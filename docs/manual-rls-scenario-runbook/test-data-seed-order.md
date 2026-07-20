# Test Data Seed Order


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 권장 seed 순서

| 순서 | 데이터 | 목적 | 주요 필드 | 의존 관계 | 실패 시 중단 |
|---:|---|---|---|---|---|
| 1 | `auth.uid()` simulation 방식 확정 | actor 전제 확보 | claim setting | 없음 | 예 |
| 2 | owner auth user 후보 | owner profile 연결 | `auth.users.id` 후보 | auth schema | 예 |
| 3 | non-owner auth user 후보 | deny 검증 | `auth.users.id` 후보 | auth schema | 예 |
| 4 | feedback author auth user 후보 | author integrity | `auth.users.id` 후보 | auth schema | 예 |
| 5 | `user_profiles` | app user mapping | `id`, `auth_user_id`, `display_name` | auth user | 예 |
| 6 | `builder_profiles` | owner builder 권한 | `id`, `user_profile_id`, `public_display_name` | user_profiles | 예 |
| 7 | `projects` | visibility/owner boundary | `owner_builder_profile_id`, `visibility_status`, `lifecycle_status`, `public_slug`, `share_token_hash` | builder_profiles | 예 |
| 8 | `problem_definitions` | 공개 page/view context | `project_id`, `current_text`, `created_by_builder_profile_id` | projects | 아니오 |
| 9 | `hypotheses` | 공개 page/view context | `project_id`, `statement`, `status` | projects | 아니오 |
| 10 | `rough_notes` | privacy test | `project_id`, `author_builder_profile_id`, `body` | projects | 예 |
| 11 | `ai_structured_drafts` | privacy test | `project_id`, `rough_note_id`, `requested_by_builder_profile_id`, `status` | rough_notes | 예 |
| 12 | `change_cards` | Timeline/RLS 핵심 | `project_id`, `author_builder_profile_id`, `card_type`, `title`, `structured_summary`, `work_status`, `visibility_status`, `sensitivity_status`, `approved_at`, `approved_by_builder_profile_id` | projects | 예 |
| 13 | `feedback_requests` | request 기반 feedback | `project_id`, `change_card_id`, `created_by_builder_profile_id`, `title`, `question`, `visibility_status` | projects/change_cards | 예 |
| 14 | `feedbacks` | author spoofing/public view | `feedback_request_id`, `author_user_profile_id`, `body`, `review_status`, `visibility_status`, `public_author_display_mode` | feedback_requests/user_profiles | 예 |
| 15 | `project_links` | public link view | `project_id`, `created_by_builder_profile_id`, `label`, `url`, `link_type`, `visibility_status` | projects | 아니오 |
| 16 | `share_token_hash` 준비 후보 | link_shared RPC | `projects.share_token_hash`, `share_token_rotated_at`, `share_token_revoked_at` | projects | link tests만 중단 |
| 17 | public-safe view 확인용 데이터 | view filter 검증 | public/internal/sensitive 조합 | 위 전체 | 아니오 |
| 18 | trigger behavior 확인용 데이터 | mutation boundary | approved/draft card, valid/invalid FR | change_cards/feedback_requests | 예 |

## 정확히 사용할 필드

아래 필드는 SQL draft 기준 이름을 유지한다.

- `projects.visibility_status`
- `projects.lifecycle_status`
- `projects.public_slug`
- `projects.share_token_hash`
- `change_cards.work_status`
- `change_cards.visibility_status`
- `change_cards.sensitivity_status`
- `change_cards.approved_at`
- `change_cards.approved_by_builder_profile_id`
- `feedback_requests.project_id`
- `feedback_requests.change_card_id`
- `feedbacks.feedback_request_id`
- `feedbacks.author_user_profile_id`

## seed 실패 시 원칙

- FK 오류가 나면 이후 seed를 진행하지 않는다.
- `auth.uid()` mapping이 불명확하면 owner 정책 테스트를 하지 않는다.
- 실패 로그에는 raw token, password, DB URL을 남기지 않는다.
