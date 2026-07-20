# RLS Policy Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `user_profiles`
- `builder_profiles`
- `projects`
- `problem_definitions`
- `hypotheses`
- `rough_notes`
- `ai_structured_drafts`
- `change_cards`
- `feedback_requests`
- `feedbacks`
- `project_links`

## 2. 공통 RLS enable 후보

```sql
-- 검토용 초안: 실행 금지
alter table user_profiles enable row level security;
alter table builder_profiles enable row level security;
alter table projects enable row level security;
alter table problem_definitions enable row level security;
alter table hypotheses enable row level security;
alter table rough_notes enable row level security;
alter table ai_structured_drafts enable row level security;
alter table change_cards enable row level security;
alter table feedback_requests enable row level security;
alter table feedbacks enable row level security;
alter table project_links enable row level security;
```

## 3. Project policies 후보

```sql
-- 검토용 초안: 실행 금지
create policy project_select_owner on projects
for select to authenticated
using (is_project_owner(id));

create policy project_insert_builder on projects
for insert to authenticated
with check (owner_builder_profile_id in (
  select id from builder_profiles where user_profile_id = current_user_profile_id()
));

create policy project_update_owner on projects
for update to authenticated
using (is_project_owner(id))
with check (is_project_owner(id));
```

전체 공개 읽기는 원천 테이블 anon select보다 public-safe view 후보를 우선한다. 링크 공개 읽기는 secure RPC 후보를 우선한다.

## 4. Change Card policies 후보

```sql
-- 검토용 초안: 실행 금지
create policy change_card_select_owner on change_cards
for select to authenticated
using (is_project_owner(project_id));

create policy change_card_insert_owner on change_cards
for insert to authenticated
with check (is_project_owner(project_id));

create policy change_card_update_owner on change_cards
for update to authenticated
using (is_project_owner(project_id))
with check (is_project_owner(project_id));
```

공개 읽기는 public-safe view 또는 제한된 select policy 후보로 검토한다.

```sql
-- 검토용 초안: 실행 금지
create policy change_card_select_public_candidate on change_cards
for select to anon, authenticated
using (
  work_status = 'approved'
  and visibility_status = 'published'
  and sensitivity_status = 'normal'
  and exists (
    select 1 from projects p
    where p.id = change_cards.project_id
      and p.visibility_status = 'public'
      and p.archived_at is null
  )
);
```

주의: 원천 row 전체 노출 위험 때문에 public-safe view를 우선 검토한다.

## 5. Rough Note / AI Draft policies 후보

```sql
-- 검토용 초안: 실행 금지
create policy rough_note_select_owner on rough_notes
for select to authenticated
using (is_project_owner(project_id));

create policy rough_note_insert_owner on rough_notes
for insert to authenticated
with check (is_project_owner(project_id));

create policy ai_draft_select_owner on ai_structured_drafts
for select to authenticated
using (is_project_owner(project_id));
```

anon select 정책은 만들지 않는다.

## 6. Feedback policies 후보

```sql
-- 검토용 초안: 실행 금지
create policy feedback_request_select_owner on feedback_requests
for select to authenticated
using (is_project_owner(project_id));

create policy feedback_request_insert_owner on feedback_requests
for insert to authenticated
with check (is_project_owner(project_id));

create policy feedback_insert_logged_in_with_request on feedbacks
for insert to authenticated
with check (
  author_user_profile_id = current_user_profile_id()
  and can_insert_feedback(feedback_request_id, author_user_profile_id)
);

create policy feedback_select_author on feedbacks
for select to authenticated
using (author_user_profile_id = current_user_profile_id());

create policy feedback_select_project_owner on feedbacks
for select to authenticated
using (can_read_feedback(id));
```

공개 선택 Feedback은 public-safe view 후보로 노출한다.

## 7. Project Links policies 후보

```sql
-- 검토용 초안: 실행 금지
create policy project_link_select_owner on project_links
for select to authenticated
using (is_project_owner(project_id));

create policy project_link_insert_owner on project_links
for insert to authenticated
with check (is_project_owner(project_id));

create policy project_link_update_owner on project_links
for update to authenticated
using (is_project_owner(project_id))
with check (is_project_owner(project_id));
```

## 8. 관련 Test Case ID

- Project: `PRJ-*`
- Change Card: `CC-*`, `OWN-*`
- Rough Note / AI Draft: `RNAI-*`
- Feedback: `FB-*`
- Public Page: `PP-*`
- Link Sharing: `LINK-*`

## 9. 추가 검토 필요 사항

- public-safe view와 anon policy의 최종 조합
- secure RPC와 RLS 정책 책임 분리
- helper function security definer 여부
- 승인된 Change Card update 제한 trigger
