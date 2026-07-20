-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against 7.5 test cases.
-- ============================================================================

-- File: 01 core schema
-- Depends on:
--   - 00 extensions and primitives
-- Purpose:
--   - user_profiles
--   - builder_profiles
--   - projects
-- Security principles:
--   - auth.users remains the authentication source.
--   - user_profiles carries product profile data.
--   - builder_profiles carries Builder role data.
--   - public_slug is not a security token.
--   - share_token raw value is never stored; only share_token_hash candidate.
-- VERIFY BEFORE APPLY:
--   - auth.users FK syntax and on delete behavior.
--   - nullable unique behavior for share_token_hash.
--   - public_slug generation policy.

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  account_status text not null default 'active'
    check (account_status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'DRAFT: app-level user profile. auth.users remains authentication source.';

create table if not exists public.builder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null unique references public.user_profiles(id) on delete cascade,
  public_display_name text,
  bio text,
  role_tags text[] not null default '{}',
  interest_tags text[] not null default '{}',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.builder_profiles is
  'DRAFT: Builder role profile. Public response must not expose auth id or internal user_profile_id.';

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  title text not null,
  one_line_description text,
  current_need_summary text,
  lifecycle_status text not null default 'idea'
    check (lifecycle_status in ('idea', 'building', 'testing', 'beta', 'operating', 'paused', 'ended')),
  visibility_status text not null default 'private'
    check (visibility_status in ('private', 'link_shared', 'public')),
  public_slug text,
  share_token_hash text,
  share_token_rotated_at timestamptz,
  share_token_revoked_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on column public.projects.public_slug is
  'DRAFT: readable public path candidate. Not a security token.';
comment on column public.projects.share_token_hash is
  'DRAFT: hash of link-share token. Raw token must never be stored.';

-- public_slug is only meaningful when present.
create unique index if not exists projects_public_slug_unique_draft
  on public.projects(public_slug)
  where public_slug is not null;

-- share_token_hash should be unique when present. PostgreSQL permits multiple nulls.
create unique index if not exists projects_share_token_hash_unique_draft
  on public.projects(share_token_hash)
  where share_token_hash is not null;

create index if not exists projects_owner_idx_draft
  on public.projects(owner_builder_profile_id);

create index if not exists projects_visibility_idx_draft
  on public.projects(visibility_status);

create index if not exists projects_last_activity_idx_draft
  on public.projects(last_activity_at desc)
  where archived_at is null;

create trigger user_profiles_set_updated_at_draft
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger builder_profiles_set_updated_at_draft
before update on public.builder_profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at_draft
before update on public.projects
for each row execute function public.set_updated_at();
