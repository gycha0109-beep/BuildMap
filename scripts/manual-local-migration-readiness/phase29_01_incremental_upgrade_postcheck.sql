\set ON_ERROR_STOP on

do $phase29$
declare
  v_count integer;
begin
  if has_column_privilege('authenticated', 'public.user_profiles', 'display_name', 'UPDATE')
     and has_column_privilege('authenticated', 'public.user_profiles', 'avatar_url', 'UPDATE')
     and not has_column_privilege('authenticated', 'public.user_profiles', 'auth_user_id', 'UPDATE')
     and not has_column_privilege('authenticated', 'public.user_profiles', 'account_status', 'UPDATE')
  then raise notice 'MIG29-INCR-001 PASS';
  else raise notice 'MIG29-INCR-001 FAIL user_profiles update allowlist'; end if;

  if has_column_privilege('authenticated', 'public.builder_profiles', 'public_display_name', 'UPDATE')
     and has_column_privilege('authenticated', 'public.builder_profiles', 'is_public', 'UPDATE')
     and not has_column_privilege('authenticated', 'public.builder_profiles', 'user_profile_id', 'UPDATE')
  then raise notice 'MIG29-INCR-002 PASS';
  else raise notice 'MIG29-INCR-002 FAIL builder_profiles update allowlist'; end if;

  if has_column_privilege('authenticated', 'public.projects', 'title', 'INSERT')
     and has_column_privilege('authenticated', 'public.projects', 'owner_builder_profile_id', 'INSERT')
     and not has_column_privilege('authenticated', 'public.projects', 'share_token_hash', 'INSERT')
  then raise notice 'MIG29-INCR-003 PASS';
  else raise notice 'MIG29-INCR-003 FAIL projects insert allowlist'; end if;

  if has_column_privilege('authenticated', 'public.projects', 'title', 'UPDATE')
     and not has_column_privilege('authenticated', 'public.projects', 'owner_builder_profile_id', 'UPDATE')
     and not has_column_privilege('authenticated', 'public.projects', 'share_token_hash', 'UPDATE')
  then raise notice 'MIG29-INCR-004 PASS';
  else raise notice 'MIG29-INCR-004 FAIL projects update allowlist'; end if;

  select count(*) into v_count
  from pg_trigger
  where not tgisinternal
    and tgname = any(array[
      'problem_definitions_prevent_identity_mutation_draft',
      'hypotheses_prevent_identity_mutation_draft',
      'feedback_requests_prevent_identity_mutation_draft',
      'project_links_prevent_identity_mutation_draft',
      'change_cards_prevent_identity_mutation_draft'
    ]);
  if v_count = 5 then raise notice 'MIG29-INCR-005 PASS';
  else raise notice 'MIG29-INCR-005 FAIL expected 5 identity triggers observed %', v_count; end if;

  if exists (select 1 from pg_trigger where tgname = 'change_cards_prevent_approved_content_mutation_draft' and not tgisinternal)
  then raise notice 'MIG29-INCR-006 PASS';
  else raise notice 'MIG29-INCR-006 FAIL approval mutation trigger missing'; end if;

  if exists (select 1 from pg_trigger where tgname = 'feedback_requests_validate_target_project_draft' and not tgisinternal)
  then raise notice 'MIG29-INCR-007 PASS';
  else raise notice 'MIG29-INCR-007 FAIL feedback target trigger missing'; end if;

  if not has_column_privilege('authenticated', 'public.projects', 'share_token_rotated_at', 'UPDATE')
     and not has_column_privilege('authenticated', 'public.projects', 'share_token_revoked_at', 'UPDATE')
  then raise notice 'MIG29-INCR-008 PASS';
  else raise notice 'MIG29-INCR-008 FAIL direct token lifecycle column update remains'; end if;
end
$phase29$;
