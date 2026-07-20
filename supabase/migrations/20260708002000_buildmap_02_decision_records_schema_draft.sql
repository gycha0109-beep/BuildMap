-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 02 decision records schema
-- Depends on:
--   - 00 extensions and primitives
--   - 01 core schema
-- Purpose:
--   - problem_definitions
--   - hypotheses
--   - rough_notes
--   - ai_structured_drafts
--   - change_cards
-- Key principles:
--   - Change Card is the source record.
--   - Decision Timeline is derived from approved Change Cards.
--   - Rough Notes and AI Drafts are private internal records.
--   - AI Draft is not an official record.
-- VERIFY BEFORE APPLY:
--   - circular relationship between ai_drafts and change_cards.
--   - approved change card mutation restrictions in file 04.

create table if not exists public.problem_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  current_text text not null,
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.problem_definitions is
  'DRAFT: current problem definition. History is tracked by Change Cards.';

create table if not exists public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  statement text not null,
  status text not null default 'assumed'
    check (status in ('assumed', 'validating', 'partially_validated', 'validated', 'refuted', 'held')),
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.hypotheses is
  'DRAFT: current hypothesis statement and status. History is tracked by Change Cards.';

create table if not exists public.rough_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  body text not null,
  converted_to_change_card_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.rough_notes is
  'DRAFT: private raw Builder note. Never exposed in public views or public timeline.';

create table if not exists public.ai_structured_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  rough_note_id uuid references public.rough_notes(id) on delete set null,
  requested_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  suggested_type text,
  suggested_title text,
  structured_summary text,
  evidence text,
  decision text,
  change_content text,
  next_check text,
  suggested_problem_definition_id uuid references public.problem_definitions(id) on delete set null,
  suggested_hypothesis_id uuid references public.hypotheses(id) on delete set null,
  status text not null default 'generated'
    check (status in ('generating', 'generated', 'editing', 'converted_to_change_card', 'held', 'failed')),
  error_message text,
  converted_change_card_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.ai_structured_drafts is
  'DRAFT: AI-created candidate. Not an official Decision Timeline record.';

create table if not exists public.change_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  approved_by_builder_profile_id uuid references public.builder_profiles(id) on delete restrict,
  rough_note_id uuid references public.rough_notes(id) on delete set null,
  ai_draft_id uuid references public.ai_structured_drafts(id) on delete set null,
  card_type text not null
    check (card_type in (
      'problem_found',
      'problem_definition_changed',
      'hypothesis_created',
      'hypothesis_refuted',
      'experiment',
      'user_feedback',
      'feature_added',
      'feature_removed',
      'decision_kept',
      'decision_changed',
      'pivot',
      'release',
      'handoff_note'
    )),
  title text not null,
  structured_summary text not null,
  evidence text,
  decision text,
  change_content text,
  next_check text,
  linked_problem_definition_id uuid references public.problem_definitions(id) on delete set null,
  linked_hypothesis_id uuid references public.hypotheses(id) on delete set null,
  linked_feedback_id uuid,
  work_status text not null default 'draft'
    check (work_status in ('draft', 'editing', 'approved', 'held')),
  visibility_status text not null default 'internal'
    check (visibility_status in ('internal', 'publishable', 'published')),
  sensitivity_status text not null default 'normal'
    check (sensitivity_status in ('normal', 'sensitive')),
  importance text not null default 'normal'
    check (importance in ('normal', 'major_turning_point')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.change_cards is
  'DRAFT: source decision record. Public timeline is derived from approved + published + normal Change Cards.';

alter table public.ai_structured_drafts
  add constraint ai_structured_drafts_converted_change_card_fk_draft
  foreign key (converted_change_card_id) references public.change_cards(id) on delete set null;

create index if not exists problem_definitions_project_idx_draft on public.problem_definitions(project_id);
create index if not exists hypotheses_project_idx_draft on public.hypotheses(project_id);
create index if not exists rough_notes_project_idx_draft on public.rough_notes(project_id);
create index if not exists ai_drafts_project_idx_draft on public.ai_structured_drafts(project_id);
create index if not exists change_cards_project_idx_draft on public.change_cards(project_id);
create index if not exists change_cards_public_timeline_idx_draft
  on public.change_cards(project_id, approved_at desc)
  where work_status = 'approved'
    and visibility_status = 'published'
    and sensitivity_status = 'normal'
    and archived_at is null;

create trigger problem_definitions_set_updated_at_draft
before update on public.problem_definitions
for each row execute function public.set_updated_at();

create trigger hypotheses_set_updated_at_draft
before update on public.hypotheses
for each row execute function public.set_updated_at();

create trigger rough_notes_set_updated_at_draft
before update on public.rough_notes
for each row execute function public.set_updated_at();

create trigger ai_drafts_set_updated_at_draft
before update on public.ai_structured_drafts
for each row execute function public.set_updated_at();

create trigger change_cards_set_updated_at_draft
before update on public.change_cards
for each row execute function public.set_updated_at();
