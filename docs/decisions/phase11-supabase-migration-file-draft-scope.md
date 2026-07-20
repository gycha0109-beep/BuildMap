# Phase 11. Supabase Migration File Draft Scope

## 확정한 것

- 11단계는 Supabase migration SQL file draft 작성 단계다.
- SQL 파일은 `supabase/migrations_draft`에만 작성한다.
- 정식 `supabase/migrations`에는 아직 작성하지 않는다.
- 실제 적용은 하지 않는다.
- `share_token` 원문 저장은 금지한다.
- `share_token_hash`는 1차 draft에서 `digest(token, 'sha256')` 후보를 사용한다.
- `hmac`은 후순위 보안 강화 후보로 남긴다.
- 링크 공개는 secure RPC 후보를 우선한다.
- secure RPC는 `SECURITY DEFINER` 후보와 `search_path` 고정, grant 제한을 포함한다.
- 전체 공개 데이터는 public-safe view 후보를 우선한다.
- public-safe view는 `security_invoker` 후보를 사용하되 실제 적용 전 재검증한다.
- Feedback author spoofing 방지 조건을 SQL draft에 반영한다.
- `feedbacks.project_id`는 1차 draft에서 저장하지 않는 방향을 우선한다.
- public Feedback view에는 `author_user_profile_id`를 포함하지 않는다.
- approved Change Card mutation 제한 trigger 후보를 SQL draft에 반영한다.
- 관리자/팀/조직/비로그인 쓰기 권한은 제외한다.
- 7.5 Test Case ID와 8단계 Policy ID를 SQL 파일과 매핑한다.

## 보류한 것

- 정식 Supabase migration 파일
- 실제 SQL 실행
- 실제 `CREATE POLICY` 적용
- 실제 helper function 생성
- 실제 secure RPC 생성
- 실제 public-safe view 생성
- 실제 trigger 생성
- Supabase CLI 실행
- local dry-run
- production/staging/local DB 적용
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

## 다음 단계 조건

12단계에서는 이 draft를 실제 migration 후보로 승격하기 전에 문법 검증, local dry-run, Supabase advisor, 7.5 Test Case 수동 검증을 진행해야 한다.
