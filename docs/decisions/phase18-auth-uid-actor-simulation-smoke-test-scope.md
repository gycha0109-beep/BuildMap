# Phase 18 Auth UID Actor Simulation Smoke Test Scope

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 확정한 것

- 18단계는 `auth.uid()` actor simulation smoke test 단계다.
- 전체 Manual RLS Scenario Test는 아직 실행하지 않는다.
- remote Supabase 적용은 하지 않는다.
- 정식 migration 승격은 하지 않는다.
- actor simulation은 후속 RLS 테스트의 선행 조건이다.
- anon actor는 `auth.uid()`가 `null`이어야 한다.
- authenticated actors는 각각 기대 UUID를 반환해야 한다.
- `request.jwt.claim.sub` 방식과 `request.jwt.claims` 방식 중 실제 동작하는 방식을 확인해야 한다.
- `auth.uid()` simulation 실패 시 19단계 RLS 테스트로 넘어가지 않는다.
- 현재 문서 작성 환경에서는 Supabase CLI, Docker, psql이 없어 smoke test를 실행하지 못했다.
- 현재 환경 기준 19단계 진입 판정은 `No-Go`다.
- 사용자의 로컬 PC에서 Method A/B 결과가 확보되면 Go / Conditional Go를 재판정한다.

## 보류한 것

- 전체 Manual RLS Scenario Test 실행
- Project access test
- Link sharing test
- Change Card access test
- Rough Note / AI Draft test
- Feedback test
- public-safe view test
- secure RPC test
- function permission test
- trigger behavior test
- test data seed 실행
- SQL patch
- remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- API route
- 프론트엔드 구현
- 자동화 테스트 코드
- hmac/pepper 기반 token hash
- `public_slug` 실제 생성 정책
- `last_activity_at` 갱신 방식
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

## 다음 단계

사용자 로컬 PC에서 `docs/auth-uid-simulation-smoke-test/manual-log-intake-template.md` 양식에 맞춰 actor별 Method A/B 실행 결과를 가져온다. 그 결과가 PASS 또는 Conditional PASS이면 19단계 P0 RLS scenario test로 이동한다. 실패하면 actor simulation patch 또는 SQL session method 보정 단계로 이동한다.
