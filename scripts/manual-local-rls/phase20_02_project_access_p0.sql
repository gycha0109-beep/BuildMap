-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL signals.
-- ============================================================================

\echo 'phase20_02_project_access_p0.sql'
\echo 'PATCH 22: anon public reads use owner-executed public-safe views; authenticated tests use source tables to reach RLS.'

begin;
set local role anon;
do $$
declare
  v_public_count integer;
  v_private_count integer;
begin
  select count(*) into v_public_count
  from public.public_project_cards
  where project_id = '30000000-0000-0000-0000-000000000102';

  if v_public_count = 1 then
    raise notice 'PRJ-P0-001 PASS anon can read public project through public_project_cards';
  else
    raise warning 'PRJ-P0-001 FAIL public project not visible through public_project_cards, count=%', v_public_count;
  end if;

  select count(*) into v_private_count
  from public.public_project_cards
  where project_id = '30000000-0000-0000-0000-000000000101';

  if v_private_count = 0 then
    raise notice 'PRJ-P0-002 EXPECTED_DENY private project absent from public_project_cards';
  else
    raise warning 'PRJ-P0-002 VIEW_BOUNDARY_FAIL private project visible through public_project_cards, count=%', v_private_count;
  end if;
exception
  when insufficient_privilege then
    raise warning 'PRJ-P0-001/002 VIEW_ACCESS_ERROR anon public-safe view read blocked before boundary check: %', sqlstate;
  when others then
    raise warning 'PRJ-P0-001/002 VIEW_ACCESS_ERROR public-safe view read failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role anon;
do $$
begin
  perform count(*) from public.projects;
  raise warning 'PRJ-P0-002A UNEXPECTED_ALLOW anon direct source projects SELECT succeeded; source projects privilege must stay revoked';
exception
  when insufficient_privilege then
    raise notice 'PRJ-P0-002A EXPECTED_DENY anon direct source projects SELECT blocked by table privilege';
  when others then
    raise warning 'PRJ-P0-002A SCRIPT_ERROR anon direct source projects SELECT produced unexpected error: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$
declare
  v_count integer;
  v_updated integer;
begin
  select count(*) into v_count
  from public.projects
  where id = '30000000-0000-0000-0000-000000000101';

  if v_count = 1 then
    raise notice 'PRJ-P0-003 PASS owner can read own private project through source table + RLS';
  else
    raise warning 'PRJ-P0-003 FAIL owner private project source read count=%', v_count;
  end if;

  update public.projects
  set current_need_summary = current_need_summary
  where id = '30000000-0000-0000-0000-000000000102';
  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    raise notice 'PRJ-P0-006 PASS owner can update own project candidate';
  else
    raise warning 'PRJ-P0-006 FAIL owner update affected % rows', v_updated;
  end if;
exception
  when insufficient_privilege then
    raise warning 'PRJ-P0-003/006 GRANT_FAIL authenticated owner source projects privilege missing: %', sqlstate;
  when others then
    raise warning 'PRJ-P0-003/006 FAIL owner project source test errored: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
do $$
declare
  v_count integer;
  v_updated integer;
begin
  select count(*) into v_count
  from public.projects
  where id = '30000000-0000-0000-0000-000000000101';

  if v_count = 0 then
    raise notice 'PRJ-P0-004 EXPECTED_DENY non-owner cannot read owner private project through source table + RLS';
  else
    raise warning 'PRJ-P0-004 UNEXPECTED_ALLOW non-owner read owner private project, count=%', v_count;
  end if;

  update public.projects
  set title = title
  where id = '30000000-0000-0000-0000-000000000102';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise notice 'PRJ-P0-005 EXPECTED_DENY non-owner update affected 0 rows';
  else
    raise warning 'PRJ-P0-005 UNEXPECTED_ALLOW non-owner update affected % rows', v_updated;
  end if;
exception
  when insufficient_privilege then
    raise warning 'PRJ-P0-004/005 GRANT_FAIL authenticated non-owner source projects privilege missing: %', sqlstate;
  when others then
    raise warning 'PRJ-P0-004/005 POLICY_FAIL non-owner project RLS test errored instead of returning 0 rows: % %', sqlstate, sqlerrm;
end $$;
rollback;
