<#
Generate incremental 00-09 -> 10 runtime evidence against the disposable local Supabase stack.
This script never accepts or uses a remote database URL, linked project, password, token, or key.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $EvidencePath,
  [string] $ContainerName,
  [string] $RunId
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDirectory 'phase29-evidence-run-common.ps1')

$Root = Get-Phase292RepositoryRoot -ScriptDirectory $ScriptDirectory
if ([string]::IsNullOrWhiteSpace($RunId)) { $RunId = [guid]::NewGuid().ToString() }
if ($RunId -notmatch '^[0-9a-fA-F-]{36}$') { throw 'RunId must be a GUID.' }

Assert-Phase292TrackedWorkingTreeClean -Root $Root
$RepositoryHead = Get-Phase292RepositoryHead -Root $Root
$SupabaseCliVersion = Get-Phase292ToolVersion -CommandName 'supabase' -Command { supabase --version }
$DockerVersion = Get-Phase292ToolVersion -CommandName 'docker' -Command { docker --version }
$LocalContainer = Get-Phase292ContainerName -RequestedName $ContainerName
$Contract = Get-Phase292ContractInfo -Root $Root
$EvidenceFullPath = if ([System.IO.Path]::IsPathRooted($EvidencePath)) { [System.IO.Path]::GetFullPath($EvidencePath) } else { [System.IO.Path]::GetFullPath((Join-Path $Root $EvidencePath)) }
$RunDirectory = Join-Path (Split-Path -Parent $EvidenceFullPath) 'incremental-upgrade'
$ExpectedBefore = @($script:Phase292ExpectedVersions[0..9])
$ExpectedAfter = @($script:Phase292ExpectedVersions)
$PreUpgradeIds = @(
  'MIG29-PREUP-001',
  'MIG29-PREUP-002',
  'MIG29-PREUP-003',
  'MIG29-PREUP-004',
  'MIG29-PREUP-005',
  'MIG29-PREUP-006'
)

Push-Location $Root
try {
  $Reset = Invoke-Phase292Native -Command { supabase db reset --version 20260720000000 --no-seed }
  Write-Phase292CapturedLog -Path (Join-Path $RunDirectory 'incremental-reset-00-09.log') -Lines $Reset.Lines
  if ($Reset.ExitCode -ne 0) { throw "Incremental baseline reset failed with exit code $($Reset.ExitCode)." }

  $HistoryBefore = @(Get-Phase292MigrationHistory -ContainerName $LocalContainer)
  Assert-Phase292ExactVersions -Observed $HistoryBefore -Expected $ExpectedBefore -Label 'Incremental pre-upgrade'

  Invoke-Phase292SqlScenarioFile `
    -Path (Join-Path $ScriptDirectory 'phase29_03_incremental_pre_upgrade.sql') `
    -ContainerName $LocalContainer `
    -ExpectedIds $PreUpgradeIds `
    -CapturePath (Join-Path $RunDirectory 'incremental-pre-upgrade.log')

  $Upgrade = Invoke-Phase292Native -Command { supabase migration up --local }
  Write-Phase292CapturedLog -Path (Join-Path $RunDirectory 'incremental-migration-up.log') -Lines $Upgrade.Lines
  if ($Upgrade.ExitCode -ne 0) { throw "Incremental migration up failed with exit code $($Upgrade.ExitCode)." }

  $HistoryAfter = @(Get-Phase292MigrationHistory -ContainerName $LocalContainer)
  Assert-Phase292ExactVersions -Observed $HistoryAfter -Expected $ExpectedAfter -Label 'Incremental post-upgrade'
  $Applied = @($HistoryAfter | Where-Object { $HistoryBefore -notcontains $_ })
  Assert-Phase292ExactVersions -Observed $Applied -Expected @('20260721000000') -Label 'Incremental applied-version delta'

  $Suite = Invoke-Phase292RegressionSuite -Root $Root -RunDirectory $RunDirectory -ContainerName $LocalContainer

  $EvidenceLines = @(
    'EvidenceSchemaVersion: 2.0',
    'EvidenceType: INCREMENTAL_00_09_TO_10',
    "RunId: $RunId",
    "GeneratedAtUtc: $([DateTimeOffset]::UtcNow.ToString('o'))",
    "RepositoryHead: $RepositoryHead",
    'RepositoryTrackedState: CLEAN',
    'RemoteCommandsUsed: none',
    "SupabaseCliVersion: $SupabaseCliVersion",
    "DockerVersion: $DockerVersion",
    "LocalContainer: $LocalContainer",
    "BaselineId: $($Contract.BaselineId)",
    "MigrationSetDigest: $($Contract.MigrationSetDigest)",
    "ProtectedGateSetDigest: $($Contract.ProtectedGateSetDigest)",
    'ReplayMode: INCREMENTAL_RESET_00_09_THEN_UP_10',
    "MigrationHistoryBefore: $($HistoryBefore -join ',')",
    "MigrationHistoryAfter: $($HistoryAfter -join ',')",
    'MigrationOrderResult: PASS',
    'PreUpgradeResult: PASS',
    "IncrementalAppliedVersions: $($Applied -join ',')",
    "CatalogReadinessResult: $($Suite.CatalogReadinessResult)",
    "Phase20Result: $($Suite.Phase20Result)",
    "Phase25Result: $($Suite.Phase25Result)",
    "Phase27Result: $($Suite.Phase27Result)",
    "Phase28GateResult: $($Suite.Phase28GateResult)",
    "Phase28PassLogValidation: $($Suite.Phase28PassLogValidation)",
    'OverallResult: PASS'
  )
  Write-Phase292Evidence -Path $EvidenceFullPath -Lines $EvidenceLines

  Write-Host "EvidencePath: $EvidenceFullPath"
  Write-Host 'IncrementalEvidenceResult: PASS'
  exit 0
}
finally {
  Pop-Location
}
