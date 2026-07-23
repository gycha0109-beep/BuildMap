function Add-Phase31Finding {
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

function Get-Phase31RepositoryRoot {
  param([Parameter(Mandatory = $true)][string] $ScriptDirectory)
  $Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
  if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) {
    throw "BuildMap Git repository root was not found: $Root"
  }
  return $Root
}

function Get-Phase31NormalizedRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  return ($Path -replace '\\','/').Trim()
}

function Test-Phase31SafeRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Normalized = Get-Phase31NormalizedRelativePath -Path $Path
  if ([string]::IsNullOrWhiteSpace($Normalized)) { return $false }
  if ([System.IO.Path]::IsPathRooted($Normalized)) { return $false }
  if ($Normalized -match '^[A-Za-z]:') { return $false }
  if ($Normalized -match '(^|/)\.\.(/|$)') { return $false }
  return $true
}

function Get-Phase31StrictUtf8Text {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  $Encoding = [System.Text.UTF8Encoding]::new($false, $true)
  $Text = $Encoding.GetString($Bytes)
  if ($Text.Length -gt 0 -and [int]$Text[0] -eq 0xFEFF) {
    $Text = $Text.Substring(1)
  }
  return $Text
}

function Get-Phase31NormalizedSha256 {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Text = Get-Phase31StrictUtf8Text -Path $Path
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

function Get-Phase31StringSha256 {
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

function Resolve-Phase31EvidencePath {
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

function Test-Phase31PowerShellParse {
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
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-PS-PARSE' -Path $Path -Message $ParseError.Message
  }
}

function Invoke-Phase31Native {
  param(
    [Parameter(Mandatory = $true)][scriptblock] $Command,
    [Parameter(Mandatory = $true)][string] $CapturePath
  )
  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }

  try {
    $ErrorActionPreference = 'Continue'
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawOutput = @(& $Command 2>&1)
    $ExitCode = $LASTEXITCODE
  }
  finally {
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $PreviousNativePreference }
    $ErrorActionPreference = $PreviousErrorActionPreference
  }

  $Lines = @(
    $RawOutput | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
      }
      else {
        $_.ToString()
      }
    }
  )
  $Directory = Split-Path -Parent $CapturePath
  New-Item -ItemType Directory -Force -Path $Directory | Out-Null
  [System.IO.File]::WriteAllLines(
    $CapturePath,
    $Lines,
    [System.Text.UTF8Encoding]::new($false)
  )
  return [pscustomobject]@{
    ExitCode = $ExitCode
    Lines = $Lines
  }
}

function ConvertFrom-Phase31ProbeLines {
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
      Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-PROBE-DUPLICATE-KEY' -Message "Duplicate probe key: $Key"
      continue
    }
    $Result[$Key] = $Value
  }
  return $Result
}

function Test-Phase31Phase30Bundle {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][string] $BundleManifestPath,
    [Parameter(Mandatory = $true)] $Manifest,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )

  try {
    $ResolvedBundleManifest = Resolve-Phase31EvidencePath -Root $Root -Path $BundleManifestPath
  }
  catch {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-BUNDLE-LOCATION' -Message $_.Exception.Message
    return $null
  }

  if (-not (Test-Path -LiteralPath $ResolvedBundleManifest -PathType Leaf)) {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-BUNDLE-MISSING' -Path $ResolvedBundleManifest -Message 'Phase30 bundle manifest is missing.'
    return $null
  }

  try {
    $Bundle = Get-Content -Raw -LiteralPath $ResolvedBundleManifest | ConvertFrom-Json
  }
  catch {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-BUNDLE-PARSE' -Path $ResolvedBundleManifest -Message $_.Exception.Message
    return $null
  }

  if (
    [string]$Bundle.schemaVersion -ne '1.0' -or
    [string]$Bundle.phase -ne 'Phase30' -or
    [string]$Bundle.overallResult -ne 'PASS'
  ) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-BUNDLE-CONTRACT' -Message 'Phase30 bundle schema, phase, or result is invalid.'
  }
  if ([string]$Bundle.repositoryHead -ne [string]$Manifest.phase30PromotionHead) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-BUNDLE-HEAD' -Message 'Phase30 bundle is not bound to the protected promotion head.'
  }

  $Phase30ManifestPath = Join-Path $Root ([string]$Manifest.phase30ManifestPath)
  if (-not (Test-Path -LiteralPath $Phase30ManifestPath -PathType Leaf)) {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-PHASE30-MANIFEST-MISSING' -Message 'Phase30 source manifest is missing.'
  }
  else {
    $ExpectedSourceManifestHash = Get-Phase31NormalizedSha256 -Path $Phase30ManifestPath
    if (([string]$Bundle.sourceManifestSha256).ToLowerInvariant() -ne $ExpectedSourceManifestHash) {
      Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-BUNDLE-MANIFEST-HASH' -Message 'Phase30 bundle source manifest hash mismatch.'
    }
  }

  $ExpectedRows = @($Manifest.migrations | Sort-Object order)
  $BundleRows = @($Bundle.files | Sort-Object order)
  if ($ExpectedRows.Count -ne [int]$Manifest.expectedMigrationCount -or $BundleRows.Count -ne $ExpectedRows.Count) {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-BUNDLE-COUNT' -Message 'Phase30 bundle must contain exactly the protected Phase31 migration inventory.'
  }

  $BundleRoot = Split-Path -Parent $ResolvedBundleManifest
  for ($Index = 0; $Index -lt [Math]::Min($ExpectedRows.Count, $BundleRows.Count); $Index++) {
    $Expected = $ExpectedRows[$Index]
    $Actual = $BundleRows[$Index]
    if (
      [int]$Actual.order -ne [int]$Expected.order -or
      [string]$Actual.version -ne [string]$Expected.version -or
      [string]$Actual.releaseFileName -ne [string]$Expected.releaseFileName -or
      ([string]$Actual.normalizedSha256).ToLowerInvariant() -ne ([string]$Expected.sha256).ToLowerInvariant()
    ) {
      Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-BUNDLE-INVENTORY' -Message "Bundle migration row mismatch at order $Index."
      continue
    }

    $ReleasePath = Get-Phase31NormalizedRelativePath -Path ([string]$Actual.releasePath)
    if (-not (Test-Phase31SafeRelativePath -Path $ReleasePath)) {
      Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-BUNDLE-PATH' -Path $ReleasePath -Message 'Unsafe release artifact path.'
      continue
    }
    $ReleaseFullPath = Join-Path $BundleRoot $ReleasePath
    if (-not (Test-Path -LiteralPath $ReleaseFullPath -PathType Leaf)) {
      Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-BUNDLE-ARTIFACT-MISSING' -Path $ReleasePath -Message 'Release artifact is missing.'
      continue
    }
    $ActualHash = Get-Phase31NormalizedSha256 -Path $ReleaseFullPath
    if ($ActualHash -ne ([string]$Expected.sha256).ToLowerInvariant()) {
      Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-BUNDLE-ARTIFACT-HASH' -Path $ReleasePath -Message 'Release artifact hash mismatch.'
    }
  }

  return [pscustomobject]@{
    Manifest = $Bundle
    ManifestPath = $ResolvedBundleManifest
    ManifestSha256 = Get-Phase31NormalizedSha256 -Path $ResolvedBundleManifest
    Root = $BundleRoot
  }
}

function Test-Phase31TargetAttestation {
  param(
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][string] $TargetAttestationPath,
    [Parameter(Mandatory = $true)][string] $TargetProjectRef,
    [Parameter(Mandatory = $true)] $Manifest,
    [Parameter(Mandatory = $true)] $BundleResult,
    [Parameter(Mandatory = $true)][string] $ConnectionIdentityHash,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )

  try {
    $ResolvedAttestationPath = Resolve-Phase31EvidencePath -Root $Root -Path $TargetAttestationPath
  }
  catch {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-ATTESTATION-LOCATION' -Message $_.Exception.Message
    return $null
  }

  if (-not (Test-Path -LiteralPath $ResolvedAttestationPath -PathType Leaf)) {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-ATTESTATION-MISSING' -Path $ResolvedAttestationPath -Message 'Phase30.5 target attestation is missing.'
    return $null
  }

  try {
    $Attestation = Get-Content -Raw -LiteralPath $ResolvedAttestationPath | ConvertFrom-Json
  }
  catch {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-ATTESTATION-PARSE' -Path $ResolvedAttestationPath -Message $_.Exception.Message
    return $null
  }

  if (
    [string]$Attestation.schemaVersion -ne '1.0' -or
    [string]$Attestation.phase -ne 'Phase30.5' -or
    [string]$Attestation.targetProjectAttestation -ne 'PASS' -or
    [string]$Attestation.deploymentReadinessDecision -ne 'DEPLOYMENT_READY'
  ) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-CONTRACT' -Message 'Phase30.5 attestation does not authorize deployment.'
  }
  if ([string]$Attestation.repositoryHead -ne [string]$Manifest.phase30_5ImplementationHead) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-HEAD' -Message 'Phase30.5 attestation repository HEAD mismatch.'
  }
  if ([string]$Attestation.target.environment -ne 'staging') {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-ENVIRONMENT' -Message 'Phase31 accepts staging attestation only.'
  }
  if ([string]$Attestation.target.projectRef -ne $TargetProjectRef) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-PROJECT' -Message 'Declared target project ref does not match Phase30.5 evidence.'
  }
  if ([string]$Attestation.target.classification -ne 'TARGET_EMPTY_COMPATIBLE') {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-CLASSIFICATION' -Message 'Target is not classified as empty and compatible.'
  }
  if ([string]$Attestation.target.connectionIdentityHash -ne $ConnectionIdentityHash) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-CONNECTION' -Message 'Current connection identity does not match Phase30.5 evidence.'
  }
  if ([string]$Attestation.phase30Bundle.manifestSha256 -ne [string]$BundleResult.ManifestSha256) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-ATTESTATION-BUNDLE' -Message 'Phase30.5 evidence is bound to a different Phase30 bundle manifest.'
  }

  return [pscustomobject]@{
    Evidence = $Attestation
    Path = $ResolvedAttestationPath
    Sha256 = Get-Phase31NormalizedSha256 -Path $ResolvedAttestationPath
  }
}

function Get-Phase31ObservedMigrationFiles {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][AllowEmptyString()][string[]] $Lines,
    [Parameter(Mandatory = $true)][string[]] $ExpectedFiles
  )
  $Observed = [System.Collections.Generic.List[string]]::new()
  foreach ($Line in @($Lines)) {
    foreach ($FileName in $ExpectedFiles) {
      $Pattern = '(?<![A-Za-z0-9_.-])' + [regex]::Escape($FileName) + '(?![A-Za-z0-9_.-])'
      if ($Line -match $Pattern) {
        $Observed.Add($FileName)
      }
    }
  }
  return @($Observed)
}

function Get-Phase31UnexpectedMigrationFiles {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][AllowEmptyString()][string[]] $Lines,
    [Parameter(Mandatory = $true)][string[]] $ExpectedFiles
  )
  $Observed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($Line in @($Lines)) {
    foreach ($Match in [regex]::Matches($Line, '(?<![A-Za-z0-9_.-])\d{14}_[A-Za-z0-9_.-]+\.sql(?![A-Za-z0-9_.-])')) {
      [void]$Observed.Add($Match.Value)
    }
  }
  return @($Observed | Where-Object { $ExpectedFiles -notcontains $_ } | Sort-Object)
}
