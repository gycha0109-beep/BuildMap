function Get-FinalFunctionDefinitions {
  param(
    [Parameter(Mandatory = $true)][object[]] $MigrationRows,
    [Parameter(Mandatory = $true)][string] $Root
  )
  $Definitions = @{}
  $Pattern = '(?is)create\s+or\s+replace\s+function\s+(?<name>public\.[a-z_][a-z0-9_]*)\s*\((?<args>.*?)\)\s*(?<attributes>.*?)\bas\s+\$\$'
  foreach ($Row in ($MigrationRows | Sort-Object Order)) {
    $FullPath = Join-Path $Root ([string]$Row.Path)
    $Text = Get-ExecutableSqlText -Text (Get-StrictUtf8Text -Path $FullPath)
    foreach ($Match in [regex]::Matches($Text, $Pattern)) {
      $Name = $Match.Groups['name'].Value.ToLowerInvariant()
      $Attributes = ($Match.Groups['attributes'].Value -replace '\s+',' ').Trim().ToLowerInvariant()
      $Definitions[$Name] = [pscustomobject]@{
        Name = $Name
        Attributes = $Attributes
        Path = [string]$Row.Path
        Order = [int]$Row.Order
      }
    }
  }
  return $Definitions
}

function Test-ProhibitedSqlPatterns {
  param(
    [Parameter(Mandatory = $true)][object[]] $MigrationRows,
    [Parameter(Mandatory = $true)][string] $Root,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  $Patterns = @(
    @{ Code='MIG29-DROP-TABLE'; Regex='(?is)\bdrop\s+table\b'; Message='DROP TABLE is not approved.' },
    @{ Code='MIG29-DROP-SCHEMA'; Regex='(?is)\bdrop\s+schema\b'; Message='DROP SCHEMA is not approved.' },
    @{ Code='MIG29-TRUNCATE'; Regex='(?is)\btruncate\b'; Message='TRUNCATE is not approved.' },
    @{ Code='MIG29-ALTER-TYPE'; Regex='(?is)\balter\s+table\b.*?\balter\s+column\b.*?\btype\b'; Message='ALTER COLUMN TYPE requires explicit data-conversion approval.' },
    @{ Code='MIG29-SET-NOT-NULL'; Regex='(?is)\balter\s+table\b.*?\balter\s+column\b.*?\bset\s+not\s+null\b'; Message='SET NOT NULL requires explicit existing-data proof.' },
    @{ Code='MIG29-GRANT-ALL'; Regex='(?is)\bgrant\s+all\b'; Message='GRANT ALL is prohibited.' },
    @{ Code='MIG29-GRANT-ALL-OBJECTS'; Regex='(?is)\bgrant\b.*?\bon\s+all\s+(tables|functions|sequences)\b'; Message='Bulk grants on all objects are prohibited.' },
    @{ Code='MIG29-PUBLIC-EXECUTE'; Regex='(?is)\bgrant\s+execute\s+on\s+function\b.*?\bto\s+public\b'; Message='Direct PUBLIC function EXECUTE grant is prohibited.' },
    @{ Code='MIG29-ALTER-DEFAULT-PRIV'; Regex='(?is)\balter\s+default\s+privileges\b'; Message='ALTER DEFAULT PRIVILEGES requires a separate approval decision.' },
    @{ Code='MIG29-REMOTE-URL'; Regex='(?is)(postgres|postgresql)://|supabase\.co'; Message='Remote database URL or hosted endpoint found in executable SQL.' }
  )

  foreach ($Row in $MigrationRows) {
    $FullPath = Join-Path $Root ([string]$Row.Path)
    $Executable = Get-ExecutableSqlText -Text (Get-StrictUtf8Text -Path $FullPath)
    foreach ($Rule in $Patterns) {
      if ($Executable -match $Rule.Regex) {
        Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code $Rule.Code -Path ([string]$Row.Path) -Message $Rule.Message
      }
    }
  }
}

function Test-FinalSecurityDefinerBoundary {
  param(
    [Parameter(Mandatory = $true)] $Definitions,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  foreach ($Definition in @($Definitions.Values | Sort-Object Name)) {
    if ($Definition.Attributes -notmatch '\bsecurity\s+definer\b') { continue }
    $Pinned = $Definition.Attributes -match '\bset\s+search_path\s*=\s*pg_catalog\s*,\s*pg_temp\b'
    if (-not $Pinned) {
      Add-Phase29Finding `
        -Findings $Findings `
        -Severity BLOCKER `
        -Code 'MIG29-UNPINNED-SECURITY-DEFINER' `
        -Path $Definition.Path `
        -Message "Final SECURITY DEFINER function is not pinned to pg_catalog, pg_temp: $($Definition.Name)"
    }
  }
}

function Get-RiskInventory {
  param(
    [Parameter(Mandatory = $true)][object[]] $MigrationRows,
    [Parameter(Mandatory = $true)][string] $Root
  )
  $Inventory = [ordered]@{
    CreateExtension = 0
    CreateTable = 0
    AddForeignKey = 0
    CreateIndex = 0
    CreateTrigger = 0
    DropPolicy = 0
    DropTrigger = 0
    Grant = 0
    Revoke = 0
    SecurityDefiner = 0
    OnDeleteCascade = 0
    OnDeleteSetNull = 0
  }
  foreach ($Row in $MigrationRows) {
    $Text = Get-ExecutableSqlText -Text (Get-StrictUtf8Text -Path (Join-Path $Root ([string]$Row.Path)))
    $Checks = @{
      CreateExtension = '(?i)\bcreate\s+extension\b'
      CreateTable = '(?i)\bcreate\s+table\b'
      AddForeignKey = '(?i)\bforeign\s+key\b'
      CreateIndex = '(?i)\bcreate\s+(?:unique\s+)?index\b'
      CreateTrigger = '(?i)\bcreate\s+trigger\b'
      DropPolicy = '(?i)\bdrop\s+policy\b'
      DropTrigger = '(?i)\bdrop\s+trigger\b'
      Grant = '(?i)\bgrant\b'
      Revoke = '(?i)\brevoke\b'
      SecurityDefiner = '(?i)\bsecurity\s+definer\b'
      OnDeleteCascade = '(?i)\bon\s+delete\s+cascade\b'
      OnDeleteSetNull = '(?i)\bon\s+delete\s+set\s+null\b'
    }
    foreach ($Key in $Checks.Keys) {
      $Inventory[$Key] += [regex]::Matches($Text, $Checks[$Key]).Count
    }
  }
  return [pscustomobject]$Inventory
}
