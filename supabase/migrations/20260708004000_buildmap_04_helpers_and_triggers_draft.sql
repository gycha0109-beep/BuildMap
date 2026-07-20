-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 04 helpers and triggers
-- Depends on:
--   - 00 extensions and primitives
--   - 01 core schema
--   - 02 decision records schema
--   - 03 feedback and links schema
-- Purpose:
--   - owner helper candidates
--   - public read helper candidates
--   - feedback integrity helper candidates
--   - approved Change Card mutation boundary trigger candidate
-- SECURITY NOTE:
--   Helper functions are draft candidates. SECURITY DEFINER and search_path
--   behavior must be verified before applying.
--   Functions use explicit public schema references where possible.

-- PATCH 24 LINK SHARING RPC DEPENDENCY HARDENING:
-- current_user_profile_id() and is_project_owner(uuid) pin search_path to
-- pg_catalog, pg_temp because Phase24 secure RPCs call them from SECURITY DEFINER code.
-- All application/auth objects remain explicitly schema-qualified.

-- ----------------------------------------------------------------------------
-- current_user_profile_id
-- ----------------------------------------------------------------------------
create or replace function public.current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select up.id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

comment on function public.current_user_profile_id() is
  'DRAFT: maps auth.uid() to user_profiles.id. VERIFY SECURITY DEFINER/search_path before apply.';

revoke execute on function public.current_user_profile_id() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- owner helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    join public.builder_profiles bp on bp.id = p.owner_builder_profile_id
    join public.user_profiles up on up.id = bp.user_profile_id
    where p.id = p_project_id
      and up.auth_user_id = auth.uid()
      and p.archived_at is null
  )
$$;
revoke execute on function public.is_project_owner(uuid) from public, anon, authenticated;



create or replace function public.is_project_owner_by_builder(p_builder_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = p_builder_profile_id
      and up.auth_user_id = auth.uid()
  )
$$;

-- ----------------------------------------------------------------------------
-- public read helpers
-- ----------------------------------------------------------------------------
create or replace function public.can_read_public_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.visibility_status = 'public'
      and p.archived_at is null
  )
$$;

create or replace function public.can_read_public_change_card(p_change_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.change_cards cc
    join public.projects p on p.id = cc.project_id
    where cc.id = p_change_card_id
      and p.visibility_status = 'public'
      and p.archived_at is null
      and cc.work_status = 'approved'
      and cc.visibility_status = 'published'
      and cc.sensitivity_status = 'normal'
      and cc.archived_at is null
  )
$$;

-- ----------------------------------------------------------------------------
-- feedback helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_feedback_author(p_feedback_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.feedbacks f
    where f.id = p_feedback_id
      and f.author_user_profile_id = public.current_user_profile_id()
      and f.archived_at is null
  )
$$;

create or replace function public.can_insert_feedback(
  p_feedback_request_id uuid,
  p_author_user_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.feedback_requests fr
    join public.projects p on p.id = fr.project_id
    where fr.id = p_feedback_request_id
      and fr.visibility_status = 'public'
      and fr.status = 'open'
      and fr.archived_at is null
      and p.visibility_status = 'public'
      and p.archived_at is null
      and p_author_user_profile_id = public.current_user_profile_id()
  )
$$;

create or replace function public.can_read_feedback(p_feedback_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.feedbacks f
    join public.feedback_requests fr on fr.id = f.feedback_request_id
    join public.projects p on p.id = fr.project_id
    where f.id = p_feedback_id
      and f.archived_at is null
      and (
        f.author_user_profile_id = public.current_user_profile_id()
        or public.is_project_owner(p.id)
        or (
          f.visibility_status = 'public_selected'
          and fr.visibility_status = 'public'
          and p.visibility_status = 'public'
          and p.archived_at is null
        )
      )
  )
$$;

-- ----------------------------------------------------------------------------
-- Approved Change Card mutation boundary
-- ----------------------------------------------------------------------------
-- DRAFT TRIGGER:
--   Prevent direct mutation of core decision fields after approval.
--   Visibility/sensitivity/archive changes remain possible by Project Owner through RLS.
-- VERIFY BEFORE APPLY:
--   - exact UX exception policy.
--   - whether application validation should also enforce this.
-- ----------------------------------------------------------------------------

create or replace function public.prevent_approved_change_card_content_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- PATCH 13:
  -- 최초 승인 transition(draft/editing -> approved)은 RLS owner check와 함께 허용 후보로 둔다.
  -- 단, once approved, 핵심 기록 필드와 승인 필드는 직접 수정하지 않는 방향을 우선한다.
  if old.work_status = 'approved' then
    if new.structured_summary is distinct from old.structured_summary
      or new.evidence is distinct from old.evidence
      or new.decision is distinct from old.decision
      or new.change_content is distinct from old.change_content
      or new.next_check is distinct from old.next_check
      or new.linked_problem_definition_id is distinct from old.linked_problem_definition_id
      or new.linked_hypothesis_id is distinct from old.linked_hypothesis_id
      or new.linked_feedback_id is distinct from old.linked_feedback_id
      or new.approved_at is distinct from old.approved_at
      or new.approved_by_builder_profile_id is distinct from old.approved_by_builder_profile_id
      or new.work_status is distinct from old.work_status
    then
      raise exception 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.';
    end if;
  end if;

  -- 허용 후보: visibility_status, sensitivity_status, archived_at, updated_at 자동 갱신.
  -- VERIFY BEFORE APPLY: trigger OLD/NEW 비교 문법과 UX 예외 정책.
  return new;
end;
$$;

create trigger change_cards_prevent_approved_content_mutation_draft
before update on public.change_cards
for each row execute function public.prevent_approved_change_card_content_mutation();

-- ----------------------------------------------------------------------------
-- Feedback Request target/project consistency boundary
-- ----------------------------------------------------------------------------
-- PATCH 13:
--   feedback_requests.change_card_id가 null이면 Project-level Feedback Request로 본다.
--   change_card_id가 not null이면 Change Card-level Feedback Request이며,
--   target Change Card의 project_id가 feedback_requests.project_id와 일치해야 한다.
--   CHECK constraint만으로 cross-table consistency를 보장하기 어려워 trigger 후보로 둔다.
-- VERIFY BEFORE APPLY:
--   - trigger syntax under local dry-run.
--   - RLS interaction on feedback_requests insert/update.
--   - application validation 병행 여부.
-- ----------------------------------------------------------------------------

create or replace function public.validate_feedback_request_target_project()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_change_card_project_id uuid;
begin
  if new.change_card_id is null then
    return new;
  end if;

  select cc.project_id
  into v_change_card_project_id
  from public.change_cards cc
  where cc.id = new.change_card_id
    and cc.archived_at is null;

  if v_change_card_project_id is null then
    raise exception 'Feedback Request target Change Card does not exist or is archived.';
  end if;

  if v_change_card_project_id is distinct from new.project_id then
    raise exception 'Feedback Request project_id must match target Change Card project_id.';
  end if;

  return new;
end;
$$;

create trigger feedback_requests_validate_target_project_draft
before insert or update on public.feedback_requests
for each row execute function public.validate_feedback_request_target_project();

-- ----------------------------------------------------------------------------
-- Feedback author spoofing boundary
-- ----------------------------------------------------------------------------
-- This trigger complements RLS WITH CHECK. It rejects insert/update attempts where
-- author_user_profile_id is not the currently authenticated user profile.
-- VERIFY BEFORE APPLY:
--   - behavior under SECURITY DEFINER helper.
--   - RPC insert path for link_shared projects.
-- ----------------------------------------------------------------------------

create or replace function public.prevent_feedback_author_spoofing()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.author_user_profile_id is distinct from public.current_user_profile_id() then
    raise exception 'Feedback author_user_profile_id must match the current user profile.';
  end if;

  return new;
end;
$$;

create trigger feedbacks_prevent_author_spoofing_draft
before insert or update on public.feedbacks
for each row execute function public.prevent_feedback_author_spoofing();
