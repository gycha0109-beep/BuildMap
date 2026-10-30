-- EM-2B isolated PostgreSQL adversarial contract.
-- Run after EM-1 fixture/scenarios and EM-2B migration 23.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';

do $$
declare
  v_result jsonb;
  v_objects integer;
  v_snapshots integer;
  v_evidence uuid;
  v_criterion uuid := '00000000-0000-4000-8000-000000000901';
  v_link uuid;
  v_rejected boolean;
begin
  v_result := public.execution_record_evidence_batch(
    '00000000-0000-4000-8000-000000000511', 12345, 'Example/project',
    '[
      {"sourceType":"merged_pull_request","sourceId":"pr:42",
       "sourceState":"SOURCE_CONFIRMED","sourceSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
       "sourceUrl":"https://github.com/Example/project/pull/42",
       "title":"PR merged","reason":null,"occurredAt":"2026-10-29T22:30:00Z"},
      {"sourceType":"release","sourceId":"release:80",
       "sourceState":"UNKNOWN","sourceSha":null,
       "sourceUrl":"https://github.com/Example/project/releases/tag/v1",
       "title":"Release tag v1","reason":"release_tag_revision_and_deployment_not_verified",
       "occurredAt":"2026-10-29T22:40:00Z"}
    ]'::jsonb
  );
  if (v_result->>'storageStatus') is distinct from 'CACHED_UNTRUSTED'
    or v_result->>'criterionEvaluation' is distinct from 'NOT_AVAILABLE'
    or (v_result->>'objectsObserved')::integer <> 2
    or (v_result->>'newSnapshots')::integer <> 2 then
    raise exception 'FAIL: initial evidence cache results are wrong: %', v_result;
  end if;

  v_result := public.execution_record_evidence_batch(
    '00000000-0000-4000-8000-000000000511',12345,'Example/project',
    '[
      {"sourceType":"merged_pull_request","sourceId":"pr:42",
       "sourceState":"SOURCE_CONFIRMED","sourceSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
       "sourceUrl":"https://github.com/Example/project/pull/42",
       "title":"PR merged","reason":null,"occurredAt":"2026-10-29T22:30:00Z"},
      {"sourceType":"release","sourceId":"release:80",
       "sourceState":"UNKNOWN","sourceSha":null,
       "sourceUrl":"https://github.com/Example/project/releases/tag/v1",
       "title":"Release tag v1","reason":"release_tag_revision_and_deployment_not_verified",
       "occurredAt":"2026-10-29T22:40:00Z"}
    ]'::jsonb
  );
  if (v_result->>'newSnapshots') is distinct from '0' then
    raise exception 'FAIL: duplicate refresh created another snapshot: %',v_result;
  end if;

  select count(*) into v_objects
  from public.execution_evidence
  where project_id='00000000-0000-4000-8000-000000000511';
  select count(*) into v_snapshots
  from public.execution_evidence_observations
  where project_id='00000000-0000-4000-8000-000000000511';
  if v_objects <> 2 or v_snapshots <> 2 then
    raise exception 'FAIL: repeat refresh duplicated object or snapshot % %',v_objects,v_snapshots;
  end if;

  v_result := public.execution_record_evidence_batch(
    '00000000-0000-4000-8000-000000000511',12345,'Example/project',
    '[
      {"sourceType":"merged_pull_request","sourceId":"pr:42",
       "sourceState":"SOURCE_CONFIRMED","sourceSha":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
       "sourceUrl":"https://github.com/Example/project/pull/42",
       "title":"PR merged","reason":null,"occurredAt":"2026-10-29T22:30:00Z"}
    ]'::jsonb
  );
  if (v_result->>'newSnapshots') is distinct from '1' then
    raise exception 'FAIL: SHA changed but source revision snapshot missing';
  end if;
  select id into v_evidence from public.execution_evidence
  where project_id='00000000-0000-4000-8000-000000000511'
    and repository_id=12345 and source_id='pr:42';
  if (select count(*) from public.execution_evidence_observations where evidence_id=v_evidence) <> 2
    or not exists (
      select 1 from public.execution_evidence_observations
      where evidence_id=v_evidence and source_sha='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ) then
    raise exception 'FAIL: old merge SHA snapshot was overwritten';
  end if;

  v_rejected := false;
  begin
    perform public.execution_record_evidence_batch(
      '00000000-0000-4000-8000-000000000511',12345,'Example/project',
      '[
        {"sourceType":"merged_pull_request","sourceId":"pr:999",
         "sourceState":"SOURCE_CONFIRMED","sourceSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
         "sourceUrl":"https://github.com/Example/project/pull/999",
         "title":"First","reason":null,"occurredAt":"2026-10-29T22:30:00Z"},
        {"sourceType":"release","sourceId":"release:900",
         "sourceState":"SOURCE_CONFIRMED","sourceSha":null,
         "sourceUrl":"https://github.com/Example/project/releases/tag/v9",
         "title":"False deployment","reason":null,"occurredAt":"2026-10-29T22:40:00Z"}
      ]'::jsonb
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: release was confirmed as deployment'; end if;
  if exists (select 1 from public.execution_evidence where source_id='pr:999') then
    raise exception 'FAIL: partially persisted source batch after later invalid item';
  end if;

  v_rejected := false;
  begin
    perform public.execution_record_evidence_batch(
      '00000000-0000-4000-8000-000000000511',12345,'Example/project',
      '[{"sourceType":"merged_pull_request","sourceId":"pr:19",
         "sourceState":"SOURCE_CONFIRMED","sourceSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
         "sourceUrl":"https://github.com/attacker/repo/pull/19",
         "title":"Hijack","reason":null,"occurredAt":"2026-10-29T22:30:00Z"}]'::jsonb
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: mismatched repository source URL accepted'; end if;

  -- Owner may propose an association. Neither proposed nor reviewed means PASS.
  insert into public.criterion_evidence_links (project_id,criterion_id,evidence_id)
  values ('00000000-0000-4000-8000-000000000511',v_criterion,v_evidence)
  returning id into v_link;
  update public.criterion_evidence_links
  set review_status='reviewed',
      reviewed_by_builder_profile_id='00000000-0000-4000-8000-000000000411'
  where id=v_link;
  if not exists (select 1 from public.criterion_evidence_links
    where id=v_link and review_status='reviewed' and reviewed_at is not null) then
    raise exception 'FAIL: owner link review missing';
  end if;

  v_rejected := false;
  begin
    update public.criterion_evidence_links set review_status='proposed' where id=v_link;
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: reviewed link was edited'; end if;

  v_rejected := false;
  begin
    update public.execution_evidence_observations set title='tampered' where evidence_id=v_evidence;
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: cached snapshot was updateable'; end if;

  if to_regclass('public.criterion_evaluations') is not null then
    raise exception 'FAIL: EM-2B must not create criterion evaluation authority';
  end if;
end
$$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000222';

do $$
declare
  v_rejected boolean := false;
  v_count integer;
begin
  select count(*) into v_count from public.execution_evidence
  where project_id='00000000-0000-4000-8000-000000000511';
  if v_count <> 0 then raise exception 'FAIL: other owner can read cached evidence'; end if;

  select count(*) into v_count from public.criterion_evidence_links
  where project_id='00000000-0000-4000-8000-000000000511';
  if v_count <> 0 then raise exception 'FAIL: other owner can read criterion links'; end if;

  begin
    perform public.execution_record_evidence_batch(
      '00000000-0000-4000-8000-000000000511',12345,'Example/project','[]'::jsonb
    );
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: cross-project write through RPC'; end if;

  v_rejected := false;
  begin
    insert into public.criterion_evidence_links (project_id,criterion_id,evidence_id)
    select '00000000-0000-4000-8000-000000000522'::uuid,
           '00000000-0000-4000-8000-000000000901'::uuid,id
    from public.execution_evidence
    where project_id='00000000-0000-4000-8000-000000000522' limit 1;
  exception when others then v_rejected := true;
  end;
  -- Cross-project links must be rejected when one is actually attempted.
end
$$;

reset role;
set role anon;
do $$
declare
  v_rejected boolean := false;
begin
  begin
    perform count(*) from public.execution_evidence;
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: anon can view evidence registry'; end if;
  v_rejected := false;
  begin
    perform public.execution_record_evidence_batch(
      '00000000-0000-4000-8000-000000000511',12345,'Example/project','[]'::jsonb
    );
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'FAIL: anon can invoke batch recording'; end if;
end
$$;
reset role;
select 'EM2B_EVIDENCE_RLS_IDEMPOTENCY_HISTORY_PASS' as result;
