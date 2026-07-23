function Add-Phase305Finding {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings,
    [Parameter(Mandatory = $true)][ValidateSet('INFO','RISK','BLOCKER','ERROR')][string] $Severity,
    [Parameter(Mandatory = $true)][string] $Code,
    [Parameter(Mandatory = $true)][string] $Message,
    [string] $Path
  )
  $Findings.Add([pscustomobject]@{
    Severity = $Severity
    Code = $Code
    Message = $Message
    Path = $Path
  })
}

function Get-Phase305RepositoryRoot {
  param([Parameter(Mandatory = $true)][string] $ScriptDirectory)
  return (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
}

function Get-Phase305NormalizedRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  return ($Path -replace '\\','/').Trim()
}

function Test-Phase305SafeRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Normalized = Get-Phase305NormalizedRelativePath -Path $Path
  if ([string]::IsNullOrWhiteSpace($Normalized)) { return $false }
  if ([System.IO.Path]::IsPathRooted($Normalized)) { return $false }
  if ($Normalized -match '^[A-Za-z]:') { return $false }
  if ($Normalized -match '(^|/)\.\.(/|$)') { return $false }
  return $true
}

function Get-Phase305StrictUtf8Text {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  $Encoding = [System.Text.UTF8Encoding]::new($false, $true)
  $Text = $Encoding.GetString($Bytes)
  if ($Text.Length -gt 0 -and [int]$Text[0] -eq 0xFEFF) {
    $Text = $Text.Substring(1)
  }
  return $Text
}

function Get-Phase305NormalizedSha256 {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Text = Get-Phase305StrictUtf8Text -Path $Path
  $Normalized = ($Text -replace "`r`n","`n") -replace "`r","`n"
  $Bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Normalized)
  $Hash = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($Hash.ComputeHash($Bytes)) -replace '-','').ToLowerInvariant()
  }
  finally {
    $Hash.Dispose()
  }
}

function Get-Phase305StringSha256 {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string] $Value)
  $Bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Value)
  $Hash = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($Hash.ComputeHash($Bytes)) -replace '-','').ToLowerInvariant()
  }
  finally {
    $Hash.Dispose()
  }
}

function Get-Phase305ExecutableSqlText {
  param([Parameter(Mandatory = $true)][string] $Text)
  $WithoutBlockComments = [regex]::Replace(
    $Text,
    '/\*.*?\*/',
    ' ',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
  $WithoutLineComments = [regex]::Replace(
    $WithoutBlockComments,
    '(?m)--[^\r\n]*$',
    ' '
  )
  return [regex]::Replace(
    $WithoutLineComments,
    "'(?:''|[^'])*'",
    "''",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

function Test-Phase305PowerShellParse {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  $Tokens = $null
  $ParseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    $Path,
    [ref]$Tokens,
    [ref]$ParseErrors
  ) | Out-Null
  foreach ($ParseError in @($ParseErrors)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PS-PARSE' -Path $Path -Message $ParseError.Message
  }
}

function Resolve-Phase305EvidencePath {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][string] $Path
  )
  $Resolved = if ([System.IO.Path]::IsPathRooted($Path)) {
    [System.IO.Path]::GetFullPath($Path)
  }
  else {
    [System.IO.Path]::GetFullPath((Join-Path $Root $Path))
  }
  $EvidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $Root '.local-evidence'))
  $EvidencePrefix = $EvidenceRoot.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
  if (-not $Resolved.StartsWith($EvidencePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Evidence paths must remain under .local-evidence.'
  }
  return $Resolved
}

function Test-Phase305Phase30Bundle {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][string] $BundleManifestPath,
    [Parameter(Mandatory = $true)] $Manifest,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  try {
    $ResolvedBundleManifest = Resolve-Phase305EvidencePath -Root $Root -Path $BundleManifestPath
  }
  catch {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-LOCATION' -Message $_.Exception.Message
    return $null
  }

  if (-not (Test-Path -LiteralPath $ResolvedBundleManifest -PathType Leaf)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-MISSING' -Path $ResolvedBundleManifest -Message 'Phase30 bundle manifest is missing.'
    return $null
  }

  try {
    $Bundle = Get-Content -Raw -LiteralPath $ResolvedBundleManifest | ConvertFrom-Json
  }
  catch {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-PARSE' -Path $ResolvedBundleManifest -Message $_.Exception.Message
    return $null
  }

  if ([string]$Bundle.schemaVersion -ne '1.0' -or [string]$Bundle.phase -ne 'Phase30' -or [string]$Bundle.overallResult -ne 'PASS') {
    Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-BUNDLE-CONTRACT' -Message 'Phase30 bundle schema, phase, or result is invalid.'
  }
  if ([string]$Bundle.repositoryHead -ne [string]$Manifest.phase30PromotionHead) {
    Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-BUNDLE-HEAD' -Message 'Phase30 bundle is not bound to the protected promotion head.'
  }
  if ([string]$Bundle.sourcePromotionMergeCommit -ne [string]$Manifest.phase29_2MergeCommit) {
    Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-BUNDLE-SOURCE' -Message 'Phase30 bundle source promotion commit mismatch.'
  }

  $Phase30ManifestPath = Join-Path $Root ([string]$Manifest.phase30ManifestPath)
  if (-not (Test-Path -LiteralPath $Phase30ManifestPath -PathType Leaf)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PHASE30-MANIFEST-MISSING' -Message 'Phase30 source manifest is missing.'
  }
  else {
    $ExpectedSourceManifestHash = Get-Phase305NormalizedSha256 -Path $Phase30ManifestPath
    if (([string]$Bundle.sourceManifestSha256).ToLowerInvariant() -ne $ExpectedSourceManifestHash) {
      Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-BUNDLE-MANIFEST-HASH' -Message 'Phase30 bundle source manifest hash mismatch.'
    }
  }

  if ([int]$Bundle.migrationCount -ne 11 -or @($Bundle.files).Count -ne 11) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-COUNT' -Message 'Phase30 bundle must contain exactly 11 migration artifacts.'
  }

  $BundleRoot = Split-Path -Parent $ResolvedBundleManifest
  $SeenOrders = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($FileRow in @($Bundle.files)) {
    $Order = [int]$FileRow.order
    if (-not $SeenOrders.Add($Order)) {
      Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-DUPLICATE-ORDER' -Message "Duplicate bundle migration order: $Order"
      continue
    }
    $ReleasePath = Get-Phase305NormalizedRelativePath -Path ([string]$FileRow.releasePath)
    if (-not (Test-Phase305SafeRelativePath -Path $ReleasePath)) {
      Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-PATH' -Path $ReleasePath -Message 'Unsafe release artifact path.'
      continue
    }
    $ReleaseFullPath = Join-Path $BundleRoot $ReleasePath
    if (-not (Test-Path -LiteralPath $ReleaseFullPath -PathType Leaf)) {
      Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-BUNDLE-ARTIFACT-MISSING' -Path $ReleasePath -Message 'Release artifact is missing.'
      continue
    }
    $ActualHash = Get-Phase305NormalizedSha256 -Path $ReleaseFullPath
    if ($ActualHash -ne ([string]$FileRow.normalizedSha256).ToLowerInvariant()) {
      Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-BUNDLE-ARTIFACT-HASH' -Path $ReleasePath -Message 'Release artifact hash mismatch.'
    }
  }

  return [pscustomobject]@{
    Manifest = $Bundle
    ManifestPath = $ResolvedBundleManifest
    ManifestSha256 = Get-Phase305NormalizedSha256 -Path $ResolvedBundleManifest
    Root = $BundleRoot
  }
}

function ConvertFrom-Phase305ProbeLines {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][AllowEmptyString()][string[]] $Lines,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  $Result = @{}
  foreach ($Line in @($Lines)) {
    if ([string]::IsNullOrWhiteSpace($Line)) { continue }
    if ($Line -notmatch '^([A-Z0-9_]+)=(.*)$') { continue }
    $Key = $Matches[1]
    $Value = $Matches[2]
    if ($Result.ContainsKey($Key)) {
      Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROBE-DUPLICATE-KEY' -Message "Duplicate probe key: $Key"
      continue
    }
    $Result[$Key] = $Value
  }
  return $Result
}
