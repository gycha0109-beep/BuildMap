-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL / VIEW_ACCESS_ERROR / VIEW_BOUNDARY_FAIL signals.
-- ============================================================================

\echo 'phase20_00_preflight.sql'
\echo 'PATCH 23.6: machine-readable object/helper/RLS prerequisites plus deterministic view/access checks.'

select 'PRE-001 current_database' as check_id, current_database() as value;
select 'PRE-002 current_user' as check_id, current_user as value;

begin;
set local role anon;
select 'PRE-003 anon auth.uid null' as check_id,
  case when auth.uid() is null then 'PASS' else 'FAIL' end as result,
  auth.uid()::text as actual_uid;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select 'PRE-004 Method A owner auth.uid' as check_id,
  case when auth.uid()::text = '00000000-0000-0000-0000-000000000101' then 'PASS' else 'FAIL' end as result,
  auth.uid()::text as actual_uid;
rollback;

select 'PRE-005 table exists user_profiles' as check_id,
  case when to_regclass('public.user_profiles') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-006 table exists builder_profiles' as check_id,
  case when to_regclass('public.builder_profiles') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-007 table exists projects' as check_id,
  case when to_regclass('public.projects') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-008 table exists change_cards' as check_id,
  case when to_regclass('public.change_cards') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-009 table exists feedbacks' as check_id,
  case when to_regclass('public.feedbacks') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-010 view exists public_feedbacks' as check_id,
  case when to_regclass('public.public_feedbacks') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-011 helper exists current_user_profile_id' as check_id,
  case when to_regprocedure('public.current_user_profile_id()') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-012 helper exists is_project_owner' as check_id,
  case when to_regprocedure('public.is_project_owner(uuid)') is not null then 'PASS' else 'ENV_ERROR' end as result;
select 'PRE-013 helper exists can_insert_feedback' as check_id,
  case when to_regprocedure('public.can_insert_feedback(uuid,uuid)') is not null then 'PASS' else 'ENV_ERROR' end as result;

with expected(table_name) as (
  values
    ('projects'),
    ('rough_notes'),
    ('ai_structured_drafts'),
    ('change_cards'),
    ('feedback_requests'),
    ('feedbacks')
), actual as (
  select
    e.table_name,
    c.oid,
    c.relrowsecurity
  from expected e
  left join pg_class c
    on c.relname = e.table_name
   and c.relnamespace = 'public'::regnamespace
)
select
  'PRE-014-' || table_name as check_id,
  case
    when oid is null then 'POLICY_FAIL'
    when relrowsecurity then 'PASS'
    else 'POLICY_FAIL'
  end as result,
  coalesce(relrowsecurity, false) as rls_enabled
from actual
order by table_name;

\echo 'PRE-020 privilege matrix: authenticated source-table permissions required to reach RLS.'
select 'PRE-020 authenticated SELECT projects' as check_id, case when has_table_privilege('authenticated','public.projects','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-021 authenticated UPDATE projects' as check_id, case when has_any_column_privilege('authenticated','public.projects','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-022 authenticated SELECT rough_notes' as check_id, case when has_table_privilege('authenticated','public.rough_notes','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-023 authenticated SELECT ai_structured_drafts' as check_id, case when has_table_privilege('authenticated','public.ai_structured_drafts','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-024 authenticated SELECT change_cards' as check_id, case when has_table_privilege('authenticated','public.change_cards','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-025 authenticated UPDATE change_cards' as check_id, case when has_table_privilege('authenticated','public.change_cards','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-026 authenticated SELECT feedback_requests' as check_id, case when has_table_privilege('authenticated','public.feedback_requests','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-027 authenticated INSERT feedbacks' as check_id, case when has_table_privilege('authenticated','public.feedbacks','INSERT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-028 authenticated SELECT feedbacks' as check_id, case when has_table_privilege('authenticated','public.feedbacks','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;

\echo 'PRE-030 anon source-table boundary: direct source access should stay blocked.'
select 'PRE-030 anon direct SELECT projects expected false' as check_id, case when has_table_privilege('anon','public.projects','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'PRE-031 anon direct SELECT rough_notes expected false' as check_id, case when has_table_privilege('anon','public.rough_notes','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'PRE-032 anon direct SELECT ai_structured_drafts expected false' as check_id, case when has_table_privilege('anon','public.ai_structured_drafts','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'PRE-033 anon direct SELECT change_cards expected false' as check_id, case when has_table_privilege('anon','public.change_cards','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'PRE-034 anon direct SELECT feedbacks expected false' as check_id, case when has_table_privilege('anon','public.feedbacks','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;

\echo 'PRE-040 public-safe view grants: anon must have SELECT on every public-safe view boundary.'
select 'PRE-039 anon SELECT public_builder_profiles' as check_id, case when has_table_privilege('anon','public.public_builder_profiles','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-040 anon SELECT public_project_cards' as check_id, case when has_table_privilege('anon','public.public_project_cards','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-041 anon SELECT public_project_pages' as check_id, case when has_table_privilege('anon','public.public_project_pages','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-042 anon SELECT public_change_cards' as check_id, case when has_table_privilege('anon','public.public_change_cards','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-043 anon SELECT public_decision_timeline' as check_id, case when has_table_privilege('anon','public.public_decision_timeline','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-044 anon SELECT public_feedback_requests' as check_id, case when has_table_privilege('anon','public.public_feedback_requests','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-045 anon SELECT public_feedbacks' as check_id, case when has_table_privilege('anon','public.public_feedbacks','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'PRE-046 anon SELECT public_project_links' as check_id, case when has_table_privilege('anon','public.public_project_links','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;

\echo 'PRE-047 public-safe view reloptions: all 8 views must be owner-executed and security_barrier=true.'
with expected(view_name) as (
  values
    ('public_builder_profiles'),
    ('public_project_cards'),
    ('public_project_pages'),
    ('public_change_cards'),
    ('public_decision_timeline'),
    ('public_feedback_requests'),
    ('public_feedbacks'),
    ('public_project_links')
),
actual as (
  select
    e.view_name,
    c.oid,
    coalesce(array_to_string(c.reloptions, ','), '') as reloptions
  from expected e
  left join pg_class c
    on c.relname = e.view_name
   and c.relnamespace = 'public'::regnamespace
)
select
  'PRE-047-' || view_name as check_id,
  view_name,
  case
    when oid is null then 'FAIL'
    when reloptions like '%security_invoker=true%' then 'VIEW_EXECUTION_MODEL_MISMATCH'
    when reloptions not like '%security_barrier=true%' then 'VIEW_OPTION_MISMATCH'
    else 'PASS'
  end as result,
  reloptions
from actual
order by view_name;

select 'PRE-048 public-safe view count expected 8' as check_id,
  case when (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'public_builder_profiles',
        'public_project_cards',
        'public_project_pages',
        'public_change_cards',
        'public_decision_timeline',
        'public_feedback_requests',
        'public_feedbacks',
        'public_project_links'
      )
  ) = 8 then 'PASS' else 'FAIL' end as result;

begin;
set local role anon;
do $$
declare
  v_count integer := 0;
begin
  select count(*) into v_count
  from public.public_builder_profiles;

  raise notice 'PRE-049 PASS anon can query public_builder_profiles view boundary, current_count=%', v_count;
exception
  when insufficient_privilege then
    raise warning 'PRE-049 VIEW_ACCESS_ERROR public_builder_profiles blocked by privilege/view execution model: %', sqlstate;
  when others then
    raise warning 'PRE-049 VIEW_ACCESS_ERROR public_builder_profiles query failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role anon;
do $$
declare
  v_count integer := 0;
begin
  -- Preflight runs before the seed script. It must only verify that anon can execute
  -- the public-safe view boundary without source table grants. Fixture-specific row
  -- boundary checks run after seed in phase20_02 and phase20_06.
  select count(*) into v_count
  from public.public_project_cards;

  raise notice 'PRE-050 PASS anon can query public_project_cards view boundary, current_count=%', v_count;
exception
  when insufficient_privilege then
    raise warning 'PRE-050 VIEW_ACCESS_ERROR public_project_cards blocked by privilege/view execution model: %', sqlstate;
  when others then
    raise warning 'PRE-050 VIEW_ACCESS_ERROR public_project_cards query failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role anon;
do $$
begin
  perform count(*) from public.projects;
  raise warning 'PRE-051 UNEXPECTED_ALLOW anon direct source projects SELECT succeeded; public reads must stay view-only';
exception
  when insufficient_privilege then
    raise notice 'PRE-051 EXPECTED_DENY anon direct source projects SELECT blocked';
  when others then
    raise warning 'PRE-051 SCRIPT_ERROR anon direct source projects SELECT produced unexpected error: % %', sqlstate, sqlerrm;
end $$;
rollback;

select 'PRE-060 forbidden view columns' as check_id,
  case when exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_builder_profiles','public_project_cards','public_project_pages','public_change_cards','public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links')
      and column_name in ('auth_user_id','owner_user_profile_id','author_user_profile_id','share_token_hash','raw_token','user_profile_id')
  ) then 'VIEW_BOUNDARY_FAIL' else 'PASS' end as result;

select 'PRE-061 rough/ai draft view columns' as check_id,
  case when exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_builder_profiles','public_project_cards','public_project_pages','public_change_cards','public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links')
      and (column_name ilike '%rough%' or column_name ilike '%ai_draft%' or column_name ilike '%draft%')
  ) then 'VIEW_BOUNDARY_FAIL' else 'PASS' end as result;
