# Signal Taxonomy and Exit Code Matrix

## runtime signal taxonomy

| Signal | 의미 | 최종 flag | exit |
|---|---|---|---:|
| `PASS` | 기대 동작 확인 | `PassDetected` | 0 조건 |
| `EXPECTED_DENY` | 의도한 deny가 정확한 oracle로 확인됨 | `ExpectedDenyDetected` | 0 조건 |
| `UNEXPECTED_ALLOW` | 차단돼야 할 접근/변경이 허용됨 | `UnexpectedAllowDetected` | 2 |
| `VIEW_BOUNDARY_FAIL` | public-safe view가 private/sensitive/internal data 또는 forbidden column을 노출함 | `ViewBoundaryFailDetected` | 2 |
| `VIEW_EXPOSURE_FAIL` | `VIEW_BOUNDARY_FAIL`의 legacy/triage alias | `ViewExposureFailDetected` | 2 |
| `FAIL` | 일반 test failure | `FailDetected` | 3 |
| `UNEXPECTED_DENY` | 허용돼야 할 동작이 차단됨 | `UnexpectedDenyDetected` | 3 |
| `POLICY_FAIL` | RLS policy behavior가 기대와 다름 | `PolicyFailDetected` | 3 |
| `TRIGGER_FAIL` | trigger가 기대 message/SQLSTATE와 다르게 동작함 | `TriggerFailDetected` | 3 |
| `SCRIPT_ERROR` | test script defect 또는 unrelated runtime error | `ScriptErrorDetected` | 3 |
| `SCENARIO_COVERAGE_FAIL` | expected scenario ID 누락/중복/충돌 | `ScenarioCoverageFailDetected` | 3 |
| `GRANT_FAIL` | privilege prerequisite 부족 | `GrantFailDetected` | 4 |
| `VIEW_ACCESS_ERROR` | public-safe view execution/access 실패 | `ViewAccessErrorDetected` | 5 |
| `ACCESS_PATH_MISMATCH` | source/view path가 scenario 의도와 다름 | `AccessPathMismatchDetected` | 5 |
| `VIEW_OPTION_MISMATCH` | view reloptions가 기대와 다름 | `ViewOptionMismatchDetected` | 5 |
| `VIEW_EXECUTION_MODEL_MISMATCH` | view execution model이 Phase22 결정과 다름 | `ViewExecutionModelMismatchDetected` | 5 |
| `SEED_FAIL` | fixture prerequisite 실패 | `SeedFailDetected` | 6 |
| `AUTH_CONTEXT_FAIL` | `auth.uid()` / `current_user_profile_id()` context 실패 | `AuthContextFailDetected` | 6 |
| `NEEDS_REVIEW` | 허용 후보/비차단 후보가 예상 밖 상태 | `NeedsReviewDetected` | 7 |
| `ENV_ERROR` | local environment 문제 | `EnvErrorDetected` | 8 |
| `ERROR` | uncaught SQL/native error signal | `UncaughtErrorDetected` | non-zero/3 |

## PASS 조건

`OverallResult: PASS`는 다음을 모두 만족할 때만 가능하다.

1. 모든 SQL file의 `ExitCode = 0`.
2. 모든 expected scenario/check ID가 출력됨.
3. missing/duplicate/conflicting scenario ID가 없음.
4. blocker/failure/review signal이 없음.
5. `PASS` 또는 `EXPECTED_DENY`가 하나 이상 존재함.
6. `EXPECTED_DENY`는 exact oracle로 확인됨.

## expected deny는 정상

`EXPECTED_DENY`는 보안 boundary가 의도대로 작동했다는 신호다. `EXPECTED_DENY` 자체는 wrapper failure가 아니다.
## Phase23.6 FileOverallResult 정렬

| FileOverallResult | 조건 |
|---|---|
| `FAIL` | native exit non-zero, scenario coverage failure, `UNEXPECTED_ALLOW`, `VIEW_BOUNDARY_FAIL`, `VIEW_EXPOSURE_FAIL`, `FAIL`, `UNEXPECTED_DENY`, `POLICY_FAIL`, `TRIGGER_FAIL`, `SCRIPT_ERROR`, `ERROR` |
| `NEEDS_REVIEW` | `GRANT_FAIL`, `VIEW_ACCESS_ERROR`, `ACCESS_PATH_MISMATCH`, `VIEW_OPTION_MISMATCH`, `VIEW_EXECUTION_MODEL_MISMATCH`, `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `NEEDS_REVIEW`, `ENV_ERROR` |
| `PASS` | exit 0, manifest 충족, duplicate/conflict 없음, failure/review signal 없음, `PASS` 또는 `EXPECTED_DENY` 존재 |

`SCRIPT_PARSE_ERROR`는 wrapper 실행 이전 PowerShell parse gate에서 차단한다. parser check가 실패하면 SQL 또는 Docker 실행으로 넘어가지 않는다.
