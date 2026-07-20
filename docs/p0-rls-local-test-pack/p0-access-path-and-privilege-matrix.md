# P0 access path and privilege matrix

## 원칙

P0 테스트는 actor별로 access path를 분리한다.

- `anon` public read: public-safe view 사용.
- `anon` source table direct read: 기본적으로 `EXPECTED_DENY`.
- `authenticated_owner` / `authenticated_non_owner`: source table + RLS로 owner boundary 확인.
- `feedback_author`: source table insert + RLS/trigger로 author integrity 확인.
- `link_shared_authenticated_user`: phase20 P0에서는 full matrix 제외. 후속 secure RPC pack에서 다룬다.

## Matrix

| Actor | Object | Source/View | Operation | Privilege 필요 | RLS 적용 | P0 access path | 기대값 |
|---|---|---|---|---|---|---|---|
| `anon` | `projects` | source table | `SELECT` | 불필요/금지 | 도달하지 않음 | 직접 조회 금지 | `EXPECTED_DENY` |
| `anon` | `public_project_cards` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | 공개 Project card | public row only |
| `anon` | `public_project_pages` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | 공개 Project page | public row only |
| `authenticated_owner` | `projects` | source table | `SELECT` | 필요 | 적용 | owner private Project read | PASS |
| `authenticated_non_owner` | `projects` | source table | `SELECT` | 필요 | 적용 | owner private Project read | 0 row / `EXPECTED_DENY` |
| `authenticated_owner` | `projects` | source table | `UPDATE` | 필요 | 적용 | own project update candidate | PASS/recorded |
| `authenticated_non_owner` | `projects` | source table | `UPDATE` | 필요 | 적용 | owner Project update | 0 row or `EXPECTED_DENY` |
| `anon` | `rough_notes` | source table | `SELECT` | 금지 | 도달하지 않음 | 직접 조회 금지 | `EXPECTED_DENY` |
| `authenticated_owner` | `rough_notes` | source table | `SELECT` | 필요 | 적용 | own rough note read | PASS |
| `authenticated_non_owner` | `rough_notes` | source table | `SELECT` | 필요 | 적용 | owner rough note read | 0 row / `EXPECTED_DENY` |
| `anon` | `ai_structured_drafts` | source table | `SELECT` | 금지 | 도달하지 않음 | 직접 조회 금지 | `EXPECTED_DENY` |
| `authenticated_owner` | `ai_structured_drafts` | source table | `SELECT` | 필요 | 적용 | own AI draft read | PASS |
| `authenticated_non_owner` | `ai_structured_drafts` | source table | `SELECT` | 필요 | 적용 | owner AI draft read | 0 row / `EXPECTED_DENY` |
| `anon` | `change_cards` | source table | `SELECT` | 금지 | 도달하지 않음 | 직접 조회 금지 | `EXPECTED_DENY` |
| `anon` | `public_change_cards` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | public card boundary | public approved/published/normal only |
| `anon` | `public_decision_timeline` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | timeline boundary | public approved/published/normal only |
| `authenticated_owner` | `change_cards` | source table | `SELECT`/`UPDATE` | 필요 | 적용 | owner read / trigger test | PASS or `EXPECTED_DENY` trigger |
| `authenticated_non_owner` | `change_cards` | source table | `SELECT` | 필요 | 적용 | private card read | 0 row / `EXPECTED_DENY` |
| `anon` | `feedbacks` | source table | `SELECT`/`INSERT` | 금지 | 도달하지 않음 | 직접 read/write 금지 | `EXPECTED_DENY` |
| `anon` | `public_feedbacks` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | selected feedback read | public_selected only |
| `feedback_author` | `feedbacks` | source table | `INSERT` | 필요 | RLS/trigger 적용 | own feedback insert | PASS |
| `feedback_author` | `feedbacks` | source table | `INSERT` spoofing | 필요 | RLS/trigger 적용 | owner author spoof | `EXPECTED_DENY` |
| `authenticated_non_owner` | `feedbacks` | source table | `INSERT` spoofing | 필요 | RLS/trigger 적용 | feedback_author spoof | `EXPECTED_DENY` |
| `anon` | `public_feedback_requests` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | public request read | public/open only |
| `anon` | `public_project_links` | public-safe view | `SELECT` | view `SELECT` | view 정의/RLS 경계 검증 | public links read | public only |

## public-safe view 관련 주의

`security_invoker` view는 PostgreSQL/Supabase 환경에서 underlying source table privilege와 충돌할 수 있다.
그 경우 즉시 broad source grant를 추가하지 않고 다음 중 하나로 분류한다.

- `VIEW_ACCESS_ERROR`: view execution model 문제.
- `ACCESS_PATH_MISMATCH`: 테스트가 잘못된 경로를 사용한 문제.
- `GRANT_FAIL`: 의도된 role에 필요한 view/function/table privilege가 빠진 문제.

## 결론

이번 patch는 anon에게 source table `SELECT`를 주지 않는다.
public read는 public-safe view를 사용하고, authenticated owner/non-owner RLS test는 source table 최소 privilege로 RLS 평가까지 도달하게 한다.
