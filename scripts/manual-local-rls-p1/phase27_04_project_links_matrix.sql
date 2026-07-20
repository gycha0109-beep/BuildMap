-- ============================================================================
-- PHASE27 P1 PROJECT LINKS MATRIX - LOCAL ONLY
-- ============================================================================
\echo 'phase27_04_project_links_matrix.sql'

begin;
set local role anon;
do $$
begin
  perform count(*) from public.project_links;
  raise warning 'P1-PL-001 UNEXPECTED_ALLOW anon direct project_links SELECT succeeded';
exception when insufficient_privilege then
  raise notice 'P1-PL-001 EXPECTED_DENY anon direct project_links SELECT blocked';
when others then
  raise warning 'P1-PL-001 SCRIPT_ERROR anon project_links source read error: % %',sqlstate,sqlerrm;
end $$;
do $$
declare v integer;
begin
  select count(*) into v from public.public_project_links where project_link_id='83000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-PL-002 PASS public active link visible'; else raise warning 'P1-PL-002 UNEXPECTED_DENY public link count=%',v; end if;
  select count(*) into v from public.public_project_links where project_link_id='83000000-0000-0000-0000-000000000302';
  if v=0 then raise notice 'P1-PL-003 EXPECTED_DENY internal link absent'; else raise warning 'P1-PL-003 VIEW_BOUNDARY_FAIL internal link visible count=%',v; end if;
  select count(*) into v from public.public_project_links where project_link_id='83000000-0000-0000-0000-000000000303';
  if v=0 then raise notice 'P1-PL-004 EXPECTED_DENY private project link absent'; else raise warning 'P1-PL-004 VIEW_BOUNDARY_FAIL private project link visible count=%',v; end if;
  select count(*) into v from public.public_project_links where project_link_id='83000000-0000-0000-0000-000000000304';
  if v=0 then raise notice 'P1-PL-005 EXPECTED_DENY archived link absent'; else raise warning 'P1-PL-005 VIEW_BOUNDARY_FAIL archived link visible count=%',v; end if;
  select count(*) into v from public.public_project_links where project_link_id='83000000-0000-0000-0000-000000000306';
  if v=0 then raise notice 'P1-PL-006 EXPECTED_DENY archived project link absent'; else raise warning 'P1-PL-006 VIEW_BOUNDARY_FAIL archived project link visible count=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  select count(*) into v from public.project_links where project_id in ('33000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000304');
  if v=4 then raise notice 'P1-PL-007 PASS owner reads links for active owned projects; archived project remains inaccessible'; else raise warning 'P1-PL-007 FAIL owner active-project link count=%',v; end if;

  insert into public.project_links(id,project_id,created_by_builder_profile_id,label,url,link_type,visibility_status,sort_order)
  values('83000000-0000-0000-0000-000000000391','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','owner insert','https://example.local/p1-owner-insert','docs','internal',9);
  raise notice 'P1-PL-008 PASS owner inserts own project link';

  update public.project_links set label='owner updated' where id='83000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-PL-009 PASS owner updates own project link'; else raise warning 'P1-PL-009 FAIL owner link update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  select count(*) into v from public.project_links where id='83000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-PL-010 PASS authenticated non-owner reads public source link through RLS'; else raise warning 'P1-PL-010 UNEXPECTED_DENY non-owner public link count=%',v; end if;
  select count(*) into v from public.project_links where id='83000000-0000-0000-0000-000000000302';
  if v=0 then raise notice 'P1-PL-011 EXPECTED_DENY non-owner cannot read internal source link'; else raise warning 'P1-PL-011 UNEXPECTED_ALLOW non-owner internal link count=%',v; end if;

  begin
    insert into public.project_links(id,project_id,created_by_builder_profile_id,label,url,link_type,visibility_status,sort_order)
    values('83000000-0000-0000-0000-000000000392','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000302','non-owner insert','https://example.local/p1-non-owner','other','internal',9);
    raise warning 'P1-PL-012 UNEXPECTED_ALLOW non-owner inserted project link';
  exception when insufficient_privilege then
    raise notice 'P1-PL-012 EXPECTED_DENY non-owner project link insert blocked';
  end;

  update public.project_links set label=label where id='83000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-PL-013 EXPECTED_DENY non-owner project link update affects zero rows'; else raise warning 'P1-PL-013 UNEXPECTED_ALLOW non-owner link update rows=%',v; end if;
end $$;
rollback;

select 'P1-PL-014' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as forbidden_column_count
from information_schema.columns
where table_schema='public' and table_name='public_project_links'
  and column_name in ('created_by_builder_profile_id','share_token_hash','owner_builder_profile_id');


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    insert into public.project_links(id,project_id,created_by_builder_profile_id,label,url,link_type,visibility_status,sort_order)
    values('83000000-0000-0000-0000-000000000393','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000302','spoof creator','https://example.local/p1-spoof','other','internal',10);
    raise warning 'P1-PL-015 UNEXPECTED_ALLOW owner inserted link with another builder as creator';
  exception when insufficient_privilege then
    raise notice 'P1-PL-015 EXPECTED_DENY project link creator spoofing blocked';
  end;
end $$;
rollback;


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.project_links
    set created_by_builder_profile_id='23000000-0000-0000-0000-000000000302'
    where id='83000000-0000-0000-0000-000000000301';
    raise warning 'P1-PL-016 UNEXPECTED_ALLOW project link creator identity changed after insert';
  exception when others then
    if sqlstate in ('P0001','42501') then
      raise notice 'P1-PL-016 EXPECTED_DENY project link creator identity mutation blocked';
    else
      raise warning 'P1-PL-016 TRIGGER_FAIL project link creator mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;
end $$;
rollback;
