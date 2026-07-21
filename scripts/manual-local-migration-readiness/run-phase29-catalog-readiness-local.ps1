<#
LOCAL-ONLY catalog readiness runner.
Runs three Phase29/29.1 SQL checks against the local Docker Supabase PostgreSQL container only.
No DB URL, password, access token, anon key, or service-role key is accepted.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)][string] $ContainerName
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-LocalNative {
  param([Parameter(Mandatory = $true)][scriptblock] $Command)

  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }

  try {
    $ErrorActionPreference = 'Continue'
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawOutput = @(& $Command 2>&1)
    $ExitCode = $LASTEXITCODE
  }
  finally {
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $PreviousNativePreference }
    $ErrorActionPreference = $PreviousErrorActionPreference
  }

  $Lines = @(
    $RawOutput | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
      }
      else { $_.ToString() }
    }
  )
  return [pscustomobject]@{ ExitCode = $ExitCode; Lines = $Lines }
}

$ExpectedIds = @(
  'MIG29-CATALOG-001','MIG29-CATALOG-002','MIG29-CATALOG-003','MIG29-CATALOG-004',
  'MIG29-CATALOG-005','MIG29-CATALOG-006','MIG29-CATALOG-007','MIG29-CATALOG-008',
  'MIG29-INCR-001','MIG29-INCR-002','MIG29-INCR-003','MIG29-INCR-004',
  'MIG29-INCR-005','MIG29-INCR-006','MIG29-INCR-007','MIG29-INCR-008',
  'MIG29-HARD-001','MIG29-HARD-002','MIG29-HARD-003','MIG29-HARD-004',
  'MIG29-HARD-005','MIG29-HARD-006','MIG29-HARD-007','MIG29-HARD-008',
  'MIG29-HARD-009','MIG29-HARD-010'
)

if ([string]::IsNullOrWhiteSpace($ContainerName)) {
  $DockerPs = Invoke-LocalNative -Command { docker ps --format '{{.Names}}' }
  if ($DockerPs.ExitCode -ne 0) {
    Write-Error "docker ps failed while locating the local Supabase container."
    exit 1
  }
  $Candidates = @($DockerPs.Lines | Where-Object { $_ -match '^supabase_db_' })
  if ($Candidates.Count -ne 1) {
    Write-Error "Expected exactly one running local supabase_db_ container; observed $($Candidates.Count). Pass -ContainerName explicitly."
    exit 1
  }
  $ContainerName = $Candidates[0]
}

$Files = @(
  'phase29_00_final_catalog_readiness.sql',
  'phase29_01_incremental_upgrade_postcheck.sql',
  'phase29_02_security_definer_hardening_postcheck.sql'
)
$Rows = [System.Collections.Generic.List[object]]::new()
$ExecutionFailed = $false

Write-Host 'BuildMap Phase29.1 local catalog readiness'
Write-Host "Container: $ContainerName"
Write-Host 'Remote commands used: none'

foreach ($File in $Files) {
  $Path = Join-Path $ScriptDirectory $File
  $Sql = Get-Content -Raw -LiteralPath $Path
  $Execution = Invoke-LocalNative -Command {
    $Sql | docker exec -i $ContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=1
  }
  $ExitCode = $Execution.ExitCode
  foreach ($Text in $Execution.Lines) {
    Write-Host $Text
    if ($Text -match '\b(?<id>MIG29-(?:CATALOG|INCR|HARD)-\d{3})\s+(?<signal>PASS|FAIL|PROMOTION_BLOCKER)\b') {
      $Rows.Add([pscustomobject]@{
        Id = $Matches['id'].ToUpperInvariant()
        Signal = $Matches['signal'].ToUpperInvariant()
        File = $File
      })
    }
  }
  if ($ExitCode -ne 0) {
    $ExecutionFailed = $true
    Write-Host "FileOverallResult: FAIL | $File | ExitCode=$ExitCode"
  }
  else {
    Write-Host "FileOverallResult: COMPLETE | $File | ExitCode=0"
  }
}

$ObservedIds = @($Rows | ForEach-Object { $_.Id } | Sort-Object -Unique)
$MissingIds = @($ExpectedIds | Where-Object { $ObservedIds -notcontains $_ })
$UnexpectedIds = @($ObservedIds | Where-Object { $ExpectedIds -notcontains $_ })
$DuplicateIds = @($Rows | Group-Object Id | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
$ConflictingIds = @(
  $Rows | Group-Object Id |
    Where-Object { @($_.Group | ForEach-Object { $_.Signal } | Sort-Object -Unique).Count -gt 1 } |
    ForEach-Object { $_.Name }
)

$CoverageFail = (
  $MissingIds.Count -gt 0 -or
  $UnexpectedIds.Count -gt 0 -or
  $DuplicateIds.Count -gt 0 -or
  $ConflictingIds.Count -gt 0 -or
  $Rows.Count -ne $ExpectedIds.Count
)

$Result = 'PASS'
if ($ExecutionFailed -or $CoverageFail -or @($Rows | Where-Object { $_.Signal -eq 'FAIL' }).Count -gt 0) {
  $Result = 'FAIL'
}
elseif (@($Rows | Where-Object { $_.Signal -eq 'PROMOTION_BLOCKER' }).Count -gt 0) {
  $Result = 'PROMOTION_HOLD'
}

Write-Host "ExpectedScenarioCount: $($ExpectedIds.Count)"
Write-Host "ObservedScenarioCount: $($ObservedIds.Count)"
Write-Host "MissingScenarioIds: $(if ($MissingIds.Count -eq 0) { 'none' } else { $MissingIds -join ',' })"
Write-Host "UnexpectedScenarioIds: $(if ($UnexpectedIds.Count -eq 0) { 'none' } else { $UnexpectedIds -join ',' })"
Write-Host "DuplicateScenarioIds: $(if ($DuplicateIds.Count -eq 0) { 'none' } else { $DuplicateIds -join ',' })"
Write-Host "ConflictingScenarioIds: $(if ($ConflictingIds.Count -eq 0) { 'none' } else { $ConflictingIds -join ',' })"
Write-Host "CatalogReadinessResult: $Result"

if ($Result -eq 'FAIL') { exit 1 }
if ($Result -eq 'PROMOTION_HOLD') { exit 2 }
exit 0
