# Phase27.1 Static Validation Report

## Result

```text
PHASE27_1_STATIC_VALIDATION: PASS
USER_LOCAL_RUNTIME: PENDING
```

## Contract

- SQL files: 9
- expected scenarios: 181
- unique scenario IDs: 181
- missing/extra source IDs: 0
- duplicate scenario ownership: 0
- domain counts: PRE 18 / SEED 14 / PH 22 / FR 30 / PL 16 / CC 31 / PROFILE 18 / INTEGRITY 24 / SUMMARY 8
- migration draft SQL files: 10
- unmatched dollar quotes: 0
- lexical terminal-state errors: 0
- parenthesis mismatches: 0
- invalid UUID literals: 0

## Migration 09 assertions

- profile/project broad UPDATE revokes present
- Project broad INSERT revoke and safe creation-column grant present
- share-token lifecycle columns excluded from direct Project INSERT/UPDATE
- five immutable identity triggers present
- Feedback Request target trigger uses one non-disclosing invalid-target error
- approved Change Card core/approval/identity evidence comparisons present
- linked Change Card read/write parity predicates present
- P1 SECURITY DEFINER helper replacements use `pg_catalog, pg_temp`
- trigger/helper direct EXECUTE revokes present

## Wrapper

- Phase27 braces: 134 / 134
- Phase27 parentheses: 209 / 209
- Phase27 brackets: 57 / 57
- Phase27 `AllowEmptyCollection`: 3
- Phase26 `AllowEmptyCollection`: 3
- ambiguous `$variable:` patterns: 0
- `elselseif`: 0
- executable remote-capable patterns in `.ps1`/`.sql`: 0

## Baseline preservation

- Phase26 protected files: 18
- protected hash mismatches: 0
- protected files byte-identical to Phase27 input: 18 / 18
- existing migration drafts 00–08 changed: 0
- Phase25 SQL/wrapper changed: 0
- Phase20 preflight changes: exactly one oracle function (`has_table_privilege` → `has_any_column_privilege`)
- new additive migration draft: 1

## Not executed here

- PowerShell runtime parser
- Docker / Supabase CLI
- PostgreSQL parser or psql
- Phase26 regression runtime
- Phase27 181-scenario runtime
