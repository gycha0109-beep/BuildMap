<#
LOCAL-ONLY Phase29.2 replay-evidence helpers.
No function in this file accepts a database URL, password, token, key, or linked-project flag.
#>

$script:Phase292ExpectedVersions = @(
  '20260708000000',
  '20260708001000',
  '20260708002000',
  '20260708003000',
  '20260708004000',
  '20260708005000',
  '20260708006000',
  '20260708007000',
  '20260708008000',
  '20260720000000',
  '20260721000000'
)

function Convert-Phase292OutputLines {
  param([AllowEmptyCollection()][object[]] $Values)
  return @(
    $Values | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
      }
      else { $_.ToString() }
    }
  )
}

function Invoke-Phase292Native {
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

  return [pscustomobject]@{
    ExitCode = $ExitCode
    Lines = @(Convert-Phase292OutputLines -Values $RawOutput)
  }
}

function Get-Phase292RepositoryRoot {
  param([Parameter(Mandatory = $true)][string] $ScriptDirectory)

  $Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
  if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) {
    throw "BuildMap Git repository root was not found: $Root"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Root 'supabase/migrations') -PathType Container)) {
    throw 'Tracked local replay migration directory is missing.'
  }
  return $Root
}

function Assert-Phase292CommandAvailable {
  param([Parameter(Mandatory = $true)][string] $Name)
  $Command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $Command) { throw "Required command is unavailable: $Name" }
  return $Command
}

function Get-Phase292RepositoryHead {
  param([Parameter(Mandatory = $true)][string] $Root)
  $Git = Assert-Phase292CommandAvailable -Name 'git'
  $Execution = Invoke-Phase292Native -Command { & $Git.Source -C $Root rev-parse HEAD }
  $Rows = @($Execution.Lines | Where-Object { $_ -match '^[0-9a-fA-F]{40}$' })
  if ($Execution.ExitCode -ne 0 -or $Rows.Count -ne 1) {
    throw 'Unable to resolve the current Git HEAD.'
  }
  return $Rows[0].ToLowerInvariant()
}

function Assert-Phase292TrackedWorkingTreeClean {
  param([Parameter(Mandatory = $true)][string] $Root)
  $Git = Assert-Phase292CommandAvailable -Name 'git'

  $Worktree = Invoke-Phase292Native -Command { & $Git.Source -C $Root diff --quiet -- }
  if ($Worktree.ExitCode -ne 0) { throw 'Tracked working-tree changes are present. Commit or restore them before evidence generation.' }

  $Index = Invoke-Phase292Native -Command { & $Git.Source -C $Root diff --cached --quiet -- }
  if ($Index.ExitCode -ne 0) { throw 'Staged changes are present. Commit or restore them before evidence generation.' }
}

function Get-Phase292ToolVersion {
  param(
    [Parameter(Mandatory = $true)][string] $CommandName,
    [Parameter(Mandatory = $true)][scriptblock] $Command
  )
  $null = Assert-Phase292CommandAvailable -Name $CommandName
  $Execution = Invoke-Phase292Native -Command $Command
  $Rows = @($Execution.Lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($Execution.ExitCode -ne 0 -or $Rows.Count -lt 1) {
    throw "Unable to read ${CommandName} version."
  }
  return ($Rows -join ' ').Trim()
}

function Get-Phase292ContainerName {
  param([string] $RequestedName)

  $Docker = Assert-Phase292CommandAvailable -Name 'docker'
  $Execution = Invoke-Phase292Native -Command { & $Docker.Source ps --format '{{.Names}}' }
  if ($Execution.ExitCode -ne 0) { throw 'docker ps failed while locating the local Supabase database.' }

  $Candidates = @($Execution.Lines | Where-Object { $_ -match '^supabase_db_' })
  if (-not [string]::IsNullOrWhiteSpace($RequestedName)) {
    if ($RequestedName -notmatch '^supabase_db_') { throw 'ContainerName must start with supabase_db_.' }
    if ($Candidates -notcontains $RequestedName) { throw "Requested local container is not running: $RequestedName" }
    return $RequestedName
  }

  foreach ($Preferred in @('supabase_db_BuildMap','supabase_db_buildmap')) {
    if ($Candidates -contains $Preferred) { return $Preferred }
  }
  if ($Candidates.Count -eq 1) { return $Candidates[0] }
  if ($Candidates.Count -eq 0) { throw 'No running local supabase_db_ container was found. Run supabase start first.' }
  throw "Multiple local Supabase database containers were found: $($Candidates -join ','). Pass -ContainerName explicitly."
}

function Get-Phase292MigrationHistory {
  param([Parameter(Mandatory = $true)][string] $ContainerName)

  $Sql = "select version::text from supabase_migrations.schema_migrations order by version::text;"
  $Execution = Invoke-Phase292Native -Command {
    docker exec $ContainerName psql -U postgres -d postgres -Atq -v ON_ERROR_STOP=1 -c $Sql
  }
  if ($Execution.ExitCode -ne 0) { throw 'Unable to read local migration history.' }

  $NonEmpty = @($Execution.Lines | ForEach-Object { $_.Trim() } | Where-Object { $_.Length -gt 0 })
  $Invalid = @($NonEmpty | Where-Object { $_ -notmatch '^\d{14}$' })
  if ($Invalid.Count -gt 0) {
    throw "Unexpected migration-history output: $($Invalid -join ',')"
  }
  return @($NonEmpty)
}

function Assert-Phase292ExactVersions {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Observed,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Expected,
    [Parameter(Mandatory = $true)][string] $Label
  )

  $Missing = @($Expected | Where-Object { $Observed -notcontains $_ })
  $Unexpected = @($Observed | Where-Object { $Expected -notcontains $_ })
  $Duplicates = @($Observed | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
  if ($Observed.Count -ne $Expected.Count -or $Missing.Count -gt 0 -or $Unexpected.Count -gt 0 -or $Duplicates.Count -gt 0) {
    throw "${Label} migration history mismatch. Missing=$($Missing -join ','); Unexpected=$($Unexpected -join ','); Duplicate=$($Duplicates -join ',')"
  }
}

function Get-Phase292TextSha256 {
  param([Parameter(Mandatory = $true)][string] $Text)
  $Bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Text)
  $Hash = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($Hash.ComputeHash($Bytes)) -replace '-','').ToLowerInvariant()
  }
  finally { $Hash.Dispose() }
}

function Get-Phase292ContractInfo {
  param([Parameter(Mandatory = $true)][string] $Root)

  $ManifestPath = Join-Path $Root 'scripts/manual-local-migration-readiness/phase29_migration_promotion_manifest.json'
  $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json

  $MigrationLines = @(
    $Manifest.migrations |
      Sort-Object { [int]$_.order } |
      ForEach-Object { "$([int]$_.order)|$([string]$_.path)|$(([string]$_.sha256).ToLowerInvariant())" }
  )
  $GateLines = @(
    $Manifest.protectedGateFiles |
      Sort-Object { [string]$_.path } |
      ForEach-Object { "$([string]$_.path)|$(([string]$_.sha256).ToLowerInvariant())" }
  )

  return [pscustomobject]@{
    BaselineId = [string]$Manifest.phase28Baseline.baselineId
    MigrationSetDigest = Get-Phase292TextSha256 -Text ($MigrationLines -join "`n")
    ProtectedGateSetDigest = Get-Phase292TextSha256 -Text ($GateLines -join "`n")
  }
}

function Write-Phase292CapturedLog {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Lines
  )
  $Directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $Directory | Out-Null
  [System.IO.File]::WriteAllLines($Path, $Lines, [System.Text.UTF8Encoding]::new($false))
}

function Assert-Phase292ExactLine {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Lines,
    [Parameter(Mandatory = $true)][string] $Pattern,
    [Parameter(Mandatory = $true)][string] $Label
  )
  $Rows = @($Lines | Where-Object { $_ -match $Pattern })
  if ($Rows.Count -ne 1) {
    throw "${Label} requires exactly one matching completion line; observed $($Rows.Count)."
  }
}

function Invoke-Phase292PowerShellFile {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [AllowEmptyCollection()][string[]] $Arguments = @(),
    [Parameter(Mandatory = $true)][string] $CapturePath
  )

  $PowerShellExecutable = (Get-Process -Id $PID).Path
  $Execution = Invoke-Phase292Native -Command {
    & $PowerShellExecutable -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments
  }
  Write-Phase292CapturedLog -Path $CapturePath -Lines $Execution.Lines
  return $Execution
}

function Get-Phase292ChildLogPath {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Lines,
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][string] $Label
  )

  $Rows = @($Lines | Where-Object { $_ -match '^Log file:\s*(?<path>.+?)\s*$' })
  if ($Rows.Count -ne 1) { throw "${Label} output requires exactly one Log file line; observed $($Rows.Count)." }
  $null = $Rows[0] -match '^Log file:\s*(?<path>.+?)\s*$'
  $Value = $Matches['path'].Trim()
  if (-not [System.IO.Path]::IsPathRooted($Value)) { $Value = Join-Path $Root $Value }
  $Resolved = [System.IO.Path]::GetFullPath($Value)
  if (-not (Test-Path -LiteralPath $Resolved -PathType Leaf)) { throw "${Label} log file is missing: $Resolved" }
  return $Resolved
}

function Invoke-Phase292RegressionSuite {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][string] $RunDirectory,
    [Parameter(Mandatory = $true)][string] $ContainerName
  )

  $Phase20 = Invoke-Phase292PowerShellFile `
    -Path (Join-Path $Root 'scripts/manual-local-rls/run-phase20-p0-local.ps1') `
    -CapturePath (Join-Path $RunDirectory 'phase20-console.log')
  if ($Phase20.ExitCode -ne 0) { throw "Phase20 failed with exit code $($Phase20.ExitCode)." }
  Assert-Phase292ExactLine -Lines $Phase20.Lines -Pattern '^OverallResult:\s*PASS\s*$' -Label 'Phase20'
  $Phase20SourceLog = Get-Phase292ChildLogPath -Lines $Phase20.Lines -Root $Root -Label 'Phase20'
  $Phase20PassLog = Join-Path $RunDirectory 'phase20-pass.log'
  Copy-Item -LiteralPath $Phase20SourceLog -Destination $Phase20PassLog -Force

  $Phase25 = Invoke-Phase292PowerShellFile `
    -Path (Join-Path $Root 'scripts/manual-local-link-sharing/run-phase25-link-sharing-local.ps1') `
    -CapturePath (Join-Path $RunDirectory 'phase25-console.log')
  if ($Phase25.ExitCode -ne 0) { throw "Phase25 failed with exit code $($Phase25.ExitCode)." }
  Assert-Phase292ExactLine -Lines $Phase25.Lines -Pattern '^OverallResult:\s*PASS\s*$' -Label 'Phase25'
  $Phase25SourceLog = Get-Phase292ChildLogPath -Lines $Phase25.Lines -Root $Root -Label 'Phase25'
  $Phase25PassLog = Join-Path $RunDirectory 'phase25-pass.log'
  Copy-Item -LiteralPath $Phase25SourceLog -Destination $Phase25PassLog -Force

  $Phase27 = Invoke-Phase292PowerShellFile `
    -Path (Join-Path $Root 'scripts/manual-local-rls-p1/run-phase27-p1-local.ps1') `
    -CapturePath (Join-Path $RunDirectory 'phase27-console.log')
  if ($Phase27.ExitCode -ne 0) { throw "Phase27 failed with exit code $($Phase27.ExitCode)." }
  Assert-Phase292ExactLine -Lines $Phase27.Lines -Pattern '^OverallResult:\s*PASS\s*$' -Label 'Phase27'
  $Phase27SourceLog = Get-Phase292ChildLogPath -Lines $Phase27.Lines -Root $Root -Label 'Phase27'
  $Phase27PassLog = Join-Path $RunDirectory 'phase27-pass.log'
  Copy-Item -LiteralPath $Phase27SourceLog -Destination $Phase27PassLog -Force

  $Phase28Arguments = @(
    '-Phase20PassLogPath', $Phase20PassLog,
    '-Phase25PassLogPath', $Phase25PassLog,
    '-Phase27PassLogPath', $Phase27PassLog,
    '-RequireAllPassLogs'
  )
  $Phase28 = Invoke-Phase292PowerShellFile `
    -Path (Join-Path $Root 'scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1') `
    -Arguments $Phase28Arguments `
    -CapturePath (Join-Path $RunDirectory 'phase28-gate.log')
  if ($Phase28.ExitCode -ne 0) { throw "Phase28 gate failed with exit code $($Phase28.ExitCode)." }
  foreach ($Pattern in @(
    '^Phase20PassLogValidation:\s*PASS\s*$',
    '^Phase25PassLogValidation:\s*PASS\s*$',
    '^Phase27PassLogValidation:\s*PASS\s*$',
    '^RequireAllPassLogs:\s*True\s*$',
    '^Phase28GateResult:\s*PASS\s*$'
  )) {
    Assert-Phase292ExactLine -Lines $Phase28.Lines -Pattern $Pattern -Label 'Phase28'
  }

  $CatalogArguments = @('-ContainerName', $ContainerName)
  $Catalog = Invoke-Phase292PowerShellFile `
    -Path (Join-Path $Root 'scripts/manual-local-migration-readiness/run-phase29-catalog-readiness-local.ps1') `
    -Arguments $CatalogArguments `
    -CapturePath (Join-Path $RunDirectory 'phase29-catalog.log')
  if ($Catalog.ExitCode -ne 0) { throw "Phase29 catalog runner failed with exit code $($Catalog.ExitCode)." }
  foreach ($Pattern in @(
    '^ExpectedScenarioCount:\s*26\s*$',
    '^ObservedScenarioCount:\s*26\s*$',
    '^MissingScenarioIds:\s*none\s*$',
    '^UnexpectedScenarioIds:\s*none\s*$',
    '^DuplicateScenarioIds:\s*none\s*$',
    '^ConflictingScenarioIds:\s*none\s*$',
    '^CatalogReadinessResult:\s*PASS\s*$'
  )) {
    Assert-Phase292ExactLine -Lines $Catalog.Lines -Pattern $Pattern -Label 'Phase29 catalog'
  }

  return [pscustomobject]@{
    Phase20Result = 'PASS'
    Phase25Result = 'PASS'
    Phase27Result = 'PASS'
    Phase28GateResult = 'PASS'
    Phase28PassLogValidation = 'PASS'
    CatalogReadinessResult = 'PASS'
  }
}

function Invoke-Phase292SqlScenarioFile {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][string] $ContainerName,
    [Parameter(Mandatory = $true)][string[]] $ExpectedIds,
    [Parameter(Mandatory = $true)][string] $CapturePath
  )

  $Sql = Get-Content -Raw -LiteralPath $Path
  $Execution = Invoke-Phase292Native -Command {
    $Sql | docker exec -i $ContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=1
  }
  Write-Phase292CapturedLog -Path $CapturePath -Lines $Execution.Lines
  if ($Execution.ExitCode -ne 0) { throw "SQL scenario file failed with exit code $($Execution.ExitCode): $Path" }

  $Rows = @()
  foreach ($Line in $Execution.Lines) {
    if ($Line -match '\b(?<id>MIG29-PREUP-\d{3})\s+(?<signal>PASS|FAIL)\b') {
      $Rows += [pscustomobject]@{ Id=$Matches['id']; Signal=$Matches['signal'] }
    }
  }
  $ObservedIds = @($Rows | ForEach-Object { $_.Id } | Sort-Object -Unique)
  $Missing = @($ExpectedIds | Where-Object { $ObservedIds -notcontains $_ })
  $Unexpected = @($ObservedIds | Where-Object { $ExpectedIds -notcontains $_ })
  $Duplicate = @($Rows | Group-Object Id | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
  $Failure = @($Rows | Where-Object { $_.Signal -ne 'PASS' })
  if ($Rows.Count -ne $ExpectedIds.Count -or $Missing.Count -gt 0 -or $Unexpected.Count -gt 0 -or $Duplicate.Count -gt 0 -or $Failure.Count -gt 0) {
    throw "Incremental pre-upgrade oracle failed. Missing=$($Missing -join ','); Unexpected=$($Unexpected -join ','); Duplicate=$($Duplicate -join ','); NonPass=$($Failure.Id -join ',')"
  }
}

function Write-Phase292Evidence {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][string[]] $Lines
  )

  $Directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $Directory | Out-Null
  $TemporaryPath = "${Path}.tmp"
  [System.IO.File]::WriteAllLines($TemporaryPath, $Lines, [System.Text.UTF8Encoding]::new($false))
  Move-Item -LiteralPath $TemporaryPath -Destination $Path -Force
}
