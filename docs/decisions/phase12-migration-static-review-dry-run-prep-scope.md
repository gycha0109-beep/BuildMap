# Phase 12 - Migration Static Review / Dry-run Preparation Scope

## 확정한 것

- 12단계는 SQL draft 정적 검수와 local dry-run 준비 단계다.
- 실제 SQL 실행은 하지 않는다.
- Supabase CLI는 실행하지 않는다.
- `supabase db lint`는 실행하지 않는다.
- local dry-run은 아직 실행하지 않는다.
- 정식 `supabase/migrations`로 파일을 이동하지 않는다.
- 11단계 `migrations_draft`는 계속 `DRAFT ONLY` 상태다.
- public-safe view의 `security_invoker` / source table grant / RLS 충돌은 dry-run 핵심 검증 항목이다.
- `SECURITY DEFINER` RPC는 `search_path` / grant / 반환 컬럼 제한 검증이 필요하다.
- helper function execute 권한은 revoke/grant 패턴 검토가 필요하다.
- `feedback_requests.change_card_id`와 `project_id` 정합성 검증이 필요하다.
- approved Change Card의 `approved_at` / `approved_by_builder_profile_id` / `work_status` 사후 조작 검토가 필요하다.
- Feedback author spoofing 방지는 계속 필수다.
- 7.5 Test Case ID 매핑은 dry-run 전 보강 대상이다.
- 13단계는 local dry-run 실행 또는 dry-run 전 SQL patch 단계 중 하나로 결정한다.

## 보류한 것

- 실제 Supabase migration 파일
- 실제 SQL 실행
- 실제 `CREATE POLICY` 적용
- 실제 helper function 생성
- 실제 secure RPC 생성
- 실제 public-safe view 생성
- 실제 trigger 생성
- Supabase CLI 실행
- local dry-run 실행
- production/staging/remote DB 적용
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

## 13단계 진입 조건

13단계로 넘어가기 전 다음 중 하나를 선택해야 한다.

1. **dry-run 전 SQL patch 단계**: 보정 후보를 SQL draft에 먼저 반영한다.
2. **local dry-run 실행 단계**: 실패 가능성을 감수하고 local-only dry-run으로 검증한다.

현재 추천은 1번이다. public-safe view, helper/RPC grant, feedback request consistency, approved Change Card mutation 경계는 dry-run 전 보강하는 편이 안전하다.
