-- ============================================================================
-- PHASE27 P1 INTEGRITY / PERMISSION MATRIX - LOCAL ONLY
-- ============================================================================
\echo 'phase27_07_integrity_permission_matrix.sql'
reset role;

select 'P1-INTEGRITY-001' as scenario_id,
  case when has_table_privilege('authenticated','public.problem_definitions','INSERT')
    and has_table_privilege('authenticated','public.problem_definitions','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'P1-INTEGRITY-002' as scenario_id,
  case when has_table_privilege('authenticated','public.hypotheses','INSERT')
    and has_table_privilege('authenticated','public.hypotheses','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'P1-INTEGRITY-003' as scenario_id,
  case when has_table_privilege('authenticated','public.feedback_requests','INSERT')
    and has_table_privilege('authenticated','public.feedback_requests','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'P1-INTEGRITY-004' as scenario_id,
  case when has_table_privilege('authenticated','public.project_links','INSERT')
    and has_table_privilege('authenticated','public.project_links','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;
select 'P1-INTEGRITY-005' as scenario_id,
  case when has_table_privilege('authenticated','public.change_cards','INSERT')
    and has_table_privilege('authenticated','public.change_cards','UPDATE') then 'PASS' else 'GRANT_FAIL' end as result;

select 'P1-INTEGRITY-006' as scenario_id,
  case when count(*)=0 then 'PASS' else 'UNEXPECTED_ALLOW' end as result,
  count(*) as anon_write_grants
from (values
 ('problem_definitions'),('hypotheses'),('feedback_requests'),('project_links'),('change_cards')
) as t(name)
where has_table_privilege('anon',format('public.%I',name),'INSERT')
   or has_table_privilege('anon',format('public.%I',name),'UPDATE');

select 'P1-INTEGRITY-007' as scenario_id,
  case when count(*)=5 then 'PASS' else 'POLICY_FAIL' end as result,
  count(*) as owner_insert_policy_count
from pg_policies
where schemaname='public' and policyname in (
 'problem_definitions_insert_owner_draft','hypotheses_insert_owner_draft',
 'feedback_requests_insert_owner_draft','project_links_insert_owner_draft','change_cards_insert_owner_draft'
);

select 'P1-INTEGRITY-008' as scenario_id,
  case when count(*)=5 then 'PASS' else 'POLICY_FAIL' end as result,
  count(*) as owner_update_policy_count
from pg_policies
where schemaname='public' and policyname in (
 'problem_definitions_update_owner_draft','hypotheses_update_owner_draft',
 'feedback_requests_update_owner_draft','project_links_update_owner_draft','change_cards_update_owner_draft'
);

select 'P1-INTEGRITY-009' as scenario_id,
  case when count(*)=0 then 'PASS' else 'UNEXPECTED_ALLOW' end as result,
  count(*) as delete_policy_count
from pg_policies
where schemaname='public' and tablename in (
 'projects','problem_definitions','hypotheses','rough_notes','ai_structured_drafts',
 'change_cards','feedback_requests','feedbacks','project_links'
) and cmd='DELETE';

select 'P1-INTEGRITY-010' as scenario_id,
  case when not has_function_privilege('anon','public.prevent_approved_change_card_content_mutation()','EXECUTE')
    then 'PASS' else 'UNEXPECTED_ALLOW' end as result;
select 'P1-INTEGRITY-011' as scenario_id,
  case when not has_function_privilege('authenticated','public.prevent_approved_change_card_content_mutation()','EXECUTE')
    then 'PASS' else 'UNEXPECTED_ALLOW' end as result;
select 'P1-INTEGRITY-012' as scenario_id,
  case when not has_function_privilege('anon','public.validate_feedback_request_target_project()','EXECUTE')
    then 'PASS' else 'UNEXPECTED_ALLOW' end as result;
select 'P1-INTEGRITY-013' as scenario_id,
  case when not has_function_privilege('authenticated','public.validate_feedback_request_target_project()','EXECUTE')
    then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

select 'P1-INTEGRITY-014' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as rough_ai_columns
from information_schema.columns
where table_schema='public'
  and table_name in (
    'public_builder_profiles','public_project_cards','public_project_pages','public_change_cards',
    'public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links'
  ) and (column_name ilike '%rough%' or column_name ilike '%ai_draft%');

select 'P1-INTEGRITY-015' as scenario_id,
  case when count(*)=0 then 'PASS' else 'VIEW_BOUNDARY_FAIL' end as result,
  count(*) as feedback_identity_columns
from information_schema.columns
where table_schema='public' and table_name='public_feedbacks'
  and column_name in ('author_user_profile_id','auth_user_id','user_profile_id');

select 'P1-INTEGRITY-016' as scenario_id,
  case when count(*)=3 then 'PASS' else 'TRIGGER_FAIL' end as result,
  count(*) as integrity_trigger_count
from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not tg.tgisinternal
  and tg.tgname in (
    'change_cards_prevent_approved_content_mutation_draft',
    'feedback_requests_validate_target_project_draft',
    'feedbacks_prevent_author_spoofing_draft'
  );



select 'P1-INTEGRITY-019' as scenario_id,
  case when count(*)=5 then 'PASS' else 'TRIGGER_FAIL' end as result,
  count(*) as identity_trigger_count
from pg_trigger tg
join pg_class c on c.oid=tg.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not tg.tgisinternal
  and tg.tgname in (
    'problem_definitions_prevent_identity_mutation_draft',
    'hypotheses_prevent_identity_mutation_draft',
    'feedback_requests_prevent_identity_mutation_draft',
    'project_links_prevent_identity_mutation_draft',
    'change_cards_prevent_identity_mutation_draft'
  );

select 'P1-INTEGRITY-020' as scenario_id,
  case when count(*)=0 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as forbidden_authenticated_update_columns
from (values
  ('user_profiles','auth_user_id'),
  ('user_profiles','account_status'),
  ('builder_profiles','user_profile_id'),
  ('projects','owner_builder_profile_id'),
  ('projects','share_token_hash'),
  ('projects','share_token_rotated_at'),
  ('projects','share_token_revoked_at')
) as candidate(table_name,column_name)
where has_column_privilege(
  'authenticated',
  format('public.%I',table_name),
  column_name,
  'UPDATE'
);

select 'P1-INTEGRITY-021' as scenario_id,
  case when count(*)=7 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as allowed_authenticated_update_columns
from (values
  ('user_profiles','display_name'),
  ('user_profiles','avatar_url'),
  ('builder_profiles','bio'),
  ('builder_profiles','is_public'),
  ('projects','title'),
  ('projects','visibility_status'),
  ('projects','archived_at')
) as allowed(table_name,column_name)
where has_column_privilege(
  'authenticated',
  format('public.%I',table_name),
  column_name,
  'UPDATE'
);

select 'P1-INTEGRITY-022' as scenario_id,
  case when count(*)=0 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as forbidden_authenticated_project_insert_columns
from (values
  ('share_token_hash'),
  ('share_token_rotated_at'),
  ('share_token_revoked_at'),
  ('created_at'),
  ('updated_at')
) as candidate(column_name)
where has_column_privilege(
  'authenticated',
  'public.projects',
  column_name,
  'INSERT'
);

select 'P1-INTEGRITY-023' as scenario_id,
  case when count(*)=3 then 'PASS' else 'GRANT_FAIL' end as result,
  count(*) as allowed_authenticated_project_insert_columns
from (values
  ('id'),
  ('owner_builder_profile_id'),
  ('title')
) as allowed(column_name)
where has_column_privilege(
  'authenticated',
  'public.projects',
  column_name,
  'INSERT'
);

select 'P1-INTEGRITY-024' as scenario_id,
  case when not has_function_privilege(
    'authenticated',
    'public.prevent_p1_record_identity_mutation()',
    'EXECUTE'
  ) then 'PASS' else 'UNEXPECTED_ALLOW' end as result;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  begin
    update public.projects
    set owner_builder_profile_id='23000000-0000-0000-0000-000000000302'
    where id='33000000-0000-0000-0000-000000000302';
    get diagnostics v=row_count;
    if v=0 then
      raise notice 'P1-INTEGRITY-017 EXPECTED_DENY direct project ownership transfer affects zero rows';
    else
      raise warning 'P1-INTEGRITY-017 UNEXPECTED_ALLOW owner directly transferred project ownership';
    end if;
  exception when insufficient_privilege then
    raise notice 'P1-INTEGRITY-017 EXPECTED_DENY direct project ownership transfer blocked';
  end;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000301',true);
do $$
declare v integer;
begin
  begin
    update public.projects
    set share_token_hash=repeat('a',64)
    where id='33000000-0000-0000-0000-000000000302';
    get diagnostics v=row_count;
    if v=0 then
      raise notice 'P1-INTEGRITY-018 EXPECTED_DENY direct share_token_hash mutation affects zero rows';
    else
      raise warning 'P1-INTEGRITY-018 UNEXPECTED_ALLOW owner directly mutated share_token_hash outside lifecycle RPC';
    end if;
  exception when insufficient_privilege then
    raise notice 'P1-INTEGRITY-018 EXPECTED_DENY direct share_token_hash mutation blocked';
  end;
end $$;
rollback;
