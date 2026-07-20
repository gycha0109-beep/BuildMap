# Phase28 Independent Review

## Review method

The implementation was reviewed separately from its initial construction against the Phase28 threat model: accidental drift, scenario-oracle weakening, Windows checkout variance, fail-open log handling, and path escape.

## Findings and corrections

### 1. Windows line-ending false positives

**Finding:** raw file SHA-256 would fail when Git converts LF to CRLF on Windows.

**Correction:** introduced `normalized_utf8_lf` hashing with strict UTF-8 decoding, optional BOM removal, and CRLF/CR to LF normalization.

### 2. Path normalization traversal bug

**Finding:** removing arbitrary leading `.` and `/` characters could transform `../path` into an apparently safe path.

**Correction:** only repeated literal `./` prefixes are removed; `..`, rooted paths, drive separators, and control characters are rejected.

### 3. Wrapper-generated log incompatibility

**Finding:** requiring the console-only completion message would reject the wrapper-created log file, because the final completion `Write-Host` line is not appended to that file.

**Correction:** log attestation relies on the logged final result, remote-command attestation, blocker/positive flags, and exact `FileResult` contract. The console-only completion line is not required.

### 4. Manifest fail-open controls

**Finding:** pack regex, runner path, source-contract path, flag lists, and validation modes could otherwise be weakened if they remained editable manifest fields.

**Correction:** removed those controls from the hash manifest. The gate hard-codes the three accepted pack contracts, expected counts, source paths, scenario patterns, blocker flags, positive flags, and the two allowed `contract_only` files.

### 5. Extra migration/test file omission

**Finding:** hash validation alone does not detect a new unlisted SQL file.

**Correction:** exact inventory rules reject missing and extra migration/Phase20/Phase25/Phase27 SQL files.

### 6. Invalid or duplicated PASS logs

**Finding:** unresolved paths or one reused log path could terminate unclearly or create ambiguous attestation.

**Correction:** path resolution errors become explicit gate failures; the same resolved log cannot attest multiple packs; `-RequireAllPassLogs` enforces all three.

### 7. Gate implementation drift

**Finding:** protecting only the prior migrations and test packs would allow accidental edits to the new Phase28 executable gate modules without a hash failure.

**Correction:** the final baseline also hashes the four executable Phase28 PowerShell files. The protected-file count is 46.

### 8. PASS-log malformed-line and signal inconsistency

**Finding:** an extra malformed `FileResult:` line could be ignored, and a tampered `ParsedSignals` field could contradict a PASS result. An empty derived contract supplied with a log could also trigger a binder exception instead of a controlled failure.

**Correction:** raw and parsed `FileResult` counts must match, only `PASS` and `EXPECTED_DENY` signal names are accepted in a passing file result, and the scenario-contract parameter explicitly accepts an empty collection so the gate can report the underlying contract failures.

## Review conclusion

`PASS_WITH_USER_LOCAL_POWERSHELL_RUNTIME_PENDING`

No database runtime claim is made by Phase28. The remaining verification is the user's local PowerShell parse and static gate execution.
