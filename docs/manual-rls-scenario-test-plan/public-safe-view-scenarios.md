# Public-safe View Scenarios

public-safe view는 전체 공개 카드/목록/Timeline 후보로 유지한다. 단, source table broad anon select 없이 공개 가능한 row/column만 노출해야 한다.

| View | read actor | 기대 row | 제외 row | 기대 column | 제외 column | security_invoker 확인 | source table broad anon select 필요 여부 | 실패 시 RPC/API 전환 기준 |
|---|---|---|---|---|---|---|---|---|
| `public_builder_profiles` | `anon`, `authenticated_non_owner` | 공개 표시 가능한 builder profile | internal profile, auth id | display_name/handle/avatar 후보 | auth_user_id, email, private fields | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_project_cards` | `anon`, `authenticated_non_owner` | public project card | private/link token-only project | title, summary, public_slug 후보 | share_token_hash, owner internal ids | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_project_pages` | `anon`, `authenticated_non_owner` | public project page | private project | public narrative fields | internal notes, token hash | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_change_cards` | `anon`, `authenticated_non_owner` | approved + published + normal + public project card | draft/internal/sensitive/private project card | decision summary/public fields | rough_note_id, ai_draft_id, internal status | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_decision_timeline` | `anon`, `authenticated_non_owner` | public project의 공개 가능 timeline rows | private project, internal/sensitive/draft card | ordered public decision fields | internal ids/hash/private content | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_feedback_requests` | `anon`, `authenticated_non_owner` | public request on accessible project | internal request/private project request | question/context/public target | owner internal fields | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_feedbacks` | `anon`, `authenticated_non_owner` | public selected feedback only | internal/unselected feedback | public display name/role/content excerpt | author_user_profile_id, email, auth id | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |
| `public_project_links` | `anon`, `authenticated_non_owner` | public/link metadata safe subset | share_token_hash/raw token/revoked internals | safe link display state 후보 | share_token_hash, raw token, internal ids | view가 source table RLS를 우회하지 않는지 확인 | 필요 없음 | 내부 row/column 노출 또는 접근 불가 충돌 시 secure RPC/API boundary로 전환 |

## 공통 테스트

- `select * from public.<view>` 후보로 column exposure를 확인한다.
- source table에 broad anon select가 필요한 구조라면 실패로 분류하고 RPC/API 전환을 검토한다.
- public-safe view는 `share_token_hash`, `author_user_profile_id`, rough note, AI draft, private project row를 노출하면 안 된다.
