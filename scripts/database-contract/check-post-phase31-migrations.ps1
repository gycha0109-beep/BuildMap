[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$ManifestPath = Join-Path $Root 'scripts/manual-controlled-staging-migration/phase31_controlled_staging_migration_manifest.json'
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json

function Get-NormalizedSha256([string] $Path) {
  $Utf8 = [Text.UTF8Encoding]::new($false, $true)
  $Text = [IO.File]::ReadAllText($Path, $Utf8)
  $Text = $Text.Replace("`r`n", "`n").Replace("`r", "`n")
  $Bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $Hash = [Security.Cryptography.SHA256]::HashData($Bytes)
  return ([Convert]::ToHexString($Hash)).ToLowerInvariant()
}

function Assert-Hash([string] $RelativePath, [string] $ExpectedHash) {
  $FullPath = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
    throw "Protected file missing: $RelativePath"
  }
  $ActualHash = Get-NormalizedSha256 $FullPath
  if ($ActualHash -ne $ExpectedHash.ToLowerInvariant()) {
    throw "Protected file hash mismatch: $RelativePath"
  }
}

if ([string]$Manifest.phase -ne 'Phase31' -or [int]$Manifest.expectedMigrationCount -ne 11) {
  throw 'Phase31 historical manifest identity is invalid.'
}

$Rows = @($Manifest.migrations | Sort-Object order)
if ($Rows.Count -ne 11) {
  throw "Expected 11 historical migrations; observed $($Rows.Count)."
}

foreach ($Row in $Rows) {
  Assert-Hash ([string]$Row.sourcePath) ([string]$Row.sha256)
  Assert-Hash ([string]$Row.replayMirrorPath) ([string]$Row.sha256)
}

foreach ($Row in @($Manifest.protectedFiles)) {
  Assert-Hash ([string]$Row.path) ([string]$Row.sha256)
}

foreach ($Row in @($Manifest.upstreamProtectedFiles)) {
  Assert-Hash ([string]$Row.path) ([string]$Row.sha256)
}

$DraftDirectory = Join-Path $Root 'supabase/migrations_draft'
$FormalDirectory = Join-Path $Root 'supabase/migrations'

$ExpectedDraft = @(
  $Rows |
    ForEach-Object { [IO.Path]::GetFileName([string]$_.sourcePath) } |
    Sort-Object
)
$ActualDraft = @(
  Get-ChildItem -LiteralPath $DraftDirectory -File -Filter '*.sql' |
    Select-Object -ExpandProperty Name |
    Sort-Object
)
if (@(Compare-Object $ExpectedDraft $ActualDraft).Count -gt 0) {
  throw 'migrations_draft must remain the exact historical 00-10 inventory.'
}

$HistoricalFormal = @(
  $Rows |
    ForEach-Object { [IO.Path]::GetFileName([string]$_.replayMirrorPath) }
)
$ActualFormal = @(
  Get-ChildItem -LiteralPath $FormalDirectory -File -Filter '*.sql' |
    Select-Object -ExpandProperty Name
)

foreach ($Leaf in $HistoricalFormal) {
  if ($ActualFormal -notcontains $Leaf) {
    throw "Historical formal mirror missing: $Leaf"
  }
}

$Additive = @($ActualFormal | Where-Object { $HistoricalFormal -notcontains $_ } | Sort-Object)
$MaxHistoricalVersion = [string](@($Rows | Sort-Object version)[-1].version)
$SeenVersions = [Collections.Generic.HashSet[string]]::new()
$SeenSequences = [Collections.Generic.HashSet[int]]::new()
$PreviousSequence = 10

foreach ($Leaf in $Additive) {
  $Match = [regex]::Match(
    $Leaf,
    '^(?<version>\d{14})_buildmap_(?<sequence>\d{2})_[a-z0-9_]+\.sql$'
  )
  if (-not $Match.Success) {
    throw "Invalid additive migration filename: $Leaf"
  }

  $Version = $Match.Groups['version'].Value
  $Sequence = [int]$Match.Groups['sequence'].Value

  if ([string]::CompareOrdinal($Version, $MaxHistoricalVersion) -le 0) {
    throw "Additive migration version must be newer than historical 00-10: $Leaf"
  }
  if ($Sequence -lt 11) {
    throw "Additive migration sequence must be 11 or greater: $Leaf"
  }
  if (-not $SeenVersions.Add($Version)) {
    throw "Duplicate additive migration version: $Version"
  }
  if (-not $SeenSequences.Add($Sequence)) {
    throw "Duplicate additive migration sequence: $Sequence"
  }
  if ($Sequence -le $PreviousSequence) {
    throw "Additive migration sequence is not strictly increasing: $Leaf"
  }

  $PreviousSequence = $Sequence
}

Write-Host "HistoricalMigrationCount: $($Rows.Count)"
Write-Host "AdditiveMigrationCount: $($Additive.Count)"
Write-Host 'HistoricalMigrationIntegrity: PASS'
Write-Host 'Phase31ProtectedIntegrity: PASS'
Write-Host 'ProductionDeploymentDecision: OUT_OF_SCOPE'
Write-Host 'DatabaseContractResult: PASS'
