-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 06 public-safe views
-- Depends on:
--   - 01 core schema
--   - 02 decision records schema
--   - 03 feedback and links schema
--   - 04 helpers
--   - 05 RLS policies
-- Purpose:
--   - public-safe response boundaries for public pages and public timeline.
-- SECURITY WARNING:
--   - These views must not expose email, auth id, internal user_profile_id,
--     owner_user_profile_id, author_user_profile_id, share_token_hash,
--     Rough Note, AI Draft, internal Feedback, or sensitive Change Cards.
-- VERIFY BEFORE APPLY:
--   - view owner / table owner behavior in Supabase local and target Postgres.
--   - public row predicates and public column allowlists.
--   - grants in file 08.
--   - whether API/RPC composition is safer for complex responses.

-- PATCH 13 ACCESS MODEL DECISION:
--   - public-safe views are retained for fully public project cards/lists/timeline candidates.
--   - link_shared/token-validated responses are secure RPC-first candidates.
--   - source table broad anon SELECT remains prohibited.
--
-- PATCH 22 VIEW EXECUTION MODEL DECISION:
--   - Phase20 third run showed SQLSTATE 42501 on public_project_cards because
--     security_invoker views require the invoking role to have underlying source privileges.
--   - Do not grant anon source table SELECT to fix this.
--   - Public-safe views now use owner-executed view semantics by omitting security_invoker=true.
--   - The view SQL itself is the public row/column boundary.
--   - security_barrier=true is used as a defense-in-depth option; it does not replace explicit predicates.
--   - Every view below must keep an explicit column list and explicit public predicates.
--   - Do not use SELECT * in public-safe views.

-- ----------------------------------------------------------------------------
-- Builder public profile
-- ----------------------------------------------------------------------------

create or replace view public.public_builder_profiles
with (security_barrier = true)
as
select
  bp.id as builder_profile_id,
  coalesce(bp.public_display_name, 'Builder') as display_name,
  bp.bio,
  bp.role_tags,
  bp.interest_tags
from public.builder_profiles bp
where bp.is_public = true;

comment on view public.public_builder_profiles is
  'DRAFT public-safe view. Owner-executed view boundary; exposes only public builder profile fields. Do not add auth_user_id/user_profile_id.';

-- ----------------------------------------------------------------------------
-- Public project cards
-- ----------------------------------------------------------------------------

create or replace view public.public_project_cards
with (security_barrier = true)
as
select
  p.id as project_id,
  p.public_slug,
  p.title,
  p.one_line_description,
  p.current_need_summary,
  p.lifecycle_status,
  p.last_activity_at,
  p.created_at,
  coalesce(bp.public_display_name, 'Builder') as builder_display_name
from public.projects p
left join public.builder_profiles bp
  on bp.id = p.owner_builder_profile_id
 and bp.is_public = true
where p.visibility_status = 'public'
  and p.archived_at is null;

comment on view public.public_project_cards is
  'DRAFT public-safe view. Public project card allowlist only; excludes owner_user_profile_id/share_token_hash/source internals.';

-- ----------------------------------------------------------------------------
-- Public project pages
-- ----------------------------------------------------------------------------

create or replace view public.public_project_pages
with (security_barrier = true)
as
select
  p.id as project_id,
  p.public_slug,
  p.title,
  p.one_line_description,
  p.current_need_summary,
  p.lifecycle_status,
  p.created_at,
  p.last_activity_at,
  coalesce(bp.public_display_name, 'Builder') as builder_display_name,
  case when bp.is_public = true then bp.bio else null end as builder_bio
from public.projects p
left join public.builder_profiles bp
  on bp.id = p.owner_builder_profile_id
 and bp.is_public = true
where p.visibility_status = 'public'
  and p.archived_at is null;

comment on view public.public_project_pages is
  'DRAFT public-safe view. Public project page allowlist only; excludes share_token_hash and owner/auth internals.';

-- ----------------------------------------------------------------------------
-- Public Change Cards / Decision Timeline
-- ----------------------------------------------------------------------------

create or replace view public.public_change_cards
with (security_barrier = true)
as
select
  cc.id as change_card_id,
  cc.project_id,
  cc.card_type,
  cc.title,
  cc.structured_summary,
  cc.evidence,
  cc.decision,
  cc.change_content,
  cc.next_check,
  cc.importance,
  cc.approved_at,
  cc.created_at
from public.change_cards cc
join public.projects p
  on p.id = cc.project_id
where p.visibility_status = 'public'
  and p.archived_at is null
  and cc.work_status = 'approved'
  and cc.visibility_status = 'published'
  and cc.sensitivity_status = 'normal'
  and cc.archived_at is null;

comment on view public.public_change_cards is
  'DRAFT public-safe view. Exposes only approved + published + normal Change Cards whose Project is public. Rough Note and AI Draft fields are excluded.';

create or replace view public.public_decision_timeline
with (security_barrier = true)
as
select
  pcc.change_card_id,
  pcc.project_id,
  pcc.card_type,
  pcc.title,
  pcc.structured_summary,
  pcc.evidence,
  pcc.decision,
  pcc.change_content,
  pcc.next_check,
  pcc.importance,
  pcc.approved_at,
  pcc.created_at
from public.public_change_cards pcc
order by pcc.approved_at desc nulls last, pcc.created_at desc;

comment on view public.public_decision_timeline is
  'DRAFT public-safe view. Explicit projection of public_change_cards; no SELECT *; timeline is derived from approved public normal cards only.';

-- ----------------------------------------------------------------------------
-- Public Feedback Requests
-- ----------------------------------------------------------------------------

create or replace view public.public_feedback_requests
with (security_barrier = true)
as
select
  fr.id as feedback_request_id,
  fr.project_id,
  fr.change_card_id,
  fr.title,
  fr.question,
  fr.context,
  fr.status,
  fr.created_at
from public.feedback_requests fr
join public.projects p
  on p.id = fr.project_id
left join public.change_cards cc
  on cc.id = fr.change_card_id
 and cc.project_id = fr.project_id
where p.visibility_status = 'public'
  and p.archived_at is null
  and fr.visibility_status = 'public'
  and fr.status = 'open'
  and fr.archived_at is null
  and (
    fr.change_card_id is null
    or (
      cc.id is not null
      and cc.work_status = 'approved'
      and cc.visibility_status = 'published'
      and cc.sensitivity_status = 'normal'
      and cc.archived_at is null
    )
  );

comment on view public.public_feedback_requests is
  'DRAFT public-safe view. Public/open feedback requests only; linked Change Card requests require approved + published + normal card boundary.';

-- ----------------------------------------------------------------------------
-- Public selected feedback
-- ----------------------------------------------------------------------------
-- PATCH 13: public_feedbacks must never expose author_user_profile_id, email, auth id, internal user id, or source row internals.

create or replace view public.public_feedbacks
with (security_barrier = true)
as
select
  f.id as feedback_id,
  f.feedback_request_id,
  f.feedback_type,
  f.tester_interest,
  case
    when f.public_author_display_mode = 'context_role' then '맥락 기반 피드백 작성자'
    else '익명 피드백 작성자'
  end as author_display,
  f.body,
  f.created_at
from public.feedbacks f
join public.feedback_requests fr
  on fr.id = f.feedback_request_id
join public.projects p
  on p.id = fr.project_id
left join public.change_cards cc
  on cc.id = fr.change_card_id
 and cc.project_id = fr.project_id
where p.visibility_status = 'public'
  and p.archived_at is null
  and fr.visibility_status = 'public'
  and fr.status = 'open'
  and fr.archived_at is null
  and (
    fr.change_card_id is null
    or (
      cc.id is not null
      and cc.work_status = 'approved'
      and cc.visibility_status = 'published'
      and cc.sensitivity_status = 'normal'
      and cc.archived_at is null
    )
  )
  and f.visibility_status = 'public_selected'
  and f.archived_at is null;

comment on view public.public_feedbacks is
  'DRAFT public-safe view. Public-selected feedback only; excludes author_user_profile_id/auth ids/internal review rows.';

-- ----------------------------------------------------------------------------
-- Public project links
-- ----------------------------------------------------------------------------

create or replace view public.public_project_links
with (security_barrier = true)
as
select
  pl.id as project_link_id,
  pl.project_id,
  pl.label,
  pl.url,
  pl.link_type,
  pl.sort_order
from public.project_links pl
join public.projects p
  on p.id = pl.project_id
where p.visibility_status = 'public'
  and p.archived_at is null
  and pl.visibility_status = 'public'
  and pl.archived_at is null;

comment on view public.public_project_links is
  'DRAFT public-safe view. Public project links only; no private/internal links or token fields.';
