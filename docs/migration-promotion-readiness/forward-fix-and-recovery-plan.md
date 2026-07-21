# Forward-fix and Recovery Plan

## Principle

An applied migration is immutable. Recovery uses a new forward migration, not file deletion or history rewriting.

## Before application

- take a database backup or platform-supported restore point;
- record migration inventory and Phase28 baseline;
- set a bounded lock timeout;
- stop if target extension/schema assumptions differ;
- stop if any readiness gate reports HOLD.

## During application

If a statement fails:

1. preserve the exact SQLSTATE and failing statement;
2. determine whether the migration transaction rolled back completely;
3. inspect grants, policies, functions, and triggers before retrying;
4. do not manually skip the failed statement;
5. create a reviewed forward-fix migration if partial state exists.

## Emergency access-control recovery

Priority order:

1. revoke exposed RPC EXECUTE privileges;
2. revoke affected view/table grants;
3. replace unsafe policy with deny-by-default policy;
4. rotate or revoke Project share tokens;
5. deploy a new pinned SECURITY DEFINER definition;
6. rerun Phase20/25/27/28 before reopening access.

## Evidence preservation

Keep:

- redacted local/target logs;
- migration history;
- catalog snapshots;
- function definitions and ACLs;
- affected row counts;
- the forward-fix decision record.
