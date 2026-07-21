\set ON_ERROR_STOP on

do $phase29$
declare
  v_count integer;
  v_unpinned text;
begin
  if exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise notice 'MIG29-CATALOG-001 PASS';
  else
    raise notice 'MIG29-CATALOG-001 FAIL pgcrypto missing';
  end if;

  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any(array[
      'user_profiles','builder_profiles','projects','problem_definitions','hypotheses',
      'rough_notes','ai_structured_drafts','change_cards','feedback_requests','feedbacks','project_links'
    ]);
  if v_count = 11 then raise notice 'MIG29-CATALOG-002 PASS';
  else raise notice 'MIG29-CATALOG-002 FAIL expected 11 tables observed %', v_count; end if;

  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'v'
    and c.relname = any(array[
      'public_builder_profiles','public_project_cards','public_project_pages','public_change_cards',
      'public_decision_timeline','public_feedback_requests','public_feedbacks','public_project_links'
    ]);
  if v_count = 8 then raise notice 'MIG29-CATALOG-003 PASS';
  else raise notice 'MIG29-CATALOG-003 FAIL expected 8 views observed %', v_count; end if;

  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relrowsecurity
    and c.relname = any(array[
      'user_profiles','builder_profiles','projects','problem_definitions','hypotheses',
      'rough_notes','ai_structured_drafts','change_cards','feedback_requests','feedbacks','project_links'
    ]);
  if v_count = 11 then raise notice 'MIG29-CATALOG-004 PASS';
  else raise notice 'MIG29-CATALOG-004 FAIL expected 11 RLS tables observed %', v_count; end if;

  select count(*) into v_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal
    and t.tgname = any(array[
      'user_profiles_set_updated_at_draft',
      'builder_profiles_set_updated_at_draft',
      'projects_set_updated_at_draft',
      'problem_definitions_set_updated_at_draft',
      'hypotheses_set_updated_at_draft',
      'rough_notes_set_updated_at_draft',
      'ai_drafts_set_updated_at_draft',
      'change_cards_set_updated_at_draft',
      'feedback_requests_set_updated_at_draft',
      'feedbacks_set_updated_at_draft',
      'project_links_set_updated_at_draft',
      'change_cards_prevent_approved_content_mutation_draft',
      'feedback_requests_validate_target_project_draft',
      'feedbacks_prevent_author_spoofing_draft',
      'problem_definitions_prevent_identity_mutation_draft',
      'hypotheses_prevent_identity_mutation_draft',
      'feedback_requests_prevent_identity_mutation_draft',
      'project_links_prevent_identity_mutation_draft',
      'change_cards_prevent_identity_mutation_draft'
    ]);
  if v_count = 19 then raise notice 'MIG29-CATALOG-005 PASS';
  else raise notice 'MIG29-CATALOG-005 FAIL expected 19 named triggers observed %', v_count; end if;

  select count(*) into v_count
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public';
  if v_count = 41 then raise notice 'MIG29-CATALOG-006 PASS';
  else raise notice 'MIG29-CATALOG-006 FAIL expected exactly 41 policies observed %', v_count; end if;

  select string_agg(n.nspname || '.' || p.proname, ', ' order by p.proname)
  into v_unpinned
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not coalesce(p.proconfig, '{}'::text[]) @> array['search_path=pg_catalog, pg_temp'];

  if v_unpinned is null then
    raise notice 'MIG29-CATALOG-007 PASS';
  else
    raise notice 'MIG29-CATALOG-007 PROMOTION_BLOCKER unpinned SECURITY DEFINER: %', v_unpinned;
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = any(array[
      'public.rotate_project_share_token(uuid)'::regprocedure,
      'public.revoke_project_share_token(uuid)'::regprocedure,
      'public.create_link_shared_feedback(uuid,text,text,text,boolean)'::regprocedure
    ])
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  )
  then
    raise notice 'MIG29-CATALOG-008 PASS';
  else
    raise notice 'MIG29-CATALOG-008 FAIL privileged RPC executable by PUBLIC';
  end if;
end
$phase29$;
