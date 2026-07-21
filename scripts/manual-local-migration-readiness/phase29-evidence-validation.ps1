function Get-ExactlyOneEvidenceValue {
  param(
    [Parameter(Mandatory = $true)][string[]] $Lines,
    [Parameter(Mandatory = $true)][string] $Key,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings,
    [Parameter(Mandatory = $true)][string] $EvidenceType
  )
  $Rows = @($Lines | Where-Object { $_ -match ('^' + [regex]::Escape($Key) + ':\s*(?<value>.+?)\s*$') })
  if ($Rows.Count -ne 1) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-SHAPE' -Message "${EvidenceType} evidence requires exactly one ${Key} line; observed $($Rows.Count)."
    return $null
  }
  $null = $Rows[0] -match ('^' + [regex]::Escape($Key) + ':\s*(?<value>.+?)\s*$')
  return $Matches['value'].Trim()
}

function Test-Phase29Evidence {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][ValidateSet('FRESH_INSTALL_00_10','INCREMENTAL_00_09_TO_10')][string] $ExpectedType,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-MISSING' -Message "Evidence file not found: $Path"
    return $false
  }

  $Lines = @(Get-Content -LiteralPath $Path)
  $Required = @(
    'EvidenceType',
    'RemoteCommandsUsed',
    'MigrationOrderResult',
    'CatalogReadinessResult',
    'Phase20Result',
    'Phase25Result',
    'Phase27Result',
    'Phase28GateResult',
    'OverallResult'
  )
  $Values = @{}
  foreach ($Key in $Required) {
    $Values[$Key] = Get-ExactlyOneEvidenceValue -Lines $Lines -Key $Key -Findings $Findings -EvidenceType $ExpectedType
  }

  if ($Values['EvidenceType'] -ne $ExpectedType) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-TYPE' -Message "Expected EvidenceType $ExpectedType, observed $($Values['EvidenceType'])."
  }
  if ($Values['RemoteCommandsUsed'] -ne 'none') {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-REMOTE' -Message "$ExpectedType evidence does not attest RemoteCommandsUsed: none."
  }
  foreach ($Key in @('MigrationOrderResult','CatalogReadinessResult','Phase20Result','Phase25Result','Phase27Result','Phase28GateResult','OverallResult')) {
    if ($Values[$Key] -ne 'PASS') {
      Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-NOT-PASS' -Message "$ExpectedType $Key is not PASS: $($Values[$Key])"
    }
  }
  return $true
}
