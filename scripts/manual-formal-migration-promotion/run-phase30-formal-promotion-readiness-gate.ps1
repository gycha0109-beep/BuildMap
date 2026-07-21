<#
Static and optional bundle validation gate for Phase30 formal migration promotion.
A DEPLOYMENT_HOLD result is expected until Phase30.5 target-project attestation is complete.
#>

[CmdletBinding()]
param(
  [string] $BundleManifestPath,
  [switch] $RequirePromotionReady
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
. (Join-Path $ScriptDirectory 'phase30-common.ps1')

$Findings = [System.Collections.Generic.List[object]]::new()
$ManifestPath = Join-Path $ScriptDirectory 'phase30_formal_promotion_manifest.json'
if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  Write-Error "Missing Phase30 manifest: $ManifestPath"
  exit 1
}
try { $Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json }
catch {
  Write-Error "Cannot parse Phase30 manifest: $($_.Exception.Message)"
  exit 1
}

if ([string]$Manifest.schemaVersion -ne '1.0') {
  Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-MANIFEST-SCHEMA' -Message "Unsupported schemaVersion: $($Manifest.schemaVersion)"
}
if ([int]$Manifest.expectedMigrationCount -ne 11 -or @($Manifest.migrations).Count -ne 11) {
  Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-MIGRATION-COUNT' -Message 'Phase30 requires exactly 11 promoted migrations.'
}
if ([bool]$Manifest.automaticDeploymentAllowed -or [bool]$Manifest.automaticRemoteLinkAllowed -or [bool]$Manifest.automaticHistoryRepairAllowed) {
  Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-AUTOMATION-PROHIBITED' -Message 'Automatic deployment, remote linking, and migration-history repair must remain disabled.'
}
if ([string]$Manifest.phase29_2Attestation.reportedDecision -ne 'PROMOTION_READY') {
  Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-SOURCE-PROMOTION' -Message 'Phase29.2 PROMOTION_READY attestation is required.'
}

$Git = Get-Command git -ErrorAction SilentlyContinue
$CurrentRepositoryHead = ''
if ($null -eq $Git) {
  Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-GIT' -Message 'git is required.'
}
else {
  $HeadRows = @(& $Git.Source -C $Root rev-parse HEAD 2>$null)
  if ($LASTEXITCODE -ne 0 -or $HeadRows.Count -ne 1 -or $HeadRows[0] -notmatch '^[0-9a-fA-F]{40}$') {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-GIT-HEAD' -Message 'Unable to resolve current Git HEAD.'
  }
  else {
    $CurrentRepositoryHead = $HeadRows[0].ToLowerInvariant()
    & $Git.Source -C $Root merge-base --is-ancestor ([string]$Manifest.sourcePromotionMergeCommit) $CurrentRepositoryHead 2>$null
    if ($LASTEXITCODE -ne 0) {
      Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-SOURCE-ANCESTRY' -Message 'Current HEAD does not descend from the Phase29.2 promotion merge commit.'
    }
  }
}

$ExpectedSourcePaths = @()
$ExpectedMirrorPaths = @()
$ExpectedReleaseNames = @()
for ($Index = 0; $Index -lt 11; $Index++) {
  $Rows = @($Manifest.migrations | Where-Object { [int]$_.order -eq $Index })
  if ($Rows.Count -ne 1) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-ORDER-CONTRACT' -Message "Migration order $Index must have exactly one row."
    continue
  }
  $Migration = $Rows[0]
  $SourcePath = Get-Phase30NormalizedRelativePath -Path ([string]$Migration.sourcePath)
  $MirrorPath = Get-Phase30NormalizedRelativePath -Path ([string]$Migration.replayMirrorPath)
  $ReleaseName = [string]$Migration.releaseFileName
  $ExpectedHash = ([string]$Migration.sha256).ToLowerInvariant()

  $ExpectedSourcePaths += $SourcePath
  $ExpectedMirrorPaths += $MirrorPath
  $ExpectedReleaseNames += $ReleaseName

  if (-not (Test-Phase30SafeRelativePath -Path $SourcePath) -or -not (Test-Phase30SafeRelativePath -Path $MirrorPath)) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-PATH-ESCAPE' -Message "Unsafe migration path at order $Index."
    continue
  }
  if ($ReleaseName -match '[\\/]' -or $ReleaseName -notmatch "^$([regex]::Escape([string]$Migration.version))_.+\.sql$" -or $ReleaseName -match '_draft\.sql$') {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-RELEASE-NAME' -Message "Invalid release filename: $ReleaseName"
  }
  $ExpectedReleaseName = ([System.IO.Path]::GetFileName($SourcePath) -replace '_draft\.sql$','.sql')
  if ($ReleaseName -ne $ExpectedReleaseName) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-RENAME-POLICY' -Message "Release filename must remove only the _draft suffix: $ReleaseName"
  }

  foreach ($Pair in @(
    @{ Path=$SourcePath; Label='source' },
    @{ Path=$MirrorPath; Label='mirror' }
  )) {
    $FullPath = Join-Path $Root ([string]$Pair.Path)
    if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
      Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-MIGRATION-MISSING' -Path ([string]$Pair.Path) -Message "Missing $($Pair.Label) migration."
      continue
    }
    if ((Get-Phase30NormalizedSha256 -Path $FullPath) -ne $ExpectedHash) {
      Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-HASH-DRIFT' -Path ([string]$Pair.Path) -Message "$($Pair.Label) migration hash mismatch."
    }
  }
}
if (@($ExpectedReleaseNames | Sort-Object -Unique).Count -ne 11) {
  Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-RELEASE-DUPLICATE' -Message 'Release filenames must be unique.'
}

$DraftInventory = @(
  Get-ChildItem -LiteralPath (Join-Path $Root 'supabase/migrations_draft') -File -Filter '*.sql' |
    ForEach-Object { "supabase/migrations_draft/$($_.Name)" } |
    Sort-Object
)
$MirrorInventory = @(
  Get-ChildItem -LiteralPath (Join-Path $Root 'supabase/migrations') -File -Filter '*.sql' |
    ForEach-Object { "supabase/migrations/$($_.Name)" } |
    Sort-Object
)
$DraftMissing = @($ExpectedSourcePaths | Where-Object { $DraftInventory -notcontains $_ })
$DraftExtra = @($DraftInventory | Where-Object { $ExpectedSourcePaths -notcontains $_ })
$MirrorMissing = @($ExpectedMirrorPaths | Where-Object { $MirrorInventory -notcontains $_ })
$MirrorExtra = @($MirrorInventory | Where-Object { $ExpectedMirrorPaths -notcontains $_ })
if ($DraftMissing.Count -gt 0 -or $DraftExtra.Count -gt 0 -or $MirrorMissing.Count -gt 0 -or $MirrorExtra.Count -gt 0) {
  Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-INVENTORY-DRIFT' -Message "Inventory drift. DraftMissing=$($DraftMissing -join ','); DraftExtra=$($DraftExtra -join ','); MirrorMissing=$($MirrorMissing -join ','); MirrorExtra=$($MirrorExtra -join ',')"
}

$ProtectedPaths = @($Manifest.protectedFiles | ForEach-Object { Get-Phase30NormalizedRelativePath -Path ([string]$_.path) })
if ([int]$Manifest.expectedProtectedFileCount -ne $ProtectedPaths.Count) {
  Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-PROTECTED-COUNT' -Message 'Protected file count mismatch.'
}
foreach ($Protected in @($Manifest.protectedFiles)) {
  $RelativePath = Get-Phase30NormalizedRelativePath -Path ([string]$Protected.path)
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-PROTECTED-MISSING' -Path $RelativePath -Message 'Protected Phase30 file is missing.'
    continue
  }
  if ((Get-Phase30NormalizedSha256 -Path $FullPath) -ne ([string]$Protected.sha256).ToLowerInvariant()) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-PROTECTED-HASH' -Path $RelativePath -Message 'Protected Phase30 file hash mismatch.'
  }
}

foreach ($ScriptPath in @(
  'scripts/manual-formal-migration-promotion/phase30-common.ps1',
  'scripts/manual-formal-migration-promotion/new-phase30-release-bundle-local.ps1',
  'scripts/manual-formal-migration-promotion/run-phase30-formal-promotion-readiness-gate.ps1',
  'scripts/manual-formal-migration-promotion/run-phase30-local-promotion-closure.ps1'
)) {
  Test-Phase30PowerShellParse -Path (Join-Path $Root $ScriptPath) -Findings $Findings
}

$BundleScriptPath = Join-Path $Root 'scripts/manual-formal-migration-promotion/new-phase30-release-bundle-local.ps1'
$BundleScriptText = Get-Phase30StrictUtf8Text -Path $BundleScriptPath
foreach ($Pattern in @(
  '(?i)\bsupabase\s+',
  '(?i)\bdocker\s+',
  '(?i)\bpsql\s+',
  '(?i)\bhttps?://',
  '(?i)\bpostgres(?:ql)?://',
  '(?i)\bmigration\s+repair\b'
)) {
  if ($BundleScriptText -match $Pattern) {
    Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-REMOTE-CAPABILITY' -Path 'new-phase30-release-bundle-local.ps1' -Message "Bundle script contains prohibited capability pattern: $Pattern"
  }
}

$BundleResult = 'MISSING'
if (-not [string]::IsNullOrWhiteSpace($BundleManifestPath)) {
  $ResolvedBundleManifest = if ([System.IO.Path]::IsPathRooted($BundleManifestPath)) {
    [System.IO.Path]::GetFullPath($BundleManifestPath)
  }
  else {
    [System.IO.Path]::GetFullPath((Join-Path $Root $BundleManifestPath))
  }

  $EvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $Root '.local-evidence'))
  $EvidencePrefix = $EvidenceRoot.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
  if (-not $ResolvedBundleManifest.StartsWith($EvidencePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-LOCATION' -Message 'Bundle manifest must remain under .local-evidence.'
    $BundleResult = 'FAIL'
  }
  elseif (-not (Test-Path -LiteralPath $ResolvedBundleManifest -PathType Leaf)) {
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-MISSING' -Message 'Bundle manifest file is missing.'
    $BundleResult = 'FAIL'
  }
  else {
    try { $Bundle = Get-Content -Raw -LiteralPath $ResolvedBundleManifest | ConvertFrom-Json }
    catch {
      Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-PARSE' -Message $_.Exception.Message
      $Bundle = $null
    }

    if ($null -ne $Bundle) {
      $BeforeBundleFindings = $Findings.Count
      if ([string]$Bundle.schemaVersion -ne '1.0' -or [string]$Bundle.phase -ne 'Phase30') {
        Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-SCHEMA' -Message 'Invalid bundle schema or phase.'
      }
      if ([string]$Bundle.repositoryHead -ne $CurrentRepositoryHead) {
        Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-BUNDLE-HEAD' -Message 'Bundle is not bound to current Git HEAD.'
      }
      if ([string]$Bundle.sourcePromotionMergeCommit -ne [string]$Manifest.sourcePromotionMergeCommit) {
        Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-BUNDLE-SOURCE' -Message 'Bundle source promotion commit mismatch.'
      }
      $ExpectedManifestHash = Get-Phase30NormalizedSha256 -Path $ManifestPath
      if (([string]$Bundle.sourceManifestSha256).ToLowerInvariant() -ne $ExpectedManifestHash) {
        Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-BUNDLE-MANIFEST-HASH' -Message 'Bundle source manifest hash mismatch.'
      }
      if ([string]$Bundle.remoteCommandsUsed -ne 'none' -or [string]$Bundle.transformation -ne 'RENAME_ONLY_PRESERVE_BYTES') {
        Add-Phase30Finding -Findings $Findings -Severity BLOCKER -Code 'MIG30-BUNDLE-CONTRACT' -Message 'Bundle remote-command or transformation contract mismatch.'
      }
      if ([int]$Bundle.migrationCount -ne 11 -or @($Bundle.files).Count -ne 11) {
        Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-COUNT' -Message 'Bundle must contain exactly 11 migrations.'
      }

      $BundleDirectory = Split-Path -Parent $ResolvedBundleManifest
      $ExpectedBundleSqlPaths = @(
        $Manifest.migrations |
          Sort-Object { [int]$_.order } |
          ForEach-Object { "$([string]$Manifest.releaseBundle.migrationDirectoryName)/$([string]$_.releaseFileName)" }
      )
      foreach ($Migration in @($Manifest.migrations)) {
        $Rows = @($Bundle.files | Where-Object { [int]$_.order -eq [int]$Migration.order })
        if ($Rows.Count -ne 1) {
          Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-ORDER' -Message "Bundle order $($Migration.order) must appear exactly once."
          continue
        }
        $ReleaseRelativePath = Get-Phase30NormalizedRelativePath -Path ([string]$Rows[0].releasePath)
        $ExpectedReleasePath = "$([string]$Manifest.releaseBundle.migrationDirectoryName)/$([string]$Migration.releaseFileName)"
        if ($ReleaseRelativePath -ne $ExpectedReleasePath) {
          Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-PATH' -Message "Bundle release path mismatch: $ReleaseRelativePath"
          continue
        }
        $ReleaseFullPath = Join-Path $BundleDirectory $ReleaseRelativePath
        if (-not (Test-Path -LiteralPath $ReleaseFullPath -PathType Leaf)) {
          Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-FILE-MISSING' -Path $ReleaseRelativePath -Message 'Bundle migration file is missing.'
          continue
        }
        $ExpectedHash = ([string]$Migration.sha256).ToLowerInvariant()
        if ((Get-Phase30NormalizedSha256 -Path $ReleaseFullPath) -ne $ExpectedHash -or ([string]$Rows[0].normalizedSha256).ToLowerInvariant() -ne $ExpectedHash) {
          Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-HASH' -Path $ReleaseRelativePath -Message 'Bundle migration hash mismatch.'
        }
      }
      $BundleSqlInventory = @(
        Get-ChildItem -LiteralPath (Join-Path $BundleDirectory ([string]$Manifest.releaseBundle.migrationDirectoryName)) -File -Filter '*.sql' |
          ForEach-Object { "$([string]$Manifest.releaseBundle.migrationDirectoryName)/$($_.Name)" } |
          Sort-Object
      )
      $BundleMissing = @($ExpectedBundleSqlPaths | Where-Object { $BundleSqlInventory -notcontains $_ })
      $BundleExtra = @($BundleSqlInventory | Where-Object { $ExpectedBundleSqlPaths -notcontains $_ })
      if ($BundleMissing.Count -gt 0 -or $BundleExtra.Count -gt 0) {
        Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-BUNDLE-INVENTORY' -Message "Bundle inventory drift. Missing=$($BundleMissing -join ','); Extra=$($BundleExtra -join ',')"
      }
      if ($Findings.Count -eq $BeforeBundleFindings) { $BundleResult = 'PASS' }
      else { $BundleResult = 'FAIL' }
    }
  }
}

$ErrorCount = @($Findings | Where-Object { $_.Severity -eq 'ERROR' }).Count
$BlockerCount = @($Findings | Where-Object { $_.Severity -eq 'BLOCKER' }).Count
$FormalPromotionDecision = 'PROMOTION_HOLD'
if ($ErrorCount -eq 0 -and $BlockerCount -eq 0 -and $BundleResult -eq 'PASS') {
  $FormalPromotionDecision = 'PROMOTION_READY'
}
$DeploymentReadinessDecision = 'DEPLOYMENT_HOLD'

Write-Host "SourcePromotionMergeCommit: $([string]$Manifest.sourcePromotionMergeCommit)"
Write-Host "MigrationCount: $(@($Manifest.migrations).Count)"
Write-Host "ProtectedFileCount: $($ProtectedPaths.Count)"
Write-Host "FormalPromotionBundleResult: $BundleResult"
Write-Host "StaticErrorCount: $ErrorCount"
Write-Host "StaticBlockerCount: $BlockerCount"
foreach ($Finding in $Findings) {
  Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Path) | $($Finding.Message)"
}
Write-Host "FormalPromotionDecision: $FormalPromotionDecision"
Write-Host 'TargetProjectAttestation: PENDING_PHASE30_5'
Write-Host "DeploymentReadinessDecision: $DeploymentReadinessDecision"

if ($ErrorCount -gt 0) {
  Write-Host 'Phase30GateResult: FAIL'
  exit 1
}
Write-Host 'Phase30GateResult: PASS'
if ($RequirePromotionReady -and $FormalPromotionDecision -ne 'PROMOTION_READY') { exit 2 }
exit 0
