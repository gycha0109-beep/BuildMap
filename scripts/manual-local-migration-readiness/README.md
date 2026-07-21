# Phase29 Migration Promotion Readiness Scripts

## Static gate

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1
```

Expected current result:

```text
Phase29GateResult: PASS
PromotionDecision: PROMOTION_HOLD
```

To require a release-ready result:

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1 -RequirePromotionReady
```

This returns exit code `2` while HOLD remains.

The static gate supports Windows PowerShell 5.1 and PowerShell 7. It does not depend on `System.IO.Path.GetRelativePath()`; repository-relative inventory paths are calculated through `System.Uri.MakeRelativeUri()`.

## Local catalog check

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-catalog-readiness-local.ps1
```

This wrapper accepts only an optional local Docker container name. It accepts no database URL or secret. It enforces 16 catalog scenarios and fails on missing, unexpected, duplicate, or conflicting results.

## Runtime evidence

After the blocker is fixed and both local replay paths pass:

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1 `
  -FreshInstallEvidencePath .\evidence\phase29-fresh.txt `
  -IncrementalUpgradeEvidencePath .\evidence\phase29-incremental.txt `
  -RequirePromotionReady
```

Do not commit raw secrets, share tokens, or remote connection details.
