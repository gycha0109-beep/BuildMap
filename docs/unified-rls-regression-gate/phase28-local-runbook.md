# Phase28 Local Runbook

Run from the BuildMap repository root.

## 1. Parse check

```powershell
$Path = Resolve-Path ".\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1"
$Tokens = $null
$ParseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  $Path,
  [ref]$Tokens,
  [ref]$ParseErrors
) | Out-Null
$ParseErrors
```

No output is expected.

## 2. Static baseline gate

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Unblock-File .\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1
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
