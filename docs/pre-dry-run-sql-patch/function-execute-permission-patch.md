# Function Execute Permission Patch

## PUBLIC EXECUTE 기본 노출 위험

PostgreSQL function은 기본적으로 `PUBLIC EXECUTE`가 열릴 수 있다. 내부 helper, trigger function, secure RPC가 같은 grant 정책을 가지면 직접 호출 노출이 발생할 수 있다.

## function 분류

| 함수군 | 예시 | 직접 execute grant 방향 |
|---|---|---|
| internal helper | `is_project_owner`, `can_insert_feedback` | 필요한 role에만 제한 후보 |
| trigger function | `prevent_approved_change_card_content_mutation` | 외부 직접 호출 허용하지 않음 |
| public/authenticated RPC | `get_link_shared_project_page`, `create_link_shared_feedback` | 목적별 최소 grant 후보 |

## 13단계 SQL 반영 위치

- `20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

## revoke/grant 후보

- 모든 helper/RPC/trigger function에 function-specific `REVOKE EXECUTE FROM PUBLIC` 후보 추가
- `rotate_project_share_token`, `revoke_project_share_token`: `authenticated` grant 후보
- `get_link_shared_project_page`, `get_link_shared_decision_timeline`, `get_link_shared_feedback_requests`: `anon`, `authenticated` grant 후보
- `create_link_shared_feedback`: `authenticated` grant 후보
- trigger function: 직접 grant하지 않는 후보

## dry-run 검증 항목

- 함수 시그니처가 실제 정의와 일치하는가
- revoke 후 RLS policy에서 필요한 helper 호출이 실패하지 않는가
- anon이 내부 helper를 직접 호출할 수 없는가
- RPC만 필요한 범위로 execute 가능한가
- broad `GRANT EXECUTE ON ALL FUNCTIONS`가 없는가
