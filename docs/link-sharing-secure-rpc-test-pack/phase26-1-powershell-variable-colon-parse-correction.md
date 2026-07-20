# Phase26.1 PowerShell Variable-Colon Parse Correction

## Status

- Correction: COMPLETE
- Runtime verification: USER LOCAL EXECUTION REQUIRED
- Scope: Phase26 regression gate wrapper only

## Failure

Windows PowerShell parsed `$RelativePath:` inside an interpolated string as a scoped or drive-qualified variable reference and raised `InvalidVariableReferenceWithDrive`.

Affected messages:

- SQL scenario IDs missing from a scenario file
- Unexpected SQL scenario IDs in a scenario file

## Correction

The two ambiguous interpolations were changed to explicit braced variable references:

```powershell
${RelativePath}:
```

No baseline hash, migration SQL, Phase25 test SQL, Phase25 wrapper, scenario ID, or gate decision rule was changed.

## Revalidation

Run from the BuildMap root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Unblock-File .\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
```

Expected terminal result:

```text
Phase26GateResult: PASS
```
