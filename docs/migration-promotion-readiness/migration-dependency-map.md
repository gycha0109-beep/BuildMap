# Migration Dependency Map

| Order | Migration | Depends on | Main objects | Promotion classification |
|---:|---|---|---|---|
| 00 | extensions and primitives | none | `pgcrypto`, `set_updated_at()` | extension-sensitive |
| 01 | core schema | 00 | profiles, projects, indexes, update triggers | schema/constraint/lock-sensitive |
| 02 | decision records | 00–01 | problem, hypothesis, rough note, AI draft, Change Card | schema/constraint/forward-only |
| 03 | feedback and links | 01–02 | Feedback Request, Feedback, Project Link | schema/constraint/forward-only |
| 04 | helpers and triggers | 00–03 | ownership/read helpers, integrity triggers | SECURITY DEFINER-sensitive |
| 05 | RLS policies | 01–04 | RLS enablement and initial policies | policy/lock-sensitive |
| 06 | public-safe views | 01–05 | eight owner-executed public views | privilege/view-owner-sensitive |
| 07 | link sharing RPC | 01–04 | token lifecycle and link-shared RPCs | SECURITY DEFINER/token-sensitive |
| 08 | grants and final checks | 01–07 | role grants/revokes | privilege-sensitive |
| 09 | P1 access/integrity hardening | 00–08 | column grants, policies, triggers, helper replacements | incremental/lock-sensitive |

## Critical ordering constraints

- 04 cannot precede the tables in 01–03.
- 05 requires helpers from 04.
- 06 requires source tables and final public predicates.
- 08 must follow all function and view creation.
- 09 must run after 08 because it narrows the broad grants established there.
- applying 09 without 08 is not a supported upgrade path.

## Data-rewrite profile

No migration in `00–09` contains:

- `ALTER COLUMN TYPE`;
- `SET NOT NULL`;
- `TRUNCATE`;
- `DROP TABLE`;
- `DROP SCHEMA`.

Migration 09 performs no row rewrite. Its principal operational risks are lock acquisition during grant, policy, function, and trigger replacement.
