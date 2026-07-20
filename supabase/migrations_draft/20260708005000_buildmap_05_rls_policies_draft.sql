-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 05 RLS policies
-- Depends on:
--   - 01 core schema
--   - 02 decision records schema
--   - 03 feedback and links schema
--   - 04 helpers and triggers
-- Purpose:
--   - enable RLS candidates
--   - policy draft candidates
-- Key constraints:
--   - No admin/team/org policy in 1st draft.
--   - No anonymous writes.
--   - Project Owner centered mutation model.
-- VERIFY BEFORE APPLY:
--   - USING vs WITH CHECK syntax and behavior.
--   - function volatility and security definer safety.
--   - grants in file 08.

-- PATCH 13 NOTES:
--   - SELECT policies rely on USING.
--   - INSERT policies must use WITH CHECK.
--   - UPDATE policies must validate both existing row access via USING and post-update row state via WITH CHECK.
--   - link_shared read/write flows that require share_token validation remain secure RPC candidates, not broad source-table policies.
--   - Project Owner mutation policies are intentionally narrow for 1st draft.

alter table public.user_profiles enable row level security;
alter table public.builder_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.problem_definitions enable row level security;
alter table public.hypotheses enable row level security;
alter table public.rough_notes enable row level security;
alter table public.ai_structured_drafts enable row level security;
alter table public.change_cards enable row level security;
alter table public.feedback_requests enable row level security;
alter table public.feedbacks enable row level security;
alter table public.project_links enable row level security;

-- ----------------------------------------------------------------------------
-- user_profiles
-- ----------------------------------------------------------------------------

create policy user_profiles_select_self_draft
on public.user_profiles
for select
to authenticated
using (auth_user_id = auth.uid());

create policy user_profiles_update_self_draft
on public.user_profiles
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

-- Profile creation may be handled by signup trigger in a later stage.
-- DRAFT insert policy candidate:
create policy user_profiles_insert_self_draft
on public.user_profiles
for insert
to authenticated
with check (auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- builder_profiles
-- ----------------------------------------------------------------------------

create policy builder_profiles_select_self_draft
on public.builder_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = builder_profiles.user_profile_id
      and up.auth_user_id = auth.uid()
  )
);

create policy builder_profiles_select_public_draft
on public.builder_profiles
for select
to anon, authenticated
using (is_public = true);

create policy builder_profiles_insert_self_draft
on public.builder_profiles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = builder_profiles.user_profile_id
      and up.auth_user_id = auth.uid()
  )
);

create policy builder_profiles_update_self_draft
on public.builder_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles up
    where up.id = builder_profiles.user_profile_id
      and up.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_profiles up
    where up.id = builder_profiles.user_profile_id
      and up.auth_user_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------

create policy projects_select_owner_draft
on public.projects
for select
to authenticated
using (public.is_project_owner(id));

create policy projects_select_public_draft
on public.projects
for select
to anon, authenticated
using (
  visibility_status = 'public'
  and archived_at is null
);

-- Link-shared project read is intentionally handled by secure RPC candidate.
-- Do not add broad anon select for link_shared source rows.

create policy projects_insert_owner_builder_draft
on public.projects
for insert
to authenticated
with check (
  exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = owner_builder_profile_id
      and up.auth_user_id = auth.uid()
  )
);

-- PATCH 13: Owner update는 1차에서 Project Owner만 허용한다.
-- VERIFY BEFORE APPLY: lifecycle/visibility/status 변경이 너무 넓지 않은지 수동 검증한다.
create policy projects_update_owner_draft
on public.projects
for update
to authenticated
using (public.is_project_owner(id))
with check (public.is_project_owner(id));

-- ----------------------------------------------------------------------------
-- problem_definitions / hypotheses
-- ----------------------------------------------------------------------------

create policy problem_definitions_select_owner_draft
on public.problem_definitions
for select
to authenticated
using (public.is_project_owner(project_id));

create policy problem_definitions_select_public_draft
on public.problem_definitions
for select
to anon, authenticated
using (public.can_read_public_project(project_id));

create policy problem_definitions_insert_owner_draft
on public.problem_definitions
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy problem_definitions_update_owner_draft
on public.problem_definitions
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

create policy hypotheses_select_owner_draft
on public.hypotheses
for select
to authenticated
using (public.is_project_owner(project_id));

create policy hypotheses_select_public_draft
on public.hypotheses
for select
to anon, authenticated
using (public.can_read_public_project(project_id));

create policy hypotheses_insert_owner_draft
on public.hypotheses
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy hypotheses_update_owner_draft
on public.hypotheses
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

-- ----------------------------------------------------------------------------
-- rough_notes / ai_structured_drafts
-- ----------------------------------------------------------------------------

create policy rough_notes_select_owner_draft
on public.rough_notes
for select
to authenticated
using (public.is_project_owner(project_id));

create policy rough_notes_insert_owner_draft
on public.rough_notes
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy rough_notes_update_owner_unconverted_draft
on public.rough_notes
for update
to authenticated
using (
  public.is_project_owner(project_id)
  and converted_to_change_card_at is null
)
with check (
  public.is_project_owner(project_id)
  and converted_to_change_card_at is null
);

create policy ai_drafts_select_owner_draft
on public.ai_structured_drafts
for select
to authenticated
using (public.is_project_owner(project_id));

create policy ai_drafts_insert_owner_draft
on public.ai_structured_drafts
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy ai_drafts_update_owner_draft
on public.ai_structured_drafts
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

-- ----------------------------------------------------------------------------
-- change_cards
-- ----------------------------------------------------------------------------

create policy change_cards_select_owner_draft
on public.change_cards
for select
to authenticated
using (public.is_project_owner(project_id));

create policy change_cards_select_public_draft
on public.change_cards
for select
to anon, authenticated
using (public.can_read_public_change_card(id));

create policy change_cards_insert_owner_draft
on public.change_cards
for insert
to authenticated
with check (public.is_project_owner(project_id));

-- PATCH 13: Change Card approve/publish/update는 Project Owner 중심으로 제한한다.
-- 승인 이후 핵심 필드 수정 제한은 file 04 trigger 후보와 함께 검증한다.
create policy change_cards_update_owner_draft
on public.change_cards
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

-- Delete is intentionally omitted. Use archived_at via owner update if needed.

-- ----------------------------------------------------------------------------
-- feedback_requests
-- ----------------------------------------------------------------------------

create policy feedback_requests_select_owner_draft
on public.feedback_requests
for select
to authenticated
using (public.is_project_owner(project_id));

create policy feedback_requests_select_public_draft
on public.feedback_requests
for select
to anon, authenticated
using (
  visibility_status = 'public'
  and status = 'open'
  and archived_at is null
  and public.can_read_public_project(project_id)
);

create policy feedback_requests_insert_owner_draft
on public.feedback_requests
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy feedback_requests_update_owner_draft
on public.feedback_requests
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));

-- ----------------------------------------------------------------------------
-- feedbacks
-- ----------------------------------------------------------------------------

create policy feedbacks_select_author_or_owner_draft
on public.feedbacks
for select
to authenticated
using (public.can_read_feedback(id));

create policy feedbacks_select_public_selected_draft
on public.feedbacks
for select
to anon, authenticated
using (
  visibility_status = 'public_selected'
  and public.can_read_feedback(id)
);

-- PATCH 13: Feedback insert는 Feedback Request 조건과 author spoofing 방지를 동시에 요구한다.
-- link_shared Feedback insert는 secure RPC에서 share_token 검증 후 insert하는 후보로 분리한다.
create policy feedbacks_insert_public_request_draft
on public.feedbacks
for insert
to authenticated
with check (
  public.can_insert_feedback(feedback_request_id, author_user_profile_id)
);

create policy feedbacks_update_owner_review_draft
on public.feedbacks
for update
to authenticated
using (
  exists (
    select 1
    from public.feedback_requests fr
    where fr.id = feedbacks.feedback_request_id
      and public.is_project_owner(fr.project_id)
  )
)
with check (
  exists (
    select 1
    from public.feedback_requests fr
    where fr.id = feedbacks.feedback_request_id
      and public.is_project_owner(fr.project_id)
  )
);

-- ----------------------------------------------------------------------------
-- project_links
-- ----------------------------------------------------------------------------

create policy project_links_select_owner_draft
on public.project_links
for select
to authenticated
using (public.is_project_owner(project_id));

create policy project_links_select_public_draft
on public.project_links
for select
to anon, authenticated
using (
  visibility_status = 'public'
  and archived_at is null
  and public.can_read_public_project(project_id)
);

create policy project_links_insert_owner_draft
on public.project_links
for insert
to authenticated
with check (public.is_project_owner(project_id));

create policy project_links_update_owner_draft
on public.project_links
for update
to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));
