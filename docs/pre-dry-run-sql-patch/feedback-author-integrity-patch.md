# Feedback Author Integrity Patch

## 유지 결정

- `feedbacks.project_id`는 저장하지 않는다.
- `feedback_request_id`는 필수다.
- Feedback의 Project는 `feedback_request_id -> feedback_requests.project_id`로 추적한다.
- `author_user_profile_id`는 `current_user_profile_id()`와 일치해야 한다.

## 13단계 보정 방향

- `can_insert_feedback()` helper와 RLS `WITH CHECK` 조건을 유지한다.
- `prevent_feedback_author_spoofing()` trigger 후보를 유지한다.
- link_shared Feedback은 secure RPC에서 token 검증 후 insert하는 후보로 둔다.
- public feedback 응답에서 `author_user_profile_id`를 제외한다.

## SQL draft 반영 위치

- `20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
- `20260708005000_buildmap_05_rls_policies_draft.sql`
- `20260708006000_buildmap_06_public_safe_views_draft.sql`
- `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`

## dry-run 테스트 후보

- 다른 사용자의 `author_user_profile_id`로 insert 시 차단
- 비로그인 insert 차단
- 공개 Feedback Request 없이 insert 차단
- link_shared Project에서 token 없이 insert 차단
- token이 유효해도 로그인하지 않으면 insert 차단
