# 11단계 Blocker 해소 방향

## Blocker 1. secure RPC SECURITY DEFINER / search_path / grant template

### 문제

링크 공개 RPC는 원천 테이블 직접 노출을 피하기 위해 필요하지만, `SECURITY DEFINER`는 권한 상승 위험이 있다.

### 10단계 판단

`SECURITY DEFINER`, `search_path`, grant 제한을 실제 migration 전 검증해야 한다.

### 11단계 보정 방향

- RPC 후보에는 `SECURITY DEFINER`를 명시한다.
- `set search_path = public, auth` 후보를 명시한다.
- 함수 내부에서는 `public.` 스키마를 최대한 명시한다.
- 원천 row 전체를 반환하지 않고 `jsonb` public-safe 응답만 반환한다.
- 실패 이유는 `not_found`처럼 통일한다.
- token 원문 로그 노출 위험을 주석으로 남긴다.
- grant는 필요한 role에만 제한한다.

### SQL 파일 반영 위치

- `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
- `20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

### 남은 검증 사항

- 실제 Supabase에서 `SECURITY DEFINER` + `search_path` 동작 검증
- execute grant 범위 검증
- token 실패 응답 통일 검증

### 실제 적용 전 필수 여부

필수.

---

## Blocker 2. share_token_hash 알고리즘

### 문제

`share_token` 원문 저장은 보안상 위험하다.

### 10단계 판단

`digest` 또는 `hmac` 후보 비교가 필요하다.

### 11단계 보정 방향

- 1차 draft에서는 긴 random token + `digest(token, 'sha256')` 후보를 우선한다.
- `encode(digest(...), 'hex')` 형태 후보를 사용한다.
- token 원문은 생성 시 1회 반환 후보로만 둔다.
- hmac은 secret/pepper 관리가 필요한 후순위 강화 후보로 남긴다.

### SQL 파일 반영 위치

- `20260708001000_buildmap_01_core_schema_draft.sql`
- `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`

### 남은 검증 사항

- token 길이와 난수성
- digest vs hmac 최종 선택
- token hash type: `text` vs `bytea`

### 실제 적용 전 필수 여부

필수.

---

## Blocker 3. Feedback author spoofing 방지

### 문제

클라이언트가 다른 사용자의 `author_user_profile_id`를 넣어 Feedback을 작성할 수 있으면 안 된다.

### 10단계 판단

`author_user_profile_id = current_user_profile_id()` 조건이 필요하다.

### 11단계 보정 방향

- `feedbacks.feedback_request_id`는 필수다.
- `feedbacks.project_id`는 1차 draft에서 저장하지 않는다.
- Project 관계는 `feedback_request_id → feedback_requests.project_id`로 추적한다.
- RLS `WITH CHECK`와 trigger 후보에 작성자 검증을 넣는다.
- 링크 공개 Feedback 작성은 secure RPC에서 token 검증 후 insert 후보로 둔다.

### SQL 파일 반영 위치

- `20260708003000_buildmap_03_feedback_and_links_schema_draft.sql`
- `20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
- `20260708005000_buildmap_05_rls_policies_draft.sql`
- `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`

### 남은 검증 사항

- trigger와 RLS 중복 적용 시 UX
- RPC 내부 insert 시 trigger 동작
- 작성자 수정 정책

### 실제 적용 전 필수 여부

필수.

---

## Blocker 4. public Feedback view 컬럼 제한

### 문제

공개 Feedback에서 내부 사용자 식별자가 노출되면 안 된다.

### 10단계 판단

`author_user_profile_id`, 이메일, auth ID, 내부 user ID를 공개 응답에서 제외해야 한다.

### 11단계 보정 방향

- `public_feedbacks` view는 원천 row 전체를 노출하지 않는다.
- `author_user_profile_id`를 포함하지 않는다.
- 작성자 표시는 익명 또는 역할/맥락 표시로 제한한다.
- 내부 검토 Feedback은 제외한다.
- `public_selected` Feedback만 포함한다.

### SQL 파일 반영 위치

- `20260708006000_buildmap_06_public_safe_views_draft.sql`

### 남은 검증 사항

- `security_invoker` view의 실제 RLS 동작
- public view grant 범위
- 작성자 표시 UX

### 실제 적용 전 필수 여부

필수.
