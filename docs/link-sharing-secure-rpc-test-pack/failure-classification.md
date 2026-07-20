# Failure Classification

| 분류 | exit | 설명 |
|---|---:|---|
| `UNEXPECTED_ALLOW`, `VIEW_BOUNDARY_FAIL`, `VIEW_EXPOSURE_FAIL` | 2 | 직접적인 공개/권한 security blocker |
| `FAIL`, `UNEXPECTED_DENY`, `POLICY_FAIL`, `TRIGGER_FAIL`, `SCRIPT_ERROR`, `SCENARIO_COVERAGE_FAIL`, `RPC_BOUNDARY_FAIL`, `TOKEN_LIFECYCLE_FAIL`, `RESPONSE_EXPOSURE_FAIL`, uncaught `ERROR` | 3 | contract, policy, integrity, script 또는 coverage 실패 |
| `GRANT_FAIL` | 4 | function/table privilege matrix 불일치 |
| `VIEW_ACCESS_ERROR`, `ACCESS_PATH_MISMATCH`, `VIEW_OPTION_MISMATCH`, `VIEW_EXECUTION_MODEL_MISMATCH` | 5 | view/access execution boundary 문제 |
| `SEED_FAIL`, `AUTH_CONTEXT_FAIL` | 6 | fixture 또는 actor prerequisite 실패 |
| `NEEDS_REVIEW` | 7 | 정책 결정 또는 수동 판독 필요 |
| `ENV_ERROR` | 8 | local environment/object prerequisite 실패 |
| `EXPECTED_DENY`, `PASS` | 0 후보 | 정상 scenario 결과. 다른 failure signal과 coverage 누락이 없어야 함 |

## 최종 PASS 조건

- 모든 SQL `ExitCode = 0`
- 모든 expected scenario가 정확히 한 번 관측됨
- missing/duplicate/conflicting scenario 없음
- failure/review signal 없음
- `PASS` 또는 `EXPECTED_DENY`가 존재함
- `OverallResult: PASS`
