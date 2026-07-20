-- ============================================================================
-- BUILDMAP PHASE27 P1 RLS FULL MATRIX - LOCAL ONLY
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- ============================================================================
\echo 'phase27_00_preflight.sql'
reset role;

select 'P1-PRE-001' as scenario_id,
  case when current_database() = 'postgres' then 'PASS' else 'ENV_ERROR' end as result,
  current_database() as actual_database;

select 'P1-PRE-002' as scenario_id,
  case when count(*) = 2 then 'PASS' else 'ENV_ERROR' end as result,
  count(*) as actual_count
from pg_roles where rolname in ('anon','authenticated');

select 'P1-PRE-003' as scenario_id,
  case when count(*) = 2 then 'PASS' else 'ENV_ERROR' end as result,
  count(*) as actual_count
from pg_namespace where nspname in ('auth','extensions');

select 'P1-PRE-004' as scenario_id,
  case when count(*) = 11 then 'PASS' else 'ENV_ERROR' end as result,
  count(*) as actual_count
from information_schema.tables
where table_schema='public'
  and table_name in (
    'user_profiles','builder_profiles','projects','problem_definitions','hypotheses',
    'rough_notes','ai_structured_drafts','change_cards','feedback_requests','feedbacks','project_links'
  );

select 'P1-PRE-005' as scenario_id,
  case when count(*) = 11 then 'PASS' else 'POLICY_FAIL' end as result,
  count(*) as actual_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'user_profiles','builder_profiles','projects','problem_definitions','hypotheses',
    'rough_notes','ai_structured_drafts','change_cards','feedback_requests','feedbacks','project_links'
  ) and c.relrowsecurity;

select 'P1-PRE-006' as scenario_id,
  case when count(*) >= 41 then 'PASS' else 'POLICY_FAIL' end as result,
  count(*) as actual_count
from pg_policies where schemaname='public';

select 'P1-PRE-007' as scenario_id,
  case when count(*) = 8 then 'PASS' else 'VIEW_ACCESS_ERROR' end as result,
  count(*) as actual_count
from information_schema.views
where table_schema='public'
  and table_name in (
    'public_builder_profiles','public_project_cards','public_project_pages','public_change_cards',
    'public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links'
  );

select 'P1-PRE-008' as scenario_id,
  case when count(*) = 0 then 'PASS' else 'UNEXPECTED_ALLOW' end as result,
  count(*) as anon_source_select_grants
from (values
 ('user_profiles'),('builder_profiles'),('projects'),('problem_definitions'),('hypotheses'),
 ('rough_notes'),('ai_structured_drafts'),('change_cards'),('feedback_requests'),('feedbacks'),('project_links')
) as t(name)
where has_table_privilege('anon',format('public.%I',name),'SELECT');

select 'P1-PRE-009' as scenario_id,
  case when count(*) = 11 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as authenticated_select_grants
from (values
 ('user_profiles'),('builder_profiles'),('projects'),('problem_definitions'),('hypotheses'),
 ('rough_notes'),('ai_structured_drafts'),('change_cards'),('feedback_requests'),('feedbacks'),('project_links')
) as t(name)
where has_table_privilege('authenticated',format('public.%I',name),'SELECT');

select 'P1-PRE-010' as scenario_id,
  case when count(*) = 8 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as anon_view_select_grants
from (values
 ('public_builder_profiles'),('public_project_cards'),('public_project_pages'),('public_change_cards'),
 ('public_decision_timeline'),('public_feedback_requests'),('public_feedbacks'),('public_project_links')
) as t(name)
where has_table_privilege('anon',format('public.%I',name),'SELECT');

select 'P1-PRE-011' as scenario_id,
  case when count(*) = 3 then 'PASS' else 'TRIGGER_FAIL' end as result,
  count(*) as integrity_trigger_count
from pg_trigger tg
join pg_class c on c.oid=tg.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not tg.tgisinternal
  and tg.tgname in (
    'change_cards_prevent_approved_content_mutation_draft',
    'feedback_requests_validate_target_project_draft',
    'feedbacks_prevent_author_spoofing_draft'
  );

select 'P1-PRE-012' as scenario_id,
  case when count(*) = 8 then 'PASS' else 'ENV_ERROR' end as result,
  count(*) as helper_count
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'current_user_profile_id','is_project_owner','is_project_owner_by_builder',
  'can_read_public_project','can_read_public_change_card','is_feedback_author',
  'can_insert_feedback','can_read_feedback'
);

select 'P1-PRE-013' as scenario_id,
  case when has_function_privilege('authenticated','public.current_user_profile_id()','EXECUTE')
    then 'PASS' else 'GRANT_FAIL' end as result;

select 'P1-PRE-014' as scenario_id,
  case when has_function_privilege('authenticated','public.is_project_owner(uuid)','EXECUTE')
    then 'PASS' else 'GRANT_FAIL' end as result;

select 'P1-PRE-015' as scenario_id,
  case when not has_function_privilege('anon','public.current_user_profile_id()','EXECUTE')
    then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

select 'P1-PRE-016' as scenario_id,
  case when not has_function_privilege('anon','public.is_project_owner(uuid)','EXECUTE')
    then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

select 'P1-PRE-017' as scenario_id,
  case when count(*) = 0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as forbidden_columns
from information_schema.columns
where table_schema='public'
  and table_name in (
    'public_builder_profiles','public_project_cards','public_project_pages','public_change_cards',
    'public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links'
  )
  and column_name in (
    'auth_user_id','user_profile_id','owner_builder_profile_id','created_by_builder_profile_id',
    'author_user_profile_id','author_builder_profile_id','approved_by_builder_profile_id','share_token_hash'
  );

select 'P1-PRE-018' as scenario_id,
  case when count(*) = 8 then 'PASS' else 'VIEW_OPTION_MISMATCH' end as result,
  count(*) as security_barrier_views
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'public_builder_profiles','public_project_cards','public_project_pages','public_change_cards',
    'public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links'
  )
  and coalesce(array_to_string(c.reloptions,','),'') like '%security_barrier=true%';
