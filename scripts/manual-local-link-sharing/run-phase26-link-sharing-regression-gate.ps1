<#
LOCAL-ONLY STATIC REGRESSION GATE
Purpose: protect the BuildMap Phase25 link-sharing PASS baseline without connecting to any database.
This script does not run Docker, Supabase CLI, psql, SQL, or any remote command.
Optional PassLogPath validates an already-created Phase25 local wrapper log.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string] $PassLogPath
)

$ErrorActionPreference = "Stop"

function Add-GateFailure {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures,
    [Parameter(Mandatory = $true)][string] $Message
  )
  $Failures.Add($Message)
}

function Get-NormalizedRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  return ($Path -replace '\\','/')
}

function Get-UniqueScenarioIds {
  param([Parameter(Mandatory = $true)][string] $Text)

  $Pattern = '\bLINK-[A-Z]+-\d{3}\b'
  return @(
    [regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase) |
      ForEach-Object { $_.Value.ToUpperInvariant() } |
      Sort-Object -Unique
  )
}

function Test-PowerShellParse {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )

  $Tokens = $null
  $ParseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    $Path,
    [ref]$Tokens,
    [ref]$ParseErrors
  ) | Out-Null

  if ($ParseErrors.Count -gt 0) {
    foreach ($ParseError in $ParseErrors) {
      Add-GateFailure -Failures $Failures -Message "PowerShell parse failure: $Path :: $($ParseError.Message)"
    }
  }
}

function Test-Phase25PassLog {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)] $Manifest,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Add-GateFailure -Failures $Failures -Message "Pass log not found: $Path"
    return
  }

  $Lines = @(Get-Content -LiteralPath $Path)
  $OverallLines = @($Lines | Where-Object { $_ -match '^OverallResult:\s*(?<result>\S+)\s*$' })
  if ($OverallLines.Count -ne 1) {
    Add-GateFailure -Failures $Failures -Message "Pass log must contain exactly one final OverallResult line; observed $($OverallLines.Count)."
  }
  elseif ($OverallLines[0] -notmatch '^OverallResult:\s*PASS\s*$') {
    Add-GateFailure -Failures $Failures -Message "Pass log OverallResult is not PASS: $($OverallLines[0])"
  }

  $RemoteLines = @($Lines | Where-Object { $_ -match '^Remote commands used:\s*(?<value>.+)$' })
  if ($RemoteLines.Count -ne 1 -or $RemoteLines[0] -notmatch '^Remote commands used:\s*none\s*$') {
    Add-GateFailure -Failures $Failures -Message "Pass log does not attest 'Remote commands used: none'."
  }

  foreach ($Flag in @($Manifest.failureFlags)) {
    $FlagLines = @($Lines | Where-Object { $_ -match ('^' + [regex]::Escape([string]$Flag) + ':\s*(?<value>True|False)\s*$') })
    if ($FlagLines.Count -ne 1) {
      Add-GateFailure -Failures $Failures -Message "Pass log must contain exactly one $Flag boolean line; observed $($FlagLines.Count)."
    }
    elseif ($FlagLines[0] -match ':\s*True\s*$') {
      Add-GateFailure -Failures $Failures -Message "Pass log blocker flag is true: $Flag"
    }
  }

  foreach ($Flag in @($Manifest.requiredPositiveFlags)) {
    $FlagLines = @($Lines | Where-Object { $_ -match ('^' + [regex]::Escape([string]$Flag) + ':\s*(?<value>True|False)\s*$') })
    if ($FlagLines.Count -ne 1) {
      Add-GateFailure -Failures $Failures -Message "Pass log must contain exactly one $Flag boolean line; observed $($FlagLines.Count)."
    }
    elseif ($FlagLines[0] -notmatch ':\s*True\s*$') {
      Add-GateFailure -Failures $Failures -Message "Pass log required positive flag is not true: $Flag"
    }
  }

  $ExpectedByName = @{}
  foreach ($ScenarioFile in @($Manifest.scenarioFiles)) {
    $Name = Split-Path -Leaf ([string]$ScenarioFile.path)
    $ExpectedByName[$Name] = [int]$ScenarioFile.expectedCount
  }

  $FileResultPattern = '^FileResult:\s*(?<file>[^|]+?)\s*\|\s*ExitCode=(?<exit>\d+)\s*\|\s*ExpectedScenarioCount=(?<expected>\d+)\s*\|\s*ObservedScenarioCount=(?<observed>\d+)\s*\|\s*MissingScenarioIds=(?<missing>[^|]+?)\s*\|\s*DuplicateScenarioIds=(?<duplicate>[^|]+?)\s*\|\s*ConflictingScenarioIds=(?<conflicting>[^|]+?)\s*\|\s*ParsedSignals=(?<signals>[^|]+?)\s*\|\s*FileOverallResult=(?<result>\S+)\s*$'
  $ObservedNames = New-Object System.Collections.Generic.List[string]
  $ExpectedTotal = 0
  $ObservedTotal = 0

  foreach ($Line in $Lines) {
    if ($Line -notmatch $FileResultPattern) { continue }

    $FileName = $Matches['file'].Trim()
    $ObservedNames.Add($FileName)
    $ExpectedCount = [int]$Matches['expected']
    $ObservedCount = [int]$Matches['observed']
    $ExpectedTotal += $ExpectedCount
    $ObservedTotal += $ObservedCount

    if (-not $ExpectedByName.ContainsKey($FileName)) {
      Add-GateFailure -Failures $Failures -Message "Unexpected FileResult in pass log: $FileName"
      continue
    }
    if ([int]$Matches['exit'] -ne 0) {
      Add-GateFailure -Failures $Failures -Message "Non-zero ExitCode in pass log: $FileName"
    }
    if ($ExpectedCount -ne $ExpectedByName[$FileName]) {
      Add-GateFailure -Failures $Failures -Message "Expected scenario count mismatch in pass log: $FileName expected $($ExpectedByName[$FileName]), observed declaration $ExpectedCount"
    }
    if ($ObservedCount -ne $ExpectedCount) {
      Add-GateFailure -Failures $Failures -Message "Observed scenario count mismatch in pass log: $FileName expected $ExpectedCount, observed $ObservedCount"
    }
    if ($Matches['missing'].Trim() -ne 'none') {
      Add-GateFailure -Failures $Failures -Message "MissingScenarioIds is not none: $FileName"
    }
    if ($Matches['duplicate'].Trim() -ne 'none') {
      Add-GateFailure -Failures $Failures -Message "DuplicateScenarioIds is not none: $FileName"
    }
    if ($Matches['conflicting'].Trim() -ne 'none') {
      Add-GateFailure -Failures $Failures -Message "ConflictingScenarioIds is not none: $FileName"
    }
    if ($Matches['result'].Trim() -ne 'PASS') {
      Add-GateFailure -Failures $Failures -Message "FileOverallResult is not PASS: $FileName"
    }
  }

  $UniqueObservedNames = @($ObservedNames | Sort-Object -Unique)
  if ($ObservedNames.Count -ne $ExpectedByName.Count) {
    Add-GateFailure -Failures $Failures -Message "Pass log FileResult count mismatch: expected $($ExpectedByName.Count), observed $($ObservedNames.Count)."
  }
  if ($UniqueObservedNames.Count -ne $ObservedNames.Count) {
    Add-GateFailure -Failures $Failures -Message "Pass log contains duplicate FileResult entries."
  }
  foreach ($ExpectedName in $ExpectedByName.Keys) {
    if ($UniqueObservedNames -notcontains $ExpectedName) {
      Add-GateFailure -Failures $Failures -Message "Pass log is missing FileResult: $ExpectedName"
    }
  }

  $ManifestTotal = [int]$Manifest.runtimeAttestation.expectedScenarioCount
  if ($ExpectedTotal -ne $ManifestTotal -or $ObservedTotal -ne $ManifestTotal) {
    Add-GateFailure -Failures $Failures -Message "Pass log total scenario count mismatch: manifest=$ManifestTotal, expected-total=$ExpectedTotal, observed-total=$ObservedTotal"
  }
}

$Failures = New-Object System.Collections.Generic.List[string]
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
$ManifestPath = Join-Path $ScriptDirectory 'phase26_link_sharing_regression_baseline.json'

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  Write-Error "Missing Phase26 baseline manifest: $ManifestPath"
  exit 1
}

try {
  $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
}
catch {
  Write-Error "Cannot parse Phase26 baseline manifest: $($_.Exception.Message)"
  exit 1
}

if ([string]$Manifest.schemaVersion -ne '1.0') {
  Add-GateFailure -Failures $Failures -Message "Unsupported baseline schemaVersion: $($Manifest.schemaVersion)"
}
if ([string]$Manifest.baselineStatus -ne 'USER_LOCAL_PASS') {
  Add-GateFailure -Failures $Failures -Message "Baseline status is not USER_LOCAL_PASS: $($Manifest.baselineStatus)"
}
if ([bool]$Manifest.baselineRefreshPolicy.automaticRefreshAllowed) {
  Add-GateFailure -Failures $Failures -Message "Baseline manifest must not allow automatic refresh."
}

$ProtectedCount = 0
foreach ($ProtectedFile in @($Manifest.protectedFiles)) {
  $RelativePath = Get-NormalizedRelativePath -Path ([string]$ProtectedFile.path)
  $ProtectedCount += 1
  if ([System.IO.Path]::IsPathRooted($RelativePath) -or $RelativePath -match '(^|/)\.\.(/|$)') {
    Add-GateFailure -Failures $Failures -Message "Protected file path escapes BuildMap root: $RelativePath"
    continue
  }
  $FullPath = Join-Path $Root $RelativePath

  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-GateFailure -Failures $Failures -Message "Protected file missing: $RelativePath"
    continue
  }

  $ActualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $FullPath).Hash.ToLowerInvariant()
  $ExpectedHash = ([string]$ProtectedFile.sha256).ToLowerInvariant()
  if ($ActualHash -ne $ExpectedHash) {
    Add-GateFailure -Failures $Failures -Message "Protected file hash mismatch: $RelativePath"
  }
}

$ScenarioOwnerById = @{}
$ScenarioTotal = 0
foreach ($ScenarioFile in @($Manifest.scenarioFiles)) {
  $RelativePath = Get-NormalizedRelativePath -Path ([string]$ScenarioFile.path)
  if ([System.IO.Path]::IsPathRooted($RelativePath) -or $RelativePath -match '(^|/)\.\.(/|$)') {
    Add-GateFailure -Failures $Failures -Message "Scenario file path escapes BuildMap root: $RelativePath"
    continue
  }
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-GateFailure -Failures $Failures -Message "Scenario file missing: $RelativePath"
    continue
  }

  $ExpectedIds = @($ScenarioFile.expectedIds | ForEach-Object { ([string]$_).ToUpperInvariant() } | Sort-Object -Unique)
  $ExpectedCount = [int]$ScenarioFile.expectedCount
  $Text = Get-Content -Raw -LiteralPath $FullPath
  $ActualIds = @(Get-UniqueScenarioIds -Text $Text)
  $MissingIds = @($ExpectedIds | Where-Object { $ActualIds -notcontains $_ })
  $ExtraIds = @($ActualIds | Where-Object { $ExpectedIds -notcontains $_ })

  if ($ExpectedIds.Count -ne $ExpectedCount) {
    Add-GateFailure -Failures $Failures -Message "Baseline scenario manifest count mismatch: $RelativePath declared $ExpectedCount but lists $($ExpectedIds.Count)."
  }
  if ($ActualIds.Count -ne $ExpectedCount) {
    Add-GateFailure -Failures $Failures -Message "SQL scenario count mismatch: $RelativePath expected $ExpectedCount, found $($ActualIds.Count)."
  }
  if ($MissingIds.Count -gt 0) {
    Add-GateFailure -Failures $Failures -Message "SQL scenario IDs missing from ${RelativePath}: $($MissingIds -join ',')"
  }
  if ($ExtraIds.Count -gt 0) {
    Add-GateFailure -Failures $Failures -Message "Unexpected SQL scenario IDs in ${RelativePath}: $($ExtraIds -join ',')"
  }

  foreach ($Id in $ExpectedIds) {
    if ($ScenarioOwnerById.ContainsKey($Id)) {
      Add-GateFailure -Failures $Failures -Message "Scenario ID is assigned to multiple files: $Id ($($ScenarioOwnerById[$Id]), $RelativePath)"
    }
    else {
      $ScenarioOwnerById[$Id] = $RelativePath
    }
  }
  $ScenarioTotal += $ExpectedCount
}

$ExpectedScenarioTotal = [int]$Manifest.runtimeAttestation.expectedScenarioCount
if ($ScenarioTotal -ne $ExpectedScenarioTotal) {
  Add-GateFailure -Failures $Failures -Message "Scenario manifest total mismatch: expected $ExpectedScenarioTotal, calculated $ScenarioTotal"
}

$Phase25Runner = Join-Path $Root 'scripts/manual-local-link-sharing/run-phase25-link-sharing-local.ps1'
Test-PowerShellParse -Path $Phase25Runner -Failures $Failures
Test-PowerShellParse -Path $MyInvocation.MyCommand.Path -Failures $Failures

$ExecutableScanTargets = @($Phase25Runner, $MyInvocation.MyCommand.Path)
$ForbiddenPatterns = @(
  '(?im)^\s*(?:&\s*)?supabase\s+link\b',
  '(?im)^\s*(?:&\s*)?supabase\s+db\s+(?:push|pull)\b',
  '(?im)^\s*(?:&\s*)?psql\b.*(?:postgres|postgresql)://',
  '(?im)^\s*(?:&\s*)?docker\s+.*(?:postgres|postgresql)://'
)
foreach ($Target in $ExecutableScanTargets) {
  $TargetText = Get-Content -Raw -LiteralPath $Target
  foreach ($Pattern in $ForbiddenPatterns) {
    if ($TargetText -match $Pattern) {
      Add-GateFailure -Failures $Failures -Message "Forbidden remote-capable command pattern found in: $Target"
    }
  }
}

$PassLogValidation = 'SKIPPED'
if (-not [string]::IsNullOrWhiteSpace($PassLogPath)) {
  $ResolvedLogPath = $PassLogPath
  if (-not [System.IO.Path]::IsPathRooted($ResolvedLogPath)) {
    $ResolvedLogPath = Join-Path $Root $ResolvedLogPath
  }
  $FailureCountBeforeLogValidation = $Failures.Count
  Test-Phase25PassLog -Path $ResolvedLogPath -Manifest $Manifest -Failures $Failures
  if ($Failures.Count -eq $FailureCountBeforeLogValidation) { $PassLogValidation = 'PASS' } else { $PassLogValidation = 'FAIL' }
}

Write-Host "BaselineId: $($Manifest.baselineId)"
Write-Host "ProtectedFileCount: $ProtectedCount"
Write-Host "ScenarioFileCount: $(@($Manifest.scenarioFiles).Count)"
Write-Host "ExpectedScenarioCount: $ExpectedScenarioTotal"
Write-Host "PassLogValidation: $PassLogValidation"

if ($Failures.Count -gt 0) {
  foreach ($Failure in $Failures) {
    Write-Host "GATE_FAIL: $Failure" -ForegroundColor Red
  }
  Write-Host "Phase26GateResult: FAIL" -ForegroundColor Red
  exit 1
}

Write-Host "Phase26GateResult: PASS" -ForegroundColor Cyan
exit 0
