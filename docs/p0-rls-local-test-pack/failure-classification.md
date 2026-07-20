# Failure Classification

| 분류 | 의미 | 심각도 | 20단계 이후 조치 |
|---|---|---:|---|
| PASS | 기대대로 허용 또는 차단됨 | 없음 | 다음 테스트 진행 |
| EXPECTED_DENY | 차단되어야 할 동작이 차단됨 | 없음 | 정상 |
| UNEXPECTED_ALLOW | 차단되어야 할 동작이 허용됨 | P0 blocker | 후속 Security Patch |
| UNEXPECTED_DENY | 허용되어야 할 동작이 차단됨 | P1/P2 | Policy Adjustment |
| SEED_FAIL | fixture 생성 실패 | blocker | Seed Script Patch |
| AUTH_CONTEXT_FAIL | `auth.uid()` context 실패 | blocker | Actor Simulation Patch |
| POLICY_FAIL | RLS policy 조건 문제 | high | RLS Policy Patch |
| TRIGGER_FAIL | trigger 동작 문제 | high/blocker | Trigger Patch |
| VIEW_EXPOSURE_FAIL | view 민감 컬럼/row 노출 | P0 blocker | Public View Boundary Patch |
| SCRIPT_ERROR | script 문법/실행 오류 | medium | Script Patch |
| ENV_ERROR | Docker/local DB 환경 오류 | medium | Local Environment Fix |
| NEEDS_REVIEW | 판정 불명확 | medium | SQL draft review |

`UNEXPECTED_ALLOW`는 무조건 P0 security blocker로 취급한다.

## 20단계 첫 실행에서 확인된 SEED_FAIL 사례

`Feedback author_user_profile_id must match the current user profile.` 오류는 baseline feedback fixture insert 시 actor context가 누락된 경우 발생한다.
이 경우 P0 RLS 본 테스트 실패가 아니라 `SEED_FAIL`로 분류한다.

patch 이후에도 같은 오류가 발생하면 다음을 확인한다.

- `request.jwt.claim.sub`가 `feedback_author_auth_user_id`로 설정되었는가
- `public.current_user_profile_id()`가 `feedback_author_user_profile_id`를 반환하는가
- `feedbacks.author_user_profile_id`가 현재 actor의 user profile과 일치하는가

## GRANT_FAIL

필요한 table/view/function privilege가 없어 RLS 또는 trigger 평가 전에 차단된 상태다. authenticated source-table RLS 테스트에서 발생하면 최소 privilege patch 대상이다. anon source-table public read에서 발생하면 access path가 public-safe view인지 먼저 확인한다.

## ACCESS_PATH_MISMATCH

public-safe view를 사용해야 하는 public scenario가 source table을 직접 조회하거나, source table RLS 검증이 필요한 authenticated scenario가 view를 잘못 사용하는 경우다. broad grant로 해결하지 않고 script access path를 먼저 수정한다.

## VIEW_ACCESS_ERROR

public-safe view에 대한 `SELECT`가 `security_invoker` 또는 underlying privilege 문제로 실패한 상태다. broad source table grant를 즉시 추가하지 않고 view execution model 또는 RPC/API boundary를 검토한다.

## Phase22 추가 분류

| 분류 | 의미 | 심각도 | 즉시 중단 여부 | patch 대상 |
|---|---|---:|---|---|
| `VIEW_ACCESS_ERROR` | public-safe view 조회가 privilege/view execution model 문제로 실패함 | blocker | 예 | public-safe view execution model / grants |
| `VIEW_BOUNDARY_FAIL` | view 조회는 성공했지만 private/sensitive/internal/draft row 또는 forbidden column이 노출됨 | P0 security blocker | 예 | public-safe view predicate/column allowlist |
| `VIEW_EXECUTION_MODEL_CONFLICT` | `security_invoker` 또는 view owner model이 BuildMap public-safe boundary와 충돌함 | high | 예 | view execution model decision |

## Phase22.6 wrapper/native stderr 분류

| 분류 | 의미 | 심각도 | 즉시 중단 여부 | patch 대상 |
|---|---|---:|---|---|
| `WRAPPER_NATIVE_STDERR_HANDLING_GAP` | PowerShell wrapper가 native stderr를 SQL process failure와 분리하지 못해 로그 수집/분류 전에 중단될 수 있음 | medium | wrapper가 중단되면 예 | wrapper |
| `POWERSHELL_NATIVE_COMMAND_COMPATIBILITY` | PowerShell 5.1/7의 native command stderr/ErrorRecord 처리 차이로 출력 수집 방식 보정 필요 | medium | 아니오 | wrapper |

PostgreSQL `NOTICE` / `WARNING`은 그 자체로 `FAIL`이 아니다. `psql` exit code와 SQL 내부 signal을 함께 보아야 한다.

- `ExitCode = 0` + `PASS`/`EXPECTED_DENY`: 정상 진행 가능
- `ExitCode = 0` + `VIEW_ACCESS_ERROR`: view/access boundary 문제
- `ExitCode = 0` + `VIEW_BOUNDARY_FAIL`: P0 security blocker
- `ExitCode != 0`: uncaught SQL/native execution failure

## Phase23 wrapper signal false positive

| 분류 | 의미 | 심각도 | 즉시 중단 여부 | patch 대상 |
|---|---|---:|---|---|
| `WRAPPER_SIGNAL_SCAN_FALSE_POSITIVE` | wrapper가 안내 문구/search hint/header의 token을 실제 scenario failure로 오탐함 | medium | 아니오, SQL 실행 자체가 PASS면 wrapper patch | wrapper |
| `UNANCHORED_SIGNAL_PATTERN` | raw substring 또는 broad regex가 exact result token이 아닌 설명 문구를 감지함 | medium | 아니오 | wrapper |

Phase23 이후 `FAIL`은 독립 token일 때만 감지한다. `GRANT_FAIL`, `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `TRIGGER_FAIL`, `VIEW_BOUNDARY_FAIL` 내부의 suffix는 일반 `FAIL`로 취급하지 않는다.

`NEXT`, `Search hints`, `Patch level`, `Review log for`, `instruction`, `PATCH` line은 signal scan 대상이 아니다.


## Phase23.5 runtime taxonomy alignment

Wrapper는 `PASS`, `EXPECTED_DENY`, `UNEXPECTED_ALLOW`, `UNEXPECTED_DENY`, `FAIL`, `ERROR`, `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `POLICY_FAIL`, `TRIGGER_FAIL`, `VIEW_EXPOSURE_FAIL`, `VIEW_BOUNDARY_FAIL`, `VIEW_ACCESS_ERROR`, `VIEW_OPTION_MISMATCH`, `VIEW_EXECUTION_MODEL_MISMATCH`, `GRANT_FAIL`, `ACCESS_PATH_MISMATCH`, `SCRIPT_ERROR`, `ENV_ERROR`, `NEEDS_REVIEW`, `SCENARIO_COVERAGE_FAIL`을 runtime signal로 인식한다. 문서 triage용 legacy alias인 `VIEW_EXPOSURE_FAIL`은 `VIEW_BOUNDARY_FAIL`과 같은 P0 security blocker 계열로 처리한다.
## Phase23.6 추가 분류

| 분류 | 의미 | 조치 |
|---|---|---|
| `SCRIPT_PARSE_ERROR` | PowerShell wrapper가 syntax parse 단계에서 실행 불가 | wrapper 수정 후 external parse check |
| `WRAPPER_STATIC_VALIDATION_GAP` | 실행 전 syntax-only gate가 없어 parse defect가 늦게 발견됨 | `Parser.ParseFile()` pre-run check |
| `SIGNAL_PARSER_DETERMINISM_GAP` | result position이 아닌 설명문 token을 중복 판독 | exact result-position parser |
| `PREFLIGHT_MANIFEST_COVERAGE_GAP` | object/helper/RLS prerequisite가 manifest에 없음 | PRE-005~014 machine-readable coverage |

PowerShell parse check 실패는 `ENV_ERROR`나 RLS 실패가 아니다. SQL 실행 이전 wrapper defect로 분류한다.
