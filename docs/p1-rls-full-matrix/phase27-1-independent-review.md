# Phase27.1 Independent Review

## Review findings after initial hardening implementation

### 1. Token mutation oracle false negative

`P1-INTEGRITY-017` and `P1-INTEGRITY-018` originally ran in one transaction. When ownership transfer succeeded, the original owner could no longer see the row, so the subsequent direct `share_token_hash` update returned zero rows and appeared blocked.

Correction: ownership transfer and token mutation now run in independent transactions.

### 2. Column-level privilege must be asserted directly

RLS cannot restrict individual columns. The reviewed design therefore revokes table-wide UPDATE for profile/project tables and grants only safe columns. New integrity scenarios verify both protected and allowed column sets using `has_column_privilege`.

### 3. Identity integrity must cover updates, not only inserts

Insert spoofing policies alone do not prevent later reassignment. Five immutable identity triggers and new PH/FR/PL/CC update scenarios were added.

### 4. Linked-card parity must cover Feedback insertion

Source read and public view tests were insufficient to prove write safety. `P1-FR-030` now attempts Feedback creation through a sensitive linked Change Card request and requires denial.

### 5. Project INSERT must not expose token lifecycle columns

Table-level Project INSERT allowed callers to supply `share_token_hash`, rotation/revocation timestamps, and evidence timestamps directly. Phase27.1 now replaces broad INSERT with a required-column allowlist and verifies both forbidden and retained columns in `P1-INTEGRITY-022..023`.

### 6. Target validation must not become an existence oracle

Different errors for nonexistent/archived and cross-project Change Cards could disclose target existence. The hardened trigger is RLS-independent but emits one unified invalid-target error for every rejected target.

### 7. SECURITY DEFINER dependencies require pinned search paths

The P1 policy helpers `is_project_owner_by_builder`, `can_read_public_project`, `can_read_public_change_card`, `can_insert_feedback`, and `can_read_feedback` are redefined with `pg_catalog, pg_temp` and schema-qualified object references.

### 8. P0 grant oracle must understand column-level UPDATE

Phase20 `PRE-021` used `has_table_privilege(..., 'UPDATE')`, which only represents whole-table privilege and would report a false regression after the Project UPDATE allowlist. The oracle now uses `has_any_column_privilege(..., 'UPDATE')`; Phase27 retains explicit forbidden/allowed column assertions. Because this changes a P0 test file, the combined local rerun includes Phase20 before Phase26/Phase27.

## Review conclusion

```text
PHASE27_1_REVIEW_RESULT: STATIC_PASS / USER_LOCAL_RUNTIME_PENDING
```

No expected denial was weakened. Runtime PASS is not claimed in this environment.
