<#
Run the Phase30.5 read-only target-project attestation.
No SQL mutation, Supabase deployment, migration repair, or Docker command is performed.
Credentials are read only from dedicated process environment variables and are never printed.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $BundleManifestPath,
  [Parameter(Mandatory = $true)][ValidateSet('staging','production')][string] $TargetEnvironment,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9]{20}$')][string] $TargetProjectRef,
  [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string] $OperatorName,
  [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string] $MaintenanceWindow,
  [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string] $RecoveryPlanReference,
  [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string] $RollbackOwner,
  [switch] $TargetProjectIdentityConfirmed,
  [switch] $BackupOrRecoveryConfirmed,
  [switch] $MaintenanceWindowConfirmed,
  [switch] $RollbackOwnerConfirmed,
  [switch] $AuthorizedOperatorConfirmed,
  [switch] $CredentialHandlingConfirmed,
  [switch] $ProductionApprovalConfirmed,
  [string] $OutputRoot = '.local-evidence/phase30-5-target-attestation'
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
. (Join-Path $ScriptDirectory 'phase30-5-common.ps1')

$ManifestPath = Join-Path $ScriptDirectory 'phase30-5_target_project_attestation_manifest.json'
$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$Findings = [System.Collections.Generic.List[object]]::new()

$PowerShellExecutable = (Get-Process -Id $PID).Path
$StaticGatePath = Join-Path $ScriptDirectory 'run-phase30-5-static-gate.ps1'
$StaticOutput = @(& $PowerShellExecutable -NoProfile -ExecutionPolicy Bypass -File $StaticGatePath 2>&1)
$StaticExit = $LASTEXITCODE
foreach ($Line in $StaticOutput) { Write-Host $Line }
if ($StaticExit -ne 0 -or @($StaticOutput | Where-Object { $_ -match '^Phase30\.5StaticGateResult:\s*PASS\s*$' }).Count -ne 1) {
  Write-Error 'Phase30.5 static gate failed.'
  exit 1
}

$BundleResult = Test-Phase305Phase30Bundle `
  -Root $Root `
  -BundleManifestPath $BundleManifestPath `
  -Manifest $Manifest `
  -Findings $Findings

if ($null -eq $BundleResult) {
  Write-Error 'Phase30 bundle validation failed.'
  exit 1
}

$RequiredEnvironmentVariables = @(
  'BUILDMAP_PHASE305_PGHOST',
  'BUILDMAP_PHASE305_PGPORT',
  'BUILDMAP_PHASE305_PGDATABASE',
  'BUILDMAP_PHASE305_PGUSER',
  'BUILDMAP_PHASE305_PGPASSWORD',
  'BUILDMAP_PHASE305_PGSSLMODE'
)
$Connection = @{}
foreach ($VariableName in $RequiredEnvironmentVariables) {
  $Value = [Environment]::GetEnvironmentVariable($VariableName, 'Process')
  if ([string]::IsNullOrWhiteSpace($Value)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-CONNECTION-ENV' -Message "Missing process environment variable: $VariableName"
  }
  else {
    $Connection[$VariableName] = $Value
  }
}

if ($Findings.Count -gt 0) {
  foreach ($Finding in $Findings) {
    Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Message)"
  }
  Write-Host 'TargetProjectAttestation: FAIL'
  Write-Host 'DeploymentReadinessDecision: DEPLOYMENT_HOLD'
  Write-Host 'Phase30.5GateResult: FAIL'
  exit 1
}

$HostValue = [string]$Connection['BUILDMAP_PHASE305_PGHOST']
$UserValue = [string]$Connection['BUILDMAP_PHASE305_PGUSER']
$DatabaseValue = [string]$Connection['BUILDMAP_PHASE305_PGDATABASE']
$ProjectRefBound = (
  $HostValue.IndexOf($TargetProjectRef, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
  $UserValue.IndexOf($TargetProjectRef, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
)
if (-not $ProjectRefBound) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PROJECT-REF-BINDING' -Message 'Neither PGHOST nor PGUSER contains the declared Supabase project ref.'
}

if (-not $TargetProjectIdentityConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-IDENTITY-CONFIRMATION' -Message 'Target-project identity confirmation is required.'
}
if (-not $BackupOrRecoveryConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-RECOVERY-CONFIRMATION' -Message 'Backup or recovery-plan confirmation is required.'
}
if (-not $MaintenanceWindowConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-WINDOW-CONFIRMATION' -Message 'Maintenance-window confirmation is required.'
}
if (-not $RollbackOwnerConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-ROLLBACK-OWNER' -Message 'Rollback-owner confirmation is required.'
}
if (-not $AuthorizedOperatorConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-OPERATOR-CONFIRMATION' -Message 'Authorized-operator confirmation is required.'
}
if (-not $CredentialHandlingConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-CREDENTIAL-CONFIRMATION' -Message 'Credential-handling confirmation is required.'
}
if ($TargetEnvironment -eq 'production' -and -not $ProductionApprovalConfirmed) {
  Add-Phase305Finding -Findings $Findings -Severity BLOCKER -Code 'MIG305-PRODUCTION-APPROVAL' -Message 'Production approval confirmation is required for a production target.'
}

$Psql = Get-Command psql -ErrorAction SilentlyContinue
if ($null -eq $Psql) {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PSQL' -Message 'psql is required on the user-local machine.'
}

$ResolvedOutputRoot = Resolve-Phase305EvidencePath -Root $Root -Path $OutputRoot
$RunId = [guid]::NewGuid().ToString()
$RunDirectory = Join-Path $ResolvedOutputRoot "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$RunId"
New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null
$ProbeLogPath = Join-Path $RunDirectory 'target-probe.log'
$EvidencePath = Join-Path $RunDirectory 'phase30-5-target-attestation.json'

if (@($Findings | Where-Object { $_.Severity -in @('ERROR','BLOCKER') }).Count -gt 0) {
  foreach ($Finding in $Findings) {
    Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Message)"
  }
  Write-Host "TargetEvidencePath: $EvidencePath"
  Write-Host 'TargetProjectAttestation: FAIL'
  Write-Host 'DeploymentReadinessDecision: DEPLOYMENT_HOLD'
  Write-Host 'Phase30.5GateResult: FAIL'
  exit 1
}

$OriginalPgValues = @{}
foreach ($Name in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGOPTIONS')) {
  $OriginalPgValues[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process')
}

try {
  [Environment]::SetEnvironmentVariable('PGHOST', [string]$Connection['BUILDMAP_PHASE305_PGHOST'], 'Process')
  [Environment]::SetEnvironmentVariable('PGPORT', [string]$Connection['BUILDMAP_PHASE305_PGPORT'], 'Process')
  [Environment]::SetEnvironmentVariable('PGDATABASE', [string]$Connection['BUILDMAP_PHASE305_PGDATABASE'], 'Process')
  [Environment]::SetEnvironmentVariable('PGUSER', [string]$Connection['BUILDMAP_PHASE305_PGUSER'], 'Process')
  [Environment]::SetEnvironmentVariable('PGPASSWORD', [string]$Connection['BUILDMAP_PHASE305_PGPASSWORD'], 'Process')
  [Environment]::SetEnvironmentVariable('PGSSLMODE', [string]$Connection['BUILDMAP_PHASE305_PGSSLMODE'], 'Process')
  [Environment]::SetEnvironmentVariable(
    'PGOPTIONS',
    '-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000',
    'Process'
  )

  $ProbeSqlPath = Join-Path $Root ([string]$Manifest.probeSqlPath)
  $PreviousErrorActionPreference = $ErrorActionPreference
  $HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
  if ($HasNativePreference) { $PreviousNativePreference = $PSNativeCommandUseErrorActionPreference }
  try {
    $ErrorActionPreference = 'Continue'
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $false }
    $RawProbeOutput = @(& $Psql.Source -X --no-psqlrc --set ON_ERROR_STOP=1 --file $ProbeSqlPath 2>&1)
    $ProbeExit = $LASTEXITCODE
  }
  finally {
    if ($HasNativePreference) { $PSNativeCommandUseErrorActionPreference = $PreviousNativePreference }
    $ErrorActionPreference = $PreviousErrorActionPreference
  }
}
finally {
  foreach ($Name in $OriginalPgValues.Keys) {
    [Environment]::SetEnvironmentVariable($Name, $OriginalPgValues[$Name], 'Process')
  }
}

$ProbeLines = @(
  $RawProbeOutput | ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) {
      if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { $_.ToString() }
    }
    else {
      $_.ToString()
    }
  }
)
[System.IO.File]::WriteAllLines($ProbeLogPath, $ProbeLines, [System.Text.UTF8Encoding]::new($false))

if ($ProbeExit -ne 0) {
  Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROBE-EXECUTION' -Message "Read-only target probe failed with exit code $ProbeExit."
}

$Probe = ConvertFrom-Phase305ProbeLines -Lines $ProbeLines -Findings $Findings
$RequiredProbeKeys = @(
  'TRANSACTION_READ_ONLY',
  'SERVER_VERSION_NUM',
  'SERVER_VERSION',
  'DATABASE_NAME',
  'CURRENT_USER',
  'PUBLIC_SCHEMA_EXISTS',
  'AUTH_SCHEMA_EXISTS',
  'EXTENSIONS_SCHEMA_EXISTS',
  'PGCRYPTO_AVAILABLE',
  'PGCRYPTO_INSTALLED',
  'DATABASE_CREATE_PRIVILEGE',
  'PUBLIC_CREATE_PRIVILEGE',
  'AUTH_USAGE_PRIVILEGE',
  'MIGRATION_TABLE_EXISTS',
  'MIGRATION_HISTORY_COUNT',
  'MIGRATION_VERSIONS',
  'PUBLIC_RELATION_COUNT',
  'PUBLIC_FUNCTION_COUNT',
  'PUBLIC_POLICY_COUNT',
  'PUBLIC_TRIGGER_COUNT',
  'PUBLIC_TYPE_COUNT',
  'PUBLIC_USER_OBJECT_COUNT'
)
foreach ($Key in $RequiredProbeKeys) {
  if (-not $Probe.ContainsKey($Key)) {
    Add-Phase305Finding -Findings $Findings -Severity ERROR -Code 'MIG305-PROBE-MISSING-KEY' -Message "Missing probe key: $Key"
  }
}

function Test-Phase305ProbeTrue {
  param([hashtable] $ProbeValues, [string] $Key)
  return $ProbeValues.ContainsKey($Key) -and ([string]$ProbeValues[$Key]).ToLowerInvariant() -eq 'true'
}

$ReadOnlyResult = if ($Probe.ContainsKey('TRANSACTION_READ_ONLY') -and [string]$Probe['TRANSACTION_READ_ONLY'] -eq 'on') { 'PASS' } else { 'FAIL' }
$TargetIdentityResult = if (
  $ProjectRefBound -and
  $TargetProjectIdentityConfirmed -and
  $Probe.ContainsKey('DATABASE_NAME') -and
  [string]$Probe['DATABASE_NAME'] -eq $DatabaseValue
) { 'PASS' } else { 'FAIL' }

$ServerVersionCompatible = $false
if ($Probe.ContainsKey('SERVER_VERSION_NUM')) {
  $ServerVersionNumber = 0
  if ([int]::TryParse([string]$Probe['SERVER_VERSION_NUM'], [ref]$ServerVersionNumber)) {
    $ServerVersionCompatible = $ServerVersionNumber -ge [int]$Manifest.minimumServerVersionNum
  }
}
$ExtensionCompatibilityResult = if (
  $ServerVersionCompatible -and
  (Test-Phase305ProbeTrue -ProbeValues $Probe -Key 'PUBLIC_SCHEMA_EXISTS') -and
  (Test-Phase305ProbeTrue -ProbeValues $Probe -Key 'AUTH_SCHEMA_EXISTS') -and
  (Test-Phase305ProbeTrue -ProbeValues $Probe -Key 'PGCRYPTO_AVAILABLE')
) { 'PASS' } else { 'FAIL' }

$PrivilegeCompatibilityResult = if (
  (Test-Phase305ProbeTrue -ProbeValues $Probe -Key 'DATABASE_CREATE_PRIVILEGE') -and
  (Test-Phase305ProbeTrue -ProbeValues $Probe -Key 'PUBLIC_CREATE_PRIVILEGE') -and
  (Test-Phase305ProbeTrue -ProbeValues $Probe -Key 'AUTH_USAGE_PRIVILEGE')
) { 'PASS' } else { 'FAIL' }

$MigrationHistoryResult = 'FAIL'
$MigrationHistoryCount = -1
if ($Probe.ContainsKey('MIGRATION_HISTORY_COUNT') -and [int]::TryParse([string]$Probe['MIGRATION_HISTORY_COUNT'], [ref]$MigrationHistoryCount)) {
  if ($MigrationHistoryCount -eq 0 -and [string]$Probe['MIGRATION_VERSIONS'] -eq '') {
    $MigrationHistoryResult = 'PASS'
  }
}

$ObjectCollisionResult = 'FAIL'
$PublicObjectCount = -1
if ($Probe.ContainsKey('PUBLIC_USER_OBJECT_COUNT') -and [int]::TryParse([string]$Probe['PUBLIC_USER_OBJECT_COUNT'], [ref]$PublicObjectCount)) {
  if ($PublicObjectCount -eq 0) {
    $ObjectCollisionResult = 'PASS'
  }
}

$BackupReadinessResult = if ($BackupOrRecoveryConfirmed -and -not [string]::IsNullOrWhiteSpace($RecoveryPlanReference)) { 'PASS' } else { 'FAIL' }
$OperationalReadinessResult = if (
  $MaintenanceWindowConfirmed -and
  $RollbackOwnerConfirmed -and
  $AuthorizedOperatorConfirmed -and
  $CredentialHandlingConfirmed -and
  ($TargetEnvironment -ne 'production' -or $ProductionApprovalConfirmed)
) { 'PASS' } else { 'FAIL' }

$TargetClassification = if ($MigrationHistoryResult -eq 'PASS' -and $ObjectCollisionResult -eq 'PASS') {
  'TARGET_EMPTY_COMPATIBLE'
}
else {
  'TARGET_CONFLICT_OR_NONEMPTY'
}

$TargetProjectAttestation = 'PASS'
foreach ($ResultValue in @(
  $ReadOnlyResult,
  $TargetIdentityResult,
  $ExtensionCompatibilityResult,
  $PrivilegeCompatibilityResult,
  $MigrationHistoryResult,
  $ObjectCollisionResult,
  $BackupReadinessResult,
  $OperationalReadinessResult
)) {
  if ($ResultValue -ne 'PASS') {
    $TargetProjectAttestation = 'FAIL'
  }
}
if (@($Findings | Where-Object { $_.Severity -in @('ERROR','BLOCKER') }).Count -gt 0) {
  $TargetProjectAttestation = 'FAIL'
}

$DeploymentReadinessDecision = if ($TargetProjectAttestation -eq 'PASS') { 'DEPLOYMENT_READY' } else { 'DEPLOYMENT_HOLD' }

$Evidence = [ordered]@{
  schemaVersion = '1.0'
  phase = 'Phase30.5'
  runId = $RunId
  generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
  repositoryHead = (@(& (Get-Command git).Source -C $Root rev-parse HEAD))[0].ToLowerInvariant()
  phase30MergeCommit = [string]$Manifest.phase30MergeCommit
  phase30PromotionHead = [string]$Manifest.phase30PromotionHead
  phase30Bundle = [ordered]@{
    manifestPath = $BundleResult.ManifestPath
    manifestSha256 = $BundleResult.ManifestSha256
    bundleId = [string]$BundleResult.Manifest.bundleId
  }
  target = [ordered]@{
    environment = $TargetEnvironment
    projectRef = $TargetProjectRef
    connectionIdentityHash = Get-Phase305StringSha256 -Value "$HostValue|$UserValue|$DatabaseValue"
    databaseName = if ($Probe.ContainsKey('DATABASE_NAME')) { [string]$Probe['DATABASE_NAME'] } else { '' }
    currentUserHash = if ($Probe.ContainsKey('CURRENT_USER')) { Get-Phase305StringSha256 -Value ([string]$Probe['CURRENT_USER']) } else { '' }
    serverVersion = if ($Probe.ContainsKey('SERVER_VERSION')) { [string]$Probe['SERVER_VERSION'] } else { '' }
    classification = $TargetClassification
  }
  operationalAttestation = [ordered]@{
    operatorName = $OperatorName
    maintenanceWindow = $MaintenanceWindow
    recoveryPlanReference = $RecoveryPlanReference
    rollbackOwner = $RollbackOwner
    targetProjectIdentityConfirmed = [bool]$TargetProjectIdentityConfirmed
    backupOrRecoveryConfirmed = [bool]$BackupOrRecoveryConfirmed
    maintenanceWindowConfirmed = [bool]$MaintenanceWindowConfirmed
    rollbackOwnerConfirmed = [bool]$RollbackOwnerConfirmed
    authorizedOperatorConfirmed = [bool]$AuthorizedOperatorConfirmed
    credentialHandlingConfirmed = [bool]$CredentialHandlingConfirmed
    productionApprovalConfirmed = [bool]$ProductionApprovalConfirmed
  }
  probe = [ordered]@{
    readOnlyResult = $ReadOnlyResult
    targetIdentityResult = $TargetIdentityResult
    extensionCompatibilityResult = $ExtensionCompatibilityResult
    privilegeCompatibilityResult = $PrivilegeCompatibilityResult
    migrationHistoryResult = $MigrationHistoryResult
    objectCollisionResult = $ObjectCollisionResult
    backupReadinessResult = $BackupReadinessResult
    operationalReadinessResult = $OperationalReadinessResult
    migrationHistoryCount = $MigrationHistoryCount
    migrationVersions = if ($Probe.ContainsKey('MIGRATION_VERSIONS')) { [string]$Probe['MIGRATION_VERSIONS'] } else { '' }
    publicUserObjectCount = $PublicObjectCount
    probeLogSha256 = Get-Phase305NormalizedSha256 -Path $ProbeLogPath
  }
  findings = @($Findings)
  targetProjectAttestation = $TargetProjectAttestation
  deploymentReadinessDecision = $DeploymentReadinessDecision
}
$EvidenceJson = $Evidence | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText(
  $EvidencePath,
  $EvidenceJson + [Environment]::NewLine,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "TargetEvidencePath: $EvidencePath"
Write-Host "ReadOnlyProbeResult: $ReadOnlyResult"
Write-Host "TargetProjectIdentityResult: $TargetIdentityResult"
Write-Host "TargetExtensionCompatibilityResult: $ExtensionCompatibilityResult"
Write-Host "TargetPrivilegeCompatibilityResult: $PrivilegeCompatibilityResult"
Write-Host "TargetMigrationHistoryResult: $MigrationHistoryResult"
Write-Host "TargetObjectCollisionResult: $ObjectCollisionResult"
Write-Host "BackupReadinessResult: $BackupReadinessResult"
Write-Host "OperationalReadinessResult: $OperationalReadinessResult"
Write-Host "TargetProjectClassification: $TargetClassification"
foreach ($Finding in $Findings) {
  Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Message)"
}
Write-Host "TargetProjectAttestation: $TargetProjectAttestation"
Write-Host "DeploymentReadinessDecision: $DeploymentReadinessDecision"

if ($TargetProjectAttestation -ne 'PASS') {
  Write-Host 'Phase30.5GateResult: FAIL'
  exit 2
}

Write-Host 'Phase30.5GateResult: PASS'
exit 0
