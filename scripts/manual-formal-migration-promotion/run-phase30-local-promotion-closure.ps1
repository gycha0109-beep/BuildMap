<#
Run the Phase30 static gate, generate a local formal release bundle, then validate the bundle.
No database or remote command is executed.
#>

[CmdletBinding()]
param(
  [string] $OutputRoot = '.local-evidence/phase30-formal-promotion'
)

$ErrorActionPreference = 'Stop'
$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDirectory 'phase30-common.ps1')
$Root = Get-Phase30RepositoryRoot -ScriptDirectory $ScriptDirectory
$RunDirectory = Join-Path $Root '.local-evidence/phase30-formal-promotion-closure'
New-Item -ItemType Directory -Force -Path $RunDirectory | Out-Null

$Preflight = Invoke-Phase30PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'run-phase30-formal-promotion-readiness-gate.ps1') `
  -CapturePath (Join-Path $RunDirectory 'phase30-preflight.log')
if ($Preflight.ExitCode -ne 0) { throw "Phase30 preflight failed with exit code $($Preflight.ExitCode)." }
Assert-Phase30ExactLine -Lines $Preflight.Lines -Pattern '^FormalPromotionBundleResult:\s*MISSING\s*$' -Label 'Phase30 preflight'
Assert-Phase30ExactLine -Lines $Preflight.Lines -Pattern '^Phase30GateResult:\s*PASS\s*$' -Label 'Phase30 preflight'

$Bundle = Invoke-Phase30PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'new-phase30-release-bundle-local.ps1') `
  -Arguments @('-OutputRoot', $OutputRoot) `
  -CapturePath (Join-Path $RunDirectory 'phase30-bundle.log')
if ($Bundle.ExitCode -ne 0) { throw "Phase30 bundle generation failed with exit code $($Bundle.ExitCode)." }
Assert-Phase30ExactLine -Lines $Bundle.Lines -Pattern '^FormalPromotionBundleResult:\s*PASS\s*$' -Label 'Phase30 bundle'

$BundlePathRows = @($Bundle.Lines | Where-Object { $_ -match '^BundleManifestPath:\s*(?<path>.+?)\s*$' })
if ($BundlePathRows.Count -ne 1) { throw 'Bundle generator must emit exactly one BundleManifestPath line.' }
$null = $BundlePathRows[0] -match '^BundleManifestPath:\s*(?<path>.+?)\s*$'
$BundleManifestPath = $Matches['path'].Trim()

$Final = Invoke-Phase30PowerShellFile `
  -Path (Join-Path $ScriptDirectory 'run-phase30-formal-promotion-readiness-gate.ps1') `
  -Arguments @('-BundleManifestPath', $BundleManifestPath, '-RequirePromotionReady') `
  -CapturePath (Join-Path $RunDirectory 'phase30-final-gate.log')
if ($Final.ExitCode -ne 0) { throw "Phase30 final gate failed with exit code $($Final.ExitCode)." }

foreach ($Pattern in @(
  '^FormalPromotionBundleResult:\s*PASS\s*$',
  '^StaticErrorCount:\s*0\s*$',
  '^StaticBlockerCount:\s*0\s*$',
  '^FormalPromotionDecision:\s*PROMOTION_READY\s*$',
  '^TargetProjectAttestation:\s*PENDING_PHASE30_5\s*$',
  '^DeploymentReadinessDecision:\s*DEPLOYMENT_HOLD\s*$',
  '^Phase30GateResult:\s*PASS\s*$'
)) {
  Assert-Phase30ExactLine -Lines $Final.Lines -Pattern $Pattern -Label 'Phase30 final gate'
}

Write-Host "BundleManifestPath: $BundleManifestPath"
Write-Host 'FormalPromotionDecision: PROMOTION_READY'
Write-Host 'DeploymentReadinessDecision: DEPLOYMENT_HOLD'
Write-Host 'Phase30ClosureResult: PASS'
exit 0
