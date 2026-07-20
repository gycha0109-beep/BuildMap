# Phase27 Static Validation Report

## Final result

```text
PHASE27_STATIC_VALIDATION: PASS
LOCAL_RUNTIME_ATTESTATION: PENDING
```

## Structure and scenario contract

- SQL files: 9
- manifest expected scenarios: 167
- unique scenario IDs: 167
- cross-file duplicate scenario ownership: 0
- manifest/source missing IDs: 0
- manifest/source extra IDs: 0
- fixture INSERT statements checked: 10
- fixture column/value cardinality mismatches: 0
- invalid UUID literals: 0
- unmatched SQL dollar quotes: 0
- PL/pgSQL IF/END IF lightweight mismatches: 0
- PL/pgSQL BEGIN/END lightweight mismatches: 0

## Wrapper review

- exact scenario format: `P1-<DOMAIN>-NNN`
- fixture label/slug false-positive scenario matches: 0
- invalid PowerShell keyword patterns: 0
- ambiguous `$variable:` interpolation patterns: 0
- braces: 134 / 134
- parentheses: 209 / 209
- brackets: 57 / 57
- `AllowEmptyCollection`: 3 Phase27 parameters
- Phase26.2 `AllowEmptyCollection`: 3 parameters retained
- remote-capable command patterns: 0

## Oracle corrections from independent review

- adversarial Feedback fixture uses local postgres RLS bypass with Scout JWT actor context so the author-spoof trigger remains active
- archived Project links are excluded from owner-readable count because `is_project_owner()` excludes archived Projects
- Builder Profile identity reassignment targets an unbound foreign User Profile, avoiding a unique-constraint false denial
- scenario parser requires the numeric three-digit suffix and no longer treats labels such as `P1-A-PUBLIC` as scenario IDs
- INSERT and UPDATE privileges are checked independently rather than relying on a composite privilege text string

## Protected baseline

- Phase25 protected files: 18
- SHA-256 mismatches: 0
- migration draft changes introduced by Phase27: 0
- Phase25 SQL/wrapper changes introduced by Phase27: 0
- Phase26.2 local runtime correction incorporated: yes

## Not executed in this environment

- Windows PowerShell `Parser.ParseFile()` runtime
- Docker
- Supabase CLI
- PostgreSQL parser/psql
- Phase27 SQL runtime

Static validation covers pack structure, oracle completeness, wrapper safety, fixture cardinality, and protected-file integrity. It is not an RLS runtime attestation. Phase27 `OverallResult: PASS` may only be recorded after the user runs the pack against the clean local Supabase database.
