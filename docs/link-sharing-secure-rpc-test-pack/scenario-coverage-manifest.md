# Scenario Coverage Manifest

| SQL | expected IDs | 목적 |
|---|---:|---|
| `phase25_00_preflight.sql` | 19 | function/search_path/ACL/token contract prerequisite |
| `phase25_01_seed_link_fixture.sql` | 10 | actor/project/card/request/token fixture |
| `phase25_02_read_rpc_matrix.sql` | 21 | valid/invalid/unified read response |
| `phase25_03_token_lifecycle_matrix.sql` | 14 | rotate/revoke/transition/old-new token |
| `phase25_04_feedback_rpc_matrix.sql` | 12 | auth, author forcing, request boundary, no mutation on deny |
| `phase25_05_rpc_permission_security.sql` | 12 | SECURITY DEFINER/function ACL/dependency security |
| `phase25_06_response_exposure.sql` | 10 | response key/row/token/internal identifier exposure |
| `phase25_99_result_summary.sql` | 9 | final fixture/ACL/path/response summary |

총 expected scenario: 107개.

wrapper는 file별 expected/observed ID를 비교하고 missing, duplicate, conflicting result를 `SCENARIO_COVERAGE_FAIL`로 처리한다.
