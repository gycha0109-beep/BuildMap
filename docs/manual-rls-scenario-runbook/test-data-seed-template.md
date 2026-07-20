# Test Data Seed Template


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 공통 주의

이 문서는 18단계 local DB 전용 seed 후보를 정리한다. remote DB에 실행하면 안 된다. 실제 UUID와 token 원문은 로그 공유 시 마스킹한다.

## Seed 후보 목록

| Seed ID | 목적 | Actor | Table | 최소 필드 | 의존 데이터 | 관련 scenario | 실행 전 확인 |
|---|---|---|---|---|---|---|---|
| SEED-USER-OWNER | owner actor | owner | `user_profiles` | `auth_user_id`, `display_name` | auth user UUID | PRJ/CC/TRG | `auth.uid()` simulation |
| SEED-USER-NONOWNER | non-owner actor | non-owner | `user_profiles` | `auth_user_id`, `display_name` | auth user UUID | deny tests | owner와 UUID 다름 |
| SEED-USER-FEEDBACK | feedback author | feedback_author | `user_profiles` | `auth_user_id`, `display_name` | auth user UUID | FB | spoofing 테스트 |
| SEED-BUILDER-OWNER | Project Owner | owner | `builder_profiles` | `user_profile_id`, `public_display_name`, `is_public` | owner profile | PRJ/CC | public profile 여부 |
| SEED-BUILDER-NONOWNER | Non-owner Builder | non-owner | `builder_profiles` | `user_profile_id`, `public_display_name` | non-owner profile | deny tests | owner와 다름 |
| SEED-PRJ-PRIVATE | private project | owner | `projects` | `owner_builder_profile_id`, `title`, `lifecycle_status`, `visibility_status='private'` | owner builder | PRJ-RUN-001/002/004 | private 상태 |
| SEED-PRJ-PUBLIC | public project | owner | `projects` | `visibility_status='public'`, `public_slug` | owner builder | VIEW/CC | slug는 token 아님 |
| SEED-PRJ-LINK | link_shared project | owner | `projects` | `visibility_status='link_shared'`, `public_slug`, `share_token_hash` | owner builder | LINK/RPC | raw token 저장 금지 |
| SEED-CC-PUB-NORMAL | 공개 card | owner | `change_cards` | `work_status='approved'`, `visibility_status='published'`, `sensitivity_status='normal'`, `approved_at`, `approved_by_builder_profile_id` | public project | CC/VIEW | public timeline 포함 후보 |
| SEED-CC-SENSITIVE | 민감 card | owner | `change_cards` | `approved/published/sensitive` | public project | CC-RUN-004 | public view 제외 |
| SEED-CC-DRAFT | draft card | owner | `change_cards` | `work_status='draft'`, `visibility_status='published'` 후보 | public project | CC-RUN-006 | approved 아니면 제외 |
| SEED-CC-INTERNAL | internal card | owner | `change_cards` | `work_status='approved'`, `visibility_status='internal'` | public project | CC-RUN-005 | 외부 제외 |
| SEED-RN | rough note | owner | `rough_notes` | `project_id`, `author_builder_profile_id`, `body` | project | RNAI | public 제외 |
| SEED-AI | AI draft | owner | `ai_structured_drafts` | `project_id`, `rough_note_id`, `requested_by_builder_profile_id`, `status` | rough note | RNAI | official record 아님 |
| SEED-FR-PUBLIC | public Feedback Request | owner | `feedback_requests` | `project_id`, `title`, `question`, `visibility_status='public'` | project | FB | public request |
| SEED-FR-INTERNAL | internal Feedback Request | owner | `feedback_requests` | `visibility_status='internal'` | project | FB-RUN-002 | 외부 제외 |
| SEED-FR-CC-VALID | valid card-level request | owner | `feedback_requests` | `project_id`, `change_card_id` | 같은 project card | FB-RUN-008 | project consistency |
| SEED-FR-CC-INVALID | invalid card-level request 후보 | owner | `feedback_requests` | `project_id`, 다른 project의 `change_card_id` | mismatch card | FB-RUN-009 | 차단 기대 |
| SEED-FB-INTERNAL | internal feedback | feedback_author | `feedbacks` | `feedback_request_id`, `author_user_profile_id`, `body`, `visibility_status='internal_review'` | public FR | FB | public view 제외 |
| SEED-FB-PUBLIC | public selected feedback | feedback_author | `feedbacks` | `visibility_status='public_selected'`, `public_author_display_mode='anonymous'` | public FR | VIEW/FB | author id 제외 |
| SEED-LINK-PUBLIC | public project link | owner | `project_links` | `visibility_status='public'`, `label`, `url`, `link_type` | public project | VIEW | source URL 검토 |
| SEED-LINK-INTERNAL | internal project link | owner | `project_links` | `visibility_status='internal'` | project | VIEW | public view 제외 |

## 실행 후보 예시 구조

```sql
-- LOCAL ONLY CANDIDATE. DO NOT RUN AGAINST REMOTE DB.
-- 실제 UUID와 token은 사용자가 local 환경에서 생성/대체한다.
-- 이 예시는 구조 설명용이다.
insert into public.user_profiles (id, auth_user_id, display_name)
values ('<OWNER_USER_PROFILE_ID>', '<OWNER_AUTH_USER_UUID>', 'Owner User');
```

## 실패 시 대응

- `SCHEMA-FAIL`: 컬럼명/제약 확인
- `TRIGGER-FAIL`: trigger 오탐 여부 확인
- `RLS-FAIL`: actor session이 잘못되었는지 먼저 확인
- `TEST_DATA_ERROR`: seed 순서 또는 FK 정합성 보정
