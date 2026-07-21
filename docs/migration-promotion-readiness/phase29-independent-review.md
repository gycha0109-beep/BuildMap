# Phase29 Independent Review

## Review method

The implementation was reviewed against the failure modes of earlier BuildMap wrappers and against migration-specific release risks.

## Findings and corrections

### 1. Regex false positives from comments and exception messages

Correction: destructive SQL scanning removes block comments, line comments, and single-quoted literals before matching.

### 2. Checking every historical SECURITY DEFINER definition would falsely block functions fixed by migration 09

Correction: definitions are processed in migration order and only the final definition of each function is evaluated.

### 3. Manifest weakening could remove a migration from the gate

Correction: the runner hard-codes the canonical ten paths and compares the manifest against that contract.

### 4. A HOLD decision could be confused with harness failure

Correction: `Phase29GateResult` and `PromotionDecision` are separate.

### 5. Missing runtime evidence could fail open

Correction: both evidence files are required for READY and are validated with exact singleton fields.

### 6. One log could be reused for both upgrade paths

Correction: duplicate resolved evidence paths are rejected.

### 7. Local test copies could be mistaken for formal promotion

Correction: premature promotion checks use Git-tracked files, not arbitrary untracked local replay files.

### 8. Gate implementation drift could invalidate the readiness verdict

Correction: the manifest stores normalized hashes for all five Phase29 PowerShell files and both catalog SQL files. The runner hard-codes the seven protected paths and validates every hash before analysis.

### 9. Catalog wrapper could pass with missing scenarios

Correction: the local catalog wrapper enforces the complete 16-scenario contract, including missing, unexpected, duplicate, and conflicting ID detection.

### 10. Native stderr handling could terminate before producing a verdict

Earlier BuildMap wrappers showed that PowerShell 7 can convert native stderr/non-zero exits into terminating errors when `$PSNativeCommandUseErrorActionPreference` is enabled.

Correction: the catalog runner and Phase28 child-process invocation temporarily disable that behavior, capture native output/exit codes, normalize `ErrorRecord` objects, and restore the caller settings in `finally` blocks.

### 11. Windows PowerShell 5.1 lacks `System.IO.Path.GetRelativePath()`

The first user-local Phase29 static-gate run stopped during migration inventory construction because Windows PowerShell 5.1 runs on .NET Framework, where `Path.GetRelativePath()` is unavailable.

Correction: `phase29-common.ps1` now provides `Get-CompatibleRelativePath`, implemented with absolute `System.Uri` values and `MakeRelativeUri()`. The static gate no longer calls the PowerShell 7/.NET Core-only API. The changed common module and gate runner hashes were refreshed in the Phase29 manifest.

### 12. SECURITY DEFINER defect found

The final-state scan identifies `public.is_feedback_author(uuid)` as unpinned. This is a real promotion blocker and is not suppressed by changing expectations.

## Review verdict

Implementation: PASS after PowerShell 5.1 compatibility correction.

Migration promotion: HOLD.
