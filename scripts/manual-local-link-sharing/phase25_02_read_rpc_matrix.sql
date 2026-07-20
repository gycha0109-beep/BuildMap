-- ============================================================================
-- LOCAL ONLY LINK SHARING READ RPC MATRIX
-- ============================================================================
\echo 'phase25_02_read_rpc_matrix.sql'

begin;
set local role anon;

with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-001' as scenario_id,
 case when j->>'ok'='true' and j->'project'->>'title'='Link Main Project' then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result
from r;

with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',null) as j)
select 'LINK-READ-003' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201','') as j)
select 'LINK-READ-004' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('f',64)) as j)
select 'LINK-READ-005' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000204',repeat('4',64)) as j)
select 'LINK-READ-006' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000202',repeat('2',64)) as j)
select 'LINK-READ-007' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000203',repeat('3',64)) as j)
select 'LINK-READ-008' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000205',repeat('5',64)) as j)
select 'LINK-READ-009' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000299',repeat('1',64)) as j)
select 'LINK-READ-010' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201','phase25-link-main') as j)
select 'LINK-READ-011' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;

with r as (select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-012' as scenario_id,
 case when j->>'ok'='true' and jsonb_array_length(j->'change_cards')=1 and j->'change_cards'->0->>'title'='Link Public Card' then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result
from r;

with r as (select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-013' as scenario_id,
 case when j::text not like '%Link Sensitive Card%' and j::text not like '%Link Draft Card%' and j::text not like '%Link Internal Card%' then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result
from r;

with r as (select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-014' as scenario_id,
 case when j->>'ok'='true' and jsonb_array_length(j->'feedback_requests')=2 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result
from r;

with r as (select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-015' as scenario_id,
 case when j::text not like '%61000000-0000-0000-0000-000000000203%'
       and j::text not like '%61000000-0000-0000-0000-000000000204%'
       and j::text not like '%61000000-0000-0000-0000-000000000205%'
      then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result
from r;

with failures as (
 select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',null) a,
        public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('f',64)) b,
        public.get_link_shared_project_page('31000000-0000-0000-0000-000000000204',repeat('4',64)) c,
        public.get_link_shared_project_page('31000000-0000-0000-0000-000000000202',repeat('2',64)) d
)
select 'LINK-READ-016' as scenario_id,case when a=b and b=c and c=d and a='{"ok":false,"error":"not_found"}'::jsonb then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from failures;

with failures as (
 select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',null) a,
        public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('f',64)) b,
        public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000204',repeat('4',64)) c
)
select 'LINK-READ-017' as scenario_id,case when a=b and b=c and a='{"ok":false,"error":"not_found"}'::jsonb then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from failures;

with failures as (
 select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',null) a,
        public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('f',64)) b,
        public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000204',repeat('4',64)) c
)
select 'LINK-READ-018' as scenario_id,case when a=b and b=c and a='{"ok":false,"error":"not_found"}'::jsonb then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from failures;

with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('6',64)) as j)
select 'LINK-READ-019' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'EXPECTED_DENY' else 'UNEXPECTED_ALLOW' end as result from r;

rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-002' as scenario_id,case when j->>'ok'='true' and j->'project'->>'title'='Link Main Project' then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from r;
with r as (select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-020' as scenario_id,case when j->>'ok'='true' and jsonb_array_length(j->'change_cards')=1 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from r;
with r as (select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('1',64)) as j)
select 'LINK-READ-021' as scenario_id,case when j->>'ok'='true' and jsonb_array_length(j->'feedback_requests')=2 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from r;
rollback;
