# Scenario Coverage Manifest

| File | Prefix | Count | 주요 경계 |
|---|---:|---:|---|
| `phase27_00_preflight.sql` | `P1-PRE` | 18 | RLS, policy, grant, view, helper/trigger existence |
| `phase27_01_seed_p1_fixture.sql` | `P1-SEED` | 14 | actor/fixture completeness |
| `phase27_02_problem_hypothesis_matrix.sql` | `P1-PH` | 22 | owner/public/archive/mutation/creator spoof |
| `phase27_03_feedback_request_matrix.sql` | `P1-FR` | 30 | request/view/source/card/feedback/creator boundary |
| `phase27_04_project_links_matrix.sql` | `P1-PL` | 16 | public/internal/private/archive/mutation/creator boundary |
| `phase27_05_change_card_mutation_matrix.sql` | `P1-CC` | 31 | create/approve/publish/immutable fields/identity |
| `phase27_06_profile_discovery_matrix.sql` | `P1-PROFILE` | 18 | self/public/private/discovery/internal status |
| `phase27_07_integrity_permission_matrix.sql` | `P1-INTEGRITY` | 24 | grants, policies, trigger ACL, ownership/token controls |
| `phase27_99_result_summary.sql` | `P1-SUMMARY` | 8 | fixture persistence and public-safe cardinality |
| **Total** |  | **181** |  |

Canonical machine-readable source:

```text
scripts/manual-local-rls-p1/phase27_p1_scenario_manifest.json
```


## Phase27.1 additions

- `P1-PH-021..022`: existing creator identity immutability
- `P1-FR-029`: Feedback Request creator identity immutability
- `P1-FR-030`: sensitive linked Change Card request Feedback insert denial
- `P1-PL-016`: Project Link creator identity immutability
- `P1-CC-029..031`: draft Change Card author/project identity and created-at evidence immutability
- `P1-INTEGRITY-019`: five identity triggers present
- `P1-INTEGRITY-020`: protected profile/project columns lack authenticated UPDATE
- `P1-INTEGRITY-021`: intended self-service/product columns retain UPDATE
- `P1-INTEGRITY-022..023`: Project INSERT excludes token/timestamp internals and retains required creation columns
- `P1-INTEGRITY-024`: generic identity trigger function remains externally non-executable
