-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY DIRECTLY
-- BuildMap Supabase Migration SQL File Draft
-- This file is written under supabase/migrations_draft, not supabase/migrations.
-- Do not run with Supabase CLI. Do not apply to local/staging/production DB.
-- Purpose: review-only SQL draft before formal migration creation.
-- Required before apply: syntax verification, Supabase local dry-run, db lint,
-- Security/Performance Advisor review, and manual verification against Phase24.
-- ============================================================================

-- File: 07 link sharing RPC
-- Depends on:
--   - 01 core schema
--   - 02 decision records schema
--   - 03 feedback and links schema
--   - 04 helpers
-- Purpose:
--   - secure RPC candidates for link-shared project access.
-- SECURITY PRINCIPLES:
--   - SECURITY DEFINER functions pin search_path to pg_catalog, pg_temp.
--   - Every application/auth/extension object is schema-qualified.
--   - Raw share tokens are accepted only as inputs and are never stored.
--   - Read failures are unified as {"ok":false,"error":"not_found"}.
--   - Source rows are never returned; responses use explicit public-safe JSON.
--   - PUBLIC/anon/authenticated EXECUTE is revoked immediately after creation;
--     file 08 grants only the intended external RPC surface.
-- PATCH 24:
--   - fixes unqualified gen_random_bytes under the pinned search_path.
--   - fixes SECURITY DEFINER search_path trust boundary.
--   - fixes linked Change Card boundary for feedback request read/write RPCs.
--   - defines a 32-byte lowercase hex token contract (64 characters).
--   - standardizes owner-only denial to SQLSTATE 42501 / not_allowed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Internal token hash helper
-- ----------------------------------------------------------------------------
create or replace function public.hash_share_token_draft(p_token text)
returns text
language sql
immutable
strict
set search_path = pg_catalog, pg_temp
as $$
  select case
    when pg_catalog.length(p_token) = 64
     and p_token ~ '^[0-9a-f]{64}$'
    then pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex')
    else null
  end
$$;

comment on function public.hash_share_token_draft(text) is
  'DRAFT: accepts only a 64-character lowercase hex token and returns a sha256 hex hash. Raw token is never stored.';

revoke execute on function public.hash_share_token_draft(text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Rotate share token
-- ----------------------------------------------------------------------------
create or replace function public.rotate_project_share_token(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_token text;
  v_hash text;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.hash_share_token_draft(v_token);

  update public.projects
  set share_token_hash = v_hash,
      share_token_rotated_at = pg_catalog.now(),
      share_token_revoked_at = null,
      updated_at = pg_catalog.now()
  where id = p_project_id
    and archived_at is null;

  if not found then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'share_token', v_token
  );
end;
$$;

comment on function public.rotate_project_share_token(uuid) is
  'DRAFT owner-only token rotation. Returns the raw token once; only its hash is stored.';

revoke execute on function public.rotate_project_share_token(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Revoke share token
-- ----------------------------------------------------------------------------
create or replace function public.revoke_project_share_token(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  update public.projects
  set share_token_hash = null,
      share_token_revoked_at = coalesce(share_token_revoked_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where id = p_project_id
    and archived_at is null;

  if not found then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  return pg_catalog.jsonb_build_object('ok', true, 'revoked', true);
end;
$$;

comment on function public.revoke_project_share_token(uuid) is
  'DRAFT owner-only token revocation. Existing token access must fail immediately.';

revoke execute on function public.revoke_project_share_token(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Link-shared project page
-- ----------------------------------------------------------------------------
create or replace function public.get_link_shared_project_page(
  p_project_id uuid,
  p_share_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_token_hash text;
begin
  v_token_hash := public.hash_share_token_draft(p_share_token);

  if v_token_hash is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select p.*
  into v_project
  from public.projects p
  where p.id = p_project_id
    and p.visibility_status = 'link_shared'
    and p.archived_at is null
    and p.share_token_hash is not null
    and p.share_token_revoked_at is null
    and p.share_token_hash = v_token_hash;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'project', pg_catalog.jsonb_build_object(
      'project_id', v_project.id,
      'title', v_project.title,
      'one_line_description', v_project.one_line_description,
      'current_need_summary', v_project.current_need_summary,
      'lifecycle_status', v_project.lifecycle_status,
      'last_activity_at', v_project.last_activity_at
    )
  );
end;
$$;

comment on function public.get_link_shared_project_page(uuid, text) is
  'DRAFT token-gated public-safe project response. Missing/wrong/revoked/private/public/archived all return not_found.';

revoke execute on function public.get_link_shared_project_page(uuid, text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Link-shared decision timeline
-- ----------------------------------------------------------------------------
create or replace function public.get_link_shared_decision_timeline(
  p_project_id uuid,
  p_share_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_ok boolean;
  v_token_hash text;
begin
  v_token_hash := public.hash_share_token_draft(p_share_token);

  select v_token_hash is not null and exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.visibility_status = 'link_shared'
      and p.archived_at is null
      and p.share_token_hash is not null
      and p.share_token_revoked_at is null
      and p.share_token_hash = v_token_hash
  ) into v_ok;

  if not v_ok then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'change_cards', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'change_card_id', cc.id,
          'card_type', cc.card_type,
          'title', cc.title,
          'structured_summary', cc.structured_summary,
          'evidence', cc.evidence,
          'decision', cc.decision,
          'change_content', cc.change_content,
          'next_check', cc.next_check,
          'importance', cc.importance,
          'approved_at', cc.approved_at
        )
        order by cc.approved_at desc nulls last, cc.created_at desc
      )
      from public.change_cards cc
      where cc.project_id = p_project_id
        and cc.work_status = 'approved'
        and cc.visibility_status = 'published'
        and cc.sensitivity_status = 'normal'
        and cc.archived_at is null
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.get_link_shared_decision_timeline(uuid, text) is
  'DRAFT token-gated approved + published + normal Change Card response.';

revoke execute on function public.get_link_shared_decision_timeline(uuid, text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Link-shared feedback requests
-- ----------------------------------------------------------------------------
create or replace function public.get_link_shared_feedback_requests(
  p_project_id uuid,
  p_share_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_ok boolean;
  v_token_hash text;
begin
  v_token_hash := public.hash_share_token_draft(p_share_token);

  select v_token_hash is not null and exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.visibility_status = 'link_shared'
      and p.archived_at is null
      and p.share_token_hash is not null
      and p.share_token_revoked_at is null
      and p.share_token_hash = v_token_hash
  ) into v_ok;

  if not v_ok then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'feedback_requests', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'feedback_request_id', fr.id,
          'project_id', fr.project_id,
          'change_card_id', fr.change_card_id,
          'title', fr.title,
          'question', fr.question,
          'context', fr.context,
          'created_at', fr.created_at
        )
        order by fr.created_at desc
      )
      from public.feedback_requests fr
      left join public.change_cards cc
        on cc.id = fr.change_card_id
       and cc.project_id = fr.project_id
      where fr.project_id = p_project_id
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
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.get_link_shared_feedback_requests(uuid, text) is
  'DRAFT token-gated public/open Feedback Requests. Linked requests require a public-safe Change Card.';

revoke execute on function public.get_link_shared_feedback_requests(uuid, text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Link-shared feedback creation
-- ----------------------------------------------------------------------------
create or replace function public.create_link_shared_feedback(
  p_feedback_request_id uuid,
  p_share_token text,
  p_body text,
  p_feedback_type text default null,
  p_tester_interest boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_profile_id uuid;
  v_project_id uuid;
  v_inserted_id uuid;
  v_token_hash text;
begin
  v_user_profile_id := public.current_user_profile_id();

  if v_user_profile_id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'login_required');
  end if;

  if p_body is null or pg_catalog.btrim(p_body) = '' then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  v_token_hash := public.hash_share_token_draft(p_share_token);

  select fr.project_id
  into v_project_id
  from public.feedback_requests fr
  join public.projects p on p.id = fr.project_id
  left join public.change_cards cc
    on cc.id = fr.change_card_id
   and cc.project_id = fr.project_id
  where fr.id = p_feedback_request_id
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
    and p.visibility_status = 'link_shared'
    and p.archived_at is null
    and p.share_token_hash is not null
    and p.share_token_revoked_at is null
    and v_token_hash is not null
    and p.share_token_hash = v_token_hash;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.feedbacks (
    feedback_request_id,
    author_user_profile_id,
    body,
    feedback_type,
    tester_interest
  )
  values (
    p_feedback_request_id,
    v_user_profile_id,
    p_body,
    p_feedback_type,
    coalesce(p_tester_interest, false)
  )
  returning id into v_inserted_id;

  return pg_catalog.jsonb_build_object('ok', true, 'feedback_id', v_inserted_id);
end;
$$;

comment on function public.create_link_shared_feedback(uuid, text, text, text, boolean) is
  'DRAFT authenticated token-gated Feedback creation. Author is forced to current_user_profile_id().';

revoke execute on function public.create_link_shared_feedback(uuid, text, text, text, boolean) from public, anon, authenticated;
