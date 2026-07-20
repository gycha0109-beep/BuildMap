# Phase23 - Phase20 Fourth Run PASS Intake & Final Signal Scan Correction Scope

## 단계 정의

Phase23은 사용자가 로컬 PC에서 수행한 Phase20 네 번째 실행 PASS 결과를 intake하고, wrapper final signal scan false positive를 최소 보정하는 단계다.

## 확정한 것

- Phase20 fourth run SQL execution은 사용자 제공 결과 기준 PASS다.
- P0 scenarios는 사용자 제공 결과 기준 PASS로 intake한다.
- public-safe view runtime verification은 사용자 제공 결과 기준 PASS다.
- 전체 8개 public-safe view verification 대상은 유지한다.
- `security_invoker=true` residual count는 `0`으로 보고됐다.
- `security_barrier=true` missing count는 `0`으로 보고됐다.
- anon source direct access deny는 유지됐다.
- approved Change Card mutation block은 `EXPECTED_DENY`로 확인됐다.
- wrapper final signal scan은 false positive다.
- false positive 원인은 raw substring scan이 instruction/search hint/header 문자열을 실제 signal로 오인한 것이다.
- raw substring scan을 폐기 또는 제한하고 exact/anchored signal parsing을 채택한다.
- `EXPECTED_DENY`는 정상 결과로 취급한다.
- `OverallResult: PASS` 출력을 추가한다.
- remote 적용은 하지 않는다.
- 정식 `supabase/migrations` 승격은 하지 않는다.
- Phase23에서 작업자는 SQL, Docker, Supabase CLI, psql, phase20 wrapper를 실행하지 않았다.

## 보류한 것

- remote migration
- 정식 `supabase/migrations` 승격
- P1/P2/P3 RLS scenario
- link sharing secure RPC full matrix
- token rotation/revocation
- full function permission audit
- full trigger matrix
- API integration
- frontend integration
- 자동화 테스트 프레임워크
- production/staging 적용

## 재실행 정책

Phase23 완료 후 전체 phase20 wrapper 재실행은 필수가 아니다. 이번 변경은 wrapper signal parser만 수정하며 SQL/migration/P0 scenario를 수정하지 않는다.

선택적으로 사용자가 wrapper classification verification을 수행할 수 있다. 이 경우 기대 결과는 다음이다.

```text
OverallResult: PASS
UnexpectedAllowDetected: False
GrantFailDetected: False
AccessPathMismatchDetected: False
ViewAccessErrorDetected: False
ViewBoundaryFailDetected: False
ViewOptionMismatchDetected: False
ViewExecutionModelMismatchDetected: False
FailDetected: False
UncaughtErrorDetected: False
ExpectedDenyDetected: True
PassDetected: True
```

## 다음 권장 단계

1순위는 Link Sharing Secure RPC Full Matrix다.

이유: P0에서 제외된 share token no/wrong/revoked/reissued, private transition, token rotation/revocation, secure RPC privilege/search_path는 외부 공유 보안 경계에 직접 연결된다.

2순위는 P1/P2 Manual RLS Scenario Pack이다.


## Phase23.5 follow-up

Phase23.5에서 wrapper false-negative guard를 보강했다. Phase23의 P0 PASS intake는 유지하되, `NEEDS_REVIEW`, `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `TRIGGER_FAIL`, `SCENARIO_COVERAGE_FAIL`이 final result에 반영되도록 했다.
