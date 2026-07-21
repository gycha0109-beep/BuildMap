\set ON_ERROR_STOP on

do $phase291$
declare
  v_proc oid := to_regprocedure('public.is_feedback_author(uuid)');
  v_count integer;
  v_text text;
  v_bool boolean;
begin
  if v_proc is not null then
    raise notice 'MIG29-HARD-001 PASS';
  else
    raise notice 'MIG29-HARD-001 FAIL exact function signature missing';
  end if;

  select (
    p.prorettype = 'boolean'::regtype
    and l.lanname = 'sql'
    and p.provolatile = 's'
    and p.prosecdef
  )
  into v_bool
  from pg_proc p
  join pg_language l on l.oid = p.prolang
  where p.oid = v_proc;

  if coalesce(v_bool, false) then
    raise notice 'MIG29-HARD-002 PASS';
  else
    raise notice 'MIG29-HARD-002 FAIL return/language/volatility/security-definer contract';
  end if;

  select coalesce(p.proconfig, '{}'::text[]) @> array['search_path=pg_catalog, pg_temp']
  into v_bool
  from pg_proc p
  where p.oid = v_proc;

  if coalesce(v_bool, false) then
    raise notice 'MIG29-HARD-003 PASS';
  else
    raise notice 'MIG29-HARD-003 FAIL search_path is not pinned';
  end if;

  select p.prosrc into v_text from pg_proc p where p.oid = v_proc;
  if position('public.feedbacks' in coalesce(v_text, '')) > 0 then
    raise notice 'MIG29-HARD-004 PASS';
  else
    raise notice 'MIG29-HARD-004 FAIL public.feedbacks is not schema-qualified';
  end if;

  if position('public.current_user_profile_id()' in coalesce(v_text, '')) > 0 then
    raise notice 'MIG29-HARD-005 PASS';
  else
    raise notice 'MIG29-HARD-005 FAIL current_user_profile_id is not schema-qualified';
  end if;

  if not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = v_proc
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise notice 'MIG29-HARD-006 PASS';
  else
    raise notice 'MIG29-HARD-006 FAIL PUBLIC can execute is_feedback_author';
  end if;

  if not has_function_privilege('anon', 'public.is_feedback_author(uuid)', 'EXECUTE') then
    raise notice 'MIG29-HARD-007 PASS';
  else
    raise notice 'MIG29-HARD-007 FAIL anon can execute is_feedback_author';
  end if;

  if has_function_privilege('authenticated', 'public.is_feedback_author(uuid)', 'EXECUTE') then
    raise notice 'MIG29-HARD-008 PASS';
  else
    raise notice 'MIG29-HARD-008 FAIL authenticated cannot execute is_feedback_author';
  end if;

  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not coalesce(p.proconfig, '{}'::text[]) @> array['search_path=pg_catalog, pg_temp'];

  if v_count = 0 then
    raise notice 'MIG29-HARD-009 PASS';
  else
    raise notice 'MIG29-HARD-009 FAIL unpinned SECURITY DEFINER count %', v_count;
  end if;

  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'is_feedback_author'
    and p.pronargs = 1
    and oidvectortypes(p.proargtypes) = 'uuid';

  if v_count = 1 then
    raise notice 'MIG29-HARD-010 PASS';
  else
    raise notice 'MIG29-HARD-010 FAIL expected one uuid signature observed %', v_count;
  end if;
end
$phase291$;
