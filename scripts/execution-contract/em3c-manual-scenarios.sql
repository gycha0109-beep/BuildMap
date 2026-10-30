-- EM-3C-A actual PostgreSQL audit-event and RLS contract.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';

insert into public.execution_tracks (id,project_id,name)
values ('00000000-0000-4000-8000-000000000661',
  '00000000-0000-4000-8000-000000000511','Manual acceptance test');

insert into public.roadmap_revisions
  (id,project_id,track_id,version,title)
values ('00000000-0000-4000-8000-000000000671',
  '00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000661',1,'Manual test revision');

insert into public.execution_milestones
  (id,project_id,track_id,roadmap_revision_id,title,position,weight)
values ('00000000-0000-4000-8000-000000000681',
  '00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000661',
  '00000000-0000-4000-8000-000000000671','Manual gate',0,1.0000);

insert into public.completion_criteria
  (id,project_id,track_id,roadmap_revision_id,milestone_id,title,position,rule_type,is_required)
values ('00000000-0000-4000-8000-000000000691',
  '00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000661',
  '00000000-0000-4000-8000-000000000671',
  '00000000-0000-4000-8000-000000000681','Manual acceptance by Builder',0,'MANUAL_ACCEPTANCE',true);

do $$
declare v_rejected boolean := false;
begin
  begin
    insert into public.execution_manual_acceptance_events
      (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
    values ('00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000661',
      '00000000-0000-4000-8000-000000000671',
      '00000000-0000-4000-8000-000000000691',
      'accepted','Premature approval');
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: draft manual criterion accepted'; end if;
end $$;

update public.roadmap_revisions set status='approved',
  approved_by_builder_profile_id='00000000-0000-4000-8000-000000000411'
where id='00000000-0000-4000-8000-000000000671';

do $$
declare
  v_event uuid;
  v_actor uuid;
  v_when timestamptz;
  v_count integer;
  v_rejected boolean;
begin
  v_rejected:=false;
  begin
    insert into public.execution_manual_acceptance_events
      (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
    values ('00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000661',
      '00000000-0000-4000-8000-000000000671',
      '00000000-0000-4000-8000-000000000691',
      'revoked','Cannot revoke without an acceptance');
  exception when others then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: revoked without acceptance'; end if;

  -- Caller-supplied actor, time and ID must all be discarded by BEFORE INSERT.
  insert into public.execution_manual_acceptance_events
    (id,project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason,
     actor_builder_profile_id,recorded_at)
  values ('00000000-0000-4000-8000-000000000699',
    '00000000-0000-4000-8000-000000000511',
    '00000000-0000-4000-8000-000000000661',
    '00000000-0000-4000-8000-000000000671',
    '00000000-0000-4000-8000-000000000691',
    'accepted','Builder explicitly checked the demo',
    '00000000-0000-4000-8000-000000000422','2000-01-01T00:00:00Z')
  returning id,actor_builder_profile_id,recorded_at
  into v_event,v_actor,v_when;

  if v_event='00000000-0000-4000-8000-000000000699'
    or v_actor is distinct from '00000000-0000-4000-8000-000000000411'
    or v_when < now()-interval '10 minutes' then
    raise exception 'FAIL: client-forged event identity or actor accepted';
  end if;

  v_rejected:=false;
  begin
    insert into public.execution_manual_acceptance_events
      (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
    values ('00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000661',
      '00000000-0000-4000-8000-000000000671',
      '00000000-0000-4000-8000-000000000691',
      'accepted','Duplicate manual acceptance rejected');
  exception when others then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: repeated acceptance not rejected'; end if;

  v_rejected:=false;
  begin
    update public.execution_manual_acceptance_events set reason='tamper' where id=v_event;
  exception when insufficient_privilege then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: owner edited immutable manual event'; end if;

  v_rejected:=false;
  begin
    delete from public.execution_manual_acceptance_events where id=v_event;
  exception when insufficient_privilege then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: owner removed immutable manual event'; end if;

  insert into public.execution_manual_acceptance_events
    (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
  values ('00000000-0000-4000-8000-000000000511',
    '00000000-0000-4000-8000-000000000661',
    '00000000-0000-4000-8000-000000000671',
    '00000000-0000-4000-8000-000000000691',
    'revoked','Acceptance withdrawn after demonstration');
  insert into public.execution_manual_acceptance_events
    (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
  values ('00000000-0000-4000-8000-000000000511',
    '00000000-0000-4000-8000-000000000661',
    '00000000-0000-4000-8000-000000000671',
    '00000000-0000-4000-8000-000000000691',
    'accepted','Acceptance restored after followup test');
  select count(*) into v_count from public.execution_manual_acceptance_events
    where criterion_id='00000000-0000-4000-8000-000000000691';
  if v_count<>3 then raise exception 'FAIL: acceptance history lost on restore'; end if;
  if (select event_type from public.execution_manual_acceptance_events
     where criterion_id='00000000-0000-4000-8000-000000000691'
     order by recorded_at desc,id desc limit 1) is distinct from 'accepted' then
    raise exception 'FAIL: last manual event not accepted';
  end if;

  v_rejected:=false;
  begin
    insert into public.execution_manual_acceptance_events
      (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
    values ('00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000601',
      '00000000-0000-4000-8000-000000000701',
      '00000000-0000-4000-8000-000000000901',
      'accepted','PR merge cannot be a manual acceptance');
  exception when others then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: nonmanual criterion accepted'; end if;
end $$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000222';

do $$
declare v_rejected boolean:=false; v_count integer;
begin
  select count(*) into v_count from public.execution_manual_acceptance_events
  where project_id='00000000-0000-4000-8000-000000000511';
  if v_count<>0 then raise exception 'FAIL: other Builder can read manual audit'; end if;

  begin
    insert into public.execution_manual_acceptance_events
      (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
    values ('00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000661',
      '00000000-0000-4000-8000-000000000671',
      '00000000-0000-4000-8000-000000000691',
      'revoked','Malicious cross-project acceptance edit');
  exception when others then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: foreign owner inserted manual event'; end if;
end $$;

reset role;
set role anon;
do $$
declare v_rejected boolean:=false;
begin
  begin
    perform count(*) from public.execution_manual_acceptance_events;
  exception when insufficient_privilege then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: anon viewed manual event'; end if;
  v_rejected:=false;
  begin
    insert into public.execution_manual_acceptance_events
      (project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason)
    values ('00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000661',
      '00000000-0000-4000-8000-000000000671',
      '00000000-0000-4000-8000-000000000691',
      'accepted','Anonymous user should not approve');
  exception when others then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'FAIL: anon inserted manual acceptance'; end if;
end $$;
reset role;
select 'EM3C_MANUAL_EVENTS_RLS_REVOCATION_PASS' as result;
