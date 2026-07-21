<#
Create a local, immutable Phase30 release bundle from the promoted migration source set.
This script performs file-system and Git inspection only. It never links to or changes any database.
#>

[CmdletBinding()]
param(
  [string] $OutputRoot = '.local-evidence/phase30-formal-promotion',
  [string] $BundleId
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDirectory 'phase30-common.ps1')

$Root = Get-Phase30RepositoryRoot -ScriptDirectory $ScriptDirectory
$ManifestPath = Join-Path $ScriptDirectory 'phase30_formal_promotion_manifest.json'
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json

$Git = Get-Command git -ErrorAction SilentlyContinue
if ($null -eq $Git) { throw 'git is required.' }

& $Git.Source -C $Root diff --quiet --
if ($LASTEXITCODE -ne 0) { throw 'Tracked working-tree changes are present.' }
& $Git.Source -C $Root diff --cached --quiet --
if ($LASTEXITCODE -ne 0) { throw 'Staged changes are present.' }

$HeadRows = @(& $Git.Source -C $Root rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $HeadRows.Count -ne 1 -or $HeadRows[0] -notmatch '^[0-9a-fA-F]{40}$') {
  throw 'Unable to resolve current Git HEAD.'
}
$RepositoryHead = $HeadRows[0].ToLowerInvariant()

if ([string]::IsNullOrWhiteSpace($BundleId)) { $BundleId = [guid]::NewGuid().ToString() }
if ($BundleId -notmatch '^[0-9a-fA-F-]{36}$') { throw 'BundleId must be a GUID.' }

$EvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $Root '.local-evidence'))
$ResolvedOutputRoot = if ([System.IO.Path]::IsPathRooted($OutputRoot)) {
  [System.IO.Path]::GetFullPath($OutputRoot)
}
else {
  [System.IO.Path]::GetFullPath((Join-Path $Root $OutputRoot))
}
$EvidencePrefix = $EvidenceRoot.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
if (-not $ResolvedOutputRoot.StartsWith($EvidencePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'OutputRoot must remain under .local-evidence.'
}

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BundleRoot = Join-Path $ResolvedOutputRoot "${Timestamp}-${BundleId}"
$MigrationOutput = Join-Path $BundleRoot ([string]$Manifest.releaseBundle.migrationDirectoryName)
New-Item -ItemType Directory -Force -Path $MigrationOutput | Out-Null

$BundleFiles = @()
foreach ($Migration in @($Manifest.migrations | Sort-Object { [int]$_.order })) {
  $SourcePath = Get-Phase30NormalizedRelativePath -Path ([string]$Migration.sourcePath)
  $MirrorPath = Get-Phase30NormalizedRelativePath -Path ([string]$Migration.replayMirrorPath)
  $ReleaseFileName = [string]$Migration.releaseFileName

  if (-not (Test-Phase30SafeRelativePath -Path $SourcePath)) { throw "Unsafe source path: $SourcePath" }
  if (-not (Test-Phase30SafeRelativePath -Path $MirrorPath)) { throw "Unsafe mirror path: $MirrorPath" }
  if ($ReleaseFileName -match '[\\/]' -or $ReleaseFileName -notmatch '^\d{14}_.+\.sql$' -or $ReleaseFileName -match '_draft\.sql$') {
    throw "Unsafe release filename: $ReleaseFileName"
  }

  $SourceFullPath = Join-Path $Root $SourcePath
  $MirrorFullPath = Join-Path $Root $MirrorPath
  if (-not (Test-Path -LiteralPath $SourceFullPath -PathType Leaf)) { throw "Missing source migration: $SourcePath" }
  if (-not (Test-Path -LiteralPath $MirrorFullPath -PathType Leaf)) { throw "Missing replay mirror: $MirrorPath" }

  $ExpectedHash = ([string]$Migration.sha256).ToLowerInvariant()
  $SourceHash = Get-Phase30NormalizedSha256 -Path $SourceFullPath
  $MirrorHash = Get-Phase30NormalizedSha256 -Path $MirrorFullPath
  if ($SourceHash -ne $ExpectedHash) { throw "Source migration hash mismatch: $SourcePath" }
  if ($MirrorHash -ne $ExpectedHash) { throw "Replay mirror hash mismatch: $MirrorPath" }

  $ReleaseFullPath = Join-Path $MigrationOutput $ReleaseFileName
  [System.IO.File]::WriteAllBytes($ReleaseFullPath, [System.IO.File]::ReadAllBytes($SourceFullPath))
  $ReleaseHash = Get-Phase30NormalizedSha256 -Path $ReleaseFullPath
  if ($ReleaseHash -ne $ExpectedHash) { throw "Release artifact hash mismatch: $ReleaseFileName" }

  $BundleFiles += [ordered]@{
    order = [int]$Migration.order
    version = [string]$Migration.version
    sourcePath = $SourcePath
    replayMirrorPath = $MirrorPath
    releasePath = "$([string]$Manifest.releaseBundle.migrationDirectoryName)/$ReleaseFileName"
    normalizedSha256 = $ReleaseHash
  }
}

$BundleManifest = [ordered]@{
  schemaVersion = '1.0'
  phase = 'Phase30'
  bundleId = $BundleId
  generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
  repositoryHead = $RepositoryHead
  sourcePromotionMergeCommit = [string]$Manifest.sourcePromotionMergeCommit
  sourceManifestSha256 = Get-Phase30NormalizedSha256 -Path $ManifestPath
  migrationCount = $BundleFiles.Count
  transformation = 'RENAME_ONLY_PRESERVE_BYTES'
  remoteCommandsUsed = 'none'
  files = $BundleFiles
  overallResult = 'PASS'
}
$BundleManifestPath = Join-Path $BundleRoot 'phase30-release-bundle.json'
$BundleJson = $BundleManifest | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText(
  $BundleManifestPath,
  $BundleJson + [Environment]::NewLine,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "BundleRoot: $BundleRoot"
Write-Host "BundleManifestPath: $BundleManifestPath"
Write-Host "MigrationArtifactCount: $($BundleFiles.Count)"
Write-Host 'RemoteCommandsUsed: none'
Write-Host 'FormalPromotionBundleResult: PASS'
exit 0
