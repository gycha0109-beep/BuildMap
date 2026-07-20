-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL signals.
-- ============================================================================

\echo 'phase20_04_change_card_public_boundary_p0.sql'
\echo 'PATCH 22: anon public Change Card checks use owner-executed public-safe views.'

begin;
set local role anon;
do $$
declare
  v_public integer;
  v_sensitive integer;
  v_draft integer;
  v_internal integer;
  v_private integer;
begin
  select count(*) into v_public from public.public_change_cards where change_card_id = '50000000-0000-0000-0000-000000000101';
  select count(*) into v_sensitive from public.public_change_cards where change_card_id = '50000000-0000-0000-0000-000000000102';
  select count(*) into v_draft from public.public_change_cards where change_card_id = '50000000-0000-0000-0000-000000000103';
  select count(*) into v_internal from public.public_change_cards where change_card_id = '50000000-0000-0000-0000-000000000104';
  select count(*) into v_private from public.public_change_cards where change_card_id = '50000000-0000-0000-0000-000000000105';

  if v_public = 1 then raise notice 'CC-P0-001 PASS anon can read public approved/published/normal card via public_change_cards'; else raise warning 'CC-P0-001 FAIL public card not visible through view, count=%', v_public; end if;
  if v_sensitive = 0 then raise notice 'CC-P0-002 EXPECTED_DENY sensitive card absent from public_change_cards'; else raise warning 'CC-P0-002 VIEW_BOUNDARY_FAIL sensitive card visible, count=%', v_sensitive; end if;
  if v_draft = 0 then raise notice 'CC-P0-003 EXPECTED_DENY draft card absent from public_change_cards'; else raise warning 'CC-P0-003 VIEW_BOUNDARY_FAIL draft card visible, count=%', v_draft; end if;
  if v_internal = 0 then raise notice 'CC-P0-004 EXPECTED_DENY internal card absent from public_change_cards'; else raise warning 'CC-P0-004 VIEW_BOUNDARY_FAIL internal card visible, count=%', v_internal; end if;
  if v_private = 0 then raise notice 'CC-P0-005 EXPECTED_DENY private project card absent from public_change_cards'; else raise warning 'CC-P0-005 VIEW_BOUNDARY_FAIL private project card visible, count=%', v_private; end if;
exception
  when insufficient_privilege then raise warning 'CC-P0-001/005 VIEW_ACCESS_ERROR anon public_change_cards read blocked: %', sqlstate;
  when others then raise warning 'CC-P0-001/005 VIEW_ACCESS_ERROR public_change_cards read failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role anon;
do $$
begin
  perform count(*) from public.change_cards;
  raise warning 'CC-P0-000 UNEXPECTED_ALLOW anon reached change_cards source table; source privilege must stay revoked';
exception
  when insufficient_privilege then raise notice 'CC-P0-000 EXPECTED_DENY anon direct change_cards source SELECT blocked by table privilege';
  when others then raise warning 'CC-P0-000 SCRIPT_ERROR anon direct change_cards source SELECT produced unexpected error: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
do $$
declare
  v_private integer;
begin
  select count(*) into v_private from public.change_cards where id = '50000000-0000-0000-0000-000000000105';
  if v_private = 0 then raise notice 'CC-P0-006 EXPECTED_DENY non-owner cannot read private project card'; else raise warning 'CC-P0-006 UNEXPECTED_ALLOW non-owner read private project card, count=%', v_private; end if;
exception
  when insufficient_privilege then raise warning 'CC-P0-006 GRANT_FAIL authenticated source change_cards SELECT missing: %', sqlstate;
  when others then raise warning 'CC-P0-006 FAIL non-owner private card test errored: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.change_cards
  where project_id in ('30000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102');
  if v_count = 5 then raise notice 'CC-P0-007 PASS owner can read all own Project Change Cards'; else raise warning 'CC-P0-007 FAIL owner Change Card count=%', v_count; end if;
exception
  when insufficient_privilege then raise warning 'CC-P0-007 GRANT_FAIL authenticated source change_cards SELECT missing: %', sqlstate;
  when others then raise warning 'CC-P0-007 FAIL owner Change Card read errored: % %', sqlstate, sqlerrm;
end $$;
rollback;
