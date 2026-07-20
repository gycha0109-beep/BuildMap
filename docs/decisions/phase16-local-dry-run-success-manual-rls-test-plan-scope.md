# Phase 16 Local Dry-run Success & Manual RLS Test Plan Scope

> 단계: BuildMap 16단계  
> 성격: Local Dry-run Success Intake & Manual RLS Scenario Test Plan  
> 주의: 이번 단계는 사용자 local dry-run 성공 결과를 문서화하고 다음 수동 테스트 계획을 작성한다. remote 적용 단계가 아니다.

## 확정한 것

- 사용자 로컬 PC에서 `supabase start`가 성공했다.
- 사용자 로컬 PC에서 `supabase db reset`이 성공했다.
- 성공 확인 로그는 `Finished supabase db reset on branch main.` 이다.
- 사용자 로컬 PC에서 `supabase db lint --local`이 성공했다.
- lint 결과는 `No schema errors found` 이다.
- local schema application과 schema lint는 1차 통과했다.
- Supabase CLI version은 `2.109.1`이다.
- Docker version은 `Docker version 29.4.3, build 055a478`이다.
- Docker daemon은 `docker info`로 확인되었다.
- remote Supabase 적용은 하지 않았다.
- 정식 migration 승격은 하지 않았다.
- SQL patch는 즉시 필요하지 않다.
- 다음은 Manual RLS Scenario Test Plan이다.
- RLS behavior, public-safe view, secure RPC, helper permission, trigger behavior는 아직 미검증이다.
- 17단계는 Manual RLS Scenario Test Execution 또는 Manual RLS Scenario Runbook 단계 후보로 둔다.

## 보류한 것

- remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- SQL patch
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

## 단계 판단

16단계에서 확인한 성공은 local-only 범위다. `supabase db reset` 성공은 schema application 성공을 의미하지만 RLS 시나리오 검증 완료를 의미하지 않는다. `supabase db lint --local`의 `No schema errors found`는 schema lint 통과를 의미하지만 제품 권한 정책 검증 완료를 의미하지 않는다.

## 다음 단계

17단계에서는 `docs/manual-rls-scenario-test-plan`을 기준으로 수동 테스트 실행 또는 실행 runbook 작성을 진행한다. remote 적용은 계속 금지한다.
