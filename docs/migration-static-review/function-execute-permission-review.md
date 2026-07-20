# Function Execute Permission Review

## 핵심 원칙

PostgreSQL function은 기본 `EXECUTE` 권한이 `PUBLIC`에 열릴 수 있으므로, 보안 함수는 명시적 `REVOKE` / `GRANT` 패턴을 검토해야 한다. 특히 `SECURITY DEFINER` 함수와 내부 helper는 직접 호출 노출을 최소화한다.

## 함수별 권한 검수

| 함수 | 성격 | 직접 execute 필요 | PUBLIC revoke 필요 | anon grant | authenticated grant | 보정 제안 |
|---|---|---|---|---|---|---|
| `current_user_profile_id()` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | PUBLIC EXECUTE 기본값 차단 필요 |
| `is_project_owner(project_id)` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | RLS 내부 호출만 목표 |
| `is_project_owner_by_builder(builder_profile_id)` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | 직접 호출 노출 최소화 |
| `can_read_public_project(project_id)` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | public read 조건 helper지만 외부 RPC 아님 |
| `can_read_public_change_card(change_card_id)` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | Change Card 공개 조건 helper |
| `can_insert_feedback(feedback_request_id, author_user_profile_id)` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | 작성자 위조 방지 핵심 |
| `can_read_feedback(feedback_id)` | internal helper | 불필요 | 필요 | 불필요 | 불필요 | owner/author/internal read |
| `set_updated_at()` | trigger function | 불필요 | 필요 | 불필요 | 불필요 | trigger 전용 |
| `prevent_approved_change_card_content_mutation()` | trigger function | 불필요 | 필요 | 불필요 | 불필요 | trigger 전용 |
| `prevent_feedback_author_spoofing()` | trigger function | 불필요 | 필요 | 불필요 | 불필요 | trigger 전용 |
| `rotate_project_share_token()` | authenticated RPC | 필요 | 필요 | 차단 | authenticated | owner check 내부 필수 |
| `revoke_project_share_token()` | authenticated RPC | 필요 | 필요 | 차단 | authenticated | owner check 내부 필수 |
| `get_link_shared_project_page()` | public RPC | 필요 | 필요 | anon 후보 | authenticated 후보 | 반환 컬럼 제한 |
| `get_link_shared_decision_timeline()` | public RPC | 필요 | 필요 | anon 후보 | authenticated 후보 | 반환 컬럼 제한 |
| `get_link_shared_feedback_requests()` | public RPC | 필요 | 필요 | anon 후보 | authenticated 후보 | 반환 컬럼 제한 |
| `create_link_shared_feedback()` | authenticated RPC | 필요 | 필요 | 차단 | authenticated | login + token + request public |

## REVOKE / GRANT 후보

- 내부 helper와 trigger function: `PUBLIC EXECUTE` revoke 후보.
- public link-sharing read RPC: `anon`, `authenticated` execute grant 후보.
- token rotate/revoke와 link-shared feedback write RPC: `authenticated` grant 후보.
- source table broad grant 없이 view/RPC 경계로만 공개 응답을 구성하는 방향을 유지한다.

## Dry-run 검증 항목

1. `PUBLIC`이 내부 helper를 직접 호출할 수 없는가.
2. `anon`이 `rotate_project_share_token()`을 호출할 수 없는가.
3. `authenticated`가 owner가 아닌 Project의 token rotate/revoke를 실패하는가.
4. `anon`은 read RPC만 호출 가능하고 write RPC는 호출할 수 없는가.
5. trigger function이 직접 호출되지 않아도 trigger에서 정상 동작하는가.

## 실제 적용 전 공식 문서 재검증 필요

- PostgreSQL function 기본 privilege
- Supabase PostgREST RPC 노출 방식
- `SECURITY DEFINER` function의 owner privilege와 `search_path`
- `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC` 패턴
