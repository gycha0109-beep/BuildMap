\set ON_ERROR_STOP on

do $phase292$
declare
  v_proc oid := to_regprocedure('public.is_feedback_author(uuid)');
  v_config text;
  v_source text;
  v_unpinned integer;
begin
  if v_proc is not null
     and (select prosecdef from pg_proc where oid = v_proc)
     and (select provolatile = 's' from pg_proc where oid = v_proc)
     and (select prolang = (select oid from pg_language where lanname = 'sql') from pg_proc where oid = v_proc)
     and (select prorettype = 'boolean'::regtype from pg_proc where oid = v_proc)
     and (select pronargs = 1 and oidvectortypes(proargtypes) = 'uuid' from pg_proc where oid = v_proc)
  then raise notice 'MIG29-PREUP-001 PASS';
  else raise notice 'MIG29-PREUP-001 FAIL expected pre-upgrade function contract'; end if;

  select coalesce(array_to_string(proconfig, ','), '') into v_config
  from pg_proc where oid = v_proc;
  if v_config ~ 'search_path=public,\s*auth'
  then raise notice 'MIG29-PREUP-002 PASS';
  else raise notice 'MIG29-PREUP-002 FAIL expected historical mutable search_path, observed %', v_config; end if;

  if not exists (
       select 1
       from pg_proc p
       cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
       where p.oid = v_proc
         and acl.grantee = 0
         and acl.privilege_type = 'EXECUTE'
     )
     and not has_function_privilege('anon', 'public.is_feedback_author(uuid)', 'EXECUTE')
     and has_function_privilege('authenticated', 'public.is_feedback_author(uuid)', 'EXECUTE')
  then raise notice 'MIG29-PREUP-003 PASS';
  else raise notice 'MIG29-PREUP-003 FAIL unexpected pre-upgrade ACL'; end if;

  select pg_get_functiondef(v_proc) into v_source;
  if v_source like '%public.feedbacks%'
     and v_source like '%public.current_user_profile_id()%'
  then raise notice 'MIG29-PREUP-004 PASS';
  else raise notice 'MIG29-PREUP-004 FAIL pre-upgrade source qualification drift'; end if;

  if exists (
       select 1 from supabase_migrations.schema_migrations
       where version::text = '20260720000000'
     )
     and not exists (
       select 1 from supabase_migrations.schema_migrations
       where version::text = '20260721000000'
     )
  then raise notice 'MIG29-PREUP-005 PASS';
  else raise notice 'MIG29-PREUP-005 FAIL migration history is not exact 00-09 pre-upgrade state'; end if;

  select count(*) into v_unpinned
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (
      p.proconfig is null
      or not exists (
        select 1
        from unnest(p.proconfig) config
        where config = 'search_path=pg_catalog, pg_temp'
      )
    );
  if v_unpinned >= 1
  then raise notice 'MIG29-PREUP-006 PASS';
  else raise notice 'MIG29-PREUP-006 FAIL expected at least one historical unpinned SECURITY DEFINER'; end if;
end
$phase292$;
