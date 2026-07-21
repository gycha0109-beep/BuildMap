# Phase29 Risk Register

## Blocker

### MIG29-BLOCK-001 — unpinned SECURITY DEFINER

Final object:

```text
public.is_feedback_author(uuid)
```

Current definition originates in migration 04 and remains final after migration 09:

```sql
security definer
set search_path = public, auth
```

This violates the established BuildMap SECURITY DEFINER rule:

```text
search_path = pg_catalog, pg_temp
```

All referenced application/auth objects must be schema-qualified.

**Decision:** promotion HOLD.

**Required forward fix:** add a new additive hardening migration. Do not edit an already promoted migration. Recreate the function with pinned search path, explicit `public.*` / `auth.*` references, and deliberate EXECUTE grants.

## Runtime-evidence holds

- fresh-install `00–09` replay not yet attested;
- incremental `00–08 → 09` replay not yet attested.

## Accepted but monitored risks

| Risk | Location | Control |
|---|---|---|
| extension schema availability | 00 | local/target preflight for `pgcrypto` and `extensions.digest` |
| FK and cascade semantics | 01–03 | empty-db replay plus dependency review |
| policy replacement locks | 09 | short maintenance window and lock timeout plan |
| owner-executed views | 06 | explicit projection/predicate tests from Phase20/25 |
| grant narrowing | 09 | Phase27 P1 and catalog postcheck |
| token lifecycle RPC | 07–09 | Phase25 matrix and immediate revoke path |
