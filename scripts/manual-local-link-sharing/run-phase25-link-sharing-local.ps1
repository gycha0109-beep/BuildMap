<#
DRAFT LOCAL-ONLY RUNNER - DO NOT USE AGAINST REMOTE DB
Purpose: Run BuildMap Phase25 Link Sharing Secure RPC matrix against local Docker Supabase DB only.
This wrapper never accepts DB URL, password, access token, anon key, or service role key.
Pack level: Phase24 Link Sharing Secure RPC Security Hardening & Full Matrix.
#>

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

$KnownSignalTokens = @(
  "VIEW_EXECUTION_MODEL_MISMATCH", "VIEW_OPTION_MISMATCH", "ACCESS_PATH_MISMATCH",
  "SCENARIO_COVERAGE_FAIL", "RESPONSE_EXPOSURE_FAIL", "TOKEN_LIFECYCLE_FAIL",
  "RPC_BOUNDARY_FAIL", "VIEW_EXPOSURE_FAIL", "VIEW_BOUNDARY_FAIL", "AUTH_CONTEXT_FAIL",
  "UNEXPECTED_ALLOW", "UNEXPECTED_DENY", "EXPECTED_DENY", "VIEW_ACCESS_ERROR",
  "NEEDS_REVIEW", "TRIGGER_FAIL", "POLICY_FAIL", "SCRIPT_ERROR", "GRANT_FAIL",
  "SEED_FAIL", "ENV_ERROR", "ERROR", "PASS", "FAIL"
)

$ExpectedScenariosByFile = @{
  "phase25_00_preflight.sql" = @(
    "LINK-PRE-001","LINK-PRE-002","LINK-PRE-003","LINK-PRE-004","LINK-PRE-005","LINK-PRE-006",
    "LINK-PRE-007","LINK-PRE-008","LINK-PRE-009","LINK-PRE-010","LINK-PRE-011","LINK-PRE-012",
    "LINK-PRE-013","LINK-PRE-014","LINK-PRE-015","LINK-PRE-016","LINK-PRE-017","LINK-PRE-018",
    "LINK-PRE-019"
  )
  "phase25_01_seed_link_fixture.sql" = @(
    "LINK-SEED-001","LINK-SEED-002","LINK-SEED-003","LINK-SEED-004","LINK-SEED-005",
    "LINK-SEED-006","LINK-SEED-007","LINK-SEED-008","LINK-SEED-009","LINK-SEED-010"
  )
  "phase25_02_read_rpc_matrix.sql" = @(
    "LINK-READ-001","LINK-READ-002","LINK-READ-003","LINK-READ-004","LINK-READ-005","LINK-READ-006",
    "LINK-READ-007","LINK-READ-008","LINK-READ-009","LINK-READ-010","LINK-READ-011","LINK-READ-012",
    "LINK-READ-013","LINK-READ-014","LINK-READ-015","LINK-READ-016","LINK-READ-017","LINK-READ-018",
    "LINK-READ-019","LINK-READ-020","LINK-READ-021"
  )
  "phase25_03_token_lifecycle_matrix.sql" = @(
    "LINK-LIFE-001","LINK-LIFE-002","LINK-LIFE-003","LINK-LIFE-004","LINK-LIFE-005","LINK-LIFE-006",
    "LINK-LIFE-007","LINK-LIFE-008","LINK-LIFE-009","LINK-LIFE-010","LINK-LIFE-011","LINK-LIFE-012",
    "LINK-LIFE-013","LINK-LIFE-014"
  )
  "phase25_04_feedback_rpc_matrix.sql" = @(
    "LINK-FB-001","LINK-FB-002","LINK-FB-003","LINK-FB-004","LINK-FB-005","LINK-FB-006",
    "LINK-FB-007","LINK-FB-008","LINK-FB-009","LINK-FB-010","LINK-FB-011","LINK-FB-012"
  )
  "phase25_05_rpc_permission_security.sql" = @(
    "LINK-RPC-001","LINK-RPC-002","LINK-RPC-003","LINK-RPC-004","LINK-RPC-005","LINK-RPC-006",
    "LINK-RPC-007","LINK-RPC-008","LINK-RPC-009","LINK-RPC-010","LINK-RPC-011","LINK-RPC-012"
  )
  "phase25_06_response_exposure.sql" = @(
    "LINK-EXPOSE-001","LINK-EXPOSE-002","LINK-EXPOSE-003","LINK-EXPOSE-004","LINK-EXPOSE-005",
    "LINK-EXPOSE-006","LINK-EXPOSE-007","LINK-EXPOSE-008","LINK-EXPOSE-009","LINK-EXPOSE-010"
  )
  "phase25_99_result_summary.sql" = @(
    "LINK-SUMMARY-001","LINK-SUMMARY-002","LINK-SUMMARY-003","LINK-SUMMARY-004","LINK-SUMMARY-005",
    "LINK-SUMMARY-006","LINK-SUMMARY-007","LINK-SUMMARY-008","LINK-SUMMARY-009"
  )
}

function Test-IgnoredSignalLine {
  param([AllowNull()][string] $Line)

  if ($null -eq $Line) { return $true }

  $Trimmed = $Line.Trim()
  if ($Trimmed.Length -eq 0) { return $true }

  $IgnorePatterns = @(
    '^Search hints\s*:',
    '^Search guidance\s*:',
    '^Patch level\s*:',
    '^Pack level\s*:',
    '^Native stderr handling\s*:',
    '^BuildMap Phase 25',
    '^Timestamp\s*:',
    '^Container\s*:',
    '^Remote commands used\s*:',
    '^Signal parser\s*:',
    '^==========',
    '^ExitCode\s*:',
    '^FileResult\s*:',
    '^ParsedSignals\s*:',
    '^FileOverallResult\s*:',
    '^ExpectedScenarioCount\s*:',
    '^ObservedScenarioCount\s*:',
    '^MissingScenarioIds\s*:',
    '^DuplicateScenarioIds\s*:',
    '^ConflictingScenarioIds\s*:',
    '^OverallResult\s*:',
    '^UnexpectedAllowDetected\s*:',
    '^UnexpectedDenyDetected\s*:',
    '^SeedFailDetected\s*:',
    '^AuthContextFailDetected\s*:',
    '^PolicyFailDetected\s*:',
    '^TriggerFailDetected\s*:',
    '^ViewExposureFailDetected\s*:',
    '^ViewBoundaryFailDetected\s*:',
    '^ViewAccessErrorDetected\s*:',
    '^ViewOptionMismatchDetected\s*:',
    '^ViewExecutionModelMismatchDetected\s*:',
    '^GrantFailDetected\s*:',
    '^AccessPathMismatchDetected\s*:',
    '^RpcBoundaryFailDetected\s*:',
    '^TokenLifecycleFailDetected\s*:',
    '^ResponseExposureFailDetected\s*:',
    '^ScriptErrorDetected\s*:',
    '^EnvErrorDetected\s*:',
    '^NeedsReviewDetected\s*:',
    '^ScenarioCoverageFailDetected\s*:',
    '^FailDetected\s*:',
    '^UncaughtErrorDetected\s*:',
    '^ExpectedDenyDetected\s*:',
    '^PassDetected\s*:',
    '^NEXT\s*\|',
    'Review log for',
    '^instruction\b',
    '^PATCH\b',
    '^Patch\b'
  )

  foreach ($Pattern in $IgnorePatterns) {
    if ($Trimmed -match $Pattern) { return $true }
  }
  return $false
}

function Get-ScenarioIdsFromLine {
  param([AllowNull()][string] $Line)
  if ($null -eq $Line) { return @() }
  $Trimmed = $Line.Trim()
  $Matches = [regex]::Matches($Trimmed, '\b(?<id>LINK(?:-[A-Z0-9_]+)+)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $Ids = New-Object System.Collections.Generic.List[string]
  foreach ($Match in $Matches) {
    $Value = $Match.Groups['id'].Value
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
  param([string[]] $Lines)

  $Rows = New-Object System.Collections.Generic.List[object]
  $ScenarioPattern = 'LINK(?:-[A-Z0-9_]+)+'

  foreach ($Line in $Lines) {
    if (Test-IgnoredSignalLine -Line $Line) { continue }

    $Trimmed = $Line.Trim()
    $ScenarioId = $null
    $Signal = $null

    if ($Trimmed -match '\|') {
      $Cells = @($Trimmed -split '\|' | ForEach-Object { $_.Trim() })
      $ScenarioCandidates = New-Object System.Collections.Generic.List[string]
      $SignalCandidates = New-Object System.Collections.Generic.List[string]

      foreach ($Cell in $Cells) {
        $Ids = @(Get-ScenarioIdsFromLine -Line $Cell)
        foreach ($Id in $Ids) {
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
        $ScenarioId = $Matches['id']
        $Signal = Get-CanonicalSignalToken -Value $Matches['signal']
      }
    }

    if ($null -ne $ScenarioId -and $null -ne $Signal) {
      $Rows.Add([pscustomobject]@{
        ScenarioId = $ScenarioId
        Signal = $Signal
        Line = $Line
      })
    }
  }

  return $Rows.ToArray()
}

function Format-StringArray {
  param([string[]] $Values)
  if (-not $Values -or $Values.Count -eq 0) { return "none" }
  return (($Values | Sort-Object -Unique) -join ",")
}

function Format-SignalSummary {
  param([string[]] $Signals)
  if (-not $Signals -or $Signals.Count -eq 0) { return "none" }
  $Parts = @()
  foreach ($Group in ($Signals | Group-Object | Sort-Object Name)) {
    $Parts += "$($Group.Name)=$($Group.Count)"
  }
  return ($Parts -join ", ")
}

function Invoke-LocalPsqlScript {
  param(
    [Parameter(Mandatory = $true)][string] $Sql,
    [Parameter(Mandatory = $true)][string] $ContainerName
  )

  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }

  try {
    $ErrorActionPreference = "Continue"
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawOutput = @(
      $Sql |
        docker exec -i $ContainerName `
          psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1
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
      } else { $_.ToString() }
    }
  )
  $OutputText = $OutputLines -join [Environment]::NewLine
  [pscustomobject]@{ ExitCode = $ExitCode; Lines = $OutputLines; Text = $OutputText }
}

$Root = (Resolve-Path ".").Path
$ExpectedScriptDir = Join-Path $Root "scripts/manual-local-link-sharing"
if (-not (Test-Path $ExpectedScriptDir)) {
  Fail "BuildMap root check failed. Run this from the BuildMap root directory."
}

$ContainerNames = @(docker ps --format "{{.Names}}" 2>$null)
if (-not $ContainerNames -or $LASTEXITCODE -ne 0) {
  Fail "Docker is not available or docker daemon is not running."
}

$ContainerName = $ContainerNames | Where-Object { $_ -eq "supabase_db_BuildMap" } | Select-Object -First 1
if (-not $ContainerName) { $ContainerName = $ContainerNames | Where-Object { $_ -eq "supabase_db_buildmap" } | Select-Object -First 1 }
if (-not $ContainerName) {
  $Candidates = @($ContainerNames | Where-Object { $_ -like "supabase_db_*" })
  if ($Candidates.Count -eq 1) { $ContainerName = $Candidates[0] }
  elseif ($Candidates.Count -gt 1) {
    Write-Host "Multiple local Supabase DB containers found:" -ForegroundColor Yellow
    $Candidates | ForEach-Object { Write-Host "- $_" }
    Fail "Refusing to choose automatically. Stop and select the intended local container manually."
  } else { Fail "No local Supabase DB container found. Expected supabase_db_BuildMap, supabase_db_buildmap, or supabase_db_*." }
}

Write-Host "Using local DB container: $ContainerName" -ForegroundColor Cyan
Write-Host "Remote DB URL, password, token, and keys are not used by this wrapper." -ForegroundColor Cyan

$LogDir = Join-Path $Root "docs/link-sharing-secure-rpc-test-pack/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "phase25-link-sharing-rpc-$Timestamp.log"

$UnexpectedAllowDetected = $false
$UnexpectedDenyDetected = $false
$SeedFailDetected = $false
$AuthContextFailDetected = $false
$PolicyFailDetected = $false
$TriggerFailDetected = $false
$ViewExposureFailDetected = $false
$ViewBoundaryFailDetected = $false
$ViewAccessErrorDetected = $false
$ViewOptionMismatchDetected = $false
$ViewExecutionModelMismatchDetected = $false
$GrantFailDetected = $false
$AccessPathMismatchDetected = $false
$RpcBoundaryFailDetected = $false
$TokenLifecycleFailDetected = $false
$ResponseExposureFailDetected = $false
$ScriptErrorDetected = $false
$EnvErrorDetected = $false
$NeedsReviewDetected = $false
$ScenarioCoverageFailDetected = $false
$FailDetected = $false
$UncaughtErrorDetected = $false
$ExpectedDenyDetected = $false
$PassDetected = $false

$FileResults = @()
$SqlFiles = @(
  "phase25_00_preflight.sql",
  "phase25_01_seed_link_fixture.sql",
  "phase25_02_read_rpc_matrix.sql",
  "phase25_03_token_lifecycle_matrix.sql",
  "phase25_04_feedback_rpc_matrix.sql",
  "phase25_05_rpc_permission_security.sql",
  "phase25_06_response_exposure.sql",
  "phase25_99_result_summary.sql"
)

"BuildMap Phase25 Link Sharing Secure RPC local run" | Tee-Object -FilePath $LogFile
"Timestamp: $Timestamp" | Tee-Object -FilePath $LogFile -Append
"Container: $ContainerName" | Tee-Object -FilePath $LogFile -Append
"Remote commands used: none" | Tee-Object -FilePath $LogFile -Append
"Native stderr handling: psql exit code and SQL signals are evaluated separately from NOTICE/WARNING stderr" | Tee-Object -FilePath $LogFile -Append
"Pack level: Phase24 secure RPC hardening + Phase25 full matrix runner" | Tee-Object -FilePath $LogFile -Append
"Signal parser: exact LINK scenario token parsing plus expected scenario coverage; descriptive text is not rescanned" | Tee-Object -FilePath $LogFile -Append
"" | Tee-Object -FilePath $LogFile -Append

foreach ($File in $SqlFiles) {
  $Path = Join-Path $ExpectedScriptDir $File
  if (-not (Test-Path $Path)) { Fail "Missing SQL script: $Path" }

  Write-Host "Running $File" -ForegroundColor Green
  "========== $File ==========" | Tee-Object -FilePath $LogFile -Append
  $Sql = Get-Content -Raw -LiteralPath $Path
  $Result = Invoke-LocalPsqlScript -Sql $Sql -ContainerName $ContainerName
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
    $ParsedRows |
      Group-Object ScenarioId |
      Where-Object { @($_.Group | ForEach-Object { $_.Signal } | Sort-Object -Unique).Count -gt 1 } |
      ForEach-Object { $_.Name }
  )
  $SignalSummary = Format-SignalSummary -Signals $Signals
  $MissingSummary = Format-StringArray -Values $MissingScenarioIds
  $DuplicateSummary = Format-StringArray -Values $DuplicateScenarioIds
  $ConflictingSummary = Format-StringArray -Values $ConflictingScenarioIds

  if ($OutputLines.Count -gt 0) { $OutputLines | Tee-Object -FilePath $LogFile -Append }

  $FileScenarioCoverageFail = $false
  if ($MissingScenarioIds.Count -gt 0 -or $DuplicateScenarioIds.Count -gt 0 -or $ConflictingScenarioIds.Count -gt 0) {
    $FileScenarioCoverageFail = $true
    $ScenarioCoverageFailDetected = $true
    $Signals += "SCENARIO_COVERAGE_FAIL"
    $SignalSummary = Format-SignalSummary -Signals $Signals
  }

  $HardFailureSignals = @(
    "UNEXPECTED_ALLOW", "VIEW_BOUNDARY_FAIL", "VIEW_EXPOSURE_FAIL", "FAIL",
    "UNEXPECTED_DENY", "POLICY_FAIL", "TRIGGER_FAIL", "SCRIPT_ERROR",
    "SCENARIO_COVERAGE_FAIL", "RPC_BOUNDARY_FAIL", "TOKEN_LIFECYCLE_FAIL",
    "RESPONSE_EXPOSURE_FAIL", "ERROR"
  )
  $ReviewSignals = @(
    "GRANT_FAIL", "VIEW_ACCESS_ERROR", "ACCESS_PATH_MISMATCH",
    "VIEW_OPTION_MISMATCH", "VIEW_EXECUTION_MODEL_MISMATCH",
    "SEED_FAIL", "AUTH_CONTEXT_FAIL", "NEEDS_REVIEW", "ENV_ERROR"
  )

  $FileOverallResult = "PASS"
  if ($ExitCode -ne 0) { $FileOverallResult = "FAIL" }
  elseif ($FileScenarioCoverageFail) { $FileOverallResult = "FAIL" }
  elseif ($Signals | Where-Object { $_ -in $HardFailureSignals }) { $FileOverallResult = "FAIL" }
  elseif ($Signals | Where-Object { $_ -in $ReviewSignals }) { $FileOverallResult = "NEEDS_REVIEW" }
  elseif (-not ($Signals -contains "PASS") -and -not ($Signals -contains "EXPECTED_DENY")) { $FileOverallResult = "NEEDS_REVIEW" }

  "ExitCode: $ExitCode" | Tee-Object -FilePath $LogFile -Append
  "ExpectedScenarioCount: $($ExpectedScenarioIds.Count)" | Tee-Object -FilePath $LogFile -Append
  "ObservedScenarioCount: $($ObservedScenarioIds.Count)" | Tee-Object -FilePath $LogFile -Append
  "MissingScenarioIds: $MissingSummary" | Tee-Object -FilePath $LogFile -Append
  "DuplicateScenarioIds: $DuplicateSummary" | Tee-Object -FilePath $LogFile -Append
  "ConflictingScenarioIds: $ConflictingSummary" | Tee-Object -FilePath $LogFile -Append
  "ParsedSignals: $SignalSummary" | Tee-Object -FilePath $LogFile -Append
  "FileOverallResult: $FileOverallResult" | Tee-Object -FilePath $LogFile -Append
  "" | Tee-Object -FilePath $LogFile -Append

  if ($Signals -contains "UNEXPECTED_ALLOW") { $UnexpectedAllowDetected = $true }
  if ($Signals -contains "UNEXPECTED_DENY") { $UnexpectedDenyDetected = $true }
  if ($Signals -contains "SEED_FAIL") { $SeedFailDetected = $true }
  if ($Signals -contains "AUTH_CONTEXT_FAIL") { $AuthContextFailDetected = $true }
  if ($Signals -contains "POLICY_FAIL") { $PolicyFailDetected = $true }
  if ($Signals -contains "TRIGGER_FAIL") { $TriggerFailDetected = $true }
  if ($Signals -contains "VIEW_EXPOSURE_FAIL") { $ViewExposureFailDetected = $true }
  if ($Signals -contains "VIEW_BOUNDARY_FAIL") { $ViewBoundaryFailDetected = $true }
  if ($Signals -contains "VIEW_ACCESS_ERROR") { $ViewAccessErrorDetected = $true }
  if ($Signals -contains "VIEW_OPTION_MISMATCH") { $ViewOptionMismatchDetected = $true }
  if ($Signals -contains "VIEW_EXECUTION_MODEL_MISMATCH") { $ViewExecutionModelMismatchDetected = $true }
  if ($Signals -contains "GRANT_FAIL") { $GrantFailDetected = $true }
  if ($Signals -contains "ACCESS_PATH_MISMATCH") { $AccessPathMismatchDetected = $true }
  if ($Signals -contains "RPC_BOUNDARY_FAIL") { $RpcBoundaryFailDetected = $true }
  if ($Signals -contains "TOKEN_LIFECYCLE_FAIL") { $TokenLifecycleFailDetected = $true }
  if ($Signals -contains "RESPONSE_EXPOSURE_FAIL") { $ResponseExposureFailDetected = $true }
  if ($Signals -contains "SCRIPT_ERROR") { $ScriptErrorDetected = $true }
  if ($Signals -contains "ENV_ERROR") { $EnvErrorDetected = $true }
  if ($Signals -contains "NEEDS_REVIEW") { $NeedsReviewDetected = $true }
  if ($Signals -contains "FAIL") { $FailDetected = $true }
  if ($Signals -contains "ERROR") { $UncaughtErrorDetected = $true }
  if ($Signals -contains "EXPECTED_DENY") { $ExpectedDenyDetected = $true }
  if ($Signals -contains "PASS") { $PassDetected = $true }

  $FileResults += [pscustomobject]@{
    FileName = $File
    ExitCode = $ExitCode
    ExpectedScenarioCount = $ExpectedScenarioIds.Count
    ObservedScenarioCount = $ObservedScenarioIds.Count
    MissingScenarioIds = $MissingSummary
    DuplicateScenarioIds = $DuplicateSummary
    ConflictingScenarioIds = $ConflictingSummary
    ParsedSignals = $Signals
    ParsedSignalSummary = $SignalSummary
    FileOverallResult = $FileOverallResult
  }

  if ($ExitCode -ne 0) {
    $UncaughtErrorDetected = $true
    if ($OutputText -match "permission denied for (table|view|function)") {
      Write-Host "GRANT_FAIL at $File. Stop and share the redacted log." -ForegroundColor Red
      exit 4
    }
    if ($File -eq "phase25_01_seed_link_fixture.sql") {
      Write-Host "SEED_FAIL at $File. Stop and share the redacted log. This is not yet a link-sharing RPC behavior result." -ForegroundColor Red
      exit 6
    }
    Write-Host "FAILED at $File. Stop and share the redacted log." -ForegroundColor Red
    exit $ExitCode
  }
}

$OverallResult = "PASS"
if ($UnexpectedAllowDetected -or $ViewBoundaryFailDetected -or $ViewExposureFailDetected) {
  $OverallResult = "FAIL"
}
elseif ($FailDetected -or $UnexpectedDenyDetected -or $PolicyFailDetected -or $TriggerFailDetected -or $ScriptErrorDetected -or $ScenarioCoverageFailDetected -or $RpcBoundaryFailDetected -or $TokenLifecycleFailDetected -or $ResponseExposureFailDetected -or $UncaughtErrorDetected) {
  $OverallResult = "FAIL"
}
elseif ($GrantFailDetected -or $ViewAccessErrorDetected -or $AccessPathMismatchDetected -or $ViewOptionMismatchDetected -or $ViewExecutionModelMismatchDetected -or $SeedFailDetected -or $AuthContextFailDetected -or $NeedsReviewDetected -or $EnvErrorDetected) {
  $OverallResult = "NEEDS_REVIEW"
}
elseif (-not $PassDetected -and -not $ExpectedDenyDetected) {
  $OverallResult = "NEEDS_REVIEW"
}

"========== FINAL SIGNAL SCAN ==========" | Tee-Object -FilePath $LogFile -Append
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
"RpcBoundaryFailDetected: $RpcBoundaryFailDetected" | Tee-Object -FilePath $LogFile -Append
"TokenLifecycleFailDetected: $TokenLifecycleFailDetected" | Tee-Object -FilePath $LogFile -Append
"ResponseExposureFailDetected: $ResponseExposureFailDetected" | Tee-Object -FilePath $LogFile -Append
"ScriptErrorDetected: $ScriptErrorDetected" | Tee-Object -FilePath $LogFile -Append
"EnvErrorDetected: $EnvErrorDetected" | Tee-Object -FilePath $LogFile -Append
"NeedsReviewDetected: $NeedsReviewDetected" | Tee-Object -FilePath $LogFile -Append
"ScenarioCoverageFailDetected: $ScenarioCoverageFailDetected" | Tee-Object -FilePath $LogFile -Append
"FailDetected: $FailDetected" | Tee-Object -FilePath $LogFile -Append
"UncaughtErrorDetected: $UncaughtErrorDetected" | Tee-Object -FilePath $LogFile -Append
"ExpectedDenyDetected: $ExpectedDenyDetected" | Tee-Object -FilePath $LogFile -Append
"PassDetected: $PassDetected" | Tee-Object -FilePath $LogFile -Append
"OverallResult: $OverallResult" | Tee-Object -FilePath $LogFile -Append
"Search guidance: inspect FileResult, MissingScenarioIds, DuplicateScenarioIds, ParsedSignals, and OverallResult lines. Wrapper does not raw-scan this guidance line." | Tee-Object -FilePath $LogFile -Append

if ($UnexpectedAllowDetected -or $ViewBoundaryFailDetected -or $ViewExposureFailDetected) {
  Write-Host "Phase25 link sharing RPC local run found link-sharing security blocker signals. Share the redacted log." -ForegroundColor Red
  exit 2
}
if ($FailDetected -or $UnexpectedDenyDetected -or $PolicyFailDetected -or $TriggerFailDetected -or $ScriptErrorDetected -or $ScenarioCoverageFailDetected -or $RpcBoundaryFailDetected -or $TokenLifecycleFailDetected -or $ResponseExposureFailDetected) {
  Write-Host "Phase25 link sharing RPC local run found test/policy/integrity/script/coverage failure signals. Share the redacted log." -ForegroundColor Yellow
  exit 3
}
if ($GrantFailDetected) {
  Write-Host "Phase25 link sharing RPC local run found GRANT_FAIL. Share the redacted log for minimal grant/access-boundary review." -ForegroundColor Yellow
  exit 4
}
if ($ViewAccessErrorDetected -or $AccessPathMismatchDetected -or $ViewOptionMismatchDetected -or $ViewExecutionModelMismatchDetected) {
  Write-Host "Phase25 link sharing RPC local run found view/access execution-boundary signals. Share the redacted log before adding any source-table grants." -ForegroundColor Yellow
  exit 5
}
if ($SeedFailDetected -or $AuthContextFailDetected) {
  Write-Host "Phase25 link sharing RPC local run found seed/actor prerequisite failure signals. Share the redacted log." -ForegroundColor Yellow
  exit 6
}
if ($NeedsReviewDetected) {
  Write-Host "Phase25 link sharing RPC local run found NEEDS_REVIEW signals. Share the redacted log." -ForegroundColor Yellow
  exit 7
}
if ($EnvErrorDetected) {
  Write-Host "Phase25 link sharing RPC local run found ENV_ERROR signals. Share the redacted log." -ForegroundColor Yellow
  exit 8
}
if ($UncaughtErrorDetected) {
  Write-Host "Phase25 link sharing RPC local run found uncaught ERROR signals. Share the redacted log." -ForegroundColor Yellow
  exit 3
}
if ($OverallResult -ne "PASS") {
  Write-Host "Phase25 link sharing RPC local run needs review. Share the redacted log." -ForegroundColor Yellow
  exit 3
}

Write-Host "Phase25 link sharing RPC local run completed. OverallResult: PASS" -ForegroundColor Cyan
Write-Host "Review FileResult / MissingScenarioIds / ParsedSignals lines for exact link-sharing matrix coverage." -ForegroundColor Cyan
Write-Host "Log file: $LogFile" -ForegroundColor Cyan
exit 0
