# Phase 13 Pre Dry-run SQL Patch Scope

## 확정한 것

- 13단계는 dry-run 전 SQL patch 단계다.
- 실제 SQL 실행은 하지 않는다.
- Supabase CLI는 실행하지 않는다.
- local dry-run은 아직 실행하지 않는다.
- 정식 `supabase/migrations`로 파일을 이동하지 않는다.
- `migrations_draft`는 계속 `DRAFT ONLY` 상태다.
- helper/RPC function execute 권한 revoke/grant 후보를 보강한다.
- secure RPC `SECURITY DEFINER` / `search_path` / grant template을 보강한다.
- public-safe view는 전체 공개 카드/목록/Timeline 후보로 유지한다.
- 링크 공개/token 검증 응답은 secure RPC 후보를 우선한다.
- `feedback_requests.change_card_id`와 `project_id` 정합성 trigger 후보를 추가한다.
- Feedback author spoofing 방지 조건을 유지하고 보강한다.
- approved Change Card의 `approved_at` / `approved_by_builder_profile_id` / `work_status` 사후 조작 제한 후보를 추가한다.
- 7.5 Test Case ID 매핑을 dry-run 대상 중심으로 보강한다.
- 14단계는 local dry-run 실행 후보 단계로 둘 수 있으나, 실행은 사용자가 직접 수행하고 로그를 가져오는 방식이 안전하다.

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

## 14단계 전 질문

1. 14단계에서 사용자가 직접 Supabase local dry-run을 실행하고 실패 로그를 가져오는 방식으로 진행할 것인가?
2. dry-run 전 SQL draft 파일을 임시 branch에서 정식 migration 경로로 복사하는 절차를 문서화할 것인가?
3. public-safe view가 실패할 경우 view를 고칠 것인가, RPC/API 조합으로 전환할 것인가?
4. function execute grant가 과하게 열리면 helper를 더 줄일 것인가?
5. approved Change Card mutation trigger가 오탐을 내면 DB trigger 범위를 줄이고 app validation으로 일부 이동할 것인가?
