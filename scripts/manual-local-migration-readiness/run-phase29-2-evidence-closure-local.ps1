<#
Run both Phase29.2 local replay paths and require the final promotion-readiness gate to return PROMOTION_READY.
All database operations target the disposable local Supabase stack only.
#>

[CmdletBinding()]
param(
  [string] $OutputRoot = '.local-evidence/phase29-2',
  [string] $ContainerName
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDirectory 'phase29-evidence-run-common.ps1')

function Write-Phase292CapturedLog {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][AllowEmptyString()][string[]] $Lines
  )
  $Directory = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $Directory | Out-Null
  [System.IO.File]::WriteAllLines($Path, $Lines, [System.Text.UTF8Encoding]::new($false))
}

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
Assert-Phase292TrackedWorkingTreeClean -Root $Root
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ResolvedOutputRoot = if ([System.IO.Path]::IsPathRooted($OutputRoot)) { [System.IO.Path]::GetFullPath($OutputRoot) } else { [System.IO.Path]::GetFullPath((Join-Path $Root $OutputRoot)) }
$RunDirectory = Join-Path $ResolvedOutputRoot $Timestamp
New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null

$FreshEvidencePath = Join-Path $RunDirectory 'fresh-install-evidence.txt'
$IncrementalEvidencePath = Join-Path $RunDirectory 'incremental-upgrade-evidence.txt'
$FreshRunId = [guid]::NewGuid().ToString()
$IncrementalRunId = [guid]::NewGuid().ToString()
$CommonContainerArguments = @()
if (-not [string]::IsNullOrWhiteSpace($ContainerName)) {
  $CommonContainerArguments = @('-ContainerName', $ContainerName)
}

$Preflight = Invoke-Phase292PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'run-phase29-migration-readiness-gate.ps1') `
  -CapturePath (Join-Path $RunDirectory 'phase29-preflight-readiness-gate.log')
if ($Preflight.ExitCode -ne 0) { throw "Phase29 preflight gate failed with exit code $($Preflight.ExitCode)." }
foreach ($Pattern in @(
  '^StaticErrorCount:\s*0\s*$',
  '^StaticBlockerCount:\s*0\s*$',
  '^RuntimeEvidenceComplete:\s*False\s*$',
  '^PromotionDecision:\s*PROMOTION_HOLD\s*$',
  '^Phase29GateResult:\s*PASS\s*$'
)) {
  Assert-Phase292ExactLine -Lines $Preflight.Lines -Pattern $Pattern -Label 'Phase29 preflight gate'
}

$FreshArguments = @('-EvidencePath', $FreshEvidencePath, '-RunId', $FreshRunId) + $CommonContainerArguments
$Fresh = Invoke-Phase292PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'run-phase29-fresh-install-evidence-local.ps1') `
  -Arguments $FreshArguments `
  -CapturePath (Join-Path $RunDirectory 'fresh-install-runner.log')
if ($Fresh.ExitCode -ne 0) { throw "Fresh-install evidence runner failed with exit code $($Fresh.ExitCode)." }
Assert-Phase292ExactLine -Lines $Fresh.Lines -Pattern '^FreshInstallEvidenceResult:\s*PASS\s*$' -Label 'Fresh-install evidence runner'

$IncrementalArguments = @('-EvidencePath', $IncrementalEvidencePath, '-RunId', $IncrementalRunId) + $CommonContainerArguments
$Incremental = Invoke-Phase292PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'run-phase29-incremental-upgrade-evidence-local.ps1') `
  -Arguments $IncrementalArguments `
  -CapturePath (Join-Path $RunDirectory 'incremental-upgrade-runner.log')
if ($Incremental.ExitCode -ne 0) { throw "Incremental evidence runner failed with exit code $($Incremental.ExitCode)." }
Assert-Phase292ExactLine -Lines $Incremental.Lines -Pattern '^IncrementalEvidenceResult:\s*PASS\s*$' -Label 'Incremental evidence runner'

$GateArguments = @(
  '-FreshInstallEvidencePath', $FreshEvidencePath,
  '-IncrementalUpgradeEvidencePath', $IncrementalEvidencePath,
  '-RequirePromotionReady'
)
$Gate = Invoke-Phase292PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'run-phase29-migration-readiness-gate.ps1') `
  -Arguments $GateArguments `
  -CapturePath (Join-Path $RunDirectory 'phase29-final-readiness-gate.log')
if ($Gate.ExitCode -ne 0) { throw "Final Phase29 readiness gate failed with exit code $($Gate.ExitCode)." }
foreach ($Pattern in @(
  '^FreshInstallEvidenceResult:\s*PASS\s*$',
  '^IncrementalEvidenceResult:\s*PASS\s*$',
  '^RuntimeEvidenceComplete:\s*True\s*$',
  '^PromotionDecision:\s*PROMOTION_READY\s*$',
  '^Phase29GateResult:\s*PASS\s*$'
)) {
  Assert-Phase292ExactLine -Lines $Gate.Lines -Pattern $Pattern -Label 'Final Phase29 readiness gate'
}

Write-Host "FreshInstallEvidencePath: $FreshEvidencePath"
Write-Host "IncrementalEvidencePath: $IncrementalEvidencePath"
Write-Host "FinalGateLogPath: $(Join-Path $RunDirectory 'phase29-final-readiness-gate.log')"
Write-Host 'PromotionDecision: PROMOTION_READY'
Write-Host 'Phase29.2ClosureResult: PASS'
exit 0
