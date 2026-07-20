# Phase28 Unified RLS Regression Baseline & Change Gate

Phase28 consolidates the previously separate P0, Link Sharing, and P1 protection boundaries into one static baseline.

## Status

- design: complete
- implementation: complete
- independent review: complete
- review corrections: complete
- static validation: PASS
- user local PowerShell runtime: pending

## Canonical files

- `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
- `scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1`
- `scripts/manual-local-unified-regression/README.md`

## Protected contract

| Pack | SQL files | Scenarios | Evidence |
|---|---:|---:|---|
| Phase20 P0 RLS | 9 | 147 | `USER_LOCAL_PASS` |
| Phase25 Link Sharing | 8 | 107 | `USER_LOCAL_PASS` |
| Phase27.1 P1 RLS | 9 | 181 | `USER_LOCAL_PASS` |
| **Total** | **26** | **435** | — |

The unified manifest protects 42 files, including migration drafts `00–09`, all three runners and test packs, the Phase27 scenario manifest, and the Phase26 legacy baseline/gate.

## Documents

- `phase28-design.md`
- `phase28-local-runbook.md`
- `phase28-baseline-refresh-procedure.md`
- `phase28-independent-review.md`
- `phase28-static-validation.md`
