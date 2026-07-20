# Phase28 Local Runbook

Run from the BuildMap repository root.

## 1. Parse check

```powershell
$Paths = @(
  ".\scripts\manual-local-unified-regression\phase28-common.ps1",
  ".\scripts\manual-local-unified-regression\phase28-contract.ps1",
  ".\scripts\manual-local-unified-regression\phase28-log-validation.ps1",
  ".\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1"
)

foreach ($Candidate in $Paths) {
  $Path = Resolve-Path $Candidate
  $Tokens = $null
  $ParseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    $Path,
    [ref]$Tokens,
    [ref]$ParseErrors
  ) | Out-Null

  if ($ParseErrors.Count -eq 0) {
    "POWERSHELL_PARSE_CHECK: PASS | $Path"
  } else {
    "POWERSHELL_PARSE_CHECK: FAIL | $Path"
    $ParseErrors | Format-List Message, Extent
  }
}
```

All four files must report `POWERSHELL_PARSE_CHECK: PASS`.

## 2. Static baseline gate

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Get-ChildItem .\scripts\manual-local-unified-regression\*.ps1 | Unblock-File
.\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1
```

Expected terminal line:

```text
Phase28GateResult: PASS
```

## 3. Optional full log attestation

Use the wrapper-created local log files, not edited excerpts.

```powershell
.\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1 `
  -Phase20PassLogPath "<phase20-log-path>" `
  -Phase25PassLogPath "<phase25-log-path>" `
  -Phase27PassLogPath "<phase27-log-path>" `
  -RequireAllPassLogs
```

Expected:

```text
Phase20PassLogValidation: PASS
Phase25PassLogValidation: PASS
Phase27PassLogValidation: PASS
RequireAllPassLogs: True
Phase28GateResult: PASS
```

## Stop rules

Stop and report the first `GATE_FAIL` when any of the following occurs:

- protected hash mismatch;
- missing or extra inventory file;
- scenario count or ID drift;
- PowerShell parse failure;
- prohibited command detection;
- supplied log validation failure.

Do not regenerate the manifest to make the failure disappear.
