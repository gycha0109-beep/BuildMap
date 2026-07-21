<#
Generate fresh-install 00-10 runtime evidence against the disposable local Supabase stack.
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

function Invoke-Phase292PowerShellFile {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [AllowEmptyCollection()][string[]] $Arguments = @(),
    [Parameter(Mandatory = $true)][string] $CapturePath
  )

  $PowerShellExecutable = (Get-Process -Id $PID).Path
  $Execution = Invoke-Phase292Native -Command {
    & $PowerShellExecutable -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments
  }
  $MeaningfulLines = @($Execution.Lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  Write-Phase292CapturedLog -Path $CapturePath -Lines $MeaningfulLines
  return [pscustomobject]@{
    ExitCode = $Execution.ExitCode
    Lines = $MeaningfulLines
  }
}

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
$RunDirectory = Join-Path (Split-Path -Parent $EvidenceFullPath) 'fresh-install'

Push-Location $Root
try {
  $Reset = Invoke-Phase292Native -Command { supabase db reset --no-seed }
  Write-Phase292CapturedLog -Path (Join-Path $RunDirectory 'fresh-reset.log') -Lines $Reset.Lines
  if ($Reset.ExitCode -ne 0) { throw "Fresh local db reset failed with exit code $($Reset.ExitCode)." }

  $HistoryAfter = @(Get-Phase292MigrationHistory -ContainerName $LocalContainer)
  Assert-Phase292ExactVersions -Observed $HistoryAfter -Expected $script:Phase292ExpectedVersions -Label 'Fresh-install'

  $Suite = Invoke-Phase292RegressionSuite -Root $Root -RunDirectory $RunDirectory -ContainerName $LocalContainer

  $EvidenceLines = @(
    'EvidenceSchemaVersion: 2.0',
    'EvidenceType: FRESH_INSTALL_00_10',
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
    'ReplayMode: FRESH_RESET_ALL_00_10',
    'MigrationHistoryBefore: none',
    "MigrationHistoryAfter: $($HistoryAfter -join ',')",
    'MigrationOrderResult: PASS',
    'PreUpgradeResult: NOT_APPLICABLE',
    'IncrementalAppliedVersions: none',
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
  Write-Host 'FreshInstallEvidenceResult: PASS'
  exit 0
}
finally {
  Pop-Location
}
