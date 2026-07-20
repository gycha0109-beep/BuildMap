-- ============================================================================
-- PHASE27 P1 PROBLEM / HYPOTHESIS MATRIX - LOCAL ONLY
-- ============================================================================
\echo 'phase27_02_problem_hypothesis_matrix.sql'

begin;
set local role anon;
do $$
begin
  perform count(*) from public.problem_definitions;
  raise warning 'P1-PH-001 UNEXPECTED_ALLOW anon direct problem_definitions SELECT succeeded';
exception when insufficient_privilege then
  raise notice 'P1-PH-001 EXPECTED_DENY anon direct problem_definitions SELECT blocked';
when others then
  raise warning 'P1-PH-001 SCRIPT_ERROR anon problem source read unexpected error: % %',sqlstate,sqlerrm;
end $$;
do $$
begin
  perform count(*) from public.hypotheses;
  raise warning 'P1-PH-002 UNEXPECTED_ALLOW anon direct hypotheses SELECT succeeded';
exception when insufficient_privilege then
  raise notice 'P1-PH-002 EXPECTED_DENY anon direct hypotheses SELECT blocked';
when others then
  raise warning 'P1-PH-002 SCRIPT_ERROR anon hypothesis source read unexpected error: % %',sqlstate,sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  select count(*) into v from public.problem_definitions where id in ('42000000-0000-0000-0000-000000000301','42000000-0000-0000-0000-000000000302');
  if v=2 then raise notice 'P1-PH-003 PASS owner reads own private and public problem rows'; else raise warning 'P1-PH-003 FAIL owner problem count=%',v; end if;
  select count(*) into v from public.hypotheses where id in ('43000000-0000-0000-0000-000000000301','43000000-0000-0000-0000-000000000302');
  if v=2 then raise notice 'P1-PH-004 PASS owner reads own private and public hypothesis rows'; else raise warning 'P1-PH-004 FAIL owner hypothesis count=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  select count(*) into v from public.problem_definitions where id='42000000-0000-0000-0000-000000000301';
  if v=0 then raise notice 'P1-PH-005 EXPECTED_DENY non-owner cannot read private problem'; else raise warning 'P1-PH-005 UNEXPECTED_ALLOW non-owner private problem count=%',v; end if;
  select count(*) into v from public.hypotheses where id='43000000-0000-0000-0000-000000000301';
  if v=0 then raise notice 'P1-PH-006 EXPECTED_DENY non-owner cannot read private hypothesis'; else raise warning 'P1-PH-006 UNEXPECTED_ALLOW non-owner private hypothesis count=%',v; end if;
  select count(*) into v from public.problem_definitions where id='42000000-0000-0000-0000-000000000302' and archived_at is null;
  if v=1 then raise notice 'P1-PH-007 PASS authenticated non-owner reads active public problem'; else raise warning 'P1-PH-007 UNEXPECTED_DENY public problem count=%',v; end if;
  select count(*) into v from public.hypotheses where id='43000000-0000-0000-0000-000000000302' and archived_at is null;
  if v=1 then raise notice 'P1-PH-008 PASS authenticated non-owner reads active public hypothesis'; else raise warning 'P1-PH-008 UNEXPECTED_DENY public hypothesis count=%',v; end if;
  select count(*) into v from public.problem_definitions where id='42000000-0000-0000-0000-000000000304';
  if v=0 then raise notice 'P1-PH-009 EXPECTED_DENY archived problem hidden from public policy'; else raise warning 'P1-PH-009 UNEXPECTED_ALLOW archived public problem visible count=%',v; end if;
  select count(*) into v from public.hypotheses where id='43000000-0000-0000-0000-000000000304';
  if v=0 then raise notice 'P1-PH-010 EXPECTED_DENY archived hypothesis hidden from public policy'; else raise warning 'P1-PH-010 UNEXPECTED_ALLOW archived public hypothesis visible count=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  insert into public.problem_definitions(id,project_id,current_text,created_by_builder_profile_id)
  values('42000000-0000-0000-0000-000000000391','33000000-0000-0000-0000-000000000302','owner insert problem','23000000-0000-0000-0000-000000000301');
  raise notice 'P1-PH-011 PASS owner inserts problem in own project';

  insert into public.hypotheses(id,project_id,statement,status,created_by_builder_profile_id)
  values('43000000-0000-0000-0000-000000000391','33000000-0000-0000-0000-000000000302','owner insert hypothesis','assumed','23000000-0000-0000-0000-000000000301');
  raise notice 'P1-PH-012 PASS owner inserts hypothesis in own project';

  update public.problem_definitions set current_text='owner updated problem' where id='42000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-PH-013 PASS owner updates own problem'; else raise warning 'P1-PH-013 FAIL owner problem update rows=%',v; end if;

  update public.hypotheses set status='validated' where id='43000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-PH-014 PASS owner updates own hypothesis'; else raise warning 'P1-PH-014 FAIL owner hypothesis update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  begin
    insert into public.problem_definitions(id,project_id,current_text,created_by_builder_profile_id)
    values('42000000-0000-0000-0000-000000000392','33000000-0000-0000-0000-000000000302','non-owner insert','23000000-0000-0000-0000-000000000302');
    raise warning 'P1-PH-015 UNEXPECTED_ALLOW non-owner inserted problem into owner A project';
  exception when insufficient_privilege then
    raise notice 'P1-PH-015 EXPECTED_DENY non-owner problem insert blocked';
  end;

  begin
    insert into public.hypotheses(id,project_id,statement,status,created_by_builder_profile_id)
    values('43000000-0000-0000-0000-000000000392','33000000-0000-0000-0000-000000000302','non-owner insert','assumed','23000000-0000-0000-0000-000000000302');
    raise warning 'P1-PH-016 UNEXPECTED_ALLOW non-owner inserted hypothesis into owner A project';
  exception when insufficient_privilege then
    raise notice 'P1-PH-016 EXPECTED_DENY non-owner hypothesis insert blocked';
  end;

  update public.problem_definitions set current_text=current_text where id='42000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-PH-017 EXPECTED_DENY non-owner problem update affects zero rows'; else raise warning 'P1-PH-017 UNEXPECTED_ALLOW non-owner problem update rows=%',v; end if;

  update public.hypotheses set status=status where id='43000000-0000-0000-0000-000000000302';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-PH-018 EXPECTED_DENY non-owner hypothesis update affects zero rows'; else raise warning 'P1-PH-018 UNEXPECTED_ALLOW non-owner hypothesis update rows=%',v; end if;
end $$;
rollback;


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    insert into public.problem_definitions(id,project_id,current_text,created_by_builder_profile_id)
    values('42000000-0000-0000-0000-000000000393','33000000-0000-0000-0000-000000000302','spoofed creator problem','23000000-0000-0000-0000-000000000302');
    raise warning 'P1-PH-019 UNEXPECTED_ALLOW owner inserted problem with another builder as creator';
  exception when insufficient_privilege then
    raise notice 'P1-PH-019 EXPECTED_DENY problem creator spoofing blocked';
  end;
  begin
    insert into public.hypotheses(id,project_id,statement,status,created_by_builder_profile_id)
    values('43000000-0000-0000-0000-000000000393','33000000-0000-0000-0000-000000000302','spoofed creator hypothesis','assumed','23000000-0000-0000-0000-000000000302');
    raise warning 'P1-PH-020 UNEXPECTED_ALLOW owner inserted hypothesis with another builder as creator';
  exception when insufficient_privilege then
    raise notice 'P1-PH-020 EXPECTED_DENY hypothesis creator spoofing blocked';
  end;
end $$;
rollback;


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.problem_definitions
    set created_by_builder_profile_id='23000000-0000-0000-0000-000000000302'
    where id='42000000-0000-0000-0000-000000000302';
    raise warning 'P1-PH-021 UNEXPECTED_ALLOW problem creator identity changed after insert';
  exception when others then
    if sqlstate in ('P0001','42501') then
      raise notice 'P1-PH-021 EXPECTED_DENY problem creator identity mutation blocked';
    else
      raise warning 'P1-PH-021 TRIGGER_FAIL problem creator mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;

  begin
    update public.hypotheses
    set created_by_builder_profile_id='23000000-0000-0000-0000-000000000302'
    where id='43000000-0000-0000-0000-000000000302';
    raise warning 'P1-PH-022 UNEXPECTED_ALLOW hypothesis creator identity changed after insert';
  exception when others then
    if sqlstate in ('P0001','42501') then
      raise notice 'P1-PH-022 EXPECTED_DENY hypothesis creator identity mutation blocked';
    else
      raise warning 'P1-PH-022 TRIGGER_FAIL hypothesis creator mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;
end $$;
rollback;
