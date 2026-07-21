function Get-ExactlyOneEvidenceValue {
  param(
    [Parameter(Mandatory = $true)][string[]] $Lines,
    [Parameter(Mandatory = $true)][string] $Key,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings,
    [Parameter(Mandatory = $true)][string] $EvidenceType
  )
  $Rows = @($Lines | Where-Object { $_ -match ('^' + [regex]::Escape($Key) + ':\s*(?<value>.*?)\s*$') })
  if ($Rows.Count -ne 1) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-SHAPE' -Message "${EvidenceType} evidence requires exactly one ${Key} line; observed $($Rows.Count)."
    return $null
  }
  $null = $Rows[0] -match ('^' + [regex]::Escape($Key) + ':\s*(?<value>.*?)\s*$')
  return $Matches['value'].Trim()
}

function Get-Phase29EvidenceContractDigest {
  param([Parameter(Mandatory = $true)][string[]] $Lines)
  $Text = $Lines -join "`n"
  $Bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Text)
  $Hash = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($Hash.ComputeHash($Bytes)) -replace '-','').ToLowerInvariant()
  }
  finally { $Hash.Dispose() }
}

function Get-Phase29ManifestEvidenceContract {
  param([Parameter(Mandatory = $true)] $Manifest)

  $MigrationLines = @(
    $Manifest.migrations |
      Sort-Object { [int]$_.order } |
      ForEach-Object { "$([int]$_.order)|$([string]$_.path)|$(([string]$_.sha256).ToLowerInvariant())" }
  )
  $GateLines = @(
    $Manifest.protectedGateFiles |
      Sort-Object { [string]$_.path } |
      ForEach-Object { "$([string]$_.path)|$(([string]$_.sha256).ToLowerInvariant())" }
  )
  return [pscustomobject]@{
    BaselineId = [string]$Manifest.phase28Baseline.baselineId
    MigrationSetDigest = Get-Phase29EvidenceContractDigest -Lines $MigrationLines
    ProtectedGateSetDigest = Get-Phase29EvidenceContractDigest -Lines $GateLines
  }
}

function Test-Phase29Evidence {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][ValidateSet('FRESH_INSTALL_00_10','INCREMENTAL_00_09_TO_10')][string] $ExpectedType,
    [Parameter(Mandatory = $true)][string] $ExpectedRepositoryHead,
    [Parameter(Mandatory = $true)][string] $ExpectedBaselineId,
    [Parameter(Mandatory = $true)][string] $ExpectedMigrationSetDigest,
    [Parameter(Mandatory = $true)][string] $ExpectedProtectedGateSetDigest,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][System.Collections.Generic.List[object]] $Findings
  )
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-MISSING' -Message "Evidence file not found: $Path"
    return $null
  }

  $Lines = @(Get-Content -LiteralPath $Path)
  $Required = @(
    'EvidenceSchemaVersion',
    'EvidenceType',
    'RunId',
    'GeneratedAtUtc',
    'RepositoryHead',
    'RepositoryTrackedState',
    'RemoteCommandsUsed',
    'SupabaseCliVersion',
    'DockerVersion',
    'LocalContainer',
    'BaselineId',
    'MigrationSetDigest',
    'ProtectedGateSetDigest',
    'ReplayMode',
    'MigrationHistoryBefore',
    'MigrationHistoryAfter',
    'MigrationOrderResult',
    'PreUpgradeResult',
    'IncrementalAppliedVersions',
    'CatalogReadinessResult',
    'Phase20Result',
    'Phase25Result',
    'Phase27Result',
    'Phase28GateResult',
    'Phase28PassLogValidation',
    'OverallResult'
  )
  $Values = @{}
  foreach ($Key in $Required) {
    $Values[$Key] = Get-ExactlyOneEvidenceValue -Lines $Lines -Key $Key -Findings $Findings -EvidenceType $ExpectedType
  }

  if ($Values['EvidenceSchemaVersion'] -ne '2.0') {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-SCHEMA' -Message "$ExpectedType evidence schema must be 2.0."
  }
  if ($Values['EvidenceType'] -ne $ExpectedType) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-TYPE' -Message "Expected EvidenceType $ExpectedType, observed $($Values['EvidenceType'])."
  }
  if ($Values['RunId'] -notmatch '^[0-9a-fA-F-]{36}$') {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-RUN-ID' -Message "$ExpectedType RunId is not a GUID."
  }
  $ParsedTimestamp = [DateTimeOffset]::MinValue
  if (-not [DateTimeOffset]::TryParse([string]$Values['GeneratedAtUtc'], [ref]$ParsedTimestamp)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-TIMESTAMP' -Message "$ExpectedType GeneratedAtUtc is invalid."
  }
  elseif ($ParsedTimestamp -gt [DateTimeOffset]::UtcNow.AddMinutes(5)) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-TIMESTAMP' -Message "$ExpectedType GeneratedAtUtc is in the future."
  }
  if ($Values['RepositoryHead'] -ne $ExpectedRepositoryHead) {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-HEAD' -Message "$ExpectedType evidence was generated for a different repository HEAD."
  }
  if ($Values['RepositoryTrackedState'] -ne 'CLEAN') {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-WORKTREE' -Message "$ExpectedType evidence does not attest a clean tracked working tree."
  }
  if ($Values['RemoteCommandsUsed'] -ne 'none') {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-REMOTE' -Message "$ExpectedType evidence does not attest RemoteCommandsUsed: none."
  }
  if ([string]::IsNullOrWhiteSpace($Values['SupabaseCliVersion']) -or [string]::IsNullOrWhiteSpace($Values['DockerVersion'])) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-TOOL-VERSION' -Message "$ExpectedType tool version evidence is incomplete."
  }
  if ($Values['LocalContainer'] -notmatch '^supabase_db_') {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-CONTAINER' -Message "$ExpectedType did not use a recognized local Supabase container."
  }
  if ($Values['BaselineId'] -ne $ExpectedBaselineId) {
    Add-Phase29Finding -Findings $Findings -Severity ERROR -Code 'MIG29-EVIDENCE-BASELINE' -Message "$ExpectedType baseline ID mismatch."
  }
  if ($Values['MigrationSetDigest'] -ne $ExpectedMigrationSetDigest) {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-MIGRATION-DIGEST' -Message "$ExpectedType migration-set digest mismatch."
  }
  if ($Values['ProtectedGateSetDigest'] -ne $ExpectedProtectedGateSetDigest) {
    Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-GATE-DIGEST' -Message "$ExpectedType protected-gate digest mismatch."
  }

  $AllVersions = '20260708000000,20260708001000,20260708002000,20260708003000,20260708004000,20260708005000,20260708006000,20260708007000,20260708008000,20260720000000,20260721000000'
  $BeforeVersions = '20260708000000,20260708001000,20260708002000,20260708003000,20260708004000,20260708005000,20260708006000,20260708007000,20260708008000,20260720000000'
  if ($ExpectedType -eq 'FRESH_INSTALL_00_10') {
    if ($Values['ReplayMode'] -ne 'FRESH_RESET_ALL_00_10' -or
        $Values['MigrationHistoryBefore'] -ne 'none' -or
        $Values['MigrationHistoryAfter'] -ne $AllVersions -or
        $Values['PreUpgradeResult'] -ne 'NOT_APPLICABLE' -or
        $Values['IncrementalAppliedVersions'] -ne 'none') {
      Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-FRESH-CONTRACT' -Message 'Fresh-install evidence path contract mismatch.'
    }
  }
  else {
    if ($Values['ReplayMode'] -ne 'INCREMENTAL_RESET_00_09_THEN_UP_10' -or
        $Values['MigrationHistoryBefore'] -ne $BeforeVersions -or
        $Values['MigrationHistoryAfter'] -ne $AllVersions -or
        $Values['PreUpgradeResult'] -ne 'PASS' -or
        $Values['IncrementalAppliedVersions'] -ne '20260721000000') {
      Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-INCREMENTAL-CONTRACT' -Message 'Incremental evidence path contract mismatch.'
    }
  }

  foreach ($Key in @(
    'MigrationOrderResult',
    'CatalogReadinessResult',
    'Phase20Result',
    'Phase25Result',
    'Phase27Result',
    'Phase28GateResult',
    'Phase28PassLogValidation',
    'OverallResult'
  )) {
    if ($Values[$Key] -ne 'PASS') {
      Add-Phase29Finding -Findings $Findings -Severity BLOCKER -Code 'MIG29-EVIDENCE-NOT-PASS' -Message "$ExpectedType $Key is not PASS: $($Values[$Key])"
    }
  }

  return [pscustomobject]@{
    EvidenceType = $ExpectedType
    RunId = [string]$Values['RunId']
    RepositoryHead = [string]$Values['RepositoryHead']
  }
}
