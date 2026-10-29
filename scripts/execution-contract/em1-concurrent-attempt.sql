set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.execution_milestones
      (project_id,track_id,roadmap_revision_id,title,position,weight) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000601',
       '00000000-0000-4000-8000-000000000702','Concurrent late mutation',1,1);
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then
    raise exception 'FAIL: concurrent insert escaped approved revision lock';
  end if;
end
$$;
reset role;
select 'EM1_APPROVAL_CONCURRENCY_LOCK_PASS' as result;
