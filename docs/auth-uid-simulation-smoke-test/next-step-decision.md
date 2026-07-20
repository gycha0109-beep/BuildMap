# Next Step Decision

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 현재 분기

현재 문서 작성 환경 기준은 `No-Go`다. 19단계로 넘어가기 위해서는 사용자의 로컬 PC에서 `auth.uid()` actor simulation smoke test를 실행한 결과가 필요하다.

## Go 또는 Conditional Go인 경우

다음 단계 후보:

- 19단계 Test Data Seed & P0 RLS Scenario Execution Runbook
- 또는 19단계 Test Data Seed & P0 RLS Scenario Execution

조건:

- actor simulation method가 확정되어야 한다.
- anon actor는 `null`이어야 한다.
- authenticated actors는 각각 expected UUID를 반환해야 한다.

## No-Go인 경우

다음 단계 후보:

- Actor Simulation Patch
- local SQL session method 보정
- `request.jwt.claim.sub` / `request.jwt.claims` 설정 방식 재검토
- Supabase local 환경 재확인

## 계속 금지되는 것

- remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- 전체 RLS 시나리오 테스트 강행
- Project / Change Card / Feedback seed 강행
- hosted SQL Editor 사용
