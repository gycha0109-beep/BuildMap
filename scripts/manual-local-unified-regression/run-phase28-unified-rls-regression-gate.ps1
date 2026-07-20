<#
LOCAL-ONLY STATIC UNIFIED RLS REGRESSION GATE
Does not run Docker, Supabase CLI, psql, SQL, or any remote command.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)][string] $Phase20PassLogPath,
  [Parameter(Mandatory = $false)][string] $Phase25PassLogPath,
  [Parameter(Mandatory = $false)][string] $Phase27PassLogPath,
  [Parameter(Mandatory = $false)][switch] $RequireAllPassLogs
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDirectory 'phase28-common.ps1')
. (Join-Path $ScriptDirectory 'phase28-contract.ps1')
. (Join-Path $ScriptDirectory 'phase28-log-validation.ps1')

$ExpectedBaselineId = 'buildmap-unified-rls-phase28-20260720'
$ExpectedSourceRepository = 'gycha0109-beep/BuildMap'
$ExpectedSourceCommit = 'f98d94d361e26af9957dea0b988e1a1559cf13e8'
$ExpectedProtectedFileCount = 46
$ExpectedPackCount = 3
$ExpectedScenarioFileCount = 26
$ExpectedScenarioCount = 435
$PositiveFlags = @('ExpectedDenyDetected', 'PassDetected')
$CommonFailureFlags = @(
  'UnexpectedAllowDetected', 'UnexpectedDenyDetected', 'SeedFailDetected', 'AuthContextFailDetected',
  'PolicyFailDetected', 'TriggerFailDetected', 'ViewExposureFailDetected', 'ViewBoundaryFailDetected',
  'ViewAccessErrorDetected', 'ViewOptionMismatchDetected', 'ViewExecutionModelMismatchDetected',
  'GrantFailDetected', 'AccessPathMismatchDetected', 'ScriptErrorDetected', 'EnvErrorDetected',
  'NeedsReviewDetected', 'ScenarioCoverageFailDetected', 'FailDetected', 'UncaughtErrorDetected'
)
$LinkFailureFlags = @(
  'UnexpectedAllowDetected', 'UnexpectedDenyDetected', 'SeedFailDetected', 'AuthContextFailDetected',
  'PolicyFailDetected', 'TriggerFailDetected', 'ViewExposureFailDetected', 'ViewBoundaryFailDetected',
  'ViewAccessErrorDetected', 'ViewOptionMismatchDetected', 'ViewExecutionModelMismatchDetected',
  'GrantFailDetected', 'AccessPathMismatchDetected', 'RpcBoundaryFailDetected', 'TokenLifecycleFailDetected',
  'ResponseExposureFailDetected', 'ScriptErrorDetected', 'EnvErrorDetected', 'NeedsReviewDetected',
  'ScenarioCoverageFailDetected', 'FailDetected', 'UncaughtErrorDetected'
)
$ExpectedPackContracts = [ordered]@{
  'phase20-p0-rls' = @{
    Files = 9; Scenarios = 147
    Runner = 'scripts/manual-local-rls/run-phase20-p0-local.ps1'
    Source = 'scripts/manual-local-rls/run-phase20-p0-local.ps1'
    Pattern = '\b(?:PRE|SEED|PRJ|RNAI|CC|FB|VIEW|TRG|SUMMARY)(?:-[A-Z0-9_]+)+\b'
    ContractOnly = @('scripts/manual-local-rls/phase20_00_preflight.sql','scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql')
    FailureFlags = $CommonFailureFlags; PositiveFlags = $PositiveFlags
  }
  'phase25-link-sharing' = @{
    Files = 8; Scenarios = 107
    Runner = 'scripts/manual-local-link-sharing/run-phase25-link-sharing-local.ps1'
    Source = 'scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json'
    Pattern = '\bLINK-[A-Z]+-\d{3}\b'
    ContractOnly = @()
    FailureFlags = $LinkFailureFlags; PositiveFlags = $PositiveFlags
  }
  'phase27-p1-rls' = @{
    Files = 9; Scenarios = 181
    Runner = 'scripts/manual-local-rls-p1/run-phase27-p1-local.ps1'
    Source = 'scripts/manual-local-rls-p1/phase27_p1_scenario_manifest.json'
    Pattern = '\bP1-[A-Z]+-\d{3}\b'
    ContractOnly = @()
    FailureFlags = $CommonFailureFlags; PositiveFlags = $PositiveFlags
  }
}
$ExpectedMigrationPaths = @(
  'supabase/migrations_draft/20260708000000_buildmap_00_extensions_and_primitives_draft.sql',
  'supabase/migrations_draft/20260708001000_buildmap_01_core_schema_draft.sql',
  'supabase/migrations_draft/20260708002000_buildmap_02_decision_records_schema_draft.sql',
  'supabase/migrations_draft/20260708003000_buildmap_03_feedback_and_links_schema_draft.sql',
  'supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql',
  'supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql',
  'supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql',
  'supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql',
  'supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql',
  'supabase/migrations_draft/20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql'
)
$LegacyGatePaths = @(
  'scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json',
  'scripts/manual-local-link-sharing/run-phase26-link-sharing-regression-gate.ps1'
)
$Phase28PowerShellPaths = @(
  'scripts/manual-local-unified-regression/phase28-common.ps1',
  'scripts/manual-local-unified-regression/phase28-contract.ps1',
  'scripts/manual-local-unified-regression/phase28-log-validation.ps1',
  'scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1'
)

$Failures = New-Object System.Collections.Generic.List[string]
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
$ManifestPath = Join-Path $ScriptDirectory 'phase28_unified_rls_regression_baseline.json'
if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  Write-Error "Missing Phase28 manifest: $ManifestPath"
  exit 1
}
try { $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json }
catch {
  Write-Error "Cannot parse Phase28 manifest: $($_.Exception.Message)"
  exit 1
}

if ([string]$Manifest.schemaVersion -ne '1.0') { Add-GateFailure $Failures "Unsupported schemaVersion: $($Manifest.schemaVersion)" }
if ([string]$Manifest.baselineId -ne $ExpectedBaselineId) { Add-GateFailure $Failures "Unexpected baselineId: $($Manifest.baselineId)" }
if ([string]$Manifest.sourceRepository -ne $ExpectedSourceRepository) { Add-GateFailure $Failures "Unexpected sourceRepository: $($Manifest.sourceRepository)" }
if ([string]$Manifest.sourceCommit -ne $ExpectedSourceCommit) { Add-GateFailure $Failures "Unexpected sourceCommit: $($Manifest.sourceCommit)" }
if ([string]$Manifest.baselineStatus -ne 'USER_LOCAL_PASS') { Add-GateFailure $Failures "Baseline status is not USER_LOCAL_PASS: $($Manifest.baselineStatus)" }
if ([bool]$Manifest.automaticRefreshAllowed) { Add-GateFailure $Failures 'Automatic baseline refresh must remain disabled.' }
if ([string]$Manifest.hashContract.mode -ne 'normalized_utf8_lf') { Add-GateFailure $Failures "Unsupported hash mode: $($Manifest.hashContract.mode)" }
if ([int]$Manifest.expectedProtectedFileCount -ne $ExpectedProtectedFileCount) { Add-GateFailure $Failures 'Manifest protected-file count drift.' }
if ([int]$Manifest.expectedPackCount -ne $ExpectedPackCount) { Add-GateFailure $Failures 'Manifest pack count drift.' }
if ([int]$Manifest.expectedScenarioFileCount -ne $ExpectedScenarioFileCount) { Add-GateFailure $Failures 'Manifest scenario-file count drift.' }
if ([int]$Manifest.expectedScenarioCount -ne $ExpectedScenarioCount) { Add-GateFailure $Failures 'Manifest scenario count drift.' }

$ContractsByPack = @{}
$PackById = @{}
$ExpectedScenarioPaths = New-Object System.Collections.Generic.List[string]
$GlobalScenarioOwner = @{}
$ScenarioFileCount = 0
$ScenarioTotal = 0
foreach ($PackId in $ExpectedPackContracts.Keys) {
  $Expected = $ExpectedPackContracts[$PackId]
  $ScenarioContract = @(Get-PackScenarioContract -PackId $PackId -Root $Root -Failures $Failures)
  $ContractsByPack[$PackId] = $ScenarioContract
  $PackById[$PackId] = [pscustomobject]@{
    packId = $PackId
    expectedFileCount = [int]$Expected.Files
    expectedScenarioCount = [int]$Expected.Scenarios
    failureFlags = @($Expected.FailureFlags)
    requiredPositiveFlags = @($Expected.PositiveFlags)
  }
  if ($ScenarioContract.Count -ne [int]$Expected.Files) {
    Add-GateFailure $Failures "${PackId} derived scenario-file count mismatch: $($ScenarioContract.Count)"
  }
  $PackTotal = 0
  foreach ($ScenarioFile in $ScenarioContract) {
    $ScenarioFileCount += 1
    $RelativePath = Get-NormalizedRelativePath ([string]$ScenarioFile.Path)
    $ExpectedScenarioPaths.Add($RelativePath)
    if (-not (Test-SafeRelativePath $RelativePath)) { Add-GateFailure $Failures "${PackId} unsafe scenario path: $RelativePath"; continue }
    $IdsRaw = @($ScenarioFile.ExpectedIds | ForEach-Object { ([string]$_).ToUpperInvariant() })
    $Ids = @($IdsRaw | Sort-Object -Unique)
    if ($IdsRaw.Count -ne $Ids.Count -or $Ids.Count -ne [int]$ScenarioFile.ExpectedCount) {
      Add-GateFailure $Failures "${PackId} duplicate/count mismatch: $RelativePath"
    }
    foreach ($Id in $Ids) {
      if ($GlobalScenarioOwner.ContainsKey($Id)) { Add-GateFailure $Failures "Duplicate scenario ID: $Id" }
      else { $GlobalScenarioOwner[$Id] = $RelativePath }
    }
    $FullPath = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) { Add-GateFailure $Failures "Scenario file missing: $RelativePath"; continue }
    if ([string]$ScenarioFile.SourceValidationMode -eq 'exact_source') {
      $ActualIds = @(Get-UniqueScenarioIds (Get-Content -Raw -LiteralPath $FullPath) ([string]$Expected.Pattern))
      $IdDiff = Compare-StringSet $Ids $ActualIds
      if ($ActualIds.Count -ne $Ids.Count -or $IdDiff.Missing.Count -gt 0 -or $IdDiff.Extra.Count -gt 0) {
        Add-GateFailure $Failures "${PackId} source scenario drift: $RelativePath"
      }
    }
    elseif ([string]$ScenarioFile.SourceValidationMode -ne 'contract_only') {
      Add-GateFailure $Failures "${PackId} unsupported source-validation mode: $RelativePath"
    }
    $PackTotal += [int]$ScenarioFile.ExpectedCount
    $ScenarioTotal += [int]$ScenarioFile.ExpectedCount
  }
  if ($PackTotal -ne [int]$Expected.Scenarios) { Add-GateFailure $Failures "${PackId} derived scenario total mismatch: $PackTotal" }
}
if ($ExpectedPackContracts.Count -ne $ExpectedPackCount) { Add-GateFailure $Failures "Pack count mismatch: $($ExpectedPackContracts.Count)" }
if ($ScenarioFileCount -ne $ExpectedScenarioFileCount) { Add-GateFailure $Failures "Scenario-file total mismatch: $ScenarioFileCount" }
if ($ScenarioTotal -ne $ExpectedScenarioCount) { Add-GateFailure $Failures "Scenario total mismatch: $ScenarioTotal" }

$ExpectedProtectedPaths = New-Object System.Collections.Generic.List[string]
foreach ($PathValue in $ExpectedMigrationPaths) { $ExpectedProtectedPaths.Add($PathValue) }
foreach ($PackId in $ExpectedPackContracts.Keys) {
  $Expected = $ExpectedPackContracts[$PackId]
  $ExpectedProtectedPaths.Add([string]$Expected.Runner)
  $ExpectedProtectedPaths.Add([string]$Expected.Source)
}
foreach ($PathValue in $ExpectedScenarioPaths) { $ExpectedProtectedPaths.Add($PathValue) }
foreach ($PathValue in $LegacyGatePaths) { $ExpectedProtectedPaths.Add($PathValue) }
foreach ($PathValue in $Phase28PowerShellPaths) { $ExpectedProtectedPaths.Add($PathValue) }
$ExpectedProtectedUnique = @($ExpectedProtectedPaths | Sort-Object -Unique)
if ($ExpectedProtectedUnique.Count -ne $ExpectedProtectedFileCount) {
  Add-GateFailure $Failures "Internal protected-path contract count mismatch: $($ExpectedProtectedUnique.Count)"
}

$ManifestProtectedRaw = @($Manifest.protectedFiles | ForEach-Object { Get-NormalizedRelativePath ([string]$_.path) })
$ManifestProtectedUnique = @($ManifestProtectedRaw | Sort-Object -Unique)
if ($ManifestProtectedRaw.Count -ne $ManifestProtectedUnique.Count) { Add-GateFailure $Failures 'Manifest contains duplicate protected paths.' }
$ProtectedDiff = Compare-StringSet $ExpectedProtectedUnique $ManifestProtectedUnique
if ($ProtectedDiff.Missing.Count -gt 0) { Add-GateFailure $Failures "Manifest protected paths missing: $($ProtectedDiff.Missing -join ',')" }
if ($ProtectedDiff.Extra.Count -gt 0) { Add-GateFailure $Failures "Manifest protected paths extra: $($ProtectedDiff.Extra -join ',')" }

$ProtectedCount = 0
foreach ($Item in @($Manifest.protectedFiles)) {
  $RelativePath = Get-NormalizedRelativePath ([string]$Item.path)
  $ProtectedCount += 1
  if (-not (Test-SafeRelativePath $RelativePath)) { Add-GateFailure $Failures "Unsafe protected path: $RelativePath"; continue }
  $ExpectedHash = ([string]$Item.sha256).ToLowerInvariant()
  if ($ExpectedHash -notmatch '^[0-9a-f]{64}$') { Add-GateFailure $Failures "Invalid SHA-256: $RelativePath"; continue }
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) { Add-GateFailure $Failures "Protected file missing: $RelativePath"; continue }
  try { $ActualHash = Get-NormalizedTextSha256 $FullPath }
  catch { Add-GateFailure $Failures "Invalid UTF-8 protected file in ${RelativePath}: $($_.Exception.Message)"; continue }
  if ($ActualHash -ne $ExpectedHash) { Add-GateFailure $Failures "Protected hash mismatch: $RelativePath" }
}
if ($ProtectedCount -ne $ExpectedProtectedFileCount) { Add-GateFailure $Failures "Protected count mismatch: $ProtectedCount" }

$InventoryRules = @(
  [pscustomobject]@{ Directory='supabase/migrations_draft'; Pattern='*.sql'; Expected=@($ExpectedMigrationPaths) },
  [pscustomobject]@{ Directory='scripts/manual-local-rls'; Pattern='phase20_*.sql'; Expected=@($ContractsByPack['phase20-p0-rls'] | ForEach-Object { [string]$_.Path }) },
  [pscustomobject]@{ Directory='scripts/manual-local-link-sharing'; Pattern='phase25_*.sql'; Expected=@($ContractsByPack['phase25-link-sharing'] | ForEach-Object { [string]$_.Path }) },
  [pscustomobject]@{ Directory='scripts/manual-local-rls-p1'; Pattern='phase27_*.sql'; Expected=@($ContractsByPack['phase27-p1-rls'] | ForEach-Object { [string]$_.Path }) }
)
foreach ($Rule in $InventoryRules) {
  $DirectoryPath = Join-Path $Root ([string]$Rule.Directory)
  if (-not (Test-Path -LiteralPath $DirectoryPath -PathType Container)) { Add-GateFailure $Failures "Inventory directory missing: $($Rule.Directory)"; continue }
  $ExpectedInventory = @($Rule.Expected | ForEach-Object { Get-NormalizedRelativePath ([string]$_) } | Sort-Object -Unique)
  $ActualInventory = @(Get-ChildItem -LiteralPath $DirectoryPath -Filter ([string]$Rule.Pattern) -File |
    ForEach-Object { Get-NormalizedRelativePath (Join-Path ([string]$Rule.Directory) $_.Name) } | Sort-Object -Unique)
  $InventoryDiff = Compare-StringSet $ExpectedInventory $ActualInventory
  if ($InventoryDiff.Missing.Count -gt 0) { Add-GateFailure $Failures "Inventory missing from $($Rule.Directory): $($InventoryDiff.Missing -join ',')" }
  if ($InventoryDiff.Extra.Count -gt 0) { Add-GateFailure $Failures "Inventory extra in $($Rule.Directory): $($InventoryDiff.Extra -join ',')" }
}

$PowerShellPaths = @(
  $ExpectedPackContracts['phase20-p0-rls'].Runner,
  $ExpectedPackContracts['phase25-link-sharing'].Runner,
  'scripts/manual-local-link-sharing/run-phase26-link-sharing-regression-gate.ps1',
  $ExpectedPackContracts['phase27-p1-rls'].Runner
) + $Phase28PowerShellPaths
foreach ($PathValue in $PowerShellPaths) {
  $RelativePath = Get-NormalizedRelativePath ([string]$PathValue)
  Test-PowerShellParse (Join-Path $Root $RelativePath) $Failures
}
$ForbiddenPatterns = @(
  '(?im)^\s*(?:&\s*)?supabase\s+link\b','(?im)^\s*(?:&\s*)?supabase\s+db\s+(?:push|pull)\b',
  '(?im)^\s*(?:&\s*)?supabase\s+(?:functions\s+deploy|migration\s+up|secrets?\b|projects?\b)',
  '(?im)^\s*(?:&\s*)?psql\b.*(?:postgres|postgresql)://','(?im)^\s*(?:&\s*)?docker\s+.*(?:postgres|postgresql)://',
  '(?im)^\s*(?:&\s*)?(?:curl|wget)\b','(?im)^\s*Invoke-(?:WebRequest|RestMethod)\b'
)
foreach ($PathValue in $PowerShellPaths) {
  $RelativePath = Get-NormalizedRelativePath ([string]$PathValue)
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) { Add-GateFailure $Failures "Scan target missing: $RelativePath"; continue }
  $Text = Get-Content -Raw -LiteralPath $FullPath
  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -match $Pattern) { Add-GateFailure $Failures "Forbidden remote-capable command in: $RelativePath" }
  }
}

$LogInputs = @(
  [pscustomobject]@{ PackId='phase20-p0-rls'; Candidate=$Phase20PassLogPath; Label='Phase20PassLogValidation' },
  [pscustomobject]@{ PackId='phase25-link-sharing'; Candidate=$Phase25PassLogPath; Label='Phase25PassLogValidation' },
  [pscustomobject]@{ PackId='phase27-p1-rls'; Candidate=$Phase27PassLogPath; Label='Phase27PassLogValidation' }
)
$LogStatuses = @{}
$ResolvedLogOwner = @{}
foreach ($Input in $LogInputs) {
  $PackId = [string]$Input.PackId
  $Label = [string]$Input.Label
  $Candidate = [string]$Input.Candidate
  $LogStatuses[$Label] = 'SKIPPED'
  if ([string]::IsNullOrWhiteSpace($Candidate)) {
    if ($RequireAllPassLogs) { Add-GateFailure $Failures "RequireAllPassLogs is set but ${PackId} path is missing."; $LogStatuses[$Label] = 'FAIL' }
    continue
  }
  try { $ResolvedPath = Resolve-LogPath $Candidate $Root }
  catch { Add-GateFailure $Failures "Cannot resolve ${PackId} log path: $($_.Exception.Message)"; $LogStatuses[$Label] = 'FAIL'; continue }
  $Key = $ResolvedPath.ToLowerInvariant()
  if ($ResolvedLogOwner.ContainsKey($Key)) { Add-GateFailure $Failures "Duplicate pass-log path: $ResolvedPath"; $LogStatuses[$Label] = 'FAIL'; continue }
  $ResolvedLogOwner[$Key] = $PackId
  $Before = $Failures.Count
  Test-PackPassLog -Path $ResolvedPath -Pack $PackById[$PackId] -ScenarioContract @($ContractsByPack[$PackId]) -Failures $Failures
  if ($Failures.Count -eq $Before) { $LogStatuses[$Label] = 'PASS' } else { $LogStatuses[$Label] = 'FAIL' }
}

Write-Host "BaselineId: $($Manifest.baselineId)"
Write-Host "SourceRepository: $($Manifest.sourceRepository)"
Write-Host "SourceCommit: $($Manifest.sourceCommit)"
Write-Host "HashMode: $($Manifest.hashContract.mode)"
Write-Host "ProtectedFileCount: $ProtectedCount"
Write-Host "PackCount: $($ExpectedPackContracts.Count)"
Write-Host "ScenarioFileCount: $ScenarioFileCount"
Write-Host "ExpectedScenarioCount: $ScenarioTotal"
Write-Host "Phase20PassLogValidation: $($LogStatuses['Phase20PassLogValidation'])"
Write-Host "Phase25PassLogValidation: $($LogStatuses['Phase25PassLogValidation'])"
Write-Host "Phase27PassLogValidation: $($LogStatuses['Phase27PassLogValidation'])"
Write-Host "RequireAllPassLogs: $([bool]$RequireAllPassLogs)"
if ($Failures.Count -gt 0) {
  foreach ($Failure in $Failures) { Write-Host "GATE_FAIL: $Failure" -ForegroundColor Red }
  Write-Host 'Phase28GateResult: FAIL' -ForegroundColor Red
  exit 1
}
Write-Host 'Phase28GateResult: PASS' -ForegroundColor Cyan
exit 0
