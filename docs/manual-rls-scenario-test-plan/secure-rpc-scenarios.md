# Secure RPC Scenarios

secure RPC는 link sharing과 token 기반 복합 응답을 source table broad public read 없이 처리하기 위한 후보 경계다.

| RPC | actor | 입력 | 기대 결과 | 실패 결과 | token failure response 통일 | internal id/hash 노출 여부 | private/revoked/wrong token 처리 | authenticated 필요 | owner 필요 |
|---|---|---|---|---|---|---|---|---|---|
| `rotate_project_share_token` | `project_owner_builder` | project_id | 새 token hash 후보 생성/old token 무효화 | non-owner 차단 | 해당 없음 | 노출 금지 | private 여부와 무관하게 owner만 | yes | yes |
| `revoke_project_share_token` | `project_owner_builder` | project_id/link_id | token revoked 처리 | non-owner 차단 | 해당 없음 | 노출 금지 | revoked 이후 접근 차단 | yes | yes |
| `get_link_shared_project_page` | `anon 또는 authenticated user` | project_id/public_slug/token | valid token이면 public-safe JSON 반환 | missing/wrong/revoked/private 차단 | 동일 실패 응답 후보 | hash/internal id 노출 금지 | private/revoked/wrong 모두 차단 | no for read 후보 | no |
| `get_link_shared_decision_timeline` | `anon 또는 authenticated user` | project_id/public_slug/token | valid token이면 public-safe JSON 반환 | missing/wrong/revoked/private 차단 | 동일 실패 응답 후보 | hash/internal id 노출 금지 | private/revoked/wrong 모두 차단 | no for read 후보 | no |
| `get_link_shared_feedback_requests` | `anon 또는 authenticated user` | project_id/public_slug/token | valid token이면 public-safe JSON 반환 | missing/wrong/revoked/private 차단 | 동일 실패 응답 후보 | hash/internal id 노출 금지 | private/revoked/wrong 모두 차단 | no for read 후보 | no |
| `create_link_shared_feedback` | `link_shared_authenticated_user` | project_id/token/feedback_request_id/content | valid token + authenticated일 때 feedback 생성 | anon/wrong/revoked token 차단 | 동일 실패 응답 후보 | hash/id 과다 노출 금지 | private/revoked/wrong 모두 차단 | yes | no |

## 공통 기준

- token failure는 존재 여부를 추론하기 어렵게 통일한다.
- `share_token_hash`와 raw token은 응답에 포함하지 않는다.
- link_shared feedback insert는 authenticated + valid token이 모두 필요하다.
