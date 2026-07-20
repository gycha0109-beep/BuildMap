# Stop Rules

다음이 발생하면 즉시 실행을 중단하고 로그를 저장한다.

- remote 연결 의심
- secret, token, password, DB URL 출력
- preflight 실패
- seed 실패
- `auth.uid()` context 실패
- private Project가 anon/non-owner에게 보임
- Rough Note 또는 AI Draft가 anon/non-owner에게 보임
- sensitive Change Card가 public으로 보임
- private Project의 published Change Card가 public으로 보임
- Feedback author spoofing이 허용됨
- approved Change Card core mutation이 허용됨
- public-safe view가 `author_user_profile_id`, `auth_user_id`, `share_token_hash` 등 민감 컬럼을 노출함

중단 후에는 remote에 아무 조치도 하지 않는다. 로그를 마스킹한 뒤 후속 patch 판단으로 넘긴다.

## 20단계 재실행 중단 규칙 보강

seed 단계에서 다시 `Feedback author_user_profile_id must match the current user profile.`가 발생하면 즉시 중단한다. 이 경우 P0 본 테스트 실패로 해석하지 않고 seed actor context 또는 helper/trigger 상호작용 문제로 분류한다.

`phase20_05_feedback_author_spoofing_p0.sql`에서 같은 오류가 `EXPECTED_DENY`로 잡히는 경우는 정상 기대 결과다. 반대로 spoofing insert가 성공해 `UNEXPECTED_ALLOW`가 출력되면 P0 security blocker다.

## PATCH 21 중단 조건 추가

다음 신호가 나오면 local run을 중단하고 redacted log를 가져온다.

- `GRANT_FAIL`
- `ACCESS_PATH_MISMATCH`
- `VIEW_ACCESS_ERROR`
- uncaught `permission denied for table/view/function`

특히 anon source table grant를 추가해야 하는 것처럼 보이는 경우에도 즉시 broad grant를 추가하지 않는다.

## Phase22 note

Phase22 추가 stop rule: `VIEW_BOUNDARY_FAIL`, public-safe view 민감 컬럼 노출, private/sensitive/internal/draft row 노출, anon source table direct SELECT 허용은 즉시 중단한다.

## Phase22.5 builder view stop rules

다음이 발생하면 P0 PASS로 판정하지 않는다.

- `public_builder_profiles` actual SELECT가 `VIEW_ACCESS_ERROR`를 출력
- non-public builder fixture가 `public_builder_profiles`에 노출
- `public_builder_profiles`에 `user_profile_id` 또는 `auth_user_id` column이 존재
- 8개 public-safe view 중 `security_invoker=true`가 남아 있음
- 8개 public-safe view 중 `security_barrier=true`가 누락됨

## Phase22.6 wrapper stderr handling stop rule

`NativeCommandError` 표시만으로 P0 PASS/FAIL을 확정하지 않는다. 다음을 기준으로 중단 여부를 판단한다.

- SQL file별 `ExitCode`가 non-zero이면 중단한다.
- `UNEXPECTED_ALLOW` 또는 `VIEW_BOUNDARY_FAIL`이 있으면 P0 security blocker로 중단한다.
- `VIEW_ACCESS_ERROR`, `VIEW_OPTION_MISMATCH`, `VIEW_EXECUTION_MODEL_MISMATCH`, `GRANT_FAIL`, `ACCESS_PATH_MISMATCH`가 있으면 execution/configuration blocker로 중단한다.
- `NOTICE` 또는 `WARNING` 문자열만 있고 `ExitCode = 0`, blocker signal이 없으면 그 자체로 중단 사유가 아니다.

wrapper가 중단된 경우에도 SQL 파일명, 정규화된 output, `ExitCode`, 최초 감지 signal이 로그에 남아야 한다.

## Phase23 false positive stop-rule correction

다음은 stop signal이 아니다.

- `NEXT` instruction 안에 failure token이 나열된 경우
- `Search hints` line에 failure token이 나열된 경우
- `Patch level` 또는 patch 설명에 failure token이 포함된 경우
- `GRANT_FAIL` 같은 compound token 내부의 `FAIL` suffix
- PostgreSQL `NOTICE` / `WARNING` severity 자체

다음은 계속 stop signal이다.

- exact `UNEXPECTED_ALLOW`
- exact `VIEW_BOUNDARY_FAIL`
- exact `GRANT_FAIL`
- exact `VIEW_ACCESS_ERROR`
- exact `ACCESS_PATH_MISMATCH`
- exact `VIEW_OPTION_MISMATCH`
- exact `VIEW_EXECUTION_MODEL_MISMATCH`
- exact `FAIL`
- uncaught SQL/native non-zero exit


## Phase23.5 stop rule 추가

`NEEDS_REVIEW`, `SCENARIO_COVERAGE_FAIL`, `TRIGGER_FAIL`, `POLICY_FAIL`, `SCRIPT_ERROR`, `UNEXPECTED_DENY`는 PASS로 처리하지 않는다. expected scenario/check ID가 누락되면 실제 SQL exit code가 0이어도 `SCENARIO_COVERAGE_FAIL`로 중단한다.
## Phase23.6 parse gate stop rule

- `POWERSHELL_PARSE_CHECK: FAIL`이면 wrapper를 실행하지 않는다.
- PRE-005~013이 `ENV_ERROR`이면 local schema/helper prerequisite 실패로 중단한다.
- PRE-014 계열이 `POLICY_FAIL`이면 RLS prerequisite 실패로 중단한다.
- `SUMMARY-020`이 `VIEW_BOUNDARY_FAIL`, `VIEW_ACCESS_ERROR`, `SCRIPT_ERROR`를 출력하면 PASS로 처리하지 않는다.
