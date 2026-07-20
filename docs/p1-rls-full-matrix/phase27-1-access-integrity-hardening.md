# Phase27.1 P1 Access & Integrity Hardening

## Implementation

New additive draft:

```text
supabase/migrations_draft/20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql
```

### Permission boundary

Authenticated table-wide UPDATE is revoked for:

- `user_profiles`
- `builder_profiles`
- `projects`

It is replaced by explicit column UPDATE grants. Internal identity, ownership, account status, and share-token lifecycle columns are excluded. Broad Project INSERT is also replaced with a creation-column allowlist so callers cannot inject token hashes or lifecycle timestamps. Phase24 token rotation/revocation RPCs remain `SECURITY DEFINER` and therefore retain their intended privileged write path.

### Helper execution boundary

P1 `SECURITY DEFINER` helpers are redefined with `search_path = pg_catalog, pg_temp`, explicit schema qualification, and minimal function EXECUTE grants.

### RLS corrections

- archived Problem Definitions and Hypotheses are excluded from public source reads;
- creator/author Builder IDs must resolve to the current authenticated user;
- Feedback Request public source reads require a public-safe linked Change Card when a target exists;
- Feedback and Feedback insert helpers apply the same linked-card boundary.

### Trigger corrections

- Feedback Request target/project validation is `SECURITY DEFINER`, schema-qualified, independent of caller RLS visibility, and uses one invalid-target error to avoid an existence oracle;
- five record identity triggers prevent ID, created-at, project, creator, and author evidence mutation;
- initial Change Card approval requires current-owner approver identity and `approved_at`;
- approved Change Card core, identity, approval, type/title, and importance fields are immutable;
- visibility, sensitivity, and archive transitions remain allowed for the owner.

## Compatibility constraints

- old migration drafts 00–08 are unchanged;
- Phase25 test SQL and wrapper are unchanged;
- Phase26 protected hashes remain valid;
- migration 09 is not yet part of the Phase26 protected baseline;
- no remote or hosted application occurred.

### P0 test-oracle compatibility

`phase20_00_preflight.sql` changes only `PRE-021` from whole-table UPDATE introspection to any-column UPDATE introspection. The expected capability remains owner Project editing; Phase27 separately proves that ownership and token columns are not directly writable.
