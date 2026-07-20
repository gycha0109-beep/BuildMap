<#
DRAFT LOCAL-ONLY RUNNER - DO NOT USE AGAINST REMOTE DB
Purpose: Run BuildMap Phase 20 P0 RLS SQL scripts against local Docker Supabase DB container only.
This wrapper never accepts DB URL, password, access token, anon key, or service role key.
Patch level: Phase23.6 parse gate + deterministic signal parser correction.
#>

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

$KnownSignalTokens = @(
  "VIEW_EXECUTION_MODEL_MISMATCH",
  "VIEW_OPTION_MISMATCH",
  "ACCESS_PATH_MISMATCH",
  "SCENARIO_COVERAGE_FAIL",
  "VIEW_EXPOSURE_FAIL",
  "VIEW_BOUNDARY_FAIL",
  "AUTH_CONTEXT_FAIL",
  "UNEXPECTED_ALLOW",
  "UNEXPECTED_DENY",
  "EXPECTED_DENY",
  "VIEW_ACCESS_ERROR",
  "NEEDS_REVIEW",
  "TRIGGER_FAIL",
  "POLICY_FAIL",
  "SCRIPT_ERROR",
  "GRANT_FAIL",
  "SEED_FAIL",
  "ENV_ERROR",
  "ERROR",
  "PASS",
  "FAIL"
)

$ExpectedScenariosByFile = @{
  "phase20_00_preflight.sql" = @(
    "PRE-003", "PRE-004",
    "PRE-005", "PRE-006", "PRE-007", "PRE-008", "PRE-009", "PRE-010", "PRE-011", "PRE-012", "PRE-013",
    "PRE-014-projects", "PRE-014-rough_notes", "PRE-014-ai_structured_drafts", "PRE-014-change_cards", "PRE-014-feedback_requests", "PRE-014-feedbacks",
    "PRE-020", "PRE-021", "PRE-022", "PRE-023", "PRE-024", "PRE-025", "PRE-026", "PRE-027", "PRE-028",
    "PRE-030", "PRE-031", "PRE-032", "PRE-033", "PRE-034",
    "PRE-039", "PRE-040", "PRE-041", "PRE-042", "PRE-043", "PRE-044", "PRE-045", "PRE-046",
    "PRE-047-public_builder_profiles", "PRE-047-public_project_cards", "PRE-047-public_project_pages", "PRE-047-public_change_cards", "PRE-047-public_decision_timeline", "PRE-047-public_feedback_requests", "PRE-047-public_feedbacks", "PRE-047-public_project_links",
    "PRE-048", "PRE-049", "PRE-050", "PRE-051", "PRE-060", "PRE-061"
  )
  "phase20_01_seed_p0_fixture.sql" = @(
    "SEED-FB-CTX-001", "SEED-001", "SEED-002", "SEED-003", "SEED-004", "SEED-005", "SEED-006", "SEED-007", "SEED-008", "SEED-009"
  )
  "phase20_02_project_access_p0.sql" = @(
    "PRJ-P0-001", "PRJ-P0-002", "PRJ-P0-002A", "PRJ-P0-003", "PRJ-P0-004", "PRJ-P0-005", "PRJ-P0-006"
  )
  "phase20_03_rough_note_ai_draft_p0.sql" = @(
    "RNAI-P0-001", "RNAI-P0-002", "RNAI-P0-003", "RNAI-P0-005", "RNAI-P0-006", "RNAI-P0-007", "RNAI-P0-008"
  )
  "phase20_04_change_card_public_boundary_p0.sql" = @(
    "CC-P0-000", "CC-P0-001", "CC-P0-002", "CC-P0-003", "CC-P0-004", "CC-P0-005", "CC-P0-006", "CC-P0-007"
  )
  "phase20_05_feedback_author_spoofing_p0.sql" = @(
    "FB-P0-001", "FB-P0-002", "FB-P0-003", "FB-P0-004", "FB-P0-005", "FB-P0-006", "FB-P0-007"
  )
  "phase20_06_public_safe_view_p0.sql" = @(
    "VIEW-P0-BP-001", "VIEW-P0-BP-002", "VIEW-P0-BP-003", "VIEW-P0-BP-004", "VIEW-P0-BP-005", "VIEW-P0-BP-006",
    "VIEW-P0-001", "VIEW-P0-002", "VIEW-P0-003", "VIEW-P0-004", "VIEW-P0-005", "VIEW-P0-006", "VIEW-P0-007", "VIEW-P0-008", "VIEW-P0-010", "VIEW-P0-011", "VIEW-P0-020", "VIEW-P0-021", "VIEW-P0-022", "VIEW-P0-023", "VIEW-P0-024"
  )
  "phase20_07_approved_change_card_trigger_p0.sql" = @(
    "TRG-P0-001", "TRG-P0-002", "TRG-P0-003", "TRG-P0-004", "TRG-P0-005", "TRG-P0-006", "TRG-P0-007", "TRG-P0-008", "TRG-P0-009"
  )
  "phase20_99_result_summary.sql" = @(
    "SUMMARY-001", "SUMMARY-002", "SUMMARY-003", "SUMMARY-004", "SUMMARY-005", "SUMMARY-006", "SUMMARY-007", "SUMMARY-008", "SUMMARY-009", "SUMMARY-009A", "SUMMARY-009B", "SUMMARY-010", "SUMMARY-011", "SUMMARY-012", "SUMMARY-013", "SUMMARY-014", "SUMMARY-015", "SUMMARY-016", "SUMMARY-017", "SUMMARY-020", "SUMMARY-030", "SUMMARY-031", "SUMMARY-032", "SUMMARY-033", "SUMMARY-034"
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
    '^Native stderr handling\s*:',
    '^BuildMap Phase 20',
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
  $Matches = [regex]::Matches($Trimmed, '\b(?<id>(?:PRE|SEED|PRJ|RNAI|CC|FB|VIEW|TRG|SUMMARY)(?:-[A-Z0-9_]+)+)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
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
  $ScenarioPattern = '(?:PRE|SEED|PRJ|RNAI|CC|FB|VIEW|TRG|SUMMARY)(?:-[A-Z0-9_]+)+'

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
$ExpectedScriptDir = Join-Path $Root "scripts/manual-local-rls"
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

$LogDir = Join-Path $Root "docs/p0-rls-local-test-pack/logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "phase20-p0-rls-$Timestamp.log"

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
  "phase20_00_preflight.sql",
  "phase20_01_seed_p0_fixture.sql",
  "phase20_02_project_access_p0.sql",
  "phase20_03_rough_note_ai_draft_p0.sql",
  "phase20_04_change_card_public_boundary_p0.sql",
  "phase20_05_feedback_author_spoofing_p0.sql",
  "phase20_06_public_safe_view_p0.sql",
  "phase20_07_approved_change_card_trigger_p0.sql",
  "phase20_99_result_summary.sql"
)

"BuildMap Phase 20 P0 RLS local run" | Tee-Object -FilePath $LogFile
"Timestamp: $Timestamp" | Tee-Object -FilePath $LogFile -Append
"Container: $ContainerName" | Tee-Object -FilePath $LogFile -Append
"Remote commands used: none" | Tee-Object -FilePath $LogFile -Append
"Native stderr handling: psql exit code and SQL signals are evaluated separately from NOTICE/WARNING stderr" | Tee-Object -FilePath $LogFile -Append
"Patch level: Phase23.6 parse gate + deterministic signal parser correction" | Tee-Object -FilePath $LogFile -Append
"Signal parser: result-position exact token parsing plus expected scenario coverage; descriptive text is not rescanned" | Tee-Object -FilePath $LogFile -Append
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
    "SCENARIO_COVERAGE_FAIL", "ERROR"
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
    if ($File -eq "phase20_01_seed_p0_fixture.sql") {
      Write-Host "SEED_FAIL at $File. Stop and share the redacted log. This is not yet a P0 RLS behavior result." -ForegroundColor Red
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
elseif ($FailDetected -or $UnexpectedDenyDetected -or $PolicyFailDetected -or $TriggerFailDetected -or $ScriptErrorDetected -or $ScenarioCoverageFailDetected -or $UncaughtErrorDetected) {
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
  Write-Host "Phase 20 P0 local run found P0 security blocker signals. Share the redacted log." -ForegroundColor Red
  exit 2
}
if ($FailDetected -or $UnexpectedDenyDetected -or $PolicyFailDetected -or $TriggerFailDetected -or $ScriptErrorDetected -or $ScenarioCoverageFailDetected) {
  Write-Host "Phase 20 P0 local run found test/policy/integrity/script/coverage failure signals. Share the redacted log." -ForegroundColor Yellow
  exit 3
}
if ($GrantFailDetected) {
  Write-Host "Phase 20 P0 local run found GRANT_FAIL. Share the redacted log for minimal grant/access-boundary review." -ForegroundColor Yellow
  exit 4
}
if ($ViewAccessErrorDetected -or $AccessPathMismatchDetected -or $ViewOptionMismatchDetected -or $ViewExecutionModelMismatchDetected) {
  Write-Host "Phase 20 P0 local run found view/access execution-boundary signals. Share the redacted log before adding any source-table grants." -ForegroundColor Yellow
  exit 5
}
if ($SeedFailDetected -or $AuthContextFailDetected) {
  Write-Host "Phase 20 P0 local run found seed/actor prerequisite failure signals. Share the redacted log." -ForegroundColor Yellow
  exit 6
}
if ($NeedsReviewDetected) {
  Write-Host "Phase 20 P0 local run found NEEDS_REVIEW signals. Share the redacted log." -ForegroundColor Yellow
  exit 7
}
if ($EnvErrorDetected) {
  Write-Host "Phase 20 P0 local run found ENV_ERROR signals. Share the redacted log." -ForegroundColor Yellow
  exit 8
}
if ($UncaughtErrorDetected) {
  Write-Host "Phase 20 P0 local run found uncaught ERROR signals. Share the redacted log." -ForegroundColor Yellow
  exit 3
}
if ($OverallResult -ne "PASS") {
  Write-Host "Phase 20 P0 local run needs review. Share the redacted log." -ForegroundColor Yellow
  exit 3
}

Write-Host "Phase 20 P0 local run completed. OverallResult: PASS" -ForegroundColor Cyan
Write-Host "Review FileResult / MissingScenarioIds / ParsedSignals lines for exact scenario signal coverage." -ForegroundColor Cyan
Write-Host "Log file: $LogFile" -ForegroundColor Cyan
exit 0
