-- EM-1B JSON import / partial failure / draft archival contract.
-- Runs after baseline EM-1 tenant scenarios, only on disposable PostgreSQL.

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';

insert into public.execution_tracks (id,project_id,name)
values ('00000000-0000-4000-8000-000000000603',
        '00000000-0000-4000-8000-000000000511','Imported track');

do $$
declare
  rejected boolean := false;
  v_count integer;
begin
  begin
    perform public.execution_import_draft(
      '00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000603',
      'Broken',
      'Invalid second milestone must roll back first',
      '[
        {"title":"First","weight":1,"criteria":[{"title":"PR merged","ruleType":"PR_MERGED","required":true}]},
        {"title":"Invalid","weight":1,"criteria":[{"title":"None","ruleType":"NO_SUCH_RULE","required":true}]}
      ]'::jsonb
    );
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: invalid JSON import accepted'; end if;
  select count(*) into v_count from public.roadmap_revisions
   where track_id='00000000-0000-4000-8000-000000000603';
  if v_count <> 0 then raise exception 'FAIL: broken import persisted partial revision'; end if;
end
$$;

do $$
declare
  v_revision_id uuid;
  v_milestones integer;
  v_criteria integer;
begin
  v_revision_id := public.execution_import_draft(
    '00000000-0000-4000-8000-000000000511',
    '00000000-0000-4000-8000-000000000603',
    'Version from JSON',
    'Initial import',
    '[
      {"title":"Core","weight":4,"description":"Required core",
       "criteria":[{"title":"PR merged","ruleType":"PR_MERGED","required":true}]},
      {"title":"Optional phase","weight":1,
       "criteria":[{"title":"Manual acceptance","ruleType":"MANUAL_ACCEPTANCE","required":true}]}
    ]'::jsonb
  );
  if v_revision_id is null then raise exception 'FAIL: import returned null'; end if;
  select count(*) into v_milestones from public.execution_milestones
   where roadmap_revision_id=v_revision_id;
  select count(*) into v_criteria from public.completion_criteria
   where roadmap_revision_id=v_revision_id;
  if v_milestones <> 2 or v_criteria <> 2 then
    raise exception 'FAIL: import lost nested milestones/criteria';
  end if;
  if not exists (
    select 1 from public.roadmap_revisions
    where id=v_revision_id and version=1 and status='draft'
  ) then raise exception 'FAIL: new version not a draft'; end if;
end
$$;

do $$
declare rejected boolean := false;
begin
  begin
    perform public.execution_import_draft(
      '00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000603',
      'Duplicate draft',
      null,
      '[{"title":"X","weight":1,"criteria":[{"title":"Y","ruleType":"PR_MERGED","required":true}]}]'::jsonb
    );
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: second simultaneous draft import accepted'; end if;
end
$$;

-- Edit an existing unapproved milestone; archive another milestone; an archived
-- mandatory criterion must not force the now-excluded milestone to be completed.
update public.execution_milestones set title='Updated core'
where track_id='00000000-0000-4000-8000-000000000603'
  and title='Core';
update public.execution_milestones set archived_at=now()
where track_id='00000000-0000-4000-8000-000000000603'
  and title='Optional phase';

-- Archiving the last required criterion of an active milestone must block approval.
update public.completion_criteria c
set archived_at = now()
from public.execution_milestones m
where c.milestone_id = m.id
  and m.track_id = '00000000-0000-4000-8000-000000000603'
  and m.title = 'Updated core'
  and c.archived_at is null;

do $$
declare
  denied boolean := false;
  v_rev uuid;
begin
  select id into v_rev from public.roadmap_revisions
  where track_id = '00000000-0000-4000-8000-000000000603'
    and status = 'draft';
  begin
    update public.roadmap_revisions
    set status = 'approved',
        approved_by_builder_profile_id = '00000000-0000-4000-8000-000000000411'
    where id = v_rev;
  exception when raise_exception then denied := true;
  end;
  if not denied then
    raise exception 'FAIL: archived required criterion still counted toward approval';
  end if;
end
$$;

insert into public.completion_criteria
  (project_id, track_id, roadmap_revision_id, milestone_id, title, position, rule_type, is_required)
select m.project_id, m.track_id, m.roadmap_revision_id, m.id,
       'Replacement mandatory criterion', 0, 'PR_MERGED', true
from public.execution_milestones m
where m.track_id = '00000000-0000-4000-8000-000000000603'
  and m.title = 'Updated core'
  and m.archived_at is null;

do $$
declare
  v_rev uuid;
  v_active_count integer;
  v_archived_count integer;
begin
  select id into v_rev from public.roadmap_revisions
  where track_id='00000000-0000-4000-8000-000000000603' and status='draft';
  select count(*) into v_active_count from public.execution_milestones
  where roadmap_revision_id=v_rev and archived_at is null;
  select count(*) into v_archived_count from public.execution_milestones
  where roadmap_revision_id=v_rev and archived_at is not null;

  if v_active_count <> 1 or v_archived_count <> 1 then
    raise exception 'FAIL: draft archival did not keep historical row';
  end if;

  update public.roadmap_revisions
  set status='approved',
      approved_by_builder_profile_id='00000000-0000-4000-8000-000000000411'
  where id=v_rev;

  if not exists (
    select 1 from public.roadmap_revisions
    where id=v_rev and status='approved'
  ) then raise exception 'FAIL: active-only approval failed'; end if;
end
$$;

do $$
declare rejected boolean := false;
begin
  begin
    update public.execution_milestones set archived_at=null
    where track_id='00000000-0000-4000-8000-000000000603'
      and title='Optional phase';
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: approved archival could be undone'; end if;
end
$$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000222';
do $$
declare rejected boolean := false;
begin
  begin
    perform public.execution_import_draft(
      '00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000603',
      'Forged',
      null,
      '[{"title":"X","weight":1,"criteria":[{"title":"Y","ruleType":"PR_MERGED","required":true}]}]'::jsonb
    );
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: cross-tenant RPC import accepted'; end if;
end
$$;

reset role;
set role anon;
do $$
declare rejected boolean := false;
begin
  begin
    perform public.execution_import_draft(
      '00000000-0000-4000-8000-000000000511',
      '00000000-0000-4000-8000-000000000603',
      'Anonymous',
      null,
      '[]'::jsonb
    );
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: anonymous import RPC executable'; end if;
end
$$;

reset role;
select 'EM1_IMPORT_ARCHIVAL_ATOMICITY_PASS' as result;
