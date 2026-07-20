# Phase 17 Manual RLS Scenario Test Runbook Scope

> 단계: BuildMap 17단계  
> 성격: Manual RLS Scenario Test Runbook  
> 주의: 이번 단계는 실행 절차서 작성 단계이며, SQL/RPC/view/trigger/function 테스트를 실행하지 않는다.

## 확정한 것

- 17단계는 Manual RLS Scenario Test Runbook 작성 단계다.
- 17단계에서는 테스트를 실행하지 않는다.
- 17단계에서는 SQL을 실행하지 않는다.
- 17단계에서는 psql을 실행하지 않는다.
- 17단계에서는 local DB에 test seed를 넣지 않는다.
- 17단계에서는 remote Supabase 적용을 하지 않는다.
- 17단계에서는 정식 migration 승격을 하지 않는다.
- 16단계 local `db reset` / `db lint --local` 성공 결과를 전제로 한다.
- 18단계는 사용자가 로컬 DB에서 수동 RLS 시나리오 테스트를 실행하고 로그를 가져오는 단계 후보로 둔다.
- actor simulation은 RLS 테스트 전 필수 smoke test다.
- `auth.uid()` simulation 실패 시 RLS 테스트를 중단한다.
- `UNEXPECTED_ALLOW`는 security blocker로 취급한다.
- Rough Note / AI Draft 노출, Feedback author spoofing 허용, private Project data 노출은 P0 blocker다.
- remote 적용은 계속 금지한다.
- 관리자/팀/조직/비로그인 피드백은 계속 제외한다.

## 보류한 것

- 실제 Manual RLS Scenario Test 실행
- test data seed 실행
- psql 실행
- SQL 실행
- RPC 호출
- view 조회
- trigger behavior 검증
- function permission 검증
- remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- SQL patch
- API route
- 프론트엔드 구현
- 자동화 테스트 코드
- hmac/pepper 기반 token hash
- public_slug 실제 생성 정책
- last_activity_at 갱신 방식
- Feedback 작성자 동의 UX
- 관리자 권한
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식

## 18단계로 넘기는 질문

1. 18단계에서 사용자는 `auth.uid()` simulation smoke test부터 실행할 것인가?
2. actor simulation 방식은 `request.jwt.claim.sub`와 `request.jwt.claims` 중 어느 쪽이 local 환경에서 동작하는가?
3. 테스트 seed는 수동 SQL로 넣을 것인가, 아니면 별도 local-only seed 파일 후보로 분리할 것인가?
4. P0 security scenario만 먼저 실행하고 P1/P2는 후속으로 나눌 것인가?
5. public-safe view 실패 시 즉시 RPC/API boundary patch로 전환할 것인가?
6. trigger behavior 테스트는 Change Card/Feedback 관련 P0만 먼저 실행할 것인가?
