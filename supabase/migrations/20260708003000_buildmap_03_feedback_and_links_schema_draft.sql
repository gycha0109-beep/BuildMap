-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 03 feedback and links schema
-- Depends on:
--   - 01 core schema
--   - 02 decision records schema
-- Purpose:
--   - feedback_requests
--   - feedbacks
--   - project_links
-- Security principles:
--   - Feedback must be created through a Feedback Request.
--   - feedbacks.project_id is intentionally not stored in this 1st draft.
--   - Project relation is traced through feedback_request_id -> feedback_requests.project_id.
--   - Public feedback response must not expose author_user_profile_id.
-- VERIFY BEFORE APPLY:
--   - target constraint for feedback_requests.
--   - author spoofing prevention in helper/RLS/trigger.

create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  change_card_id uuid references public.change_cards(id) on delete cascade,
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  title text not null,
  question text not null,
  context text,
  visibility_status text not null default 'internal'
    check (visibility_status in ('internal', 'public')),
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint feedback_requests_change_card_project_consistency_draft
    check (change_card_id is null or project_id is not null)
);

comment on table public.feedback_requests is
  'DRAFT: feedback question/request. Target is Project or Change Card in 1st draft.';

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  feedback_request_id uuid not null references public.feedback_requests(id) on delete cascade,
  author_user_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  body text not null,
  feedback_type text,
  tester_interest boolean not null default false,
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewing', 'reflected', 'not_reflected')),
  visibility_status text not null default 'internal_review'
    check (visibility_status in ('internal_review', 'public_selected')),
  public_author_display_mode text not null default 'anonymous'
    check (public_author_display_mode in ('anonymous', 'context_role')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.feedbacks is
  'DRAFT: internal feedback by default. Public-safe view must hide author_user_profile_id.';

alter table public.change_cards
  add constraint change_cards_linked_feedback_fk_draft
  foreign key (linked_feedback_id) references public.feedbacks(id) on delete set null;

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  label text not null,
  url text not null,
  link_type text not null default 'other'
    check (link_type in ('demo', 'github', 'notion', 'figma', 'docs', 'other')),
  visibility_status text not null default 'internal'
    check (visibility_status in ('internal', 'public')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists feedback_requests_project_idx_draft on public.feedback_requests(project_id);
create index if not exists feedback_requests_change_card_idx_draft on public.feedback_requests(change_card_id);
create index if not exists feedbacks_request_idx_draft on public.feedbacks(feedback_request_id);
create index if not exists feedbacks_author_idx_draft on public.feedbacks(author_user_profile_id);
create index if not exists project_links_project_idx_draft on public.project_links(project_id, sort_order);

create trigger feedback_requests_set_updated_at_draft
before update on public.feedback_requests
for each row execute function public.set_updated_at();

create trigger feedbacks_set_updated_at_draft
before update on public.feedbacks
for each row execute function public.set_updated_at();

create trigger project_links_set_updated_at_draft
before update on public.project_links
for each row execute function public.set_updated_at();
