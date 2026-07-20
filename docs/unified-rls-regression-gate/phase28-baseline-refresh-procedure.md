# Phase28 Baseline Refresh Procedure

## Rule

The Phase28 manifest is not an automatically generated cache. It is an approved security regression baseline.

## Required sequence

1. Document why the protected file must change.
2. Identify the affected pack and scenario contract.
3. Review the exact protected-file diff.
4. Decide whether previous runtime evidence is invalidated.
5. Run a clean local reset when migration or runtime policy behavior changed.
6. Rerun every affected wrapper.
7. Require complete scenario coverage and `OverallResult: PASS`.
8. Perform an independent review of the implementation and test oracle.
9. Record the new baseline decision.
10. Update the manifest hashes and handoff only after the preceding steps pass.

## Explicit prohibitions

- no automatic hash refresh;
- no expected-ID removal to hide a failure;
- no conversion of `UNEXPECTED_ALLOW` into an accepted result;
- no reuse of a prior PASS after a protected runtime/test file changed;
- no remote or hosted database command as part of this gate.

## Evidence label

Until independent execution evidence exists, retain `USER_LOCAL_PASS`. Do not upgrade it to an independently reproduced runtime result.
