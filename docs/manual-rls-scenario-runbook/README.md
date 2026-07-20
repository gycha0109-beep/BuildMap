# BuildMap 17단계 Manual RLS Scenario Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 17단계 목적

16단계에서 local schema application과 lint가 1차 통과했으므로, 이제 RLS behavior를 검증할 차례다. 17단계의 목적은 18단계에서 사용자가 로컬 Supabase DB에 대해 수동 RLS 시나리오 테스트를 안전하게 실행할 수 있도록 실행 절차서를 고정하는 것이다.

## 16단계 Manual RLS Scenario Test Plan과의 관계

16단계는 무엇을 검증할지 정의한 테스트 계획이다. 17단계는 그 계획을 실제 local-only 실행 순서, actor simulation, seed 순서, 시나리오별 SQL/RPC 후보, 로그 수집 양식으로 변환한다.

16단계에서 확인된 전제는 다음이다.

| 항목 | 상태 |
|---|---|
| Supabase CLI | `2.109.1` |
| Docker | `Docker version 29.4.3, build 055a478` |
| Docker daemon | `docker info` 성공 |
| `supabase/config.toml` | 생성 완료 |
| `supabase start` | 성공 |
| `supabase db reset` | 성공 |
| `supabase db lint --local` | 성공, `No schema errors found` |
| remote 적용 | 없음 |

## 생성 문서 목록

1. `runbook-overview.md`
2. `local-only-safety-rules.md`
3. `preflight-before-manual-test.md`
4. `actor-simulation-strategy.md`
5. `auth-uid-simulation-check.md`
6. `test-data-seed-order.md`
7. `test-data-seed-template.md`
8. `sql-session-runbook.md`
9. `project-access-test-runbook.md`
10. `link-sharing-test-runbook.md`
11. `change-card-access-test-runbook.md`
12. `rough-note-ai-draft-test-runbook.md`
13. `feedback-test-runbook.md`
14. `public-safe-view-test-runbook.md`
15. `secure-rpc-test-runbook.md`
16. `function-permission-test-runbook.md`
17. `trigger-behavior-test-runbook.md`
18. `test-execution-order.md`
19. `manual-test-log-intake-template.md`
20. `expected-results-matrix.md`
21. `failure-triage-guide.md`
22. `stop-and-rollback-rules.md`
23. `next-step-after-runbook.md`

## 읽는 순서

`README.md` → `local-only-safety-rules.md` → `preflight-before-manual-test.md` → `actor-simulation-strategy.md` → `auth-uid-simulation-check.md` → `test-data-seed-order.md` → 각 영역별 test runbook → `expected-results-matrix.md` → `failure-triage-guide.md` → `manual-test-log-intake-template.md`

## 이번 단계에서 실행하지 않는 것

- Supabase CLI 실행
- `supabase db reset`
- `supabase db lint`
- SQL 실행
- `psql` 실행
- local DB test seed
- RPC 호출
- view 조회
- trigger/function permission 검증
- remote Supabase 적용
- 정식 migration 승격
- API / frontend / 자동화 테스트 코드 작성

## 18단계에서 사용자가 실행할 후보

18단계에서는 사용자가 local-only 환경에서 다음을 실행할 수 있다.

- actor별 `auth.uid()` simulation smoke test
- 테스트 데이터 seed
- Project / Change Card / Rough Note / AI Draft / Feedback RLS 시나리오
- public-safe view 컬럼 노출 검증
- secure RPC token 시나리오
- function execute permission 검증
- approved Change Card mutation trigger 검증

## 핵심 안전 원칙

- local-only만 허용한다.
- remote Supabase, production, staging DB 접근은 금지한다.
- `supabase link`, `db push`, `db pull`, Supabase hosted SQL Editor는 금지한다.
- secret, raw token, DB URL, password는 로그에 남기지 않는다.
- `auth.uid()` simulation이 실패하면 RLS 시나리오 테스트를 중단한다.
- `UNEXPECTED_ALLOW`는 security blocker다.

## 최종 결론

17단계는 실행 단계가 아니라 **수동 RLS 시나리오 테스트 실행 절차서 작성 단계**다. 18단계는 사용자가 이 runbook에 따라 local DB에서 테스트를 실행하고 로그를 가져오는 흐름으로 진행한다.

> 18단계 auth.uid() actor simulation smoke test 결과는 `docs/auth-uid-simulation-smoke-test/README.md`를 확인한다.

## 19단계 P0 local test pack

18단계 `auth.uid()` actor simulation이 사용자 로컬 PC에서 PASS로 확인되었으므로, 20단계에서 실행할 P0 RLS local test pack은 `docs/p0-rls-local-test-pack/README.md`와 `scripts/manual-local-rls/README.md`를 확인한다.
