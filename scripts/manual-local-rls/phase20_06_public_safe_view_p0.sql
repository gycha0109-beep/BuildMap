-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / VIEW_ACCESS_ERROR signals.
-- ============================================================================

\echo 'phase20_06_public_safe_view_p0.sql'
\echo 'PATCH 22.5: validates all 8 public-safe views, including public_builder_profiles.'


begin;
set local role anon;
do $$
declare
  v_count integer;
  v_forbidden integer;
begin
  select count(*) into v_count from public.public_builder_profiles where builder_profile_id = '20000000-0000-0000-0000-000000000101';
  if v_count = 1 then raise notice 'VIEW-P0-BP-002 PASS public_builder_profiles exposes owner public builder fixture'; else raise warning 'VIEW-P0-BP-002 FAIL public_builder_profiles expected owner public builder count=%', v_count; end if;

  select count(*) into v_count from public.public_builder_profiles where builder_profile_id = '20000000-0000-0000-0000-000000000102';
  if v_count = 1 then raise notice 'VIEW-P0-BP-003 PASS public_builder_profiles exposes non-owner public builder fixture'; else raise warning 'VIEW-P0-BP-003 FAIL public_builder_profiles expected non-owner public builder count=%', v_count; end if;

  select count(*) into v_count from public.public_builder_profiles where builder_profile_id = '20000000-0000-0000-0000-000000000104';
  if v_count = 0 then raise notice 'VIEW-P0-BP-004 PASS public_builder_profiles excludes non-public builder fixture'; else raise warning 'VIEW-P0-BP-004 VIEW_BOUNDARY_FAIL public_builder_profiles exposes non-public builder count=%', v_count; end if;

  select count(*) into v_forbidden
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'public_builder_profiles'
    and column_name = 'user_profile_id';
  if v_forbidden = 0 then raise notice 'VIEW-P0-BP-005 PASS public_builder_profiles excludes user_profile_id column'; else raise warning 'VIEW-P0-BP-005 VIEW_BOUNDARY_FAIL public_builder_profiles exposes user_profile_id column'; end if;

  select count(*) into v_forbidden
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'public_builder_profiles'
    and column_name in ('auth_user_id','owner_user_profile_id');
  if v_forbidden = 0 then raise notice 'VIEW-P0-BP-006 PASS public_builder_profiles excludes auth/internal owner columns'; else raise warning 'VIEW-P0-BP-006 VIEW_BOUNDARY_FAIL public_builder_profiles exposes auth/internal owner columns'; end if;

  raise notice 'VIEW-P0-BP-001 PASS anon can query public_builder_profiles';
exception
  when insufficient_privilege then raise warning 'VIEW-P0-BP-001 VIEW_ACCESS_ERROR public_builder_profiles read blocked: %', sqlstate;
  when others then raise warning 'VIEW-P0-BP-001 VIEW_ACCESS_ERROR public_builder_profiles query failed: % %', sqlstate, sqlerrm;
end $$;
rollback;


begin;
set local role anon;
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.public_project_cards where project_id = '30000000-0000-0000-0000-000000000102';
  if v_count = 1 then raise notice 'VIEW-P0-001 PASS public_project_cards exposes expected public project'; else raise warning 'VIEW-P0-001 FAIL public_project_cards expected public project count=%', v_count; end if;

  select count(*) into v_count from public.public_project_cards where project_id = '30000000-0000-0000-0000-000000000101';
  if v_count = 0 then raise notice 'VIEW-P0-002 EXPECTED_DENY public_project_cards excludes private project'; else raise warning 'VIEW-P0-002 VIEW_BOUNDARY_FAIL public_project_cards exposes private project count=%', v_count; end if;

  select count(*) into v_count from public.public_change_cards where change_card_id in ('50000000-0000-0000-0000-000000000102','50000000-0000-0000-0000-000000000103','50000000-0000-0000-0000-000000000104','50000000-0000-0000-0000-000000000105');
  if v_count = 0 then raise notice 'VIEW-P0-003 EXPECTED_DENY public_change_cards excludes sensitive/draft/internal/private cards'; else raise warning 'VIEW-P0-003 VIEW_BOUNDARY_FAIL public_change_cards exposes blocked cards count=%', v_count; end if;

  select count(*) into v_count from public.public_feedbacks where feedback_id = '70000000-0000-0000-0000-000000000102';
  if v_count = 0 then raise notice 'VIEW-P0-004 EXPECTED_DENY public_feedbacks excludes internal_review feedback'; else raise warning 'VIEW-P0-004 VIEW_BOUNDARY_FAIL public_feedbacks exposes internal_review feedback count=%', v_count; end if;
exception
  when insufficient_privilege then raise warning 'VIEW-P0-001/004 VIEW_ACCESS_ERROR public-safe view read blocked. Do not add broad anon source grants without architecture review: %', sqlstate;
  when others then raise warning 'VIEW-P0-001/004 VIEW_ACCESS_ERROR public-safe view read failed: % %', sqlstate, sqlerrm;
end $$;
rollback;


begin;
set local role anon;
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.public_project_pages where project_id = '30000000-0000-0000-0000-000000000102';
  if v_count = 1 then raise notice 'VIEW-P0-005 PASS public_project_pages exposes expected public project page'; else raise warning 'VIEW-P0-005 FAIL public_project_pages expected public project count=%', v_count; end if;

  select count(*) into v_count from public.public_decision_timeline where change_card_id = '50000000-0000-0000-0000-000000000101';
  if v_count = 1 then raise notice 'VIEW-P0-006 PASS public_decision_timeline exposes expected public Change Card'; else raise warning 'VIEW-P0-006 FAIL public_decision_timeline expected public Change Card count=%', v_count; end if;

  select count(*) into v_count from public.public_feedback_requests where feedback_request_id = '60000000-0000-0000-0000-000000000101';
  if v_count = 1 then raise notice 'VIEW-P0-007 PASS public_feedback_requests exposes expected public request'; else raise warning 'VIEW-P0-007 FAIL public_feedback_requests expected public request count=%', v_count; end if;

  select count(*) into v_count from public.public_project_links where project_id = '30000000-0000-0000-0000-000000000102';
  if v_count = 1 then
    raise notice 'VIEW-P0-008 PASS public_project_links exposes exactly one expected public link';
  elsif v_count = 0 then
    raise warning 'VIEW-P0-008 UNEXPECTED_DENY public_project_links expected public link count=0';
  else
    raise warning 'VIEW-P0-008 VIEW_BOUNDARY_FAIL public_project_links returned duplicate/unexpected public link count=%', v_count;
  end if;
exception
  when insufficient_privilege then raise warning 'VIEW-P0-005/008 VIEW_ACCESS_ERROR additional public-safe view read blocked: %', sqlstate;
  when others then raise warning 'VIEW-P0-005/008 VIEW_ACCESS_ERROR additional public-safe view read failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

select 'VIEW-P0-010 forbidden columns' as scenario_id,
  case when exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_builder_profiles','public_project_cards','public_project_pages','public_change_cards','public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links')
      and column_name in ('auth_user_id','owner_user_profile_id','author_user_profile_id','share_token_hash','user_profile_id')
  ) then 'VIEW_BOUNDARY_FAIL' else 'PASS' end as result,
  'public-safe views do not expose internal identifiers or token hashes' as note;

select 'VIEW-P0-011 rough/ai columns' as scenario_id,
  case when exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_builder_profiles','public_project_cards','public_project_pages','public_change_cards','public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links')
      and (column_name ilike '%rough%' or column_name ilike '%ai_draft%' or column_name ilike '%draft%')
  ) then 'VIEW_BOUNDARY_FAIL' else 'PASS' end as result,
  'public-safe views do not expose Rough Note / AI Draft columns' as note;

select 'VIEW-P0-020 anon source rough_notes privilege' as scenario_id,
  case when has_table_privilege('anon','public.rough_notes','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'VIEW-P0-021 anon source ai_structured_drafts privilege' as scenario_id,
  case when has_table_privilege('anon','public.ai_structured_drafts','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'VIEW-P0-022 anon source feedbacks privilege' as scenario_id,
  case when has_table_privilege('anon','public.feedbacks','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;

select 'VIEW-P0-023 anon source projects privilege' as scenario_id,
  case when has_table_privilege('anon','public.projects','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
select 'VIEW-P0-024 anon source change_cards privilege' as scenario_id,
  case when has_table_privilege('anon','public.change_cards','SELECT') then 'UNEXPECTED_ALLOW' else 'PASS' end as result;
