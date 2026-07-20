# Phase27 First User-local Runtime Failure Intake

## Evidence

- source: user local redacted wrapper output
- final result: `OverallResult: FAIL`
- scenario coverage: complete; missing/duplicate/conflicting IDs all `none`
- environment/script errors: none
- blocker classes: `UNEXPECTED_ALLOW`, `TRIGGER_FAIL`

## File-level results

| File | Result | Blocker signal |
|---|---|---|
| Problem/Hypothesis | FAIL | 4 `UNEXPECTED_ALLOW` |
| Feedback Request/Feedback | FAIL | 4 `UNEXPECTED_ALLOW`, 1 `TRIGGER_FAIL` |
| Project Links | FAIL | 1 `UNEXPECTED_ALLOW` |
| Change Card | FAIL | 7 `UNEXPECTED_ALLOW` |
| Profile/Discovery | FAIL | 1 `UNEXPECTED_ALLOW` |
| Integrity/Permission | FAIL | 1 `UNEXPECTED_ALLOW` |

## Root-cause classification

Migration and scenario source cross-review classified the blockers as:

1. archived Problem/Hypothesis rows inherited public Project visibility;
2. creator/author IDs were not bound to the authenticated Builder on insert;
3. public Feedback Request source RLS did not enforce linked Change Card safety;
4. public-selected Feedback helper did not enforce linked Change Card safety;
5. Feedback Request target trigger was affected by caller RLS and returned the wrong cross-project classification;
6. approved Change Card title/type/author/importance and approval transition metadata were insufficiently protected;
7. profile/project table-wide UPDATE exposed `account_status` and ownership fields.

## Decision

- do not change expected results;
- preserve Phase25/Phase26 protected files;
- add migration draft 09 as the minimum forward correction;
- strengthen the Phase27 oracle before rerun.
