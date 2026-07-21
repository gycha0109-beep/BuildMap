-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY TO REMOTE/STAGING/PRODUCTION
-- BuildMap Phase29.1 Residual SECURITY DEFINER Boundary Hardening
-- Depends on migration drafts 00 through 09.
-- Local disposable Supabase verification only.
-- ============================================================================

-- Purpose:
--   1. replace the residual unpinned public.is_feedback_author(uuid) definition;
--   2. preserve the existing signature, return type, volatility, and authenticated-only call surface;
--   3. remove mutable application schemas from SECURITY DEFINER search_path;
--   4. keep every application/auth object explicitly schema-qualified.

create or replace function public.is_feedback_author(p_feedback_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.feedbacks f
    where f.id = p_feedback_id
      and f.author_user_profile_id = public.current_user_profile_id()
      and f.archived_at is null
  )
$$;

comment on function public.is_feedback_author(uuid) is
  'Phase29.1: authenticated feedback-author predicate with pinned SECURITY DEFINER search_path.';

revoke execute on function public.is_feedback_author(uuid)
  from public, anon, authenticated;

grant execute on function public.is_feedback_author(uuid)
  to authenticated;
