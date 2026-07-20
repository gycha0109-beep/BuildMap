# Public-safe View Access Model Review

## 핵심 질문

`security_invoker` view를 사용할 경우, 호출자 권한으로 underlying table의 RLS와 권한이 적용되는지 dry-run에서 확인해야 한다. 원천 테이블에 넓은 `anon select`를 열지 않으면서 public-safe view가 정상 동작하는지가 핵심이다.

## 공통 원칙

- 원천 테이블 row 전체를 공개하지 않는다.
- public-safe view에는 공개 응답에 필요한 컬럼만 포함한다.
- `Rough Note`와 `AI Draft`는 어떤 view에도 포함하지 않는다.
- `owner_user_profile_id`, `author_user_profile_id`, `share_token_hash`는 공개 view에 포함하지 않는다.
- public-safe view가 실패하면 secure RPC 또는 API 조합으로 전환한다.

## View별 검수

| View | 목적 | 포함 컬럼 후보 | 제외 컬럼 후보 | dry-run 실험 | 실패 시 대안 |
|---|---|---|---|---|---|
| `public_builder_profiles` | Builder 공개 프로필 | display_name, role_tags, interest_tags, public_bio | auth_id, email, user_profile_id | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_project_cards` | 공개 탐색 카드 | project title, one_line_description, current_need_summary, visibility/lifecycle summary | owner_builder_profile_id, share_token_hash | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_project_pages` | 공개 페이지 상단 요약 | project 공개 정보, public_slug, 현재 문제/가설 요약 후보 | share_token_hash, owner internal id | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_change_cards` | 공개 변화 카드 | approved+published+normal 카드 요약 | internal/publishable/sensitive 카드 | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_decision_timeline` | 공개 Timeline | approved_at 정렬된 공개 변화 카드 | rough note, AI draft | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_feedback_requests` | 공개 피드백 요청 | public request title/question/context | internal request | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_feedbacks` | 공개 선택 Feedback | body, feedback_type, anonymous/role context author label | author_user_profile_id, email, auth id | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |
| `public_project_links` | 공개 링크 | public link label/url/type | internal links | `security_invoker` dry-run 검증 | 실패 시 secure RPC/API 조합 |

## source table grant / RLS 충돌 가능성

`security_invoker` 후보를 쓰면 호출자 권한/RLS를 따른다는 기대가 있지만, Supabase/PostgreSQL 실제 버전과 grant 조건에 따라 source table 권한이 필요할 수 있다. 이 경우 원천 테이블에 넓은 `anon select`를 열면 보안 경계가 무너진다.

## Dry-run 실험 항목

1. `anon`이 public-safe view를 읽을 수 있는가.
2. `anon`이 원천 테이블을 직접 넓게 읽지 못하는가.
3. view가 내부 식별자를 노출하지 않는가.
4. `public_decision_timeline`이 `approved + published + normal`만 반환하는가.
5. `public_feedbacks`가 `public_selected`만 반환하고 author 내부 ID를 제외하는가.
6. `link_shared` Project가 public-safe view만으로 열리지 않는가.

## 13단계 기대 결과

- 전체 공개 Project의 공개 데이터는 view로 읽힌다.
- 비공개/링크 공개 Project의 protected 데이터는 view에서 차단된다.
- view가 source table broad grant를 요구하면 **No-Go가 아니라 RPC/API 대안으로 전환 검토**한다.
