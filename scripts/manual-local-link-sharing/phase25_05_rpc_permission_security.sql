-- ============================================================================
-- LOCAL ONLY RPC PERMISSION / SECURITY DEFINER MATRIX
-- ============================================================================
\echo 'phase25_05_rpc_permission_security.sql'
reset role;

with expected(signature) as (values
 ('public.rotate_project_share_token(uuid)'),('public.revoke_project_share_token(uuid)'),
 ('public.get_link_shared_project_page(uuid,text)'),('public.get_link_shared_decision_timeline(uuid,text)'),
 ('public.get_link_shared_feedback_requests(uuid,text)'),('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
)
select 'LINK-RPC-001' as scenario_id,case when count(*) filter(where p.prosecdef)=6 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from expected e join pg_proc p on p.oid=to_regprocedure(e.signature);

with expected(signature) as (values
 ('public.rotate_project_share_token(uuid)'),('public.revoke_project_share_token(uuid)'),
 ('public.get_link_shared_project_page(uuid,text)'),('public.get_link_shared_decision_timeline(uuid,text)'),
 ('public.get_link_shared_feedback_requests(uuid,text)'),('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
)
select 'LINK-RPC-002' as scenario_id,case when count(*) filter(where array_to_string(p.proconfig,',')='search_path=pg_catalog, pg_temp')=6 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from expected e join pg_proc p on p.oid=to_regprocedure(e.signature);

with expected(signature) as (values
 ('public.hash_share_token_draft(text)'),('public.rotate_project_share_token(uuid)'),('public.revoke_project_share_token(uuid)'),
 ('public.get_link_shared_project_page(uuid,text)'),('public.get_link_shared_decision_timeline(uuid,text)'),
 ('public.get_link_shared_feedback_requests(uuid,text)'),('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
), x as (
 select e.signature from expected e join pg_proc p on p.oid=to_regprocedure(e.signature)
 cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 where a.grantee=0 and a.privilege_type='EXECUTE'
)
select 'LINK-RPC-003' as scenario_id,case when count(*)=0 then 'PASS' else 'GRANT_FAIL' end as result,count(*) as public_execute_count from x;

begin;
set local role anon;
do $$ begin perform public.hash_share_token_draft(repeat('a',64)); raise warning 'LINK-RPC-004 UNEXPECTED_ALLOW anon called hash helper'; exception when insufficient_privilege then raise notice 'LINK-RPC-004 EXPECTED_DENY anon hash helper denied'; when others then raise warning 'LINK-RPC-004 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm; end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
do $$ begin perform public.hash_share_token_draft(repeat('a',64)); raise warning 'LINK-RPC-005 UNEXPECTED_ALLOW authenticated called hash helper'; exception when insufficient_privilege then raise notice 'LINK-RPC-005 EXPECTED_DENY authenticated hash helper denied'; when others then raise warning 'LINK-RPC-005 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm; end $$;
rollback;

select 'LINK-RPC-006' as scenario_id,case when has_function_privilege('anon','public.get_link_shared_project_page(uuid,text)','EXECUTE') and has_function_privilege('authenticated','public.get_link_shared_project_page(uuid,text)','EXECUTE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'LINK-RPC-007' as scenario_id,case when not has_function_privilege('anon','public.create_link_shared_feedback(uuid,text,text,text,boolean)','EXECUTE') and has_function_privilege('authenticated','public.create_link_shared_feedback(uuid,text,text,text,boolean)','EXECUTE') and not has_function_privilege('anon','public.rotate_project_share_token(uuid)','EXECUTE') and has_function_privilege('authenticated','public.rotate_project_share_token(uuid)','EXECUTE') then 'PASS' else 'GRANT_FAIL' end as result;

with defs as (
 select array_to_string(p.proconfig, ',') as config
 from (values
 ('public.rotate_project_share_token(uuid)'),('public.revoke_project_share_token(uuid)'),
 ('public.get_link_shared_project_page(uuid,text)'),('public.get_link_shared_decision_timeline(uuid,text)'),
 ('public.get_link_shared_feedback_requests(uuid,text)'),('public.create_link_shared_feedback(uuid,text,text,text,boolean)')) v(signature)
 join pg_proc p on p.oid=to_regprocedure(v.signature)
)
select 'LINK-RPC-008' as scenario_id,case when count(*) filter(where config='search_path=pg_catalog, pg_temp')=6 and count(*) filter(where config ilike '%public%')=0 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from defs;

select 'LINK-RPC-009' as scenario_id,case when pg_get_function_arguments(to_regprocedure('public.create_link_shared_feedback(uuid,text,text,text,boolean)')) not ilike '%author%' then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

with checked as (
 select array_to_string(proconfig,',') config from pg_proc where oid in (to_regprocedure('public.current_user_profile_id()'),to_regprocedure('public.is_project_owner(uuid)'))
)
select 'LINK-RPC-010' as scenario_id,case when count(*) filter(where config='search_path=pg_catalog, pg_temp')=2 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result from checked;

select 'LINK-RPC-011' as scenario_id,case when not exists(
 select 1 from information_schema.columns where table_schema='public' and column_name='share_token' and table_name in ('projects','feedbacks','feedback_requests','project_links')
) then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result;

select 'LINK-RPC-012' as scenario_id,case when has_function_privilege('anon','public.get_link_shared_decision_timeline(uuid,text)','EXECUTE') and has_function_privilege('anon','public.get_link_shared_feedback_requests(uuid,text)','EXECUTE') then 'PASS' else 'GRANT_FAIL' end as result;
