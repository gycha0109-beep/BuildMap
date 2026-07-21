# Phase28 Unified RLS Regression Gate

`run-phase28-unified-rls-regression-gate.ps1` is a local-only static gate for the accepted BuildMap RLS baselines.

It does not run Docker, Supabase CLI, `psql`, SQL, or any remote command.

## Protected baseline

- migration drafts `00–09`
- Phase20 P0 runner and 9 SQL files: 147 scenarios
- Phase25 Link Sharing runner and 8 SQL files: 107 scenarios
- Phase27.1 P1 runner, manifest, and 9 SQL files: 181 scenarios
- Phase26 legacy baseline manifest and regression gate
- four executable Phase28 gate scripts

Total:

- protected files: 46
- packs: 3
- scenario files: 26
- scenarios: 435

## Static gate

From the BuildMap repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Get-ChildItem .\scripts\manual-local-unified-regression\*.ps1 | Unblock-File
.\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1
```

Expected result:

```text
ProtectedFileCount: 46
PackCount: 3
ScenarioFileCount: 26
ExpectedScenarioCount: 435
Phase20PassLogValidation: SKIPPED
Phase25PassLogValidation: SKIPPED
Phase27PassLogValidation: SKIPPED
Phase28GateResult: PASS
```

## PASS-log validation

A supplied log is mandatory-to-validate: an invalid or incomplete supplied log makes the gate fail.

```powershell
.\scripts\manual-local-unified-regression\run-phase28-unified-rls-regression-gate.ps1 `
  -Phase20PassLogPath ".\path\phase20.log" `
  -Phase25PassLogPath ".\path\phase25.log" `
  -Phase27PassLogPath ".\path\phase27.log" `
  -RequireAllPassLogs
```

`-RequireAllPassLogs` fails when any one of the three paths is omitted.

## Hash contract

Hashes use `normalized_utf8_lf`:

1. decode strict UTF-8;
2. remove an optional UTF-8 BOM;
3. normalize CRLF and CR to LF;
4. hash UTF-8 bytes without BOM using SHA-256.

This avoids Windows Git line-ending false positives while still detecting text-content drift.

## Baseline refresh

Do not regenerate hashes automatically. Follow `docs/unified-rls-regression-gate/phase28-baseline-refresh-procedure.md`.
