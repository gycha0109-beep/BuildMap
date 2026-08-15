# Staging ACL hardening

## Finding

After the MVP application foundation merged, staging reconciliation showed migration 11 present and its four required privileges effective.

A broader ACL inspection also showed the Supabase-managed default relation ACL surface remained wider than BuildMap's intended application contract:

- authenticated source-table ACL included privileges beyond `SELECT/INSERT/UPDATE`;
- anon/authenticated public-safe view ACL included privileges beyond `SELECT`.

Migration 08 had already documented the intended boundary:

- source tables: no anon object privilege; authenticated `SELECT/INSERT/UPDATE`, with RLS deciding rows;
- public-safe views: anon/authenticated `SELECT` only.

## Decision

Do not edit migrations 00–11. Add migration 12 to normalize existing relation ACLs to the already-defined BuildMap boundary.

Migration 12:

1. revokes source-table privileges from anon/authenticated;
2. grants only `SELECT/INSERT/UPDATE` on source tables to authenticated;
3. revokes public-safe view privileges from anon/authenticated;
4. grants only `SELECT` on public-safe views to anon/authenticated;
5. asserts the exact allowed/forbidden privilege surface before commit.

`service_role` privileges are not modified.

## Security model

Object privileges and RLS serve different purposes:

```text
relation privilege
→ RLS policy
→ trigger/function integrity boundary
```

Migration 12 narrows the first layer. It does not weaken or replace RLS.

## Deployment boundary

Repository CI must pass before staging application. After applying migration 12, verify:

- migration history contains 00–12 in order;
- authenticated source tables have only SELECT/INSERT/UPDATE;
- anon has no source-table privilege;
- public-safe views expose SELECT only to anon/authenticated;
- existing RLS/catalog regression remains valid.

Production remains OUT_OF_SCOPE.
