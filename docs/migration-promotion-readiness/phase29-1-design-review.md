# Phase29.1 Design Review

## Scope

Resolve `MIG29-BLOCK-001` through a new additive migration while preserving migration drafts `00–09` unchanged.

## Approved design

- add migration draft `10` and an exact tracked local replay mirror;
- retain `public.is_feedback_author(uuid)` signature, boolean return type, SQL language, and `STABLE` volatility;
- pin `SECURITY DEFINER` search path to `pg_catalog, pg_temp`;
- schema-qualify `public.feedbacks` and `public.current_user_profile_id()`;
- revoke EXECUTE from `PUBLIC`, `anon`, and `authenticated`, then grant only to `authenticated`;
- expand Phase28 protected migration inventory from `00–09` to `00–10`;
- mark the refreshed Phase28 baseline `PENDING_USER_LOCAL_REVALIDATION` rather than reusing the old PASS attestation;
- expand Phase29 readiness and replay-mirror contracts to 11 migrations;
- retain `PROMOTION_HOLD` until fresh-install and incremental runtime evidence both pass.

## Self-review corrections

1. A migration-only patch would break the exact Phase28 inventory contract. Phase28 manifest and gate were extended together.
2. The tracked `supabase/migrations` directory is a local replay mirror, not formal promotion. Migration 10 is mirrored byte-for-byte and remains `_draft.sql` with `DRAFT ONLY` markers.
3. Runtime function verification cannot rely on source text alone. Ten catalog scenarios verify signature, attributes, search path, qualification, ACLs, and the final global unpinned-function count.
4. Function identity verification avoids formatting-sensitive `pg_get_function_identity_arguments()` comparison and uses `pronargs` plus `oidvectortypes(proargtypes)`.
5. Existing Phase28 user-local PASS is not carried forward across the migration-set change.

## Design verdict

`PASS`

No hosted, remote, production, or formal migration promotion action is included.
