-- ============================================================================
-- PHASE27 P1 FEEDBACK REQUEST MATRIX - LOCAL ONLY
-- ============================================================================
\echo 'phase27_03_feedback_request_matrix.sql'

begin;
set local role anon;
do $$
begin
  perform count(*) from public.feedback_requests;
  raise warning 'P1-FR-001 UNEXPECTED_ALLOW anon direct feedback_requests SELECT succeeded';
exception when insufficient_privilege then
  raise notice 'P1-FR-001 EXPECTED_DENY anon direct feedback_requests SELECT blocked';
when others then
  raise warning 'P1-FR-001 SCRIPT_ERROR anon feedback request source read error: % %',sqlstate,sqlerrm;
end $$;
do $$
declare v integer;
begin
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-FR-002 PASS public project-level open request visible'; else raise warning 'P1-FR-002 UNEXPECTED_DENY public request count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000302';
  if v=0 then raise notice 'P1-FR-003 EXPECTED_DENY internal request absent from public view'; else raise warning 'P1-FR-003 VIEW_BOUNDARY_FAIL internal request visible count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000303';
  if v=0 then raise notice 'P1-FR-004 EXPECTED_DENY closed request absent from public view'; else raise warning 'P1-FR-004 VIEW_BOUNDARY_FAIL closed request visible count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000304';
  if v=0 then raise notice 'P1-FR-005 EXPECTED_DENY private project request absent from public view'; else raise warning 'P1-FR-005 VIEW_BOUNDARY_FAIL private project request visible count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000305';
  if v=1 then raise notice 'P1-FR-006 PASS safe linked Change Card request visible'; else raise warning 'P1-FR-006 UNEXPECTED_DENY safe linked request count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000306';
  if v=0 then raise notice 'P1-FR-007 EXPECTED_DENY sensitive linked request absent'; else raise warning 'P1-FR-007 VIEW_BOUNDARY_FAIL sensitive linked request visible count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000307';
  if v=0 then raise notice 'P1-FR-008 EXPECTED_DENY draft linked request absent'; else raise warning 'P1-FR-008 VIEW_BOUNDARY_FAIL draft linked request visible count=%',v; end if;
  select count(*) into v from public.public_feedback_requests where feedback_request_id='63000000-0000-0000-0000-000000000308';
  if v=0 then raise notice 'P1-FR-009 EXPECTED_DENY archived request absent'; else raise warning 'P1-FR-009 VIEW_BOUNDARY_FAIL archived request visible count=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  select count(*) into v from public.feedback_requests where project_id in ('33000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000302');
  if v=8 then raise notice 'P1-FR-010 PASS owner reads all own project feedback requests'; else raise warning 'P1-FR-010 FAIL owner request count=%',v; end if;

  insert into public.feedback_requests(id,project_id,change_card_id,created_by_builder_profile_id,title,question,visibility_status,status)
  values('63000000-0000-0000-0000-000000000391','33000000-0000-0000-0000-000000000302',null,'23000000-0000-0000-0000-000000000301','owner insert','question','internal','open');
  raise notice 'P1-FR-011 PASS owner inserts own feedback request';

  update public.feedback_requests set question='owner updated question' where id='63000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=1 then raise notice 'P1-FR-012 PASS owner updates own feedback request'; else raise warning 'P1-FR-012 FAIL owner request update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  select count(*) into v from public.feedback_requests where id='63000000-0000-0000-0000-000000000302';
  if v=0 then raise notice 'P1-FR-013 EXPECTED_DENY non-owner cannot read internal request'; else raise warning 'P1-FR-013 UNEXPECTED_ALLOW non-owner internal request count=%',v; end if;

  begin
    insert into public.feedback_requests(id,project_id,created_by_builder_profile_id,title,question,visibility_status,status)
    values('63000000-0000-0000-0000-000000000392','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000302','non-owner insert','question','internal','open');
    raise warning 'P1-FR-014 UNEXPECTED_ALLOW non-owner inserted request into owner A project';
  exception when insufficient_privilege then
    raise notice 'P1-FR-014 EXPECTED_DENY non-owner request insert blocked';
  end;

  update public.feedback_requests set question=question where id='63000000-0000-0000-0000-000000000301';
  get diagnostics v=row_count;
  if v=0 then raise notice 'P1-FR-015 EXPECTED_DENY non-owner request update affects zero rows'; else raise warning 'P1-FR-015 UNEXPECTED_ALLOW non-owner request update rows=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    insert into public.feedback_requests(id,project_id,change_card_id,created_by_builder_profile_id,title,question,visibility_status,status)
    values('63000000-0000-0000-0000-000000000393','33000000-0000-0000-0000-000000000302','53000000-0000-0000-0000-000000000306','23000000-0000-0000-0000-000000000301','mismatch','question','internal','open');
    raise warning 'P1-FR-016 UNEXPECTED_ALLOW cross-project Change Card target accepted';
  exception when others then
    if sqlerrm='Feedback Request target Change Card is invalid for this Project.' then
      raise notice 'P1-FR-016 EXPECTED_DENY cross-project Change Card target rejected';
    else
      raise warning 'P1-FR-016 TRIGGER_FAIL wrong mismatch error: % %',sqlstate,sqlerrm;
    end if;
  end;

  begin
    insert into public.feedback_requests(id,project_id,change_card_id,created_by_builder_profile_id,title,question,visibility_status,status)
    values('63000000-0000-0000-0000-000000000394','33000000-0000-0000-0000-000000000302','53000000-0000-0000-0000-000000000308','23000000-0000-0000-0000-000000000301','archived target','question','internal','open');
    raise warning 'P1-FR-017 UNEXPECTED_ALLOW archived Change Card target accepted';
  exception when others then
    if sqlerrm='Feedback Request target Change Card is invalid for this Project.' then
      raise notice 'P1-FR-017 EXPECTED_DENY archived Change Card target rejected';
    else
      raise warning 'P1-FR-017 TRIGGER_FAIL wrong archived-target error: % %',sqlstate,sqlerrm;
    end if;
  end;
end $$;
rollback;

select 'P1-FR-018' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as forbidden_column_count
from information_schema.columns
where table_schema='public' and table_name='public_feedback_requests'
  and column_name in ('created_by_builder_profile_id','share_token_hash','author_user_profile_id');


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000302',true);
do $$
declare v integer;
begin
  select count(*) into v from public.feedback_requests where id='63000000-0000-0000-0000-000000000306';
  if v=0 then raise notice 'P1-FR-019 EXPECTED_DENY authenticated source read hides sensitive linked request'; else raise warning 'P1-FR-019 UNEXPECTED_ALLOW sensitive linked request visible through source RLS count=%',v; end if;
  select count(*) into v from public.feedback_requests where id='63000000-0000-0000-0000-000000000307';
  if v=0 then raise notice 'P1-FR-020 EXPECTED_DENY authenticated source read hides draft linked request'; else raise warning 'P1-FR-020 UNEXPECTED_ALLOW draft linked request visible through source RLS count=%',v; end if;
  select count(*) into v from public.feedback_requests where id='63000000-0000-0000-0000-000000000308';
  if v=0 then raise notice 'P1-FR-021 EXPECTED_DENY authenticated source read hides archived request'; else raise warning 'P1-FR-021 UNEXPECTED_ALLOW archived request visible through source RLS count=%',v; end if;
  select count(*) into v from public.feedback_requests where id='63000000-0000-0000-0000-000000000303';
  if v=0 then raise notice 'P1-FR-022 EXPECTED_DENY authenticated source read hides closed request'; else raise warning 'P1-FR-022 UNEXPECTED_ALLOW closed request visible through source RLS count=%',v; end if;
  select count(*) into v from public.feedbacks where id='73000000-0000-0000-0000-000000000301';
  if v=1 then raise notice 'P1-FR-023 PASS authenticated source read exposes public-selected feedback on safe public request'; else raise warning 'P1-FR-023 UNEXPECTED_DENY safe public-selected feedback count=%',v; end if;
  select count(*) into v from public.feedbacks where id='73000000-0000-0000-0000-000000000303';
  if v=0 then raise notice 'P1-FR-024 EXPECTED_DENY public-selected feedback on internal request hidden'; else raise warning 'P1-FR-024 UNEXPECTED_ALLOW selected feedback on internal request visible count=%',v; end if;
  select count(*) into v from public.feedbacks where id='73000000-0000-0000-0000-000000000305';
  if v=0 then raise notice 'P1-FR-025 EXPECTED_DENY public-selected feedback on sensitive linked request hidden'; else raise warning 'P1-FR-025 UNEXPECTED_ALLOW sensitive-linked selected feedback visible count=%',v; end if;
end $$;
rollback;

begin;
set local role anon;
do $$
declare v integer;
begin
  select count(*) into v from public.public_feedbacks where feedback_id='73000000-0000-0000-0000-000000000304';
  if v=1 then raise notice 'P1-FR-026 PASS public view exposes selected feedback on safe linked request'; else raise warning 'P1-FR-026 UNEXPECTED_DENY safe linked public feedback count=%',v; end if;
  select count(*) into v from public.public_feedbacks where feedback_id in ('73000000-0000-0000-0000-000000000302','73000000-0000-0000-0000-000000000303','73000000-0000-0000-0000-000000000305');
  if v=0 then raise notice 'P1-FR-027 EXPECTED_DENY public view hides internal/internal-request/sensitive-linked feedback'; else raise warning 'P1-FR-027 VIEW_BOUNDARY_FAIL blocked feedback count=%',v; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    insert into public.feedback_requests(id,project_id,created_by_builder_profile_id,title,question,visibility_status,status)
    values('63000000-0000-0000-0000-000000000395','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000302','spoof creator','question','internal','open');
    raise warning 'P1-FR-028 UNEXPECTED_ALLOW owner inserted request with another builder as creator';
  exception when insufficient_privilege then
    raise notice 'P1-FR-028 EXPECTED_DENY feedback request creator spoofing blocked';
  end;
end $$;
rollback;


begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
begin
  begin
    update public.feedback_requests
    set created_by_builder_profile_id='23000000-0000-0000-0000-000000000302'
    where id='63000000-0000-0000-0000-000000000301';
    raise warning 'P1-FR-029 UNEXPECTED_ALLOW feedback request creator identity changed after insert';
  exception when others then
    if sqlstate in ('P0001','42501') then
      raise notice 'P1-FR-029 EXPECTED_DENY feedback request creator identity mutation blocked';
    else
      raise warning 'P1-FR-029 TRIGGER_FAIL feedback request creator mutation error: % %',sqlstate,sqlerrm;
    end if;
  end;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000303',true);
do $$
begin
  begin
    insert into public.feedbacks(
      id,feedback_request_id,author_user_profile_id,body,feedback_type,
      tester_interest,review_status,visibility_status,public_author_display_mode
    ) values(
      '73000000-0000-0000-0000-000000000391',
      '63000000-0000-0000-0000-000000000306',
      '13000000-0000-0000-0000-000000000303',
      'sensitive linked request insert attempt','understanding',false,
      'new','internal_review','anonymous'
    );
    raise warning 'P1-FR-030 UNEXPECTED_ALLOW feedback inserted through sensitive linked Change Card request';
  exception when insufficient_privilege then
    raise notice 'P1-FR-030 EXPECTED_DENY sensitive linked Change Card feedback insert blocked';
  when others then
    raise warning 'P1-FR-030 SCRIPT_ERROR sensitive linked feedback insert error: % %',sqlstate,sqlerrm;
  end;
end $$;
rollback;
