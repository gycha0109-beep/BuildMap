-- Runs only in the disposable PostgreSQL CI database after EM-1A migration.
-- Every positive assertion is followed by tests of forbidden owner/tenant/approval transitions.

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';

insert into public.execution_tracks (id, project_id, name) values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000511', 'Runtime');
insert into public.roadmap_revisions
  (id, project_id, track_id, version, title) values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000601', 1, 'Initial version');

do $$
declare rejected boolean := false;
begin
  begin
    update public.roadmap_revisions
    set status = 'approved',
        approved_by_builder_profile_id = '00000000-0000-4000-8000-000000000411'
    where id = '00000000-0000-4000-8000-000000000701';
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: approval without milestones succeeded'; end if;
end
$$;

insert into public.execution_milestones
  (id, project_id, track_id, roadmap_revision_id, title, position, weight) values
  ('00000000-0000-4000-8000-000000000801',
   '00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000601',
   '00000000-0000-4000-8000-000000000701',
   'MVP runtime', 0, 4.0000);

do $$
declare rejected boolean := false;
begin
  begin
    update public.roadmap_revisions
    set status = 'approved',
        approved_by_builder_profile_id = '00000000-0000-4000-8000-000000000411'
    where id = '00000000-0000-4000-8000-000000000701';
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: approval without required criteria succeeded'; end if;
end
$$;

insert into public.completion_criteria
  (id, project_id, track_id, roadmap_revision_id, milestone_id,
   title, position, rule_type, is_required) values
  ('00000000-0000-4000-8000-000000000901',
   '00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000601',
   '00000000-0000-4000-8000-000000000701',
   '00000000-0000-4000-8000-000000000801',
   'PR is merged', 0, 'PR_MERGED', true);

update public.roadmap_revisions
set status = 'approved',
    approved_by_builder_profile_id = '00000000-0000-4000-8000-000000000411'
where id = '00000000-0000-4000-8000-000000000701';

do $$
begin
  if not exists (
    select 1 from public.roadmap_revisions
    where id = '00000000-0000-4000-8000-000000000701'
      and status = 'approved'
      and approved_at is not null
  ) then raise exception 'FAIL: owner approval missing'; end if;
end
$$;

do $$
declare rejected boolean;
begin
  rejected := false;
  begin
    update public.completion_criteria set title = 'tampered'
    where id = '00000000-0000-4000-8000-000000000901';
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: approved criterion was mutable'; end if;

  rejected := false;
  begin
    insert into public.execution_milestones
      (project_id,track_id,roadmap_revision_id,title,position,weight) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000601',
       '00000000-0000-4000-8000-000000000701',
       'unauthorized', 1, 1);
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: approved milestone accepted insertion'; end if;

  rejected := false;
  begin
    update public.roadmap_revisions set title = 'tampered'
    where id = '00000000-0000-4000-8000-000000000701';
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: approved revision was mutable'; end if;
end
$$;

insert into public.roadmap_revisions
  (id,project_id,track_id,version,title) values
  ('00000000-0000-4000-8000-000000000702',
   '00000000-0000-4000-8000-000000000511',
   '00000000-0000-4000-8000-000000000601',2,'Next draft');

do $$
declare rejected boolean := false;
begin
  begin
    update public.roadmap_revisions
    set status='approved',
        approved_by_builder_profile_id='00000000-0000-4000-8000-000000000422'
    where id='00000000-0000-4000-8000-000000000702';
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: owner could approve as another actor'; end if;
end
$$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000222';

insert into public.execution_tracks (id,project_id,name) values
  ('00000000-0000-4000-8000-000000000602',
   '00000000-0000-4000-8000-000000000522','Other Builder Track');

do $$
declare rejected boolean := false;
begin
  if exists (
    select 1 from public.execution_tracks
    where id = '00000000-0000-4000-8000-000000000601'
  ) then raise exception 'FAIL: cross-project track SELECT leaked'; end if;

  begin
    insert into public.execution_tracks (project_id,name) values
      ('00000000-0000-4000-8000-000000000511','Cross-project insert');
  exception when sqlstate '42501' then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: cross-project track INSERT succeeded'; end if;
end
$$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';

do $$
declare rejected boolean := false;
begin
  begin
    insert into public.execution_milestones
      (project_id,track_id,roadmap_revision_id,title,position,weight) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000602',
       '00000000-0000-4000-8000-000000000702','Wrong tenant',0,1);
  exception when foreign_key_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: cross-project milestone FK succeeded'; end if;
end
$$;

reset role;
set role anon;

do $$
declare rejected boolean := false;
begin
  begin
    perform count(*) from public.execution_tracks;
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: anonymous Execution Map read succeeded'; end if;
end
$$;

reset role;
select 'EM-1A_ISOLATED_POSTGRES_RLS_SCENARIOS_PASS' as result;
