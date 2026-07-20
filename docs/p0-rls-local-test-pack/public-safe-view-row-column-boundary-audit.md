# Public-safe View Row / Column Boundary Audit

## 목적

이 문서는 Phase22에서 실제 `06_public_safe_views_draft.sql`의 public-safe view를 기준으로 row predicate와 column allowlist를 감사한 결과를 기록한다.

## 공통 감사 기준

모든 public-safe view는 다음 원칙을 만족해야 한다.

```text
select * 금지
explicit column allowlist 사용
private Project 제외
archived row 제외
sensitive/internal/draft Change Card 제외
Rough Note / AI Draft 제외
Feedback author internal identifier 제외
share_token_hash / raw token 제외
source table RLS에만 의존하지 않음
anon source table direct privilege에 의존하지 않음
```

## View audit matrix

| view name | source | execution model | 공개 row predicate | 공개 column allowlist | 금지 column | patch 필요 |
|---|---|---|---|---|---|---|
| `public_builder_profiles` | `builder_profiles` | owner-executed view + `security_barrier` | `bp.is_public = true` | `builder_profile_id`, `display_name`, `bio`, `role_tags`, `interest_tags` | `user_profile_id`, `auth_user_id` | 반영 |
| `public_project_cards` | `projects`, `builder_profiles` | owner-executed view + `security_barrier` | `p.visibility_status = 'public'`, `p.archived_at is null`, optional public builder join | project card fields only | `owner_builder_profile_id`, `share_token_hash`, `owner_user_profile_id`, auth identifiers | 반영 |
| `public_project_pages` | `projects`, `builder_profiles` | owner-executed view + `security_barrier` | `p.visibility_status = 'public'`, `p.archived_at is null` | public page fields and public builder display/bio only | `share_token_hash`, owner/auth internals | 반영 |
| `public_change_cards` | `change_cards`, `projects` | owner-executed view + `security_barrier` | Project public + card `approved` + `published` + `normal` + not archived | public decision/timeline fields | `rough_note_id`, `ai_draft_id`, `author_builder_profile_id`, internal status beyond public fields | 반영 |
| `public_decision_timeline` | `public_change_cards` | owner-executed view + `security_barrier` | inherits `public_change_cards` predicate | explicit projection, no `select *` | same as `public_change_cards` | 반영 |
| `public_feedback_requests` | `feedback_requests`, `projects`, optional `change_cards` | owner-executed view + `security_barrier` | Project public + request public/open + linked card public if present | request public fields | creator internals, private request metadata | 반영 |
| `public_feedbacks` | `feedbacks`, `feedback_requests`, `projects`, optional `change_cards` | owner-executed view + `security_barrier` | Project public + request public/open + feedback `public_selected` + linked card public if present | feedback id/request/type/interest/display/body/created_at | `author_user_profile_id`, auth ids, internal review rows | 반영 |
| `public_project_links` | `project_links`, `projects` | owner-executed view + `security_barrier` | Project public + link public + not archived | public link fields only | created_by internals, private links, token fields | 반영 |

## 금지 column 점검

다음 column은 public-safe view select list에 포함하지 않는다.

```text
auth_user_id
author_user_profile_id
owner_user_profile_id
share_token_hash
raw token
rough_note_id
ai_draft_id
rough note body
AI draft body
private feedback metadata
internal moderation/status metadata
```

참고: 실제 schema에 존재하지 않는 column은 존재한다고 가정하지 않는다. 이번 audit은 실제 draft SQL에 존재하는 column과 view select list를 기준으로 수행했다.

## join dependency 검토

`public_project_cards`와 `public_project_pages`는 `public_builder_profiles` view를 중첩 사용하지 않고 `builder_profiles`를 직접 `left join`한다. join 조건에 `bp.is_public = true`를 포함해 비공개 builder profile 내용이 노출되지 않도록 했다.

`public_feedback_requests`와 `public_feedbacks`는 `change_card_id`가 존재하는 경우 해당 Change Card도 public boundary를 만족해야 한다. 이 보강은 `feedback_requests.change_card_id`가 내부/sensitive card를 참조할 때 public request/feedback으로 간접 노출되는 위험을 줄인다.

## RLS 의존 여부

이번 public-safe view patch는 public row predicate를 view SQL 안에 직접 둔다. 따라서 public-safe view boundary는 source table RLS에만 의존하지 않는다.

다만 source table RLS는 authenticated source table test와 application path에서 계속 유지된다. view boundary와 source table RLS는 역할이 다르다.

## 남은 검증

다음은 사용자의 다음 local run에서 확인해야 한다.

```text
PRE-050 public_project_cards actual SELECT PASS
VIEW_ACCESS_ERROR 없음
VIEW_BOUNDARY_FAIL 없음
anon source projects direct SELECT EXPECTED_DENY
private/sensitive/draft/internal fixture가 public-safe view에 없음
forbidden column이 public-safe view에 없음
```

## Phase22.5 public_builder_profiles runtime coverage correction

Phase22 audit 문서에는 `public_builder_profiles`가 public-safe view 목록에 포함되어 있었지만, runtime script `phase20_06_public_safe_view_p0.sql`의 actual SELECT scenario에서는 누락되어 있었다.

Phase22.5에서 다음 runtime verification을 추가했다.

| View | Added check |
|---|---|
| `public_builder_profiles` | anon actual SELECT |
| `public_builder_profiles` | public owner builder fixture count = 1 |
| `public_builder_profiles` | public non-owner builder fixture count = 1 |
| `public_builder_profiles` | non-public builder fixture count = 0 |
| `public_builder_profiles` | `user_profile_id` absent |
| `public_builder_profiles` | `auth_user_id` / internal owner columns absent |

Migration draft SQL 확인 결과 `public_builder_profiles`는 이미 `security_barrier=true`, explicit column list, `bp.is_public=true`, no `security_invoker=true` 상태였으므로 SQL migration draft 수정은 하지 않았다.
