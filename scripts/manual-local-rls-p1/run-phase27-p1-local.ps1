<#
LOCAL ONLY - BuildMap Phase27 P1 RLS Full Matrix runner.
Never use this wrapper against remote, staging, or production databases.
The wrapper accepts no DB URL, password, access token, anon key, or service-role key.
#>

param(
  [string] $ContainerName
)

$ErrorActionPreference = "Stop"

function Fail {
  param([Parameter(Mandatory = $true)][string] $Message)
  Write-Error $Message
  exit 1
}

$KnownSignalTokens = @(
  "SCENARIO_COVERAGE_FAIL", "VIEW_OPTION_MISMATCH", "VIEW_EXECUTION_MODEL_MISMATCH",
  "ACCESS_PATH_MISMATCH", "VIEW_EXPOSURE_FAIL", "VIEW_BOUNDARY_FAIL", "VIEW_ACCESS_ERROR",
  "AUTH_CONTEXT_FAIL", "UNEXPECTED_ALLOW", "UNEXPECTED_DENY", "EXPECTED_DENY",
  "NEEDS_REVIEW", "TRIGGER_FAIL", "POLICY_FAIL", "SCRIPT_ERROR", "GRANT_FAIL",
  "SEED_FAIL", "ENV_ERROR", "ERROR", "PASS", "FAIL"
)

function Test-IgnoredSignalLine {
  param([AllowNull()][string] $Line)
  if ($null -eq $Line) { return $true }
  $Trimmed = $Line.Trim()
  if ($Trimmed.Length -eq 0) { return $true }

  $IgnorePatterns = @(
    '^BuildMap Phase27', '^Timestamp\s*:', '^Container\s*:', '^Remote commands used\s*:',
    '^Native stderr handling\s*:', '^Pack level\s*:', '^Signal parser\s*:', '^==========',
    '^ExitCode\s*:', '^FileResult\s*:', '^ParsedSignals\s*:', '^FileOverallResult\s*:',
    '^ExpectedScenarioCount\s*:', '^ObservedScenarioCount\s*:', '^MissingScenarioIds\s*:',
    '^DuplicateScenarioIds\s*:', '^ConflictingScenarioIds\s*:', '^OverallResult\s*:',
    '^UnexpectedAllowDetected\s*:', '^UnexpectedDenyDetected\s*:', '^SeedFailDetected\s*:',
    '^AuthContextFailDetected\s*:', '^PolicyFailDetected\s*:', '^TriggerFailDetected\s*:',
    '^ViewExposureFailDetected\s*:', '^ViewBoundaryFailDetected\s*:', '^ViewAccessErrorDetected\s*:',
    '^ViewOptionMismatchDetected\s*:', '^ViewExecutionModelMismatchDetected\s*:',
    '^GrantFailDetected\s*:', '^AccessPathMismatchDetected\s*:', '^ScriptErrorDetected\s*:',
    '^EnvErrorDetected\s*:', '^NeedsReviewDetected\s*:', '^ScenarioCoverageFailDetected\s*:',
    '^FailDetected\s*:', '^UncaughtErrorDetected\s*:', '^ExpectedDenyDetected\s*:',
    '^PassDetected\s*:', '^Search guidance\s*:', '^Review log\s*:', '^instruction\b',
    '^PATCH\b', '^Patch\b'
  )
  foreach ($Pattern in $IgnorePatterns) {
    if ($Trimmed -match $Pattern) { return $true }
  }
  return $false
}

function Get-ScenarioIdsFromLine {
  param([AllowNull()][string] $Line)
  if ($null -eq $Line) { return @() }
  $Matches = [regex]::Matches(
    $Line,
    '\b(?<id>P1-[A-Z0-9_]+-\d{3})\b',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  $Ids = [System.Collections.Generic.List[string]]::new()
  foreach ($Match in $Matches) {
    $Value = $Match.Groups['id'].Value.ToUpperInvariant()
    if (-not $Ids.Contains($Value)) { $Ids.Add($Value) }
  }
  return $Ids.ToArray()
}

function Get-CanonicalSignalToken {
  param([AllowNull()][string] $Value)
  if ($null -eq $Value) { return $null }
  $Candidate = $Value.Trim()
  if ($Candidate -ieq 'PASS/RECORDED') { return 'PASS' }
  foreach ($Token in $KnownSignalTokens) {
    if ($Candidate -ieq $Token) { return $Token }
  }
  return $null
}

function Get-ParsedLineResults {
  param([AllowEmptyCollection()][string[]] $Lines)
  $Rows = [System.Collections.Generic.List[object]]::new()
  $ScenarioPattern = 'P1-[A-Z0-9_]+-\d{3}'

  foreach ($Line in $Lines) {
    if (Test-IgnoredSignalLine -Line $Line) { continue }
    $Trimmed = $Line.Trim()
    $ScenarioId = $null
    $Signal = $null

    if ($Trimmed -match '\|') {
      $Cells = @($Trimmed -split '\|' | ForEach-Object { $_.Trim() })
      $ScenarioCandidates = [System.Collections.Generic.List[string]]::new()
      $SignalCandidates = [System.Collections.Generic.List[string]]::new()
      foreach ($Cell in $Cells) {
        foreach ($Id in @(Get-ScenarioIdsFromLine -Line $Cell)) {
          if (-not $ScenarioCandidates.Contains($Id)) { $ScenarioCandidates.Add($Id) }
        }
        $Canonical = Get-CanonicalSignalToken -Value $Cell
        if ($null -ne $Canonical -and -not $SignalCandidates.Contains($Canonical)) {
          $SignalCandidates.Add($Canonical)
        }
      }
      if ($ScenarioCandidates.Count -eq 1 -and $SignalCandidates.Count -eq 1) {
        $ScenarioId = $ScenarioCandidates[0]
        $Signal = $SignalCandidates[0]
      }
      elseif ($ScenarioCandidates.Count -gt 0 -and $SignalCandidates.Count -gt 1) {
        $ScenarioId = $ScenarioCandidates[0]
        $Signal = 'SCRIPT_ERROR'
      }
    }
    elseif ($Trimmed -match '^(NOTICE|WARNING|ERROR):\s*(?<body>.+)$') {
      $Body = $Matches['body'].Trim()
      $NoticePattern = "^(?<id>$ScenarioPattern)\b\s+(?<signal>[A-Z_]+(?:/[A-Z_]+)?)(?:\s|$)"
      if ($Body -match $NoticePattern) {
        $ScenarioId = $Matches['id'].ToUpperInvariant()
        $Signal = Get-CanonicalSignalToken -Value $Matches['signal']
      }
    }

    if ($null -ne $ScenarioId -and $null -ne $Signal) {
      $Rows.Add([pscustomobject]@{ ScenarioId=$ScenarioId; Signal=$Signal; Line=$Line })
    }
  }
  return $Rows.ToArray()
}

function Format-StringArray {
  param([AllowEmptyCollection()][string[]] $Values)
  if (-not $Values -or $Values.Count -eq 0) { return 'none' }
  return (($Values | Sort-Object -Unique) -join ',')
}

function Format-SignalSummary {
  param([AllowEmptyCollection()][string[]] $Signals)
  if (-not $Signals -or $Signals.Count -eq 0) { return 'none' }
  $Parts = @()
  foreach ($Group in ($Signals | Group-Object | Sort-Object Name)) {
    $Parts += "$($Group.Name)=$($Group.Count)"
  }
  return ($Parts -join ', ')
}

function Invoke-LocalPsqlScript {
  param(
    [Parameter(Mandatory = $true)][string] $Sql,
    [Parameter(Mandatory = $true)][string] $LocalContainerName
  )
  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }
  try {
    $ErrorActionPreference = 'Continue'
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawOutput = @(
      $Sql | docker exec -i $LocalContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1
    )
    $ExitCode = $LASTEXITCODE
  }
  finally {
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $PreviousNativePreference }
    $ErrorActionPreference = $PreviousErrorActionPreference
  }
  $OutputLines = @(
    $RawOutput | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
      }
      else { $_.ToString() }
    }
  )
  [pscustomobject]@{
    ExitCode=$ExitCode
    Lines=$OutputLines
    Text=($OutputLines -join [Environment]::NewLine)
  }
}

$Root = (Resolve-Path '.').Path
$ScriptDir = Join-Path $Root 'scripts/manual-local-rls-p1'
$ManifestPath = Join-Path $ScriptDir 'phase27_p1_scenario_manifest.json'
if (-not (Test-Path $ManifestPath)) {
  Fail 'BuildMap root check failed or Phase27 manifest is missing. Run from the BuildMap root directory.'
}

$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$ManifestFiles = @($Manifest.files)
if ($ManifestFiles.Count -ne [int]$Manifest.expected_file_count) {
  Fail 'Phase27 manifest file count does not match expected_file_count.'
}

$ExpectedScenariosByFile = @{}
$AllExpectedIds = @()
foreach ($Entry in $ManifestFiles) {
  $FileName = [string]$Entry.file
  $Ids = @($Entry.expected_scenarios | ForEach-Object { ([string]$_).ToUpperInvariant() })
  if ($ExpectedScenariosByFile.ContainsKey($FileName)) { Fail "Duplicate manifest file entry: $FileName" }
  $ExpectedScenariosByFile[$FileName] = $Ids
  $AllExpectedIds += $Ids

  $SqlPath = Join-Path $ScriptDir $FileName
  if (-not (Test-Path $SqlPath)) { Fail "Missing Phase27 SQL script: $SqlPath" }
  $SourceIds = @(
    Get-ScenarioIdsFromLine -Line (Get-Content -Raw -LiteralPath $SqlPath) | Sort-Object -Unique
  )
  $MissingInSource = @($Ids | Where-Object { $SourceIds -notcontains $_ })
  $ExtraInSource = @($SourceIds | Where-Object { $Ids -notcontains $_ })
  if ($MissingInSource.Count -gt 0) {
    Fail "Manifest scenarios missing from ${FileName}: $(Format-StringArray -Values $MissingInSource)"
  }
  if ($ExtraInSource.Count -gt 0) {
    Fail "Unexpected scenarios in ${FileName}: $(Format-StringArray -Values $ExtraInSource)"
  }
}

$ExpectedDuplicateIds = @($AllExpectedIds | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
if ($ExpectedDuplicateIds.Count -gt 0) {
  Fail "Scenario IDs are owned by multiple Phase27 files: $(Format-StringArray -Values $ExpectedDuplicateIds)"
}
if ($AllExpectedIds.Count -ne [int]$Manifest.expected_scenario_count) {
  Fail 'Phase27 manifest scenario count does not match expected_scenario_count.'
}

$ForbiddenPatterns = @(
  '(?im)\bsupabase\s+link\b', '(?im)\bsupabase\s+db\s+push\b',
  '(?im)\bsupabase\s+db\s+pull\b', '(?im)postgres(?:ql)?://', '(?im)\.supabase\.co\b'
)
foreach ($Candidate in Get-ChildItem -LiteralPath $ScriptDir -File) {
  $CandidateText = Get-Content -Raw -LiteralPath $Candidate.FullName
  foreach ($Pattern in $ForbiddenPatterns) {
    if ($CandidateText -match $Pattern) {
      Fail "Remote-capable pattern found in Phase27 pack file: $($Candidate.Name)"
    }
  }
}

$ContainerNames = @(docker ps --format '{{.Names}}' 2>$null)
if (-not $ContainerNames -or $LASTEXITCODE -ne 0) {
  Fail 'Docker is unavailable or the Docker daemon is not running.'
}
if ([string]::IsNullOrWhiteSpace($ContainerName)) {
  $ContainerName = $ContainerNames | Where-Object { $_ -eq 'supabase_db_BuildMap' } | Select-Object -First 1
  if (-not $ContainerName) { $ContainerName = $ContainerNames | Where-Object { $_ -eq 'supabase_db_buildmap' } | Select-Object -First 1 }
  if (-not $ContainerName) {
    $Candidates = @($ContainerNames | Where-Object { $_ -like 'supabase_db_*' })
    if ($Candidates.Count -eq 1) { $ContainerName = $Candidates[0] }
    elseif ($Candidates.Count -gt 1) {
      Write-Host 'Multiple local Supabase DB containers found:' -ForegroundColor Yellow
      $Candidates | ForEach-Object { Write-Host "- $_" }
      Fail 'Refusing automatic container selection. Pass -ContainerName explicitly.'
    }
    else { Fail 'No local Supabase DB container was found.' }
  }
}
elseif ($ContainerNames -notcontains $ContainerName) {
  Fail "Requested container is not running: $ContainerName"
}

$LogDir = Join-Path $Root 'docs/p1-rls-full-matrix/logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogFile = Join-Path $LogDir "phase27-p1-rls-$Timestamp.log"
$SqlFiles = @($ManifestFiles | ForEach-Object { [string]$_.file })

$UnexpectedAllowDetected=$false
$UnexpectedDenyDetected=$false
$SeedFailDetected=$false
$AuthContextFailDetected=$false
$PolicyFailDetected=$false
$TriggerFailDetected=$false
$ViewExposureFailDetected=$false
$ViewBoundaryFailDetected=$false
$ViewAccessErrorDetected=$false
$ViewOptionMismatchDetected=$false
$ViewExecutionModelMismatchDetected=$false
$GrantFailDetected=$false
$AccessPathMismatchDetected=$false
$ScriptErrorDetected=$false
$EnvErrorDetected=$false
$NeedsReviewDetected=$false
$ScenarioCoverageFailDetected=$false
$FailDetected=$false
$UncaughtErrorDetected=$false
$ExpectedDenyDetected=$false
$PassDetected=$false
$FileResults=@()

'BuildMap Phase27 P1 RLS Full Matrix local run' | Tee-Object -FilePath $LogFile
"Timestamp: $Timestamp" | Tee-Object -FilePath $LogFile -Append
"Container: $ContainerName" | Tee-Object -FilePath $LogFile -Append
'Remote commands used: none' | Tee-Object -FilePath $LogFile -Append
'Native stderr handling: psql exit code and exact scenario signals are evaluated independently' | Tee-Object -FilePath $LogFile -Append
"Pack level: Phase27 P1 matrix | Files=$($SqlFiles.Count) | Scenarios=$($AllExpectedIds.Count)" | Tee-Object -FilePath $LogFile -Append
'Signal parser: exact P1 scenario token and result-position parser; explanatory prose is not rescanned' | Tee-Object -FilePath $LogFile -Append
'' | Tee-Object -FilePath $LogFile -Append

foreach ($File in $SqlFiles) {
  $Path = Join-Path $ScriptDir $File
  Write-Host "Running $File" -ForegroundColor Green
  "========== $File ==========" | Tee-Object -FilePath $LogFile -Append
  $Sql = Get-Content -Raw -LiteralPath $Path
  $Result = Invoke-LocalPsqlScript -Sql $Sql -LocalContainerName $ContainerName
  $ExitCode = $Result.ExitCode
  $OutputLines = @($Result.Lines)
  $OutputText = $Result.Text
  $ParsedRows = @(Get-ParsedLineResults -Lines $OutputLines)
  $Signals = @($ParsedRows | ForEach-Object { $_.Signal })
  $ObservedScenarioIds = @($ParsedRows | ForEach-Object { $_.ScenarioId } | Sort-Object -Unique)
  $ExpectedScenarioIds = @($ExpectedScenariosByFile[$File])
  $MissingScenarioIds = @($ExpectedScenarioIds | Where-Object { $ObservedScenarioIds -notcontains $_ })
  $DuplicateScenarioIds = @($ParsedRows | Group-Object ScenarioId | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
  $ConflictingScenarioIds = @(
    $ParsedRows | Group-Object ScenarioId |
      Where-Object { @($_.Group | ForEach-Object { $_.Signal } | Sort-Object -Unique).Count -gt 1 } |
      ForEach-Object { $_.Name }
  )
  if ($OutputLines.Count -gt 0) { $OutputLines | Tee-Object -FilePath $LogFile -Append }

  $FileScenarioCoverageFail = $MissingScenarioIds.Count -gt 0 -or $DuplicateScenarioIds.Count -gt 0 -or $ConflictingScenarioIds.Count -gt 0
  if ($FileScenarioCoverageFail) {
    $ScenarioCoverageFailDetected=$true
    $Signals += 'SCENARIO_COVERAGE_FAIL'
  }

  $HardFailureSignals=@('UNEXPECTED_ALLOW','VIEW_BOUNDARY_FAIL','VIEW_EXPOSURE_FAIL','FAIL','UNEXPECTED_DENY','POLICY_FAIL','TRIGGER_FAIL','SCRIPT_ERROR','SCENARIO_COVERAGE_FAIL','ERROR')
  $ReviewSignals=@('GRANT_FAIL','VIEW_ACCESS_ERROR','ACCESS_PATH_MISMATCH','VIEW_OPTION_MISMATCH','VIEW_EXECUTION_MODEL_MISMATCH','SEED_FAIL','AUTH_CONTEXT_FAIL','NEEDS_REVIEW','ENV_ERROR')
  $FileOverallResult='PASS'
  if ($ExitCode -ne 0 -or $FileScenarioCoverageFail) { $FileOverallResult='FAIL' }
  elseif ($Signals | Where-Object { $_ -in $HardFailureSignals }) { $FileOverallResult='FAIL' }
  elseif ($Signals | Where-Object { $_ -in $ReviewSignals }) { $FileOverallResult='NEEDS_REVIEW' }
  elseif (-not ($Signals -contains 'PASS') -and -not ($Signals -contains 'EXPECTED_DENY')) { $FileOverallResult='NEEDS_REVIEW' }

  $MissingSummary=Format-StringArray -Values $MissingScenarioIds
  $DuplicateSummary=Format-StringArray -Values $DuplicateScenarioIds
  $ConflictingSummary=Format-StringArray -Values $ConflictingScenarioIds
  $SignalSummary=Format-SignalSummary -Signals $Signals
  "ExitCode: $ExitCode" | Tee-Object -FilePath $LogFile -Append
  "ExpectedScenarioCount: $($ExpectedScenarioIds.Count)" | Tee-Object -FilePath $LogFile -Append
  "ObservedScenarioCount: $($ObservedScenarioIds.Count)" | Tee-Object -FilePath $LogFile -Append
  "MissingScenarioIds: $MissingSummary" | Tee-Object -FilePath $LogFile -Append
  "DuplicateScenarioIds: $DuplicateSummary" | Tee-Object -FilePath $LogFile -Append
  "ConflictingScenarioIds: $ConflictingSummary" | Tee-Object -FilePath $LogFile -Append
  "ParsedSignals: $SignalSummary" | Tee-Object -FilePath $LogFile -Append
  "FileOverallResult: $FileOverallResult" | Tee-Object -FilePath $LogFile -Append
  '' | Tee-Object -FilePath $LogFile -Append

  if ($Signals -contains 'UNEXPECTED_ALLOW') { $UnexpectedAllowDetected=$true }
  if ($Signals -contains 'UNEXPECTED_DENY') { $UnexpectedDenyDetected=$true }
  if ($Signals -contains 'SEED_FAIL') { $SeedFailDetected=$true }
  if ($Signals -contains 'AUTH_CONTEXT_FAIL') { $AuthContextFailDetected=$true }
  if ($Signals -contains 'POLICY_FAIL') { $PolicyFailDetected=$true }
  if ($Signals -contains 'TRIGGER_FAIL') { $TriggerFailDetected=$true }
  if ($Signals -contains 'VIEW_EXPOSURE_FAIL') { $ViewExposureFailDetected=$true }
  if ($Signals -contains 'VIEW_BOUNDARY_FAIL') { $ViewBoundaryFailDetected=$true }
  if ($Signals -contains 'VIEW_ACCESS_ERROR') { $ViewAccessErrorDetected=$true }
  if ($Signals -contains 'VIEW_OPTION_MISMATCH') { $ViewOptionMismatchDetected=$true }
  if ($Signals -contains 'VIEW_EXECUTION_MODEL_MISMATCH') { $ViewExecutionModelMismatchDetected=$true }
  if ($Signals -contains 'GRANT_FAIL') { $GrantFailDetected=$true }
  if ($Signals -contains 'ACCESS_PATH_MISMATCH') { $AccessPathMismatchDetected=$true }
  if ($Signals -contains 'SCRIPT_ERROR') { $ScriptErrorDetected=$true }
  if ($Signals -contains 'ENV_ERROR') { $EnvErrorDetected=$true }
  if ($Signals -contains 'NEEDS_REVIEW') { $NeedsReviewDetected=$true }
  if ($Signals -contains 'FAIL') { $FailDetected=$true }
  if ($Signals -contains 'ERROR') { $UncaughtErrorDetected=$true }
  if ($Signals -contains 'EXPECTED_DENY') { $ExpectedDenyDetected=$true }
  if ($Signals -contains 'PASS') { $PassDetected=$true }

  $FileResults += [pscustomobject]@{
    FileName=$File; ExitCode=$ExitCode; ExpectedScenarioCount=$ExpectedScenarioIds.Count;
    ObservedScenarioCount=$ObservedScenarioIds.Count; MissingScenarioIds=$MissingSummary;
    DuplicateScenarioIds=$DuplicateSummary; ConflictingScenarioIds=$ConflictingSummary;
    ParsedSignalSummary=$SignalSummary; FileOverallResult=$FileOverallResult
  }

  if ($ExitCode -ne 0) {
    $UncaughtErrorDetected=$true
    if ($OutputText -match 'permission denied for (table|view|function)') {
      Write-Host "GRANT_FAIL at $File. Stop and share the redacted log." -ForegroundColor Red
      exit 4
    }
    if ($File -eq 'phase27_01_seed_p1_fixture.sql') {
      Write-Host "SEED_FAIL at $File. Stop and share the redacted log." -ForegroundColor Red
      exit 6
    }
    Write-Host "FAILED at $File. Stop and share the redacted log." -ForegroundColor Red
    exit $ExitCode
  }
}

$OverallResult='PASS'
if ($UnexpectedAllowDetected -or $ViewBoundaryFailDetected -or $ViewExposureFailDetected) { $OverallResult='FAIL' }
elseif ($FailDetected -or $UnexpectedDenyDetected -or $PolicyFailDetected -or $TriggerFailDetected -or $ScriptErrorDetected -or $ScenarioCoverageFailDetected -or $UncaughtErrorDetected) { $OverallResult='FAIL' }
elseif ($GrantFailDetected -or $ViewAccessErrorDetected -or $AccessPathMismatchDetected -or $ViewOptionMismatchDetected -or $ViewExecutionModelMismatchDetected -or $SeedFailDetected -or $AuthContextFailDetected -or $NeedsReviewDetected -or $EnvErrorDetected) { $OverallResult='NEEDS_REVIEW' }
elseif (-not $PassDetected -and -not $ExpectedDenyDetected) { $OverallResult='NEEDS_REVIEW' }

'========== FINAL SIGNAL SCAN ==========' | Tee-Object -FilePath $LogFile -Append
foreach ($FileResult in $FileResults) {
  "FileResult: $($FileResult.FileName) | ExitCode=$($FileResult.ExitCode) | ExpectedScenarioCount=$($FileResult.ExpectedScenarioCount) | ObservedScenarioCount=$($FileResult.ObservedScenarioCount) | MissingScenarioIds=$($FileResult.MissingScenarioIds) | DuplicateScenarioIds=$($FileResult.DuplicateScenarioIds) | ConflictingScenarioIds=$($FileResult.ConflictingScenarioIds) | ParsedSignals=$($FileResult.ParsedSignalSummary) | FileOverallResult=$($FileResult.FileOverallResult)" | Tee-Object -FilePath $LogFile -Append
}
"UnexpectedAllowDetected: $UnexpectedAllowDetected" | Tee-Object -FilePath $LogFile -Append
"UnexpectedDenyDetected: $UnexpectedDenyDetected" | Tee-Object -FilePath $LogFile -Append
"SeedFailDetected: $SeedFailDetected" | Tee-Object -FilePath $LogFile -Append
"AuthContextFailDetected: $AuthContextFailDetected" | Tee-Object -FilePath $LogFile -Append
"PolicyFailDetected: $PolicyFailDetected" | Tee-Object -FilePath $LogFile -Append
"TriggerFailDetected: $TriggerFailDetected" | Tee-Object -FilePath $LogFile -Append
"ViewExposureFailDetected: $ViewExposureFailDetected" | Tee-Object -FilePath $LogFile -Append
"ViewBoundaryFailDetected: $ViewBoundaryFailDetected" | Tee-Object -FilePath $LogFile -Append
"ViewAccessErrorDetected: $ViewAccessErrorDetected" | Tee-Object -FilePath $LogFile -Append
"ViewOptionMismatchDetected: $ViewOptionMismatchDetected" | Tee-Object -FilePath $LogFile -Append
"ViewExecutionModelMismatchDetected: $ViewExecutionModelMismatchDetected" | Tee-Object -FilePath $LogFile -Append
"GrantFailDetected: $GrantFailDetected" | Tee-Object -FilePath $LogFile -Append
"AccessPathMismatchDetected: $AccessPathMismatchDetected" | Tee-Object -FilePath $LogFile -Append
"ScriptErrorDetected: $ScriptErrorDetected" | Tee-Object -FilePath $LogFile -Append
"EnvErrorDetected: $EnvErrorDetected" | Tee-Object -FilePath $LogFile -Append
"NeedsReviewDetected: $NeedsReviewDetected" | Tee-Object -FilePath $LogFile -Append
"ScenarioCoverageFailDetected: $ScenarioCoverageFailDetected" | Tee-Object -FilePath $LogFile -Append
"FailDetected: $FailDetected" | Tee-Object -FilePath $LogFile -Append
"UncaughtErrorDetected: $UncaughtErrorDetected" | Tee-Object -FilePath $LogFile -Append
"ExpectedDenyDetected: $ExpectedDenyDetected" | Tee-Object -FilePath $LogFile -Append
"PassDetected: $PassDetected" | Tee-Object -FilePath $LogFile -Append
"OverallResult: $OverallResult" | Tee-Object -FilePath $LogFile -Append
'Search guidance: inspect FileResult, scenario coverage, ParsedSignals, and OverallResult.' | Tee-Object -FilePath $LogFile -Append

if ($OverallResult -eq 'PASS') {
  Write-Host 'Phase27 P1 RLS local run completed. OverallResult: PASS' -ForegroundColor Cyan
  Write-Host "Log file: $LogFile" -ForegroundColor Cyan
  exit 0
}
if ($UnexpectedAllowDetected -or $ViewBoundaryFailDetected -or $ViewExposureFailDetected) {
  Write-Host 'Phase27 found P1 access or public exposure blocker signals. Share the redacted log.' -ForegroundColor Red
  exit 2
}
if ($GrantFailDetected) {
  Write-Host 'Phase27 found GRANT_FAIL. Share the redacted log before adding broad grants.' -ForegroundColor Yellow
  exit 4
}
if ($SeedFailDetected -or $AuthContextFailDetected) {
  Write-Host 'Phase27 found seed or actor-context prerequisite failures. Share the redacted log.' -ForegroundColor Yellow
  exit 6
}
Write-Host 'Phase27 P1 RLS local run needs review. Share the redacted log.' -ForegroundColor Yellow
exit 3
