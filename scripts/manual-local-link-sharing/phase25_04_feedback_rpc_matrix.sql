-- ============================================================================
-- LOCAL ONLY LINK-SHARED FEEDBACK RPC MATRIX
-- ============================================================================
\echo 'phase25_04_feedback_rpc_matrix.sql'

begin;
set local role anon;
do $$
begin
  perform public.create_link_shared_feedback('61000000-0000-0000-0000-000000000201',repeat('1',64),'anon body',null,false);
  raise warning 'LINK-FB-001 UNEXPECTED_ALLOW anon executed feedback RPC';
exception when insufficient_privilege then
  raise notice 'LINK-FB-001 EXPECTED_DENY anon feedback execute denied';
when others then
  raise warning 'LINK-FB-001 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000204',true);
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000201',repeat('1',64),'no profile body',null,false) as j)
select 'LINK-FB-002' as scenario_id,case when j='{"ok":false,"error":"login_required"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
do $$
declare r jsonb; fid uuid; author_id uuid; vis text;
begin
  r:=public.create_link_shared_feedback('61000000-0000-0000-0000-000000000201',repeat('1',64),'valid link feedback','understanding',true);
  fid:=(r->>'feedback_id')::uuid;
  if r->>'ok'='true' and fid is not null then raise notice 'LINK-FB-003 PASS authenticated valid token inserted feedback'; else raise warning 'LINK-FB-003 RPC_BOUNDARY_FAIL valid feedback failed'; end if;
  select author_user_profile_id,visibility_status into author_id,vis from public.feedbacks where id=fid;
  if author_id='11000000-0000-0000-0000-000000000203' then raise notice 'LINK-FB-004 PASS feedback author forced to current profile'; else raise warning 'LINK-FB-004 UNEXPECTED_ALLOW feedback author mismatch'; end if;
  if vis='internal_review' then raise notice 'LINK-FB-005 PASS new link feedback remains internal_review'; else raise warning 'LINK-FB-005 RESPONSE_EXPOSURE_FAIL feedback visibility mismatch'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
do $$
declare before_count bigint; after_count bigint; r jsonb;
begin
  select count(*) into before_count from public.feedbacks;
  r:=public.create_link_shared_feedback('61000000-0000-0000-0000-000000000201',repeat('f',64),'wrong token body',null,false);
  select count(*) into after_count from public.feedbacks;
  if r='{"ok":false,"error":"not_found"}'::jsonb and before_count=after_count then raise notice 'LINK-FB-006 EXPECTED_DENY wrong token created no feedback'; else raise warning 'LINK-FB-006 UNEXPECTED_ALLOW wrong token feedback mutation'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000206',repeat('2',64),'private body',null,false) as j)
select 'LINK-FB-007' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000204',repeat('1',64),'internal request body',null,false) as j)
select 'LINK-FB-008' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000205',repeat('1',64),'closed request body',null,false) as j)
select 'LINK-FB-009' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000203',repeat('1',64),'sensitive linked body',null,false) as j)
select 'LINK-FB-010' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000201',repeat('1',64),'   ',null,false) as j)
select 'LINK-FB-011' as scenario_id,case when j='{"ok":false,"error":"invalid_input"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000202',true);
do $$
declare r jsonb; fid uuid; author_id uuid;
begin
  r:=public.create_link_shared_feedback('61000000-0000-0000-0000-000000000202',repeat('1',64),'non-owner valid feedback',null,false);
  fid:=(r->>'feedback_id')::uuid;
  select author_user_profile_id into author_id from public.feedbacks where id=fid;
  if r->>'ok'='true' and author_id='11000000-0000-0000-0000-000000000202' then raise notice 'LINK-FB-012 PASS authenticated non-owner can submit and author is forced'; else raise warning 'LINK-FB-012 RPC_BOUNDARY_FAIL non-owner valid feedback failed'; end if;
end $$;
rollback;
