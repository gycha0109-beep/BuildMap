# BuildMap 18단계 auth.uid() Actor Simulation Smoke Test

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 18단계 목적

17단계 Manual RLS Scenario Test Runbook에서 선행 조건으로 정의한 `auth.uid()` actor simulation 가능 여부를 확인하는 단계다. 이 검증이 성공해야 Project Owner 정책, non-owner 차단 정책, Feedback author spoofing 차단 정책, link_shared authenticated write 조건 같은 후속 RLS 시나리오 테스트가 의미를 가진다.

## 17단계 runbook과의 관계

17단계는 전체 수동 RLS 테스트 절차서를 만들었다. 18단계는 그중 가장 먼저 실행해야 하는 `auth.uid()` smoke test만 분리한다. 18단계에서 actor simulation이 실패하면 19단계 P0 RLS scenario로 넘어가지 않는다.

## 이번 단계에서 실행하는 범위

- local-only `auth.uid()` actor simulation 후보 확인
- `anon`, `authenticated_owner`, `authenticated_non_owner`, `feedback_author`, `link_shared_authenticated_user` fixture 정리
- `request.jwt.claim.sub` 방식과 `request.jwt.claims` 방식의 실행 후보 정리
- 현재 환경 기준 preflight 결과 문서화
- 19단계 Go / No-Go 판단 문서화

## 이번 단계에서 실행하지 않는 범위

- 전체 Manual RLS Scenario Test
- Project / Change Card / Feedback 본 테스트
- test seed insert
- secure RPC 호출
- public-safe view 조회
- trigger behavior 검증
- function permission 검증
- remote Supabase 적용
- 정식 migration 승격

## 생성 문서 목록

1. `smoke-test-overview.md`
2. `local-only-preflight.md`
3. `actor-fixture.md`
4. `sql-session-methods.md`
5. `request-jwt-claim-sub-method.md`
6. `request-jwt-claims-method.md`
7. `anon-actor-result.md`
8. `authenticated-owner-result.md`
9. `authenticated-non-owner-result.md`
10. `feedback-author-result.md`
11. `method-comparison-result.md`
12. `failure-analysis.md`
13. `go-no-go-after-auth-smoke.md`
14. `manual-log-intake-template.md`
15. `next-step-decision.md`

## 읽는 순서

`README.md` → `local-only-preflight.md` → `actor-fixture.md` → `sql-session-methods.md` → Method A/B 문서 → actor별 결과 문서 → `method-comparison-result.md` → `go-no-go-after-auth-smoke.md` → `next-step-decision.md`

## 최종 결론

현재 문서 작성 환경에서는 Supabase CLI, Docker, psql이 없어 실제 `auth.uid()` smoke test를 실행하지 못했다. 따라서 18단계 결과는 이 환경 기준 `No-Go`다. 사용자의 로컬 PC에서 16단계와 동일한 local Supabase 환경으로 Method A/B 중 하나를 실행해 actor별 기대 UUID가 확인되면 19단계로 넘어갈 수 있다.

## 19단계 사용자 로컬 PASS 반영

사용자가 로컬 PC에서 18단계 `auth.uid()` actor simulation smoke test를 직접 실행했고, `anon`, `authenticated_owner`, `authenticated_non_owner`, `feedback_author`, `link_shared_authenticated_user`가 모두 기대 결과를 반환했다. 따라서 18단계 진행 판단은 사용자 로컬 결과 기준 `Go`로 재분류한다.

- PASS 결과: `docs/auth-uid-simulation-smoke-test/user-local-pass-result.md`
- Go 재분류: `docs/auth-uid-simulation-smoke-test/go-reclassification.md`
