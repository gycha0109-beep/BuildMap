# Phase29.1 Migration Promotion Readiness Scripts

## Static gate

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1
```

Expected after pulling the Phase29.1 branch:

```text
MigrationCount: 11
Phase28BaselineResult: PASS
TrackedReplayMirrorResult: PASS
StaticErrorCount: 0
StaticBlockerCount: 0
RuntimeEvidenceComplete: False
Phase29GateResult: PASS
PromotionDecision: PROMOTION_HOLD
```

The remaining HOLD is caused only by missing fresh-install `00–10` and incremental `00–09 → 10` evidence.

To require a release-ready result:

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1 -RequirePromotionReady
```

This returns exit code `2` while HOLD remains.

The static gate supports Windows PowerShell 5.1 and PowerShell 7. It does not depend on `System.IO.Path.GetRelativePath()`.

## Local catalog check

Apply migration 10 to the disposable local database through the normal local reset/replay path, then run:

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-catalog-readiness-local.ps1
```

The wrapper accepts only an optional local Docker container name. It accepts no database URL or secret. It enforces 26 catalog scenarios and fails on missing, unexpected, duplicate, conflicting, or blocker signals.

Expected result:

```text
ExpectedScenarioCount: 26
ObservedScenarioCount: 26
CatalogReadinessResult: PASS
```

## Runtime evidence

After both replay paths and protected regressions pass:

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1 `
  -FreshInstallEvidencePath .\evidence\phase29-fresh.txt `
  -IncrementalUpgradeEvidencePath .\evidence\phase29-incremental.txt `
  -RequirePromotionReady
```

Evidence types:

```text
FRESH_INSTALL_00_10
INCREMENTAL_00_09_TO_10
```

Do not commit raw secrets, share tokens, or remote connection details.
