# Function Permission Scenarios

## 목적

helper, trigger function, public RPC의 execute permission이 의도보다 넓게 열리지 않았는지 확인한다.

## 검증 항목

| Scenario ID | 항목 | actor | 실행 후보 | 기대 결과 | 관련 파일 | 조치 기준 |
|---|---|---|---|---|---|---|
| GRANT-MAN-001 | internal helper direct execute 차단 후보 | `anon` | `current_user_profile_id()`, `is_project_owner()` 등 direct call | 필요 범위 외 차단 또는 안전 결과 | `08_grants_and_final_checks` | broad execute grant 확인 시 patch |
| GRANT-MAN-002 | trigger function direct execute 차단 후보 | `anon`, `authenticated_non_owner` | `prevent_approved_change_card_content_mutation()` direct call | 직접 실행 차단 후보 | `08_grants_and_final_checks` | PUBLIC execute revoke 필요 |
| GRANT-MAN-003 | public RPC execute 허용 범위 | `anon` | `get_link_shared_*` read RPC | read RPC만 허용 후보 | `07_link_sharing_rpc` | write RPC 노출 시 blocker |
| GRANT-MAN-004 | authenticated RPC execute 허용 범위 | `authenticated` | `create_link_shared_feedback` | authenticated + valid token 필요 | `07_link_sharing_rpc` | token 없이 허용 시 blocker |
| GRANT-MAN-005 | broad execute grant 없음 확인 | `anon`, `authenticated` | function list/grant 확인 후보 | 과다 grant 없음 | `08_grants_and_final_checks` | GRANT_ERROR |
| GRANT-MAN-006 | PUBLIC execute revoke 확인 | `anon` | helper/RPC direct call | 내부 helper는 노출 안 됨 | `08_grants_and_final_checks` | helper exposure patch |
| GRANT-MAN-007 | function signature mismatch 확인 | local DB | grant 대상 signature 확인 | grant/revoke가 실제 signature와 일치 | `08_grants_and_final_checks` | signature patch |

## 권한 과다 노출 시 조치

- `GRANT_ERROR`로 분류한다.
- helper/RPC function별 revoke/grant를 좁힌다.
- public read는 view/RPC boundary에서만 허용한다.
- direct helper execute가 권한 우회를 만들면 blocker로 처리한다.
