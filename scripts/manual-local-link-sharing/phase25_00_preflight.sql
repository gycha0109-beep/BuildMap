-- ============================================================================
-- LOCAL ONLY LINK SHARING SECURE RPC TEST
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- ============================================================================
\echo 'phase25_00_preflight.sql'
reset role;

select 'LINK-PRE-001' as scenario_id,
  case when current_database() = 'postgres' then 'PASS' else 'ENV_ERROR' end as result,
  current_database() as actual_database;

with expected(signature) as (values
  ('public.hash_share_token_draft(text)'),
  ('public.rotate_project_share_token(uuid)'),
  ('public.revoke_project_share_token(uuid)'),
  ('public.get_link_shared_project_page(uuid,text)'),
  ('public.get_link_shared_decision_timeline(uuid,text)'),
  ('public.get_link_shared_feedback_requests(uuid,text)'),
  ('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
)
select 'LINK-PRE-002' as scenario_id,
  case when count(to_regprocedure(signature)) = 7 then 'PASS' else 'ENV_ERROR' end as result,
  count(to_regprocedure(signature)) as actual_count, 7 as expected_count
from expected;

with expected(signature) as (values
  ('public.rotate_project_share_token(uuid)'),
  ('public.revoke_project_share_token(uuid)'),
  ('public.get_link_shared_project_page(uuid,text)'),
  ('public.get_link_shared_decision_timeline(uuid,text)'),
  ('public.get_link_shared_feedback_requests(uuid,text)'),
  ('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
)
select 'LINK-PRE-003' as scenario_id,
  case when count(*) filter (where p.prosecdef) = 6 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result,
  count(*) filter (where p.prosecdef) as actual_count, 6 as expected_count
from expected e
join pg_proc p on p.oid = to_regprocedure(e.signature);

select 'LINK-PRE-004' as scenario_id,
  case when not p.prosecdef then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result
from pg_proc p
where p.oid = to_regprocedure('public.hash_share_token_draft(text)');

with expected(signature) as (values
  ('public.rotate_project_share_token(uuid)'),
  ('public.revoke_project_share_token(uuid)'),
  ('public.get_link_shared_project_page(uuid,text)'),
  ('public.get_link_shared_decision_timeline(uuid,text)'),
  ('public.get_link_shared_feedback_requests(uuid,text)'),
  ('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
), checked as (
  select e.signature, array_to_string(p.proconfig, ',') as config
  from expected e join pg_proc p on p.oid = to_regprocedure(e.signature)
)
select 'LINK-PRE-005' as scenario_id,
  case when count(*) filter (where config = 'search_path=pg_catalog, pg_temp') = 6 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result,
  count(*) filter (where config = 'search_path=pg_catalog, pg_temp') as actual_count, 6 as expected_count
from checked;

with expected(signature) as (values
  ('public.current_user_profile_id()'),
  ('public.is_project_owner(uuid)')
), checked as (
  select e.signature, array_to_string(p.proconfig, ',') as config
  from expected e join pg_proc p on p.oid = to_regprocedure(e.signature)
)
select 'LINK-PRE-006' as scenario_id,
  case when count(*) filter (where config = 'search_path=pg_catalog, pg_temp') = 2 then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result,
  count(*) filter (where config = 'search_path=pg_catalog, pg_temp') as actual_count, 2 as expected_count
from checked;

select 'LINK-PRE-007' as scenario_id,
  case when to_regprocedure('extensions.gen_random_bytes(integer)') is not null then 'PASS' else 'ENV_ERROR' end as result;

select 'LINK-PRE-008' as scenario_id,
  case when public.hash_share_token_draft(repeat('a',64)) = encode(extensions.digest(repeat('a',64),'sha256'),'hex') then 'PASS' else 'TOKEN_LIFECYCLE_FAIL' end as result;

select 'LINK-PRE-009' as scenario_id,
  case when public.hash_share_token_draft('invalid-token') is null then 'PASS' else 'TOKEN_LIFECYCLE_FAIL' end as result;

with expected(signature) as (values
  ('public.hash_share_token_draft(text)'),
  ('public.rotate_project_share_token(uuid)'),
  ('public.revoke_project_share_token(uuid)'),
  ('public.get_link_shared_project_page(uuid,text)'),
  ('public.get_link_shared_decision_timeline(uuid,text)'),
  ('public.get_link_shared_feedback_requests(uuid,text)'),
  ('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
), public_exec as (
  select e.signature
  from expected e
  join pg_proc p on p.oid = to_regprocedure(e.signature)
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where a.grantee = 0 and a.privilege_type = 'EXECUTE'
)
select 'LINK-PRE-010' as scenario_id,
  case when count(*) = 0 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as public_execute_count
from public_exec;

select 'LINK-PRE-011' as scenario_id,
  case when has_function_privilege('anon','public.get_link_shared_project_page(uuid,text)','EXECUTE')
         and has_function_privilege('anon','public.get_link_shared_decision_timeline(uuid,text)','EXECUTE')
         and has_function_privilege('anon','public.get_link_shared_feedback_requests(uuid,text)','EXECUTE')
       then 'PASS' else 'GRANT_FAIL' end as result;

select 'LINK-PRE-012' as scenario_id,
  case when has_function_privilege('authenticated','public.get_link_shared_project_page(uuid,text)','EXECUTE')
         and has_function_privilege('authenticated','public.get_link_shared_decision_timeline(uuid,text)','EXECUTE')
         and has_function_privilege('authenticated','public.get_link_shared_feedback_requests(uuid,text)','EXECUTE')
       then 'PASS' else 'GRANT_FAIL' end as result;

select 'LINK-PRE-013' as scenario_id,
  case when not has_function_privilege('anon','public.create_link_shared_feedback(uuid,text,text,text,boolean)','EXECUTE')
         and not has_function_privilege('anon','public.rotate_project_share_token(uuid)','EXECUTE')
         and not has_function_privilege('anon','public.revoke_project_share_token(uuid)','EXECUTE')
       then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

select 'LINK-PRE-014' as scenario_id,
  case when has_function_privilege('authenticated','public.create_link_shared_feedback(uuid,text,text,text,boolean)','EXECUTE')
         and has_function_privilege('authenticated','public.rotate_project_share_token(uuid)','EXECUTE')
         and has_function_privilege('authenticated','public.revoke_project_share_token(uuid)','EXECUTE')
       then 'PASS' else 'GRANT_FAIL' end as result;

select 'LINK-PRE-015' as scenario_id,
  case when not has_function_privilege('anon','public.hash_share_token_draft(text)','EXECUTE')
         and not has_function_privilege('authenticated','public.hash_share_token_draft(text)','EXECUTE')
       then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

select 'LINK-PRE-016' as scenario_id,
  case when not has_table_privilege('anon','public.projects','SELECT') then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

select 'LINK-PRE-017' as scenario_id,
  case when to_regclass('public.projects') is not null
         and to_regclass('public.change_cards') is not null
         and to_regclass('public.feedback_requests') is not null
         and to_regclass('public.feedbacks') is not null
       then 'PASS' else 'ENV_ERROR' end as result;

select 'LINK-PRE-018' as scenario_id,
  case when pg_get_function_arguments(to_regprocedure('public.create_link_shared_feedback(uuid,text,text,text,boolean)')) not ilike '%author%'
       then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result;
with expected(signature) as (values
  ('public.rotate_project_share_token(uuid)'),
  ('public.revoke_project_share_token(uuid)'),
  ('public.get_link_shared_project_page(uuid,text)'),
  ('public.get_link_shared_decision_timeline(uuid,text)'),
  ('public.get_link_shared_feedback_requests(uuid,text)'),
  ('public.create_link_shared_feedback(uuid,text,text,text,boolean)')
), owners as (
  select e.signature, r.rolname, r.rolcanlogin
  from expected e
  join pg_proc p on p.oid = to_regprocedure(e.signature)
  join pg_roles r on r.oid = p.proowner
)
select 'LINK-PRE-019' as scenario_id,
  case when count(*) = 6
             and count(*) filter (where rolname in ('anon','authenticated','authenticator','service_role')) = 0
       then 'PASS' else 'RPC_BOUNDARY_FAIL' end as result,
  string_agg(distinct rolname, ', ' order by rolname) as function_owners
from owners;
