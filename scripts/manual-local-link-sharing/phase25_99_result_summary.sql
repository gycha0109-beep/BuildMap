-- ============================================================================
-- LOCAL ONLY LINK SHARING RPC RESULT SUMMARY
-- ============================================================================
\echo 'phase25_99_result_summary.sql'
reset role;

select 'LINK-SUMMARY-001' as scenario_id,case when count(*)=7 then 'PASS' else 'ENV_ERROR' end as result,count(*) actual_count from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('hash_share_token_draft','rotate_project_share_token','revoke_project_share_token','get_link_shared_project_page','get_link_shared_decision_timeline','get_link_shared_feedback_requests','create_link_shared_feedback');
select 'LINK-SUMMARY-002' as scenario_id,case when count(*)=6 then 'PASS' else 'SEED_FAIL' end as result,count(*) actual_count from public.projects where id::text like '31000000-0000-0000-0000-0000000002%';
select 'LINK-SUMMARY-003' as scenario_id,case when has_function_privilege('anon','public.get_link_shared_project_page(uuid,text)','EXECUTE') and not has_function_privilege('anon','public.rotate_project_share_token(uuid)','EXECUTE') then 'PASS' else 'GRANT_FAIL' end as result;
with x as (select array_to_string(proconfig,',') c from pg_proc where oid in (to_regprocedure('public.rotate_project_share_token(uuid)'),to_regprocedure('public.revoke_project_share_token(uuid)'),to_regprocedure('public.get_link_shared_project_page(uuid,text)'),to_regprocedure('public.get_link_shared_decision_timeline(uuid,text)'),to_regprocedure('public.get_link_shared_feedback_requests(uuid,text)'),to_regprocedure('public.create_link_shared_feedback(uuid,text,text,text,boolean)')))
select 'LINK-SUMMARY-004' as scenario_id,case when count(*) filter(where c='search_path=pg_catalog, pg_temp')=6 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from x;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-SUMMARY-005' as scenario_id,case when j->>'ok'='true' then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('f',64)) j)
select 'LINK-SUMMARY-006' as scenario_id,case when j='{"ok":false,"error":"not_found"}'::jsonb then 'PASS' else 'UNEXPECTED_ALLOW' end as result from r;
with r as (select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-SUMMARY-007' as scenario_id,case when jsonb_array_length(j->'change_cards')=1 then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
with r as (select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-SUMMARY-008' as scenario_id,case when jsonb_array_length(j->'feedback_requests')=2 then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
select 'LINK-SUMMARY-009' as scenario_id,case when not exists(select 1 from information_schema.columns where table_schema='public' and column_name='share_token') then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result;
