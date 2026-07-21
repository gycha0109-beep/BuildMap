# Fresh-install Replay Runbook

## Purpose

Prove that a clean local Supabase database can apply migration drafts `00–09` in order and retain every protected access boundary.

## Restrictions

- local disposable environment only;
- no `supabase link`;
- no hosted DB URL;
- no `supabase db push` or `db pull`;
- do not commit copied files to `supabase/migrations`.

## Required execution sequence

1. create or use a disposable local BuildMap Supabase workspace;
2. ensure only migrations `00–09` are present in the local replay migration directory;
3. run a clean local database reset;
4. run the Phase29 catalog readiness wrapper;
5. run Phase20 P0;
6. run Phase25 Link Sharing;
7. run Phase27.1 P1;
8. run Phase28 unified gate;
9. record a fresh-install evidence file.

## Evidence shape

```text
EvidenceType: FRESH_INSTALL_00_09
RemoteCommandsUsed: none
MigrationOrderResult: PASS
CatalogReadinessResult: PASS
Phase20Result: PASS
Phase25Result: PASS
Phase27Result: PASS
Phase28GateResult: PASS
OverallResult: PASS
```

The current migration set is expected to report `PROMOTION_HOLD` at catalog scenario `MIG29-CATALOG-007` until `is_feedback_author` is hardened.
