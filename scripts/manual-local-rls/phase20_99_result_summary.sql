-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL signals.
-- ============================================================================

\echo 'phase20_99_result_summary.sql'
\echo 'PATCH 23.6: deterministic single-result public-safe boundary summary.'

begin;
set local role anon;
select 'SUMMARY-001 anon auth.uid null' as check_id,
  case when auth.uid() is null then 'PASS' else 'FAIL' end as result;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
select 'SUMMARY-002 owner auth.uid Method A' as check_id,
  case when auth.uid()::text = '00000000-0000-0000-0000-000000000101' then 'PASS' else 'FAIL' end as result;
rollback;

reset role;
select 'SUMMARY-003' as check_id, case when count(*) = 4 then 'PASS' else 'SEED_FAIL' end as result, count(*) as actual_count, 4 as expected_count from public.projects where id::text like '30000000-0000-0000-0000-00000000010%';
select 'SUMMARY-004' as check_id, case when count(*) = 5 then 'PASS' else 'SEED_FAIL' end as result, count(*) as actual_count, 5 as expected_count from public.change_cards where id::text like '50000000-0000-0000-0000-00000000010%';
select 'SUMMARY-005' as check_id, case when count(*) = 3 then 'PASS' else 'SEED_FAIL' end as result, count(*) as actual_count, 3 as expected_count from public.feedback_requests where id::text like '60000000-0000-0000-0000-00000000010%';
select 'SUMMARY-006' as check_id, case when count(*) = 2 then 'PASS' else 'SEED_FAIL' end as result, count(*) as actual_count, 2 as expected_count from public.feedbacks where id::text like '70000000-0000-0000-0000-00000000010%';
select 'SUMMARY-007' as check_id, case when count(*) = 2 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result, count(*) as actual_count, 2 as expected_count from public.public_project_cards where project_id::text like '30000000-0000-0000-0000-00000000010%';
select 'SUMMARY-008' as check_id, case when count(*) = 1 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result, count(*) as actual_count, 1 as expected_count from public.public_change_cards where change_card_id::text like '50000000-0000-0000-0000-00000000010%';
select 'SUMMARY-009' as check_id, case when count(*) = 1 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result, count(*) as actual_count, 1 as expected_count from public.public_feedbacks where feedback_id::text like '70000000-0000-0000-0000-00000000010%';
select 'SUMMARY-009A' as check_id,
  case when count(*) = 2 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as actual_count,
  2 as expected_count
from public.public_builder_profiles
where builder_profile_id in ('20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000102');
select 'SUMMARY-009B' as check_id,
  case when count(*) = 0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as count
from public.public_builder_profiles
where builder_profile_id = '20000000-0000-0000-0000-000000000104';
select 'SUMMARY-010' as check_id, case when count(*) = 2 then 'PASS' else 'SEED_FAIL' end as result, count(*) as actual_count, 2 as expected_count from public.feedbacks where author_user_profile_id = '10000000-0000-0000-0000-000000000103';
select 'SUMMARY-011 authenticated projects SELECT' as check_id, case when has_table_privilege('authenticated','public.projects','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'SUMMARY-012 anon projects direct SELECT expected false' as check_id, case when has_table_privilege('anon','public.projects','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'SUMMARY-013 anon public_project_cards SELECT' as check_id, case when has_table_privilege('anon','public.public_project_cards','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
select 'SUMMARY-014 anon public_builder_profiles SELECT' as check_id, case when has_table_privilege('anon','public.public_builder_profiles','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;
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
select 'SUMMARY-015 public-safe view count expected 8' as check_id,
  case when count(oid) = 8 then 'PASS' else 'FAIL' end as result,
  count(oid) as actual_count
from actual;
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
    coalesce(array_to_string(c.reloptions, ','), '') as reloptions
  from expected e
  left join pg_class c
    on c.relname = e.view_name
   and c.relnamespace = 'public'::regnamespace
)
select 'SUMMARY-016 security_invoker=true residual view count' as check_id,
  case when count(*) filter (where reloptions like '%security_invoker=true%') = 0 then 'PASS' else 'VIEW_ACCESS_ERROR' end as result,
  count(*) filter (where reloptions like '%security_invoker=true%') as count
from actual;
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
    coalesce(array_to_string(c.reloptions, ','), '') as reloptions
  from expected e
  left join pg_class c
    on c.relname = e.view_name
   and c.relnamespace = 'public'::regnamespace
)
select 'SUMMARY-017 security_barrier=true missing view count' as check_id,
  case when count(*) filter (where reloptions not like '%security_barrier=true%') = 0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) filter (where reloptions not like '%security_barrier=true%') as count
from actual;


begin;
set local role anon;
do $$
declare
  v_public_projects integer := 0;
  v_private_projects integer := 0;
  v_public_cards integer := 0;
  v_blocked_cards integer := 0;
  v_public_builders integer := 0;
  v_private_builders integer := 0;
  v_public_project_links integer := 0;
begin
  select count(*) into v_public_projects
  from public.public_project_cards
  where project_id = '30000000-0000-0000-0000-000000000102';

  select count(*) into v_private_projects
  from public.public_project_cards
  where project_id = '30000000-0000-0000-0000-000000000101';

  select count(*) into v_public_cards
  from public.public_change_cards
  where change_card_id = '50000000-0000-0000-0000-000000000101';

  select count(*) into v_blocked_cards
  from public.public_change_cards
  where change_card_id in (
    '50000000-0000-0000-0000-000000000102',
    '50000000-0000-0000-0000-000000000103',
    '50000000-0000-0000-0000-000000000104',
    '50000000-0000-0000-0000-000000000105'
  );

  select count(*) into v_public_builders
  from public.public_builder_profiles
  where builder_profile_id in (
    '20000000-0000-0000-0000-000000000101',
    '20000000-0000-0000-0000-000000000102'
  );

  select count(*) into v_private_builders
  from public.public_builder_profiles
  where builder_profile_id = '20000000-0000-0000-0000-000000000104';

  select count(*) into v_public_project_links
  from public.public_project_links
  where project_id = '30000000-0000-0000-0000-000000000102';

  if v_public_projects = 1
     and v_private_projects = 0
     and v_public_cards = 1
     and v_blocked_cards = 0
     and v_public_builders = 2
     and v_private_builders = 0
     and v_public_project_links = 1 then
    raise notice 'SUMMARY-020 PASS public-safe boundary counts matched; public_projects=% private_projects=% public_cards=% blocked_cards=% public_builders=% private_builders=% public_project_links=%',
      v_public_projects, v_private_projects, v_public_cards, v_blocked_cards,
      v_public_builders, v_private_builders, v_public_project_links;
  else
    raise warning 'SUMMARY-020 VIEW_BOUNDARY_FAIL public-safe boundary count mismatch; public_projects=% private_projects=% public_cards=% blocked_cards=% public_builders=% private_builders=% public_project_links=%',
      v_public_projects, v_private_projects, v_public_cards, v_blocked_cards,
      v_public_builders, v_private_builders, v_public_project_links;
  end if;
exception
  when insufficient_privilege then
    raise warning 'SUMMARY-020 VIEW_ACCESS_ERROR anon public-safe view summary blocked: %', sqlstate;
  when others then
    raise warning 'SUMMARY-020 SCRIPT_ERROR anon public-safe view summary failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

select 'SUMMARY-030 anon projects direct SELECT expected false' as check_id, case when has_table_privilege('anon','public.projects','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'SUMMARY-031 anon rough_notes direct SELECT expected false' as check_id, case when has_table_privilege('anon','public.rough_notes','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'SUMMARY-032 anon ai_structured_drafts direct SELECT expected false' as check_id, case when has_table_privilege('anon','public.ai_structured_drafts','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'SUMMARY-033 anon feedbacks direct SELECT expected false' as check_id, case when has_table_privilege('anon','public.feedbacks','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'SUMMARY-034 authenticated projects SELECT' as check_id, case when has_table_privilege('authenticated','public.projects','SELECT') then 'PASS' else 'GRANT_FAIL' end as result;

select 'NEXT' as item, 'Review log for UNEXPECTED_ALLOW, VIEW_BOUNDARY_FAIL, VIEW_ACCESS_ERROR, GRANT_FAIL, ACCESS_PATH_MISMATCH, FAIL, ERROR. Share redacted log for the next local-only patch or P0 decision.' as instruction;
