<#
LOCAL-ONLY STATIC MIGRATION PROMOTION READINESS GATE.
This script does not run Docker, Supabase CLI, psql, SQL, or any remote command.
A PROMOTION_HOLD decision is a valid completed analysis result.
Use -RequirePromotionReady to return a non-zero exit code while HOLD remains.
#>

[CmdletBinding()]
param(
  [string] $FreshInstallEvidencePath,
  [string] $IncrementalUpgradeEvidencePath,
  [switch] $RequirePromotionReady
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path

. (Join-Path $ScriptDirectory 'phase29-common.ps1')
. (Join-Path $ScriptDirectory 'phase29-sql-analysis.ps1')
. (Join-Path $ScriptDirectory 'phase29-evidence-validation.ps1')

$Findings = [System.Collections.Generic.List[object]]::new()
$ManifestPath = Join-Path $ScriptDirectory 'phase29_migration_promotion_manifest.json'
if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  Write-Error "Missing Phase29 manifest: $ManifestPath"
  exit 1
}
try { $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json }
catch {
  Write-Error "Cannot parse Phase29 manifest: $($_.Exception.Message)"
  exit 1
}

$CanonicalMigrationPaths = @(
  'supabase/migrations_draft/20260708000000_buildmap_00_extensions_and_primitives_draft.sql',
  'supabase/migrations_draft/20260708001000_buildmap_01_core_schema_draft.sql',
  'supabase/migrations_draft/20260708002000_buildmap_02_decision_records_schema_draft.sql',
  'supabase/migrations_draft/20260708003000_buildmap_03_feedback_and_links_schema_draft.sql',
  'supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql',
  'supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql',
  'supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql',
  'supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql',
  'supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql',
  'supabase/migrations_draft/20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql',
  'supabase/migrations_draft/20260721000000_buildmap_10_security_definer_boundary_hardening_draft.sql'
)
$CanonicalReplayMirrorPaths = @(
  $CanonicalMigrationPaths | ForEach-Object {
    $_ -replace '^supabase/migrations_draft/', 'supabase/migrations/'
  }
)
$CanonicalGatePaths = @(
  'scripts/manual-local-migration-readiness/phase29-common.ps1',
  'scripts/manual-local-migration-readiness/phase29-sql-analysis.ps1',
  'scripts/manual-local-migration-readiness/phase29-evidence-validation.ps1',
  'scripts/manual-local-migration-readiness/phase29-evidence-run-common.ps1',
  'scripts/manual-local-migration-readiness/run-phase29-migration-readiness-gate.ps1',
  'scripts/manual-local-migration-readiness/run-phase29-catalog-readiness-local.ps1',
  'scripts/manual-local-migration-readiness/run-phase29-fresh-install-evidence-local.ps1',
  'scripts/manual-local-migration-readiness/run-phase29-incremental-upgrade-evidence-local.ps1',
  'scripts/manual-local-migration-readiness/run-phase29-2-evidence-closure-local.ps1',
  'scripts/manual-local-migration-readiness/phase29_00_final_catalog_readiness.sql',
  'scripts/manual-local-migration-readiness/phase29_01_incremental_upgrade_postcheck.sql',
  'scripts/manual-local-migration-readiness/phase29_02_security_definer_hardening_postcheck.sql',
  'scripts/manual-local-migration-readiness/phase29_03_incremental_pre_upgrade.sql'
)

if ([string]$Manifest.schemaVersion -ne '1.2') {
  Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-MANIFEST-SCHEMA' -Message "Unsupported schemaVersion: $($Manifest.schemaVersion)"
}
if ([int]$Manifest.expectedMigrationCount -ne 11 -or @($Manifest.migrations).Count -ne 11) {
  Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-MANIFEST-COUNT' -Message 'Phase29.2 requires exactly 11 migration drafts.'
}
if ([bool]$Manifest.automaticPromotionAllowed -or [bool]$Manifest.automaticManifestRefreshAllowed) {
  Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-AUTOMATION-PROHIBITED' -Message 'Automatic promotion and automatic manifest refresh must remain disabled.'
}
if ([int]$Manifest.expectedProtectedGateFileCount -ne $CanonicalGatePaths.Count -or @($Manifest.protectedGateFiles).Count -ne $CanonicalGatePaths.Count) {
  Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GATE-PROTECTION-COUNT' -Message "Expected $($CanonicalGatePaths.Count) protected Phase29 gate files."
}

foreach ($GatePath in $CanonicalGatePaths) {
  $Rows = @($Manifest.protectedGateFiles | Where-Object {
    (Get-NormalizedRelativePath -Path ([string]$_.path)) -eq $GatePath
  })
  if ($Rows.Count -ne 1) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GATE-PROTECTION-PATH' -Path $GatePath -Message 'Protected gate file must have exactly one manifest row.'
    continue
  }
  $FullPath = Join-Path $Root $GatePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GATE-FILE-MISSING' -Path $GatePath -Message 'Protected Phase29 gate file is missing.'
    continue
  }
  $ActualHash = Get-NormalizedSha256 -Path $FullPath
  if ($ActualHash -ne ([string]$Rows[0].sha256).ToLowerInvariant()) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GATE-HASH-DRIFT' -Path $GatePath -Message 'Protected Phase29 gate file hash mismatch.'
  }
}

$MigrationRows = @()
for ($Index = 0; $Index -lt $CanonicalMigrationPaths.Count; $Index++) {
  $ExpectedPath = $CanonicalMigrationPaths[$Index]
  $ManifestRows = @($Manifest.migrations | Where-Object { [int]$_.order -eq $Index })
  if ($ManifestRows.Count -ne 1) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-ORDER-CONTRACT' -Message "Migration order $Index must have exactly one manifest row."
    continue
  }
  $RelativePath = Get-NormalizedRelativePath -Path ([string]$ManifestRows[0].path)
  if ($RelativePath -ne $ExpectedPath) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-PATH-CONTRACT' -Message "Migration order $Index path mismatch: $RelativePath"
  }
  if (-not (Test-SafeRelativePath -Path $RelativePath)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-PATH-ESCAPE' -Path $RelativePath -Message 'Unsafe migration path.'
    continue
  }
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-MIGRATION-MISSING' -Path $RelativePath -Message 'Migration draft is missing.'
    continue
  }
  if ((Get-NormalizedSha256 -Path $FullPath) -ne ([string]$ManifestRows[0].sha256).ToLowerInvariant()) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-HASH-DRIFT' -Path $RelativePath -Message 'Normalized migration SHA-256 mismatch.'
  }
  $MigrationRows += [pscustomobject]@{ Order=$Index; Path=$RelativePath; FullPath=$FullPath }
}

$DraftInventory = @(
  Get-ChildItem -LiteralPath (Join-Path $Root 'supabase/migrations_draft') -File -Filter '*.sql' |
    ForEach-Object { Get-CompatibleRelativePath -BasePath $Root -TargetPath $_.FullName } |
    Sort-Object
)
$MissingDrafts = @($CanonicalMigrationPaths | Where-Object { $DraftInventory -notcontains $_ })
$ExtraDrafts = @($DraftInventory | Where-Object { $CanonicalMigrationPaths -notcontains $_ })
if ($MissingDrafts.Count -gt 0 -or $ExtraDrafts.Count -gt 0) {
  Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-INVENTORY-DRIFT' -Message "Migration inventory drift. Missing=$($MissingDrafts -join ','); Extra=$($ExtraDrafts -join ',')"
}

$Phase28BaselinePass = $false
$Phase28GatePath = Join-Path $Root ([string]$Manifest.phase28Baseline.gatePath)
if (-not (Test-Path -LiteralPath $Phase28GatePath -PathType Leaf)) {
  Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-PHASE28-GATE-MISSING' -Message 'Phase28 gate is missing.'
}
else {
  $PowerShellExecutable = (Get-Process -Id $PID).Path
  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }
  try {
    $ErrorActionPreference = 'Continue'
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawPhase28 = @(& $PowerShellExecutable -NoProfile -ExecutionPolicy Bypass -File $Phase28GatePath 2>&1)
    $Phase28Exit = $LASTEXITCODE
  }
  finally {
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $PreviousNativePreference }
    $ErrorActionPreference = $PreviousErrorActionPreference
  }
  $Phase28Lines = @(
    $RawPhase28 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
      }
      else { $_.ToString() }
    }
  )
  $PassRows = @($Phase28Lines | Where-Object { $_ -match '^Phase28GateResult:\s*PASS\s*$' })
  if ($Phase28Exit -ne 0 -or $PassRows.Count -ne 1) {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-PHASE28-BASELINE' -Message 'Phase28 protected baseline gate did not PASS.'
  }
  else { $Phase28BaselinePass = $true }
}

foreach ($PathValue in @($CanonicalGatePaths | Where-Object { $_ -match '\.ps1$' })) {
  Test-PowerShellParse -Path (Join-Path $Root $PathValue) -Findings $Findings
}

Test-ProhibitedSqlPatterns -MigrationRows $MigrationRows -Root $Root -Findings $Findings
$Definitions = Get-FinalFunctionDefinitions -MigrationRows $MigrationRows -Root $Root
Test-FinalSecurityDefinerBoundary -Definitions $Definitions -Findings $Findings
$RiskInventory = Get-RiskInventory -MigrationRows $MigrationRows -Root $Root

$TrackedReplayMirrorResult = 'NONE'
$Git = Get-Command git -ErrorAction SilentlyContinue
$CurrentRepositoryHead = ''
if ($null -eq $Git) {
  Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GIT-INSPECTION' -Message 'git is required for replay-mirror and evidence inspection.'
}
else {
  $HeadRaw = @(& $Git.Source -C $Root rev-parse HEAD 2>$null)
  if ($LASTEXITCODE -ne 0 -or $HeadRaw.Count -ne 1 -or $HeadRaw[0] -notmatch '^[0-9a-fA-F]{40}$') {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GIT-HEAD' -Message 'Unable to resolve current repository HEAD.'
  }
  else { $CurrentRepositoryHead = $HeadRaw[0].ToLowerInvariant() }

  $TrackedMigrationPaths = @(
    & $Git.Source -C $Root ls-files 'supabase/migrations/*.sql' 2>$null |
      ForEach-Object { Get-NormalizedRelativePath -Path $_ } |
      Sort-Object
  )
  if ($LASTEXITCODE -ne 0) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-GIT-INSPECTION' -Message 'git ls-files failed while inspecting tracked migration files.'
  }
  elseif ($TrackedMigrationPaths.Count -eq 0) {
    $TrackedReplayMirrorResult = 'NONE'
  }
  else {
    $UnexpectedTracked = @($TrackedMigrationPaths | Where-Object { $CanonicalReplayMirrorPaths -notcontains $_ })
    $MissingTracked = @($CanonicalReplayMirrorPaths | Where-Object { $TrackedMigrationPaths -notcontains $_ })
    $MirrorDrift = [System.Collections.Generic.List[string]]::new()
    foreach ($DraftPath in $CanonicalMigrationPaths) {
      $MirrorPath = $DraftPath -replace '^supabase/migrations_draft/', 'supabase/migrations/'
      if ($TrackedMigrationPaths -notcontains $MirrorPath) { continue }
      $MirrorFullPath = Join-Path $Root $MirrorPath
      if (-not (Test-Path -LiteralPath $MirrorFullPath -PathType Leaf)) {
        $MirrorDrift.Add("$MirrorPath missing from working tree")
        continue
      }
      $DraftHash = Get-NormalizedSha256 -Path (Join-Path $Root $DraftPath)
      $MirrorHash = Get-NormalizedSha256 -Path $MirrorFullPath
      $MirrorText = Get-StrictUtf8Text -Path $MirrorFullPath
      if ($DraftHash -ne $MirrorHash) { $MirrorDrift.Add("$MirrorPath content differs from canonical draft") }
      elseif ($MirrorPath -notmatch '_draft\.sql$' -or $MirrorText -notmatch 'DRAFT ONLY') {
        $MirrorDrift.Add("$MirrorPath lacks replay-mirror draft markers")
      }
    }
    if ($UnexpectedTracked.Count -gt 0 -or $MissingTracked.Count -gt 0 -or $MirrorDrift.Count -gt 0) {
      Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-PREMATURE-PROMOTION' -Message "Tracked migration directory is not an exact canonical local replay mirror. Missing=$($MissingTracked -join ','); Unexpected=$($UnexpectedTracked -join ','); Drift=$($MirrorDrift -join '; ')"
      $TrackedReplayMirrorResult = 'FAIL'
    }
    else { $TrackedReplayMirrorResult = 'PASS' }
  }
}

$EvidenceContract = Get-Phase29ManifestEvidenceContract -Manifest $Manifest
$EvidenceComplete = $true
$EvidenceRecords = [System.Collections.Generic.List[object]]::new()
$ResolvedEvidencePaths = [System.Collections.Generic.List[string]]::new()
$FreshInstallEvidenceResult = 'MISSING'
$IncrementalEvidenceResult = 'MISSING'

foreach ($Pair in @(
  @{ Path=$FreshInstallEvidencePath; Type='FRESH_INSTALL_00_10'; Label='FreshInstallEvidenceResult' },
  @{ Path=$IncrementalUpgradeEvidencePath; Type='INCREMENTAL_00_09_TO_10'; Label='IncrementalEvidenceResult' }
)) {
  if ([string]::IsNullOrWhiteSpace([string]$Pair.Path)) {
    $EvidenceComplete = $false
    continue
  }
  $Resolved = [string]$Pair.Path
  if (-not [System.IO.Path]::IsPathRooted($Resolved)) { $Resolved = Join-Path $Root $Resolved }
  $Resolved = [System.IO.Path]::GetFullPath($Resolved)
  $ResolvedKey = $Resolved.ToLowerInvariant()
  if ($ResolvedEvidencePaths.Contains($ResolvedKey)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-DUPLICATE-EVIDENCE' -Message 'Fresh and incremental evidence must be different files.'
    $EvidenceComplete = $false
    continue
  }
  $ResolvedEvidencePaths.Add($ResolvedKey)

  $BeforeCount = $Findings.Count
  $Record = Test-Phase29Evidence `
    -Path $Resolved `
    -ExpectedType ([string]$Pair.Type) `
    -ExpectedRepositoryHead $CurrentRepositoryHead `
    -ExpectedBaselineId $EvidenceContract.BaselineId `
    -ExpectedMigrationSetDigest $EvidenceContract.MigrationSetDigest `
    -ExpectedProtectedGateSetDigest $EvidenceContract.ProtectedGateSetDigest `
    -Findings $Findings
  $Result = 'FAIL'
  if ($null -ne $Record -and $Findings.Count -eq $BeforeCount) {
    $Result = 'PASS'
    $EvidenceRecords.Add($Record)
  }
  else { $EvidenceComplete = $false }

  if ([string]$Pair.Label -eq 'FreshInstallEvidenceResult') { $FreshInstallEvidenceResult = $Result }
  else { $IncrementalEvidenceResult = $Result }
}

if ($EvidenceRecords.Count -eq 2) {
  if ($EvidenceRecords[0].RunId -eq $EvidenceRecords[1].RunId) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-RUN-REUSE' -Message 'Fresh and incremental evidence must use different RunId values.'
    $EvidenceComplete = $false
  }
  if ($EvidenceRecords[0].RepositoryHead -ne $EvidenceRecords[1].RepositoryHead) {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-HEAD-MISMATCH' -Message 'Fresh and incremental evidence were generated from different repository HEAD values.'
    $EvidenceComplete = $false
  }
}

$ErrorCount = @($Findings | Where-Object { $_.Severity -eq 'ERROR' }).Count
$BlockerCount = @($Findings | Where-Object { $_.Severity -eq 'BLOCKER' }).Count
$PromotionDecision = 'PROMOTION_READY'
if ($ErrorCount -gt 0 -or $BlockerCount -gt 0 -or -not $EvidenceComplete) {
  $PromotionDecision = 'PROMOTION_HOLD'
}

Write-Host "MigrationCount: $($MigrationRows.Count)"
Write-Host "Phase28BaselineResult: $(if ($Phase28BaselinePass) { 'PASS' } else { 'FAIL' })"
Write-Host "TrackedReplayMirrorResult: $TrackedReplayMirrorResult"
Write-Host "FreshInstallEvidenceResult: $FreshInstallEvidenceResult"
Write-Host "IncrementalEvidenceResult: $IncrementalEvidenceResult"
Write-Host "StaticErrorCount: $ErrorCount"
Write-Host "StaticBlockerCount: $BlockerCount"
Write-Host "RuntimeEvidenceComplete: $EvidenceComplete"
Write-Host "RiskInventory: CreateExtension=$($RiskInventory.CreateExtension), CreateTable=$($RiskInventory.CreateTable), AddForeignKey=$($RiskInventory.AddForeignKey), CreateIndex=$($RiskInventory.CreateIndex), CreateTrigger=$($RiskInventory.CreateTrigger), DropPolicy=$($RiskInventory.DropPolicy), DropTrigger=$($RiskInventory.DropTrigger), Grant=$($RiskInventory.Grant), Revoke=$($RiskInventory.Revoke), SecurityDefiner=$($RiskInventory.SecurityDefiner)"
foreach ($Finding in $Findings) {
  Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Path) | $($Finding.Message)"
}
if (-not $EvidenceComplete) {
  Write-Host 'HOLD_REASON: fresh-install 00-10 and incremental 00-09 to 10 runtime evidence must both validate against the current protected contract.'
}
Write-Host "PromotionDecision: $PromotionDecision"

if ($ErrorCount -gt 0) {
  Write-Host 'Phase29GateResult: FAIL'
  exit 1
}
Write-Host 'Phase29GateResult: PASS'
if ($RequirePromotionReady -and $PromotionDecision -ne 'PROMOTION_READY') { exit 2 }
exit 0
