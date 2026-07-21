<#
Static gate for Phase30.5 target-project attestation.
This script performs no network or database operation.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
. (Join-Path $ScriptDirectory 'phase30-5-common.ps1')

$Findings = [System.Collections.Generic.List[object]]::new()
$ManifestPath = Join-Path $ScriptDirectory 'phase30-5_target_project_attestation_manifest.json'
$ExpectedPhase30PromotionHead = '884c13ccafcc29f452976de7033fae6e3f5fe06e'
$ExpectedPhase30MergeCommit = '320bbd52f7bf18402b1fe10801bc809e173fcf4b'
$CanonicalProtectedPaths = @(
  'scripts/manual-target-project-attestation/phase30-5-common.ps1',
  'scripts/manual-target-project-attestation/phase30_5_00_read_only_target_probe.sql',
  'scripts/manual-target-project-attestation/run-phase30-5-static-gate.ps1',
  'scripts/manual-target-project-attestation/run-phase30-5-target-attestation-local.ps1',
  'scripts/manual-target-project-attestation/README.md',
  'docs/migration-promotion-readiness/phase30-5-design-review.md',
  'docs/migration-promotion-readiness/phase30-5-implementation-review.md',
  'docs/migration-promotion-readiness/phase30-5-static-validation.md'
)

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  Write-Error "Missing Phase30.5 manifest: $ManifestPath"
  exit 1
}
try {
  $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
}
catch {
  Write-Error "Cannot parse Phase30.5 manifest: $($_.Exception.Message)"
  exit 1
}

if ([string]$Manifest.schemaVersion -ne '1.0' -or [string]$Manifest.phase -ne 'Phase30.5') {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-MANIFEST-SCHEMA' -Message 'Unsupported Phase30.5 manifest.'
}
if ([bool]$Manifest.remoteWriteAllowed -or [bool]$Manifest.automaticDeploymentAllowed -or [bool]$Manifest.migrationHistoryRepairAllowed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-WRITE-AUTOMATION' -Message 'Remote writes, automatic deployment, and migration-history repair must remain disabled.'
}
if ([string]$Manifest.compatibilityMode -ne 'EMPTY_TARGET_ONLY_V1') {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-COMPATIBILITY-MODE' -Message 'Phase30.5 must remain fail-closed for empty targets only.'
}
if (-not [bool]$Manifest.remoteReadOnlyAllowed) {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-READONLY-CONTRACT' -Message 'Remote read-only attestation capability must be explicitly enabled.'
}
if ([string]$Manifest.phase30PromotionHead -ne $ExpectedPhase30PromotionHead -or [string]$Manifest.phase30MergeCommit -ne $ExpectedPhase30MergeCommit) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PHASE30-CONTRACT' -Message 'Protected Phase30 promotion head or merge commit mismatch.'
}

$Git = Get-Command git -ErrorAction SilentlyContinue
if ($null -eq $Git) {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-GIT' -Message 'git is required.'
}
else {
  $HeadRows = @(& $Git.Source -C $Root rev-parse HEAD 2>$null)
  if ($LASTEXITCODE -ne 0 -or $HeadRows.Count -ne 1 -or $HeadRows[0] -notmatch '^[0-9a-fA-F]{40}$') {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-GIT-HEAD' -Message 'Unable to resolve current Git HEAD.'
  }
  else {
    $CurrentHead = $HeadRows[0].ToLowerInvariant()
    & $Git.Source -C $Root merge-base --is-ancestor ([string]$Manifest.phase30MergeCommit) $CurrentHead 2>$null
    if ($LASTEXITCODE -ne 0) {
      Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PHASE30-ANCESTRY' -Message 'Current HEAD does not descend from the Phase30 merge commit.'
    }

    & $Git.Source -C $Root diff --quiet ([string]$Manifest.phase30MergeCommit) -- 'supabase/migrations_draft/*.sql' 'supabase/migrations/*.sql'
    if ($LASTEXITCODE -ne 0) {
      Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-MIGRATION-DRIFT' -Message 'Migration source or replay mirror changed after Phase30 promotion.'
    }
  }
}

if ([int]$Manifest.expectedProtectedFileCount -ne $CanonicalProtectedPaths.Count -or @($Manifest.protectedFiles).Count -ne $CanonicalProtectedPaths.Count) {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROTECTED-COUNT' -Message 'Protected file count mismatch.'
}
foreach ($CanonicalPath in $CanonicalProtectedPaths) {
  $Rows = @($Manifest.protectedFiles | Where-Object {
    (Get-Phase305NormalizedRelativePath -Path ([string]$_.path)) -eq $CanonicalPath
  })
  if ($Rows.Count -ne 1) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROTECTED-INVENTORY' -Path $CanonicalPath -Message 'Canonical protected file must have exactly one manifest row.'
  }
}
foreach ($Protected in @($Manifest.protectedFiles)) {
  $RelativePath = Get-Phase305NormalizedRelativePath -Path ([string]$Protected.path)
  if (-not (Test-Phase305SafeRelativePath -Path $RelativePath)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROTECTED-PATH' -Path $RelativePath -Message 'Unsafe protected file path.'
    continue
  }
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROTECTED-MISSING' -Path $RelativePath -Message 'Protected Phase30.5 file is missing.'
    continue
  }
  if ((Get-Phase305NormalizedSha256 -Path $FullPath) -ne ([string]$Protected.sha256).ToLowerInvariant()) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROTECTED-HASH' -Path $RelativePath -Message 'Protected Phase30.5 file hash mismatch.'
  }
}

foreach ($ScriptPath in @(
  'scripts/manual-target-project-attestation/phase30-5-common.ps1',
  'scripts/manual-target-project-attestation/run-phase30-5-static-gate.ps1',
  'scripts/manual-target-project-attestation/run-phase30-5-target-attestation-local.ps1'
)) {
  Test-Phase305PowerShellParse -Path (Join-Path $Root $ScriptPath) -Findings $Findings
}

$ProbePath = Join-Path $Root ([string]$Manifest.probeSqlPath)
if (-not (Test-Path -LiteralPath $ProbePath -PathType Leaf)) {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROBE-MISSING' -Message 'Read-only probe SQL is missing.'
}
else {
  $ProbeText = Get-Phase305StrictUtf8Text -Path $ProbePath
  $ExecutableProbe = Get-Phase305ExecutableSqlText -Text $ProbeText
  if ($ExecutableProbe -notmatch '(?is)\bbegin\s+transaction\s+read\s+only\s*;') {
    Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PROBE-NOT-READ-ONLY' -Message 'Probe must begin an explicit read-only transaction.'
  }
  if ($ExecutableProbe -notmatch '(?is)\brollback\s*;') {
    Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PROBE-NO-ROLLBACK' -Message 'Probe must terminate with ROLLBACK.'
  }
  if ($ExecutableProbe -match '(?is)\bcommit\s*;') {
    Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PROBE-COMMIT' -Message 'Probe must not contain COMMIT.'
  }
  foreach ($Pattern in @(
    '(?i)\binsert\b',
    '(?i)\bupdate\b',
    '(?i)\bdelete\b',
    '(?i)\bmerge\b',
    '(?i)\bcreate\b',
    '(?i)\balter\b',
    '(?i)\bdrop\b',
    '(?i)\btruncate\b',
    '(?i)\bgrant\b',
    '(?i)\brevoke\b',
    '(?i)\bcopy\b',
    '(?i)\bcall\b',
    '(?i)\bdo\b',
    '(?i)\bvacuum\b',
    '(?i)\banalyze\b',
    '(?i)\breindex\b',
    '(?i)\bcluster\b',
    '(?i)\block\b'
  )) {
    if ($ExecutableProbe -match $Pattern) {
      Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PROBE-WRITE-TOKEN' -Message "Probe contains prohibited token pattern: $Pattern"
    }
  }
}

$RunnerPath = Join-Path $Root 'scripts/manual-target-project-attestation/run-phase30-5-target-attestation-local.ps1'
if (Test-Path -LiteralPath $RunnerPath -PathType Leaf) {
  $RunnerText = Get-Phase305StrictUtf8Text -Path $RunnerPath
  foreach ($Pattern in @(
    '(?i)\bsupabase\s+link\b',
    '(?i)\bsupabase\s+db\s+push\b',
    '(?i)\bsupabase\s+migration\s+repair\b',
    '(?i)\bdocker\s+exec\b',
    '(?i)\bpsql\b.*\s-c\s+',
    '(?i)\bpostgres(?:ql)?://'
  )) {
    if ($RunnerText -match $Pattern) {
      Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-RUNNER-WRITE-CAPABILITY' -Message "Runner contains prohibited remote capability pattern: $Pattern"
    }
  }
}

$ErrorCount = @($Findings | Where-Object { $_.Severity -eq 'ERROR' }).Count
$BlockerCount = @($Findings | Where-Object { $_.Severity -eq 'BLOCKER' }).Count

Write-Host "StaticErrorCount: $ErrorCount"
Write-Host "StaticBlockerCount: $BlockerCount"
foreach ($Finding in $Findings) {
  Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Path) | $($Finding.Message)"
}

if ($ErrorCount -gt 0 -or $BlockerCount -gt 0) {
  Write-Host 'Phase30.5StaticGateResult: FAIL'
  exit 1
}

Write-Host 'Phase30.5StaticGateResult: PASS'
exit 0
