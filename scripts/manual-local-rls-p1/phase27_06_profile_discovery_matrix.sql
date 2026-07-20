-- ============================================================================
-- PHASE27 P1 PROFILE / DISCOVERY MATRIX - LOCAL ONLY
-- ============================================================================
\echo 'phase27_06_profile_discovery_matrix.sql'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  select count(*) into v from public.user_profiles where id='13000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-PROFILE-001 PASS user reads own user_profile'; else raise warning 'P1-PROFILE-001 UNEXPECTED_DENY own user profile count=%',v; end if;
  select count(*) into v from public.user_profiles where id='13000000-0000-0000-0000-000000000302';
  if v=0 then raise notice 'P1-PROFILE-002 EXPECTED_DENY user cannot read another user_profile'; else raise warning 'P1-PROFILE-002 UNEXPECTED_ALLOW other user profile count=%',v; end if;
  update public.user_profiles set display_name='P1 Owner A Updated' where id='13000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-PROFILE-003 PASS user updates own display_name'; else raise warning 'P1-PROFILE-003 FAIL own user profile update rows=%',v; end if;
  update public.user_profiles set display_name=display_name where id='13000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-PROFILE-004 EXPECTED_DENY user cannot update another user_profile'; else raise warning 'P1-PROFILE-004 UNEXPECTED_ALLOW other user profile update rows=%',v; end if;
  select count(*) into v from public.builder_profiles where id='23000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-PROFILE-005 PASS builder reads own builder_profile'; else raise warning 'P1-PROFILE-005 UNEXPECTED_DENY own builder profile count=%',v; end if;
  update public.builder_profiles set bio='updated own bio' where id='23000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-PROFILE-006 PASS builder updates own builder_profile'; else raise warning 'P1-PROFILE-006 FAIL own builder update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  select count(*) into v from public.builder_profiles where id='23000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-PROFILE-007 PASS authenticated user reads another public builder_profile'; else raise warning 'P1-PROFILE-007 UNEXPECTED_DENY public builder profile count=%',v; end if;
  select count(*) into v from public.builder_profiles where id='23000000-0000-0000-0000-000000000303';
  if v=0 then raise notice 'P1-PROFILE-008 EXPECTED_DENY authenticated user cannot read private builder_profile'; else raise warning 'P1-PROFILE-008 UNEXPECTED_ALLOW private builder profile count=%',v; end if;
  update public.builder_profiles set bio=bio where id='23000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-PROFILE-009 EXPECTED_DENY user cannot update another builder_profile'; else raise warning 'P1-PROFILE-009 UNEXPECTED_ALLOW other builder update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000304',true);
do $$
declare v uuid;
begin
  select public.current_user_profile_id() into v;
  if v is null then raise notice 'P1-PROFILE-010 PASS authenticated actor without profile resolves null current profile'; else raise warning 'P1-PROFILE-010 AUTH_CONTEXT_FAIL no-profile actor resolved %',v; end if;
end $$;
rollback;

begin;
set local role anon;
do $$
declare v integer;
begin
  select count(*) into v from public.public_builder_profiles where builder_profile_id in ('23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000302');
  if v=2 then raise notice 'P1-PROFILE-011 PASS public builder profiles visible in discovery view'; else raise warning 'P1-PROFILE-011 UNEXPECTED_DENY public builder count=%',v; end if;
  select count(*) into v from public.public_builder_profiles where builder_profile_id='23000000-0000-0000-0000-000000000303';
  if v=0 then raise notice 'P1-PROFILE-012 EXPECTED_DENY private builder absent from discovery view'; else raise warning 'P1-PROFILE-012 VIEW_BOUNDARY_FAIL private builder visible count=%',v; end if;
  select count(*) into v from public.public_project_cards where project_id in ('33000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000303');
  if v=2 then raise notice 'P1-PROFILE-013 PASS public projects visible in discovery view'; else raise warning 'P1-PROFILE-013 UNEXPECTED_DENY public project count=%',v; end if;
  select count(*) into v from public.public_project_cards where project_id in ('33000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000304','33000000-0000-0000-0000-000000000305');
  if v=0 then raise notice 'P1-PROFILE-014 EXPECTED_DENY private/archived/link_shared projects absent from discovery'; else raise warning 'P1-PROFILE-014 VIEW_BOUNDARY_FAIL blocked project count=%',v; end if;
end $$;
rollback;

select 'P1-PROFILE-015' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as forbidden_profile_columns
from information_schema.columns
where table_schema='public' and table_name='public_builder_profiles'
  and column_name in ('user_profile_id','auth_user_id','account_status');

select 'P1-PROFILE-016' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as forbidden_project_columns
from information_schema.columns
where table_schema='public' and table_name in ('public_project_cards','public_project_pages')
  and column_name in ('owner_builder_profile_id','share_token_hash','share_token_rotated_at','share_token_revoked_at');


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  begin
    update public.user_profiles set account_status='disabled' where id='13000000-0000-0000-0000-000000000301';
    get diagnostics v=row_count;
    if v=0 then raise notice 'P1-PROFILE-017 EXPECTED_DENY self-service account_status update affects zero rows';
    else raise warning 'P1-PROFILE-017 UNEXPECTED_ALLOW user changed own internal account_status'; end if;
  exception when insufficient_privilege then
    raise notice 'P1-PROFILE-017 EXPECTED_DENY self-service account_status update blocked';
  end;
  begin
    update public.builder_profiles set user_profile_id='13000000-0000-0000-0000-000000000305' where id='23000000-0000-0000-0000-000000000301';
    raise warning 'P1-PROFILE-018 UNEXPECTED_ALLOW builder_profile reassigned to another user_profile';
  exception when insufficient_privilege then
    raise notice 'P1-PROFILE-018 EXPECTED_DENY builder_profile user identity reassignment blocked';
  end;
end $$;
rollback;
