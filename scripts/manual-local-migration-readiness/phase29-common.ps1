function Add-Phase29Finding {
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

function Get-NormalizedRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  return ($Path -replace '\\','/').Trim()
}

function Get-CompatibleRelativePath {
  param(
    [Parameter(Mandatory = $true)][string] $BasePath,
    [Parameter(Mandatory = $true)][string] $TargetPath
  )

  $BaseFullPath = [System.IO.Path]::GetFullPath($BasePath)
  $TargetFullPath = [System.IO.Path]::GetFullPath($TargetPath)
  $DirectorySeparator = [System.IO.Path]::DirectorySeparatorChar

  if (-not $BaseFullPath.EndsWith([string]$DirectorySeparator)) {
    $BaseFullPath += $DirectorySeparator
  }

  $BaseUri = [System.Uri]::new($BaseFullPath)
  $TargetUri = [System.Uri]::new($TargetFullPath)

  if ($BaseUri.Scheme -ne $TargetUri.Scheme) {
    throw "Cannot calculate a relative path across URI schemes: $BaseFullPath -> $TargetFullPath"
  }

  $RelativeUri = $BaseUri.MakeRelativeUri($TargetUri)
  $RelativePath = [System.Uri]::UnescapeDataString($RelativeUri.ToString())
  return Get-NormalizedRelativePath -Path $RelativePath
}

function Test-SafeRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Normalized = Get-NormalizedRelativePath -Path $Path
  if ([string]::IsNullOrWhiteSpace($Normalized)) { return $false }
  if ([System.IO.Path]::IsPathRooted($Normalized)) { return $false }
  if ($Normalized -match '^[A-Za-z]:') { return $false }
  if ($Normalized -match '(^|/)\.\.(/|$)') { return $false }
  return $true
}

function Get-StrictUtf8Text {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  $Encoding = [System.Text.UTF8Encoding]::new($false, $true)
  $Text = $Encoding.GetString($Bytes)
  if ($Text.Length -gt 0 -and [int]$Text[0] -eq 0xFEFF) {
    $Text = $Text.Substring(1)
  }
  return $Text
}

function Get-NormalizedSha256 {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Text = Get-StrictUtf8Text -Path $Path
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

function Get-ExecutableSqlText {
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

function Test-PowerShellParse {
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
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-PS-PARSE' -Path $Path -Message $ParseError.Message
  }
}
