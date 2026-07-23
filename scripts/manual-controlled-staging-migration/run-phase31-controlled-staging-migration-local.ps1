<# Interactive, staging-only execution of the protected Phase30 migration bundle. #>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $BundleManifestPath,
  [Parameter(Mandatory = $true)][string] $TargetAttestationPath,
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
  [string] $OutputRoot = '.local-evidence/phase31-controlled-staging-migration'
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDirectory '../..')).Path
. (Join-Path $ScriptDirectory 'phase31-common.ps1')
$Manifest = Get-Content -Raw -LiteralPath (Join-Path $ScriptDirectory 'phase31_controlled_staging_migration_manifest.json') | ConvertFrom-Json
$Findings = [System.Collections.Generic.List[object]]::new()
$ExpectedFiles = @($Manifest.migrations | Sort-Object order | ForEach-Object { [string]$_.releaseFileName })
$ExpectedVersions = @($Manifest.migrations | Sort-Object order | ForEach-Object { [string]$_.version })
$ExpectedVersionCsv = $ExpectedVersions -join ','
$State = [ordered]@{
  dryRunResult='FAIL'; preExecutionStateResult='FAIL'; executionAttempted=$false; executionApproved=$false
  applyExitCode=$null; migrationHistoryResult='NOT_RUN'; catalogReadinessResult='NOT_RUN'
  postValidationResult='NOT_RUN'; controlledStagingMigrationResult='FAIL'; supabaseCliVersion=''
}
$PreProbe = @{}; $PostProbe = @{}; $CatalogResult = $null; $DryRunObserved = @(); $DryRunUnexpected = @()

. (Join-Path $ScriptDirectory 'phase31-runtime.ps1')
. (Join-Path $ScriptDirectory 'phase31-evidence.ps1')

$PowerShell = (Get-Process -Id $PID).Path
$StaticOutput = @(& $PowerShell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ScriptDirectory 'run-phase31-static-gate.ps1') 2>&1); $StaticExit = $LASTEXITCODE
$StaticOutput | ForEach-Object { Write-Host $_ }
if ($StaticExit -ne 0 -or @($StaticOutput | Where-Object { $_ -match '^Phase31StaticGateResult:\s*PASS\s*$' }).Count -ne 1) { Write-Error 'Phase31 static gate failed.'; exit 1 }

Add-Phase31RequiredBlocker ([bool]$TargetProjectIdentityConfirmed) 'MIG31-IDENTITY-CONFIRMATION' 'Target identity confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$BackupOrRecoveryConfirmed) 'MIG31-RECOVERY-CONFIRMATION' 'Backup/recovery confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$MaintenanceWindowConfirmed) 'MIG31-WINDOW-CONFIRMATION' 'Maintenance window confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$RollbackOwnerConfirmed) 'MIG31-ROLLBACK-CONFIRMATION' 'Rollback owner confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$AuthorizedOperatorConfirmed) 'MIG31-OPERATOR-CONFIRMATION' 'Authorized operator confirmation is required.'
Add-Phase31RequiredBlocker ([bool]$CredentialHandlingConfirmed) 'MIG31-CREDENTIAL-CONFIRMATION' 'Credential handling confirmation is required.'

$Connection = Get-Phase31ProcessEnvironment @('BUILDMAP_PHASE31_PGHOST','BUILDMAP_PHASE31_PGPORT','BUILDMAP_PHASE31_PGDATABASE','BUILDMAP_PHASE31_PGUSER','BUILDMAP_PHASE31_PGPASSWORD','BUILDMAP_PHASE31_PGSSLMODE','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD')
if ($Connection.BUILDMAP_PHASE31_PGPASSWORD -cne $Connection.SUPABASE_DB_PASSWORD) { Add-Phase31Finding -Findings $Findings -Severity BLOCKER -Code 'MIG31-PASSWORD-BINDING' -Message 'psql and CLI DB passwords differ.' }
$Supabase = Get-Command supabase -ErrorAction SilentlyContinue; $Psql = Get-Command psql -ErrorAction SilentlyContinue; $Git = Get-Command git -ErrorAction SilentlyContinue
if ($null -eq $Supabase) { Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-SUPABASE-CLI' -Message 'Supabase CLI is required.' }
if ($null -eq $Psql) { Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-PSQL' -Message 'psql is required.' }
if ($null -eq $Git) { Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-GIT' -Message 'git is required.' }
$HostValue=[string]$Connection.BUILDMAP_PHASE31_PGHOST; $UserValue=[string]$Connection.BUILDMAP_PHASE31_PGUSER; $DatabaseValue=[string]$Connection.BUILDMAP_PHASE31_PGDATABASE
Add-Phase31RequiredBlocker (($HostValue.IndexOf($TargetProjectRef,[StringComparison]::OrdinalIgnoreCase) -ge 0) -or ($UserValue.IndexOf($TargetProjectRef,[StringComparison]::OrdinalIgnoreCase) -ge 0)) 'MIG31-PROJECT-BINDING' 'PGHOST or PGUSER must contain the declared project ref.'
$ConnectionIdentityHash = Get-Phase31StringSha256 "$HostValue|$UserValue|$DatabaseValue"
$BundleResult = Test-Phase31Phase30Bundle -Root $Root -BundleManifestPath $BundleManifestPath -Manifest $Manifest -Findings $Findings
$AttestationResult = if ($null -ne $BundleResult) { Test-Phase31TargetAttestation -Root $Root -TargetAttestationPath $TargetAttestationPath -TargetProjectRef $TargetProjectRef -Manifest $Manifest -BundleResult $BundleResult -ConnectionIdentityHash $ConnectionIdentityHash -Findings $Findings } else { $null }

$RunId=[guid]::NewGuid().ToString(); $RunDirectory=Join-Path (Resolve-Phase31EvidencePath $Root $OutputRoot) "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$RunId"; $WorkDirectory=Join-Path $RunDirectory 'workdir'
New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null
$EvidencePath=Join-Path $RunDirectory 'phase31-controlled-staging-migration.json'
$Logs=[ordered]@{version=Join-Path $RunDirectory 'supabase-version.log';init=Join-Path $RunDirectory 'supabase-init.log';link=Join-Path $RunDirectory 'supabase-link.log';beforeList=Join-Path $RunDirectory 'migration-list-before.log';dryRun=Join-Path $RunDirectory 'db-push-dry-run.log';beforeProbe=Join-Path $RunDirectory 'target-probe-before.log';apply=Join-Path $RunDirectory 'db-push-apply.log';afterList=Join-Path $RunDirectory 'migration-list-after.log';afterProbe=Join-Path $RunDirectory 'target-probe-after.log'}

try {
  if (@($Findings | Where-Object { $_.Severity -in @('ERROR','BLOCKER') }).Count -gt 0) { throw 'Preflight contract failed.' }
  New-Item -ItemType Directory -Force -Path $WorkDirectory | Out-Null
  $Version = Invoke-Phase31Native { & $Supabase.Source --version } $Logs.version; if ($Version.ExitCode -ne 0) { throw 'Supabase CLI version failed.' }; $State.supabaseCliVersion=[string]$Version.Lines[0]
  $Init = Invoke-Phase31Native { & $Supabase.Source --workdir $WorkDirectory init --force } $Logs.init; if ($Init.ExitCode -ne 0) { throw 'Isolated workdir init failed.' }
  $MigrationDirectory=Join-Path $WorkDirectory 'supabase/migrations'; New-Item -ItemType Directory -Force -Path $MigrationDirectory | Out-Null; Get-ChildItem $MigrationDirectory -File -ErrorAction SilentlyContinue | Remove-Item -Force
  foreach ($Optional in @('supabase/seed.sql','supabase/roles.sql')) { $Path=Join-Path $WorkDirectory $Optional; if (Test-Path $Path) { Remove-Item $Path -Force } }
  foreach ($Row in @($BundleResult.Manifest.files | Sort-Object order)) { $Source=Join-Path $BundleResult.Root ([string]$Row.releasePath); $Destination=Join-Path $MigrationDirectory ([string]$Row.releaseFileName); [IO.File]::Copy($Source,$Destination,$true); if ((Get-Phase31NormalizedSha256 $Destination) -ne ([string]$Row.normalizedSha256).ToLowerInvariant()) { throw "Workdir hash mismatch: $Destination" } }
  $SavedPassword=[Environment]::GetEnvironmentVariable('SUPABASE_DB_PASSWORD','Process'); try { [Environment]::SetEnvironmentVariable('SUPABASE_DB_PASSWORD',$null,'Process'); $Link=Invoke-Phase31Native { '' | & $Supabase.Source --workdir $WorkDirectory link --project-ref $TargetProjectRef } $Logs.link } finally { [Environment]::SetEnvironmentVariable('SUPABASE_DB_PASSWORD',$SavedPassword,'Process') }; if ($Link.ExitCode -ne 0) { throw 'Ephemeral project link failed.' }
  $BeforeList=Invoke-Phase31Native { & $Supabase.Source --workdir $WorkDirectory migration list } $Logs.beforeList; if ($BeforeList.ExitCode -ne 0) { throw 'Pre-execution migration list failed.' }
  $Dry=Invoke-Phase31Native { & $Supabase.Source --workdir $WorkDirectory --yes db push --dry-run } $Logs.dryRun
  $DryRunObserved=@(Get-Phase31ObservedMigrationFiles $Dry.Lines $ExpectedFiles | Sort-Object -Unique); $DryRunUnexpected=@(Get-Phase31UnexpectedMigrationFiles $Dry.Lines $ExpectedFiles); $Missing=@($ExpectedFiles | Where-Object { $DryRunObserved -notcontains $_ })
  if ($Dry.ExitCode -ne 0 -or $DryRunObserved.Count -ne 11 -or $Missing.Count -gt 0 -or $DryRunUnexpected.Count -gt 0) { throw 'Dry-run exact inventory failed.' }; $State.dryRunResult='PASS'
  $ProbeSql=Join-Path $Root ([string]$Manifest.targetProbeSqlPath); $BeforeProbeExecution=Invoke-Phase31ReadOnlySql $ProbeSql $Logs.beforeProbe $Psql $Connection; if ($BeforeProbeExecution.ExitCode -ne 0) { throw 'Pre-execution probe failed.' }; $PreProbe=ConvertFrom-Phase31ProbeLines $BeforeProbeExecution.Lines $Findings; if (-not (Test-Phase31Probe $PreProbe before $DatabaseValue)) { throw 'Target state changed after attestation.' }; $State.preExecutionStateResult='PASS'
  Write-Host 'TargetEnvironment: staging'; Write-Host 'DryRunResult: PASS'; Write-Host 'AutomaticRollback: disabled'; Write-Host 'ProductionDeployment: out of scope'
  $Phrase="APPLY 11 MIGRATIONS TO STAGING $TargetProjectRef"; if ((Read-Host "Type exactly: $Phrase") -cne $Phrase) { throw 'Execution approval phrase mismatch.' }; $State.executionApproved=$true; $State.executionAttempted=$true
  $Apply=Invoke-Phase31Native { & $Supabase.Source --workdir $WorkDirectory --yes db push } $Logs.apply; $State.applyExitCode=$Apply.ExitCode
  $AfterList=Invoke-Phase31Native { & $Supabase.Source --workdir $WorkDirectory migration list } $Logs.afterList
  $AfterProbeExecution=Invoke-Phase31ReadOnlySql $ProbeSql $Logs.afterProbe $Psql $Connection
  if ($AfterProbeExecution.ExitCode -eq 0) { $PostProbe=ConvertFrom-Phase31ProbeLines $AfterProbeExecution.Lines $Findings; if (Test-Phase31Probe $PostProbe after $DatabaseValue) { $State.migrationHistoryResult='PASS' } else { $State.migrationHistoryResult='FAIL' } } else { $State.migrationHistoryResult='FAIL' }
  if ($State.applyExitCode -eq 0 -and $AfterList.ExitCode -eq 0 -and $State.migrationHistoryResult -eq 'PASS') { $CatalogResult=Invoke-Phase31CatalogValidation $Psql $Connection $RunDirectory; $State.catalogReadinessResult=$CatalogResult.Result }
  if ($State.applyExitCode -eq 0 -and $AfterList.ExitCode -eq 0 -and $State.migrationHistoryResult -eq 'PASS' -and $State.catalogReadinessResult -eq 'PASS' -and @($Findings | Where-Object { $_.Severity -in @('ERROR','BLOCKER') }).Count -eq 0) { $State.postValidationResult='PASS'; $State.controlledStagingMigrationResult='PASS' } else { $State.postValidationResult='FAIL' }
} catch {
  Add-Phase31Finding -Findings $Findings -Severity ERROR -Code 'MIG31-EXECUTION-ABORTED' -Message $_.Exception.Message
} finally {
  if (Test-Path $WorkDirectory) { Remove-Item $WorkDirectory -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Phase31ExecutionEvidence
foreach ($Finding in $Findings) { Write-Host "$($Finding.Severity): $($Finding.Code) | $($Finding.Message)" }
Write-Host "Phase31EvidencePath: $EvidencePath"
Write-Host "DryRunResult: $($State.dryRunResult)"
Write-Host "PreExecutionStateResult: $($State.preExecutionStateResult)"
Write-Host "MigrationHistoryResult: $($State.migrationHistoryResult)"
Write-Host "CatalogReadinessResult: $($State.catalogReadinessResult)"
Write-Host "PostValidationResult: $($State.postValidationResult)"
Write-Host "ControlledStagingMigrationResult: $($State.controlledStagingMigrationResult)"
Write-Host 'ProductionDeploymentDecision: OUT_OF_SCOPE'
if ($State.controlledStagingMigrationResult -ne 'PASS') { Write-Host 'Phase31GateResult: FAIL'; exit 2 }
Write-Host 'Phase31GateResult: PASS'
exit 0
