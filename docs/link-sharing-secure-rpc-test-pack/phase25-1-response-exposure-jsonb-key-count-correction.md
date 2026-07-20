# Phase25.1 Response Exposure JSONB Key Count Correction

## Purpose

Correct the local-only Phase25 response exposure test after PostgreSQL rejected the non-existent `jsonb_object_length(jsonb)` function.

## Failure observed

`phase25_06_response_exposure.sql` stopped at `LINK-EXPOSE-006` with:

```text
ERROR: function jsonb_object_length(jsonb) does not exist
```

The preceding Phase25 files completed with full scenario coverage and `FileOverallResult: PASS`.

## Minimal correction

All exact JSON object key-count assertions now count rows returned by PostgreSQL's `jsonb_object_keys(jsonb)`:

```sql
(select count(*) from jsonb_object_keys(value)) = 2
```

The PL/pgSQL assertion for `LINK-EXPOSE-007` stores that count in a local integer variable before checking the response shape.

No migration, RPC implementation, RLS policy, grant, fixture, expected scenario ID, or wrapper result classification was changed.

## Local rerun

The Phase25 seed uses committed fixture rows, so rerun the complete Phase25 wrapper after a clean local reset rather than starting only from file 06.

```powershell
supabase db reset
.\scripts\manual-local-link-sharing\run-phase25-link-sharing-local.ps1
```

Passing evidence requires all files to report `FileOverallResult: PASS`, `OverallResult: PASS`, and no missing, duplicate, or conflicting scenario IDs.
