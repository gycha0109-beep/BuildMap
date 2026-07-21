function Add-GateFailure {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures,
    [Parameter(Mandatory = $true)][string] $Message
  )
  $Failures.Add($Message)
}

function Get-NormalizedRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Normalized = ($Path -replace '\\', '/')
  while ($Normalized.StartsWith('./')) { $Normalized = $Normalized.Substring(2) }
  return $Normalized
}

function Test-SafeRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  if ([System.IO.Path]::IsPathRooted($Path)) { return $false }
  if ($Path -match ':') { return $false }
  if ($Path -match '(^|/)\.\.(/|$)') { return $false }
  if ($Path -match '[\x00-\x1F]') { return $false }
  return $true
}

function Get-NormalizedTextSha256 {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  $StrictUtf8 = [System.Text.UTF8Encoding]::new($false, $true)
  $Text = $StrictUtf8.GetString($Bytes)
  if ($Text.Length -gt 0 -and [int]$Text[0] -eq 0xFEFF) { $Text = $Text.Substring(1) }
  $Text = $Text.Replace("`r`n", "`n").Replace("`r", "`n")
  $Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  $Hasher = [System.Security.Cryptography.SHA256]::Create()
  try { $HashBytes = $Hasher.ComputeHash($Utf8NoBom.GetBytes($Text)) }
  finally { $Hasher.Dispose() }
  return (($HashBytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function Test-PowerShellParse {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[string]] $Failures
  )
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Add-GateFailure -Failures $Failures -Message "PowerShell parse target missing: $Path"
    return
  }
  $Tokens = $null
  $ParseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$ParseErrors) | Out-Null
  foreach ($ParseError in @($ParseErrors)) {
    Add-GateFailure -Failures $Failures -Message "PowerShell parse failure: $Path :: $($ParseError.Message)"
  }
}

function Get-UniqueScenarioIds {
  param(
    [Parameter(Mandatory = $true)][string] $Text,
    [Parameter(Mandatory = $true)][string] $Pattern
  )
  return @(
    [regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase) |
      ForEach-Object { $_.Value.ToUpperInvariant() } |
      Sort-Object -Unique
  )
}

function Resolve-LogPath {
  param(
    [Parameter(Mandatory = $true)][string] $Candidate,
    [Parameter(Mandatory = $true)][string] $Root
  )
  if ([System.IO.Path]::IsPathRooted($Candidate)) { return [System.IO.Path]::GetFullPath($Candidate) }
  return [System.IO.Path]::GetFullPath((Join-Path $Root $Candidate))
}

function Compare-StringSet {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Expected,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]] $Observed
  )
  $ExpectedUnique = @($Expected | Sort-Object -Unique)
  $ObservedUnique = @($Observed | Sort-Object -Unique)
  return [pscustomobject]@{
    Missing = @($ExpectedUnique | Where-Object { $ObservedUnique -notcontains $_ })
    Extra = @($ObservedUnique | Where-Object { $ExpectedUnique -notcontains $_ })
    ExpectedUnique = $ExpectedUnique
    ObservedUnique = $ObservedUnique
  }
}
