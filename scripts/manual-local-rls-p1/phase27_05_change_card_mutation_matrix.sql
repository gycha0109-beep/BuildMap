-- ============================================================================
-- PHASE27 P1 CHANGE CARD MUTATION MATRIX - LOCAL ONLY
-- ============================================================================
\echo 'phase27_05_change_card_mutation_matrix.sql'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  insert into public.change_cards(
    id,project_id,author_builder_profile_id,card_type,title,structured_summary,
    work_status,visibility_status,sensitivity_status
  ) values(
    '53000000-0000-0000-0000-000000000391','33000000-0000-0000-0000-000000000302',
    '23000000-0000-0000-0000-000000000301','experiment','owner insert','owner insert summary',
    'draft','internal','normal'
  );
  raise notice 'P1-CC-001 PASS owner inserts draft Change Card';

  update public.change_cards
  set work_status='approved',approved_by_builder_profile_id='23000000-0000-0000-0000-000000000301',approved_at=now()
  where id='53000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-CC-002 PASS owner approves draft Change Card'; else raise warning 'P1-CC-002 FAIL owner approval rows=%',v; end if;

  update public.change_cards set visibility_status='published' where id='53000000-0000-0000-0000-000000000307';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-CC-003 PASS owner publishes approved publishable card'; else raise warning 'P1-CC-003 FAIL owner publish rows=%',v; end if;

  update public.change_cards set visibility_status='internal' where id='53000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-CC-004 PASS owner can unpublish approved card'; else raise warning 'P1-CC-004 FAIL owner unpublish rows=%',v; end if;

  update public.change_cards set sensitivity_status='sensitive' where id='53000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-CC-005 PASS owner can mark approved card sensitive'; else raise warning 'P1-CC-005 FAIL sensitivity update rows=%',v; end if;

  update public.change_cards set archived_at=now() where id='53000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-CC-006 PASS owner can archive approved card'; else raise warning 'P1-CC-006 FAIL archive update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  begin
    insert into public.change_cards(id,project_id,author_builder_profile_id,card_type,title,structured_summary,work_status,visibility_status,sensitivity_status)
    values('53000000-0000-0000-0000-000000000392','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000302','experiment','non-owner insert','summary','draft','internal','normal');
    raise warning 'P1-CC-007 UNEXPECTED_ALLOW non-owner inserted Change Card into owner A project';
  exception when insufficient_privilege then
    raise notice 'P1-CC-007 EXPECTED_DENY non-owner Change Card insert blocked';
  end;

  update public.change_cards set work_status='approved' where id='53000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-CC-008 EXPECTED_DENY non-owner approval affects zero rows'; else raise warning 'P1-CC-008 UNEXPECTED_ALLOW non-owner approval rows=%',v; end if;

  update public.change_cards set visibility_status='published' where id='53000000-0000-0000-0000-000000000307';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-CC-009 EXPECTED_DENY non-owner publish affects zero rows'; else raise warning 'P1-CC-009 UNEXPECTED_ALLOW non-owner publish rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.change_cards set structured_summary='mutated approved summary' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-010 UNEXPECTED_ALLOW approved structured_summary mutated';
  exception when others then
    if sqlstate='P0001' and sqlerrm='Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'P1-CC-010 EXPECTED_DENY approved structured_summary mutation blocked';
    else raise warning 'P1-CC-010 TRIGGER_FAIL wrong approved summary error: % %',sqlstate,sqlerrm; end if;
  end;

  begin
    update public.change_cards set evidence='mutated approved evidence' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-011 UNEXPECTED_ALLOW approved evidence mutated';
  exception when others then
    if sqlstate='P0001' and sqlerrm='Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'P1-CC-011 EXPECTED_DENY approved evidence mutation blocked';
    else raise warning 'P1-CC-011 TRIGGER_FAIL wrong approved evidence error: % %',sqlstate,sqlerrm; end if;
  end;

  begin
    update public.change_cards set decision='mutated approved decision' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-012 UNEXPECTED_ALLOW approved decision mutated';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-012 EXPECTED_DENY approved decision mutation blocked';
    else raise warning 'P1-CC-012 TRIGGER_FAIL approved decision error: % %',sqlstate,sqlerrm; end if;
  end;

  begin
    update public.change_cards set work_status='editing' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-013 UNEXPECTED_ALLOW approved card reverted to editing';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-013 EXPECTED_DENY approved work_status mutation blocked';
    else raise warning 'P1-CC-013 TRIGGER_FAIL approved work status error: % %',sqlstate,sqlerrm; end if;
  end;

  begin
    update public.change_cards set approved_by_builder_profile_id='23000000-0000-0000-0000-000000000302' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-014 UNEXPECTED_ALLOW approved_by changed after approval';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-014 EXPECTED_DENY approved_by mutation blocked';
    else raise warning 'P1-CC-014 TRIGGER_FAIL approved_by error: % %',sqlstate,sqlerrm; end if;
  end;
end $$;
rollback;

begin;
set local role anon;
do $$
declare v integer;
begin
  select count(*) into v from public.public_change_cards where change_card_id='53000000-0000-0000-0000-000000000302';
  if v=1 then raise notice 'P1-CC-015 PASS approved published normal card visible'; else raise warning 'P1-CC-015 UNEXPECTED_DENY public card count=%',v; end if;
  select count(*) into v from public.public_change_cards where change_card_id in (
    '53000000-0000-0000-0000-000000000301','53000000-0000-0000-0000-000000000303',
    '53000000-0000-0000-0000-000000000304','53000000-0000-0000-0000-000000000305',
    '53000000-0000-0000-0000-000000000307','53000000-0000-0000-0000-000000000308'
  );
  if v=0 then raise notice 'P1-CC-016 EXPECTED_DENY draft/internal/sensitive/private/publishable/archived cards absent'; else raise warning 'P1-CC-016 VIEW_BOUNDARY_FAIL blocked card count=%',v; end if;
end $$;
rollback;

select 'P1-CC-017' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as forbidden_column_count
from information_schema.columns
where table_schema='public' and table_name in ('public_change_cards','public_decision_timeline')
  and column_name in ('author_builder_profile_id','approved_by_builder_profile_id','rough_note_id','ai_draft_id','linked_feedback_id');

select 'P1-CC-018' as scenario_id,
  case when count(*)=1 then 'PASS' else 'TRIGGER_FAIL' end as result,
  count(*) as trigger_count
from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='change_cards'
  and tg.tgname='change_cards_prevent_approved_content_mutation_draft' and not tg.tgisinternal;

select 'P1-CC-019' as scenario_id,
  case when count(*)=1 then 'PASS' else 'POLICY_FAIL' end as result,
  count(*) as owner_update_policy_count
from pg_policies where schemaname='public' and tablename='change_cards' and policyname='change_cards_update_owner_draft';

select 'P1-CC-020' as scenario_id,
  case when count(*)=0 then 'PASS' else 'UNEXPECTED_ALLOW' end as result,
  count(*) as anon_source_select_grants
from (select 1) s where has_table_privilege('anon','public.change_cards','SELECT');


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.change_cards set title='mutated approved title' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-021 UNEXPECTED_ALLOW approved title mutated';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-021 EXPECTED_DENY approved title mutation blocked'; else raise warning 'P1-CC-021 TRIGGER_FAIL title mutation error: % %',sqlstate,sqlerrm; end if;
  end;
  begin
    update public.change_cards set card_type='pivot' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-022 UNEXPECTED_ALLOW approved card_type mutated';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-022 EXPECTED_DENY approved card_type mutation blocked'; else raise warning 'P1-CC-022 TRIGGER_FAIL card_type mutation error: % %',sqlstate,sqlerrm; end if;
  end;
  begin
    update public.change_cards set project_id='33000000-0000-0000-0000-000000000301' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-023 UNEXPECTED_ALLOW approved project_id mutated';
  exception when others then
    if sqlstate='P0001' or sqlstate='42501' then raise notice 'P1-CC-023 EXPECTED_DENY approved project_id mutation blocked'; else raise warning 'P1-CC-023 TRIGGER_FAIL project mutation error: % %',sqlstate,sqlerrm; end if;
  end;
  begin
    update public.change_cards set author_builder_profile_id='23000000-0000-0000-0000-000000000302' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-024 UNEXPECTED_ALLOW approved author mutated';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-024 EXPECTED_DENY approved author mutation blocked'; else raise warning 'P1-CC-024 TRIGGER_FAIL author mutation error: % %',sqlstate,sqlerrm; end if;
  end;
  begin
    update public.change_cards set importance='normal' where id='53000000-0000-0000-0000-000000000302';
    raise warning 'P1-CC-025 UNEXPECTED_ALLOW approved importance mutated';
  exception when others then
    if sqlstate='P0001' then raise notice 'P1-CC-025 EXPECTED_DENY approved importance mutation blocked'; else raise warning 'P1-CC-025 TRIGGER_FAIL importance mutation error: % %',sqlstate,sqlerrm; end if;
  end;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.change_cards
    set work_status='approved',approved_by_builder_profile_id='23000000-0000-0000-0000-000000000302',approved_at=now()
    where id='53000000-0000-0000-0000-000000000301';
    raise warning 'P1-CC-026 UNEXPECTED_ALLOW initial approval recorded another builder as approver';
  exception when others then
    if sqlstate in ('P0001','42501') then raise notice 'P1-CC-026 EXPECTED_DENY approval identity spoofing blocked'; else raise warning 'P1-CC-026 TRIGGER_FAIL approval identity error: % %',sqlstate,sqlerrm; end if;
  end;
  begin
    update public.change_cards
    set work_status='approved',approved_by_builder_profile_id='23000000-0000-0000-0000-000000000301',approved_at=null
    where id='53000000-0000-0000-0000-000000000301';
    raise warning 'P1-CC-027 UNEXPECTED_ALLOW approval without approved_at';
  exception when others then
    if sqlstate in ('P0001','23502','23514') then raise notice 'P1-CC-027 EXPECTED_DENY approval without approved_at blocked'; else raise warning 'P1-CC-027 TRIGGER_FAIL approval timestamp error: % %',sqlstate,sqlerrm; end if;
  end;
  begin
    insert into public.change_cards(id,project_id,author_builder_profile_id,card_type,title,structured_summary,work_status,visibility_status,sensitivity_status)
    values('53000000-0000-0000-0000-000000000393','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000302','experiment','spoof author','summary','draft','internal','normal');
    raise warning 'P1-CC-028 UNEXPECTED_ALLOW owner inserted Change Card with another builder as author';
  exception when insufficient_privilege then
    raise notice 'P1-CC-028 EXPECTED_DENY Change Card author spoofing blocked';
  end;
end $$;
rollback;


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.change_cards
    set author_builder_profile_id='23000000-0000-0000-0000-000000000302'
    where id='53000000-0000-0000-0000-000000000301';
    raise warning 'P1-CC-029 UNEXPECTED_ALLOW draft Change Card author identity changed';
  exception when others then
    if sqlstate in ('P0001','42501') then
      raise notice 'P1-CC-029 EXPECTED_DENY draft Change Card author identity mutation blocked';
    else
      raise warning 'P1-CC-029 TRIGGER_FAIL draft author mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;

  begin
    update public.change_cards
    set project_id='33000000-0000-0000-0000-000000000301'
    where id='53000000-0000-0000-0000-000000000301';
    raise warning 'P1-CC-030 UNEXPECTED_ALLOW draft Change Card project identity changed';
  exception when others then
    if sqlstate in ('P0001','42501') then
      raise notice 'P1-CC-030 EXPECTED_DENY draft Change Card project identity mutation blocked';
    else
      raise warning 'P1-CC-030 TRIGGER_FAIL draft project mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;
end $$;
rollback;


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.change_cards
    set created_at=created_at - interval '1 day'
    where id='53000000-0000-0000-0000-000000000301';
    raise warning 'P1-CC-031 UNEXPECTED_ALLOW draft Change Card created_at evidence changed';
  exception when others then
    if sqlstate='P0001' then
      raise notice 'P1-CC-031 EXPECTED_DENY Change Card created_at evidence mutation blocked';
    else
      raise warning 'P1-CC-031 TRIGGER_FAIL created_at mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;
end $$;
rollback;
