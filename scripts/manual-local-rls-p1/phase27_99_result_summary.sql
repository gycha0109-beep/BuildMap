-- ============================================================================
-- PHASE27 P1 RESULT SUMMARY - LOCAL ONLY
-- ============================================================================
\echo 'phase27_99_result_summary.sql'
reset role;

select 'P1-SUMMARY-001' as scenario_id,
  case when count(*)=5 then 'PASS' else 'FAIL' end as result,
  count(*) as phase27_project_count
from public.projects where id::text like '33000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-002' as scenario_id,
  case when count(*)=4 then 'PASS' else 'FAIL' end as result,
  count(*) as phase27_problem_count
from public.problem_definitions where id::text like '42000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-003' as scenario_id,
  case when count(*)=4 then 'PASS' else 'FAIL' end as result,
  count(*) as phase27_hypothesis_count
from public.hypotheses where id::text like '43000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-004' as scenario_id,
  case when count(*)=8 then 'PASS' else 'FAIL' end as result,
  count(*) as phase27_change_card_count
from public.change_cards where id::text like '53000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-005' as scenario_id,
  case when count(*)=9 then 'PASS' else 'FAIL' end as result,
  count(*) as phase27_feedback_request_count
from public.feedback_requests where id::text like '63000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-006' as scenario_id,
  case when count(*)=6 then 'PASS' else 'FAIL' end as result,
  count(*) as phase27_project_link_count
from public.project_links where id::text like '83000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-007' as scenario_id,
  case when count(*)=2 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as public_project_card_count
from public.public_project_cards where project_id::text like '33000000-0000-0000-0000-0000000003%';

select 'P1-SUMMARY-008' as scenario_id,
  case when count(*)=1 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as public_change_card_count
from public.public_change_cards where change_card_id::text like '53000000-0000-0000-0000-0000000003%';
