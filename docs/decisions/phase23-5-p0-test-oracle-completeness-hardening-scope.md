# Decision: Phase23.5 P0 Test Oracle Completeness & Wrapper False-negative Guard Hardening Scope

## 확정

- 사용자 Phase20 네 번째 local 실행의 P0 PASS 판정은 유지한다.
- Phase23.5는 발견된 실제 policy failure를 수정하는 단계가 아니다.
- Phase23.5는 future false-negative와 test oracle ambiguity를 줄이는 harness assurance patch다.
- `NEEDS_REVIEW`는 wrapper parser와 final result에 반영한다.
- `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `TRIGGER_FAIL`은 inert signal이 아니며 final result와 exit code에 반영한다.
- 문서 failure taxonomy와 wrapper runtime taxonomy를 맞춘다.
- `EXPECTED_DENY`는 exact negative-control oracle로만 인정한다.
- feedback author spoofing은 exact `P0001` + exact trigger message로 확인한다.
- approved Change Card mutation은 exact `P0001` + exact trigger message로 확인한다.
- direct source expected-deny는 `insufficient_privilege`만 인정한다.
- non-owner RLS test는 exception이 아니라 row count 0 / row_count 0을 oracle로 사용한다.
- `public_project_links`는 expected public fixture count = 1을 확인한다.
- expected scenario/check ID manifest를 wrapper에 둔다.
- missing/duplicate/conflicting scenario ID는 `SCENARIO_COVERAGE_FAIL`로 분류한다.
- seed fixture counts와 actor context를 machine-readable `PASS`/`SEED_FAIL`/`AUTH_CONTEXT_FAIL`로 출력한다.
- migration draft는 수정하지 않는다.
- broad grant는 추가하지 않는다.
- remote 적용은 계속 금지한다.

## 보류

- remote migration
- 정식 `supabase/migrations` 승격
- P1/P2/P3 RLS test
- Link Sharing Secure RPC Full Matrix
- token rotation/revocation
- full function permission audit
- full trigger matrix
- API integration
- frontend integration
- 자동화 테스트 프레임워크 추가
- production/staging 적용

## 재실행 정책

Phase23.5는 migration/RLS/view를 수정하지 않지만 P0 SQL test oracle과 wrapper coverage logic을 수정한다. 따라서 사용자는 local PC에서 phase20 wrapper를 다시 실행한다. 이 실행은 DB policy patch 검증이 아니라 wrapper/test-oracle assurance verification이다.

## Phase24 진입 조건

- Phase23.5 wrapper 실행 `ExitCode = 0`
- `OverallResult: PASS`
- `MissingScenarioIds: none`
- `DuplicateScenarioIds: none`
- `NEEDS_REVIEW` 없음
- `TRIGGER_FAIL` 없음
- `POLICY_FAIL` 없음
- `SCRIPT_ERROR` 없음
- `UNEXPECTED_ALLOW` 없음
- `UNEXPECTED_DENY` 없음
- `VIEW_BOUNDARY_FAIL` 없음
- remote command 없음
- secret 노출 없음
## Phase23.6 correction note

Phase23.5 wrapper에는 `elselseif` 2건의 parse error가 있었으므로 Phase23.5 결과물 자체의 wrapper 실행 PASS는 확인되지 않았다. 이 문제는 Phase23.6에서 수정했다. Phase23.5의 exact oracle, full taxonomy, scenario coverage 강화 결정은 유지한다.

사용자는 Phase23.6 ZIP에서 먼저 PowerShell static parse check를 수행하고, PASS한 경우에만 local wrapper assurance verification을 실행한다.
