<# Phase31 repository-only gate. No network or database command is executed. #>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
. (Join-Path $ScriptDirectory 'phase31-common.ps1')
$ManifestPath = Join-Path $ScriptDirectory 'phase31_controlled_staging_migration_manifest.json'
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$Findings = [System.Collections.Generic.List[object]]::new()

function Add-GateFinding([string] $Severity, [string] $Code, [string] $Message, [string] $Path = '') {
  Add-Phase31Finding -Findings $Findings -Severity $Severity -Code $Code -Message $Message -Path $Path
}

if (
  [string]$Manifest.schemaVersion -ne '1.0' -or
  [string]$Manifest.phase -ne 'Phase31' -or
  [string]$Manifest.executionEngine -ne 'SUPABASE_CLI_DB_PUSH_V1' -or
  [string]$Manifest.targetEnvironment -ne 'staging' -or
  [int]$Manifest.expectedMigrationCount -ne 11
) {
  Add-GateFinding ERROR 'MIG31-MANIFEST-CONTRACT' 'Phase31 manifest identity is invalid.' $ManifestPath
}

foreach ($Field in @(
  'productionDeploymentAllowed','automaticExecutionAllowed','automaticRollbackAllowed',
  'migrationHistoryRepairAllowed','remoteResetAllowed','seedDeploymentAllowed',
  'roleDeploymentAllowed','dbUrlArgumentAllowed'
)) {
  if ([bool]$Manifest.$Field) {
    Add-GateFinding BLOCKER 'MIG31-MANIFEST-CAPABILITY' "$Field must remain false." $ManifestPath
  }
}

if ([string]$Manifest.phase30PromotionHead -ne '884c13ccafcc29f452976de7033fae6e3f5fe06e') {
  Add-GateFinding BLOCKER 'MIG31-PHASE30-HEAD' 'Phase30 promotion head changed.' $ManifestPath
}
if ([string]$Manifest.phase30_5ImplementationHead -ne 'eb40bea433a3e3f51c13520879e797728dc7bc05') {
  Add-GateFinding BLOCKER 'MIG31-PHASE305-HEAD' 'Phase30.5 implementation head changed.' $ManifestPath
}
if ([string]$Manifest.phase30_5MergeCommit -ne 'ed2be349de1d9114d321fc2a66b97fbd5740bcc1') {
  Add-GateFinding BLOCKER 'MIG31-PHASE305-MERGE' 'Phase30.5 merge commit changed.' $ManifestPath
}

$Git = Get-Command git -ErrorAction SilentlyContinue
if ($null -eq $Git) {
  Add-GateFinding ERROR 'MIG31-GIT' 'git is required.' $Root
}
else {
  $Branch = [string](@(& $Git.Source -C $Root branch --show-current 2>$null))[0]
  if ($Branch -ne [string]$Manifest.requiredBranch) {
    Add-GateFinding BLOCKER 'MIG31-BRANCH' "Expected $($Manifest.requiredBranch); observed $Branch." $Root
  }
  & $Git.Source -C $Root merge-base --is-ancestor ([string]$Manifest.phase30_5MergeCommit) HEAD 2>$null
  if ($LASTEXITCODE -ne 0) {
    Add-GateFinding BLOCKER 'MIG31-ANCESTRY' 'HEAD is not descended from the Phase30.5 merge commit.' $Root
  }
  $Drift = @(& $Git.Source -C $Root diff --name-only ([string]$Manifest.phase30_5MergeCommit) HEAD -- supabase/migrations_draft supabase/migrations 2>$null)
  if ($LASTEXITCODE -ne 0) {
    Add-GateFinding ERROR 'MIG31-DIFF' 'Unable to inspect migration drift.' $Root
  }
  elseif (@($Drift | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count -gt 0) {
    Add-GateFinding BLOCKER 'MIG31-MIGRATION-DRIFT' 'Migration source or replay mirror changed after Phase30.5.' ($Drift -join ',')
  }
}

$MigrationRows = @($Manifest.migrations | Sort-Object order)
if ($MigrationRows.Count -ne 11) {
  Add-GateFinding ERROR 'MIG31-MIGRATION-COUNT' 'Exactly 11 migrations are required.' $ManifestPath
}
for ($Index = 0; $Index -lt $MigrationRows.Count; $Index++) {
  $Row = $MigrationRows[$Index]
  if ([int]$Row.order -ne $Index -or [string]$Row.version -notmatch '^\d{14}$') {
    Add-GateFinding ERROR 'MIG31-MIGRATION-ORDER' "Invalid migration row at index $Index." $ManifestPath
  }
  foreach ($RelativePath in @([string]$Row.sourcePath,[string]$Row.replayMirrorPath)) {
    if (-not (Test-Phase31SafeRelativePath -Path $RelativePath)) {
      Add-GateFinding ERROR 'MIG31-MIGRATION-PATH' 'Unsafe migration path.' $RelativePath
      continue
    }
    $FullPath = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
      Add-GateFinding ERROR 'MIG31-MIGRATION-MISSING' 'Protected migration is missing.' $RelativePath
    }
    elseif ((Get-Phase31NormalizedSha256 -Path $FullPath) -ne ([string]$Row.sha256).ToLowerInvariant()) {
      Add-GateFinding BLOCKER 'MIG31-MIGRATION-HASH' 'Protected migration hash mismatch.' $RelativePath
    }
  }
}

foreach ($Row in @($Manifest.upstreamProtectedFiles)) {
  $RelativePath = [string]$Row.path
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-GateFinding ERROR 'MIG31-UPSTREAM-MISSING' 'Required upstream oracle is missing.' $RelativePath
  }
  elseif ((Get-Phase31NormalizedSha256 -Path $FullPath) -ne ([string]$Row.sha256).ToLowerInvariant()) {
    Add-GateFinding BLOCKER 'MIG31-UPSTREAM-HASH' 'Required upstream oracle hash mismatch.' $RelativePath
  }
}

$CanonicalProtectedPaths = @(
  'scripts/manual-controlled-staging-migration/phase31-common.ps1',
  'scripts/manual-controlled-staging-migration/phase31-runtime.ps1',
  'scripts/manual-controlled-staging-migration/phase31-evidence.ps1',
  'scripts/manual-controlled-staging-migration/run-phase31-static-gate.ps1',
  'scripts/manual-controlled-staging-migration/run-phase31-controlled-staging-migration-local.ps1',
  'scripts/manual-controlled-staging-migration/README.md',
  'docs/migration-promotion-readiness/phase30-5-user-local-attestation.md',
  'docs/migration-promotion-readiness/phase31-design-review.md',
  'docs/migration-promotion-readiness/phase31-implementation-review.md',
  'docs/migration-promotion-readiness/phase31-static-validation.md',
  'docs/handoff/CURRENT-HANDOFF.md'
)
$ProtectedRows = @($Manifest.protectedFiles)
$ActualProtectedPaths = @($ProtectedRows | ForEach-Object { [string]$_.path } | Sort-Object -Unique)
$ExpectedProtectedPaths = @($CanonicalProtectedPaths | Sort-Object -Unique)
if (
  [int]$Manifest.expectedProtectedFileCount -ne $CanonicalProtectedPaths.Count -or
  $ProtectedRows.Count -ne $CanonicalProtectedPaths.Count -or
  @(Compare-Object $ExpectedProtectedPaths $ActualProtectedPaths).Count -gt 0
) {
  Add-GateFinding ERROR 'MIG31-PROTECTED-INVENTORY' 'Protected file inventory mismatch.' $ManifestPath
}

foreach ($Row in $ProtectedRows) {
  $RelativePath = [string]$Row.path
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-GateFinding ERROR 'MIG31-PROTECTED-MISSING' 'Protected file is missing.' $RelativePath
    continue
  }
  if ((Get-Phase31NormalizedSha256 -Path $FullPath) -ne ([string]$Row.sha256).ToLowerInvariant()) {
    Add-GateFinding BLOCKER 'MIG31-PROTECTED-HASH' 'Protected file hash mismatch.' $RelativePath
  }
  if ([System.IO.Path]::GetExtension($RelativePath) -ieq '.ps1') {
    Test-Phase31PowerShellParse -Path $FullPath -Findings $Findings
  }
}

$RunnerPath = Join-Path $Root 'scripts/manual-controlled-staging-migration/run-phase31-controlled-staging-migration-local.ps1'
if (Test-Path -LiteralPath $RunnerPath -PathType Leaf) {
  $RunnerText = Get-Phase31StrictUtf8Text -Path $RunnerPath
  $CommandSurface = [regex]::Matches(
    $RunnerText,
    '(?im)^\s*[^#\r\n]*&\s*\$Supabase\.Source\b[^\r\n]*$'
  ) | ForEach-Object { $_.Value.Trim() }

  $Push = @($CommandSurface | Where-Object { $_ -match '(?i)\bdb\s+push\b' })
  $Dry = @($Push | Where-Object { $_ -match '(?i)--dry-run\b' })
  $Apply = @($Push | Where-Object { $_ -notmatch '(?i)--dry-run\b' })
  if ($Push.Count -ne 2 -or $Dry.Count -ne 1 -or $Apply.Count -ne 1) {
    Add-GateFinding BLOCKER 'MIG31-PUSH-SURFACE' 'Exactly one dry-run and one actual db push are required.' $RunnerPath
  }
  if (@($CommandSurface | Where-Object { $_ -match '(?i)\bmigration\s+list\b' }).Count -ne 2) {
    Add-GateFinding ERROR 'MIG31-LIST-SURFACE' 'Migration list must run before and after execution.' $RunnerPath
  }
  if (@($CommandSurface | Where-Object { $_ -match '(?i)\blink\b' }).Count -ne 1) {
    Add-GateFinding ERROR 'MIG31-LINK-SURFACE' 'Exactly one isolated link command is required.' $RunnerPath
  }
  foreach ($Command in $CommandSurface) {
    foreach ($Pattern in @(
      '(?i)\bmigration\s+repair\b','(?i)\bdb\s+reset\b','(?i)\bdb\s+pull\b',
      '(?i)--db-url\b','(?i)--password\b','(?i)(?:^|\s)-p(?:\s|$)',
      '(?i)--include-seed\b','(?i)--include-roles\b'
    )) {
      if ($Command -match $Pattern) {
        Add-GateFinding BLOCKER 'MIG31-FORBIDDEN-COMMAND' "Forbidden command capability: $Command" $RunnerPath
      }
    }
  }
  foreach ($Marker in @('APPLY 11 MIGRATIONS TO STAGING','ProductionDeploymentDecision: OUT_OF_SCOPE','AutomaticRollback: disabled')) {
    if ($RunnerText.IndexOf($Marker,[System.StringComparison]::Ordinal) -lt 0) {
      Add-GateFinding ERROR 'MIG31-RUNNER-MARKER' "Missing runner marker: $Marker" $RunnerPath
    }
  }
}

$Errors = @($Findings | Where-Object { $_.Severity -eq 'ERROR' }).Count
$Blockers = @($Findings | Where-Object { $_.Severity -eq 'BLOCKER' }).Count
foreach ($Finding in $Findings) {
  Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Message)$(if ($Finding.Path) { " | $($Finding.Path)" } else { '' })"
}
Write-Host "MigrationCount: $($MigrationRows.Count)"
Write-Host "ProtectedFileCount: $($ProtectedRows.Count)"
Write-Host "StaticErrorCount: $Errors"
Write-Host "StaticBlockerCount: $Blockers"
Write-Host 'TargetEnvironment: staging'
Write-Host 'ProductionDeploymentDecision: OUT_OF_SCOPE'
if ($Errors -gt 0 -or $Blockers -gt 0) {
  Write-Host 'Phase31StaticGateResult: FAIL'
  exit 1
}
Write-Host 'Phase31StaticGateResult: PASS'
exit 0
