<# Read-only reconciliation for a staging target that already contains the exact protected Phase31 migration set. #>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $BundleManifestPath,
  [Parameter(Mandatory = $true)][string] $TargetAttestationPath,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9]{20}$')][string] $TargetProjectRef,
  [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string] $OperatorName,
  [switch] $TargetProjectIdentityConfirmed,
  [switch] $AuthorizedOperatorConfirmed,
  [switch] $CredentialHandlingConfirmed,
  [string] $OutputRoot = '.local-evidence/phase31-already-applied-staging-reconciliation'
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
. (Join-Path $ScriptDirectory 'phase31-common.ps1')
$Manifest = Get-Content -Raw -LiteralPath (Join-Path $ScriptDirectory 'phase31_controlled_staging_migration_manifest.json') | ConvertFrom-Json
$Findings = [System.Collections.Generic.List[object]]::new()
$ExpectedVersions = @($Manifest.migrations | Sort-Object order | ForEach-Object { [string]$_.version })
$ExpectedVersionCsv = $ExpectedVersions -join ','
$CatalogResult = $null
$Probe = @{}

. (Join-Path $ScriptDirectory 'phase31-runtime.ps1')

$PowerShell = (Get-Process -Id $PID).Path
$StaticOutput = @(& $PowerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ScriptDirectory 'run-phase31-static-gate.ps1') 2>&1)
$StaticExit = $LASTEXITCODE
$StaticOutput | ForEach-Object { Write-Host $_ }
if ($StaticExit -ne 0 -or @($StaticOutput | Where-Object { $_ -match '^Phase31StaticGateResult:\s*PASS\s*$' }).Count -ne 1) {
  Write-Error 'Phase31 static gate failed.'
  exit 1
}

Add-Phase31RequiredBlocker ([bool]$TargetProjectIdentityConfirmed) 'MIG31R-IDENTITY-CONFIRMATION' 'Target identity confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$AuthorizedOperatorConfirmed) 'MIG31R-OPERATOR-CONFIRMATION' 'Authorized operator confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$CredentialHandlingConfirmed) 'MIG31R-CREDENTIAL-CONFIRMATION' 'Credential handling confirmation is required.'

$Connection = Get-Phase31ProcessEnvironment @(
  'BUILDMAP_PHASE31_PGHOST',
  'BUILDMAP_PHASE31_PGPORT',
  'BUILDMAP_PHASE31_PGDATABASE',
  'BUILDMAP_PHASE31_PGUSER',
  'BUILDMAP_PHASE31_PGPASSWORD',
  'BUILDMAP_PHASE31_PGSSLMODE'
)
$Psql = Get-Command psql -ErrorAction SilentlyContinue
if ($null -eq $Psql) {
  Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31R-PSQL' -Message 'psql is required.'
}

$HostValue = [string]$Connection.BUILDMAP_PHASE31_PGHOST
$UserValue = [string]$Connection.BUILDMAP_PHASE31_PGUSER
$DatabaseValue = [string]$Connection.BUILDMAP_PHASE31_PGDATABASE
Add-Phase31RequiredBlocker (
  ($HostValue.IndexOf($TargetProjectRef,[StringComparison]::OrdinalIgnoreCase) -ge 0) -or
  ($UserValue.IndexOf($TargetProjectRef,[StringComparison]::OrdinalIgnoreCase) -ge 0)
) 'MIG31R-PROJECT-BINDING' 'PGHOST or PGUSER must contain the declared project ref.'
$ConnectionIdentityHash = Get-Phase31StringSha256 "$HostValue|$UserValue|$DatabaseValue"

$BundleResult = Test-Phase31Phase30Bundle -Root $Root -BundleManifestPath $BundleManifestPath -Manifest $Manifest -Findings $Findings
$Attestation = $null
$ResolvedAttestationPath = $null
if ($null -ne $BundleResult) {
  try {
    $ResolvedAttestationPath = Resolve-Phase31EvidencePath -Root $Root -Path $TargetAttestationPath
    $Attestation = Get-Content -Raw -LiteralPath $ResolvedAttestationPath | ConvertFrom-Json
  }
  catch {
    Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31R-ATTESTATION' -Message $_.Exception.Message
  }
}

if ($null -ne $Attestation) {
  if ([string]$Attestation.schemaVersion -ne '1.0' -or [string]$Attestation.phase -ne 'Phase30.5') {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-CONTRACT' -Message 'Phase30.5 evidence identity is invalid.'
  }
  if ([string]$Attestation.target.environment -ne 'staging' -or [string]$Attestation.target.projectRef -ne $TargetProjectRef) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-TARGET' -Message 'Phase30.5 evidence is bound to a different target.'
  }
  if ([string]$Attestation.target.connectionIdentityHash -ne $ConnectionIdentityHash) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-CONNECTION' -Message 'Current connection identity differs from the read-only Phase30.5 evidence.'
  }
  if ([string]$Attestation.phase30Bundle.manifestSha256 -ne [string]$BundleResult.ManifestSha256) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-BUNDLE' -Message 'Phase30.5 evidence is bound to a different Phase30 bundle.'
  }
  if (
    [string]$Attestation.probe.readOnlyResult -ne 'PASS' -or
    [string]$Attestation.probe.targetIdentityResult -ne 'PASS' -or
    [string]$Attestation.probe.extensionCompatibilityResult -ne 'PASS' -or
    [string]$Attestation.probe.privilegeCompatibilityResult -ne 'PASS'
  ) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-BASELINE' -Message 'Phase30.5 read-only identity/compatibility checks did not pass.'
  }
  $AttestationObjectCount = 0
  if (
    [int]$Attestation.probe.migrationHistoryCount -ne 11 -or
    [string]$Attestation.probe.migrationVersions -ne $ExpectedVersionCsv -or
    -not [int]::TryParse([string]$Attestation.probe.publicUserObjectCount,[ref]$AttestationObjectCount) -or
    $AttestationObjectCount -le 0
  ) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-ALREADY-APPLIED' -Message 'Phase30.5 evidence does not show the exact already-applied Phase31 history/object state.'
  }
  if (
    [string]$Attestation.target.classification -ne 'TARGET_CONFLICT_OR_NONEMPTY' -or
    [string]$Attestation.targetProjectAttestation -ne 'FAIL' -or
    [string]$Attestation.deploymentReadinessDecision -ne 'DEPLOYMENT_HOLD'
  ) {
    Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31R-ATTESTATION-EMPTY-ONLY-REJECTION' -Message 'Expected EMPTY_TARGET_ONLY rejection evidence is missing.'
  }
}

$RunId = [guid]::NewGuid().ToString()
$RunDirectory = Join-Path (Resolve-Phase31EvidencePath $Root $OutputRoot) "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$RunId"
New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null
$EvidencePath = Join-Path $RunDirectory 'phase31-already-applied-staging-reconciliation.json'
$ProbeLog = Join-Path $RunDirectory 'target-poststate-probe.log'

$MigrationHistoryResult = 'FAIL'
$CatalogReadinessResult = 'NOT_RUN'
$PostValidationResult = 'FAIL'
$ReconciliationResult = 'FAIL'

try {
  if (@($Findings | Where-Object { $_.Severity -in @('ERROR','BLOCKER') }).Count -gt 0) {
    throw 'Reconciliation preflight contract failed.'
  }

  $ProbeSql = Join-Path $Root ([string]$Manifest.targetProbeSqlPath)
  $ProbeExecution = Invoke-Phase31ReadOnlySql $ProbeSql $ProbeLog $Psql $Connection
  if ($ProbeExecution.ExitCode -ne 0) {
    throw 'Read-only current-state probe failed.'
  }
  $Probe = ConvertFrom-Phase31ProbeLines $ProbeExecution.Lines $Findings
  if (-not (Test-Phase31Probe $Probe after $DatabaseValue)) {
    throw 'Current staging state does not match the exact protected Phase31 poststate history/object contract.'
  }
  $MigrationHistoryResult = 'PASS'

  $CatalogResult = Invoke-Phase31CatalogValidation $Psql $Connection $RunDirectory
  $CatalogReadinessResult = $CatalogResult.Result
  if ($CatalogReadinessResult -ne 'PASS') {
    throw 'Phase29 catalog poststate validation did not pass 26/26.'
  }

  if (@($Findings | Where-Object { $_.Severity -in @('ERROR','BLOCKER') }).Count -gt 0) {
    throw 'Reconciliation findings contain blocking results.'
  }

  $PostValidationResult = 'PASS'
  $ReconciliationResult = 'PASS'
}
catch {
  Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31R-RECONCILIATION-ABORTED' -Message $_.Exception.Message
}

$Evidence = [ordered]@{
  schemaVersion = '1.0'
  phase = 'Phase31'
  executionMode = 'ALREADY_APPLIED_STAGING_RECONCILIATION'
  runId = $RunId
  generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
  repositoryHead = [string](@(& git -C $Root rev-parse HEAD 2>$null))[0]
  operatorName = $OperatorName
  target = [ordered]@{
    environment = 'staging'
    projectRef = $TargetProjectRef
    connectionIdentityHash = $ConnectionIdentityHash
    databaseName = $DatabaseValue
  }
  phase30Bundle = if ($BundleResult) {
    [ordered]@{
      manifestPath = $BundleResult.ManifestPath
      manifestSha256 = $BundleResult.ManifestSha256
      bundleId = [string]$BundleResult.Manifest.bundleId
    }
  } else { $null }
  phase30_5Evidence = if ($ResolvedAttestationPath) {
    [ordered]@{
      path = $ResolvedAttestationPath
      sha256 = Get-Phase31NormalizedSha256 $ResolvedAttestationPath
    }
  } else { $null }
  observed = [ordered]@{
    migrationHistoryCount = $Probe.MIGRATION_HISTORY_COUNT
    migrationVersions = $Probe.MIGRATION_VERSIONS
    publicUserObjectCount = $Probe.PUBLIC_USER_OBJECT_COUNT
  }
  catalog = if ($CatalogResult) {
    [ordered]@{
      result = $CatalogResult.Result
      observedScenarioCount = @($CatalogResult.Rows).Count
      missingIds = $CatalogResult.MissingIds
      unexpectedIds = $CatalogResult.UnexpectedIds
      duplicateIds = $CatalogResult.DuplicateIds
      conflictingIds = $CatalogResult.ConflictingIds
      logs = $CatalogResult.Logs
    }
  } else { $null }
  remoteMutationAttempted = $false
  migrationHistoryResult = $MigrationHistoryResult
  catalogReadinessResult = $CatalogReadinessResult
  postValidationResult = $PostValidationResult
  alreadyAppliedStagingReconciliationResult = $ReconciliationResult
  productionDeployment = 'OUT_OF_SCOPE'
  findings = @($Findings)
}
[IO.File]::WriteAllText(
  $EvidencePath,
  (($Evidence | ConvertTo-Json -Depth 12) + [Environment]::NewLine),
  [Text.UTF8Encoding]::new($false)
)

foreach ($Finding in $Findings) {
  Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Message)"
}
Write-Host "Phase31EvidencePath: $EvidencePath"
Write-Host 'Phase31ExecutionMode: ALREADY_APPLIED_STAGING_RECONCILIATION'
Write-Host 'RemoteMutationAttempted: false'
Write-Host "MigrationHistoryResult: $MigrationHistoryResult"
Write-Host "CatalogReadinessResult: $CatalogReadinessResult"
Write-Host "PostValidationResult: $PostValidationResult"
Write-Host "AlreadyAppliedStagingReconciliationResult: $ReconciliationResult"
Write-Host 'ProductionDeploymentDecision: OUT_OF_SCOPE'
if ($ReconciliationResult -ne 'PASS') {
  Write-Host 'Phase31GateResult: FAIL'
  exit 2
}
Write-Host 'Phase31GateResult: PASS'
exit 0
