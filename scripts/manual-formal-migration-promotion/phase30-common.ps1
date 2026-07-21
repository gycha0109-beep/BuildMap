function Add-Phase30Finding {
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

function Get-Phase30NormalizedRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  return ($Path -replace '\\','/').Trim()
}

function Test-Phase30SafeRelativePath {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Normalized = Get-Phase30NormalizedRelativePath -Path $Path
  if ([string]::IsNullOrWhiteSpace($Normalized)) { return $false }
  if ([System.IO.Path]::IsPathRooted($Normalized)) { return $false }
  if ($Normalized -match '^[A-Za-z]:') { return $false }
  if ($Normalized -match '(^|/)\.\.(/|$)') { return $false }
  return $true
}

function Get-Phase30RepositoryRoot {
  param([Parameter(Mandatory = $true)][string] $ScriptDirectory)
  $Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
  if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) {
    throw "BuildMap Git repository root was not found: $Root"
  }
  return $Root
}

function Get-Phase30StrictUtf8Text {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Bytes = [System.IO.File]::ReadAllBytes($Path)
  $Encoding = [System.Text.UTF8Encoding]::new($false, $true)
  $Text = $Encoding.GetString($Bytes)
  if ($Text.Length -gt 0 -and [int]$Text[0] -eq 0xFEFF) {
    $Text = $Text.Substring(1)
  }
  return $Text
}

function Get-Phase30NormalizedSha256 {
  param([Parameter(Mandatory = $true)][string] $Path)
  $Text = Get-Phase30StrictUtf8Text -Path $Path
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

function Get-Phase30TextSha256 {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string] $Text)
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

function Test-Phase30PowerShellParse {
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
    Add-Phase30Finding -Findings $Findings -Severity ERROR -Code 'MIG30-PS-PARSE' -Path $Path -Message $ParseError.Message
  }
}

function Invoke-Phase30PowerShellFile {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [AllowEmptyCollection()][string[]] $Arguments = @(),
    [Parameter(Mandatory = $true)][string] $CapturePath
  )
  $PowerShellExecutable = (Get-Process -Id $PID).Path
  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }

  try {
    $ErrorActionPreference = 'Continue'
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawOutput = @(& $PowerShellExecutable -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments 2>&1)
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
      else { $_.ToString() }
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

function Assert-Phase30ExactLine {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][AllowEmptyString()][string[]] $Lines,
    [Parameter(Mandatory = $true)][string] $Pattern,
    [Parameter(Mandatory = $true)][string] $Label
  )
  $Rows = @($Lines | Where-Object { $_ -match $Pattern })
  if ($Rows.Count -ne 1) {
    throw "${Label} requires exactly one matching line for pattern ${Pattern}; observed $($Rows.Count)."
  }
}
