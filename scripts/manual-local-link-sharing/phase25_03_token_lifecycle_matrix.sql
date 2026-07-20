-- ============================================================================
-- LOCAL ONLY SHARE TOKEN LIFECYCLE MATRIX
-- ============================================================================
\echo 'phase25_03_token_lifecycle_matrix.sql'

begin;
set local role anon;
do $$
begin
  perform public.rotate_project_share_token('31000000-0000-0000-0000-000000000206');
  raise warning 'LINK-LIFE-001 UNEXPECTED_ALLOW anon rotated token';
exception when insufficient_privilege then
  raise notice 'LINK-LIFE-001 EXPECTED_DENY anon rotate execute denied';
when others then
  raise warning 'LINK-LIFE-001 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000202',true);
do $$
begin
  perform public.rotate_project_share_token('31000000-0000-0000-0000-000000000206');
  raise warning 'LINK-LIFE-002 UNEXPECTED_ALLOW non-owner rotated token';
exception when others then
  if sqlstate='42501' and sqlerrm='not_allowed' then
    raise notice 'LINK-LIFE-002 EXPECTED_DENY non-owner rotate denied';
  else
    raise warning 'LINK-LIFE-002 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm;
  end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
declare r jsonb; t text; h text; old_result jsonb; new_result jsonb;
begin
  r:=public.rotate_project_share_token('31000000-0000-0000-0000-000000000206');
  t:=r->>'share_token';
  select share_token_hash into h from public.projects where id='31000000-0000-0000-0000-000000000206';
  if r->>'ok'='true' and t ~ '^[0-9a-f]{64}$' then raise notice 'LINK-LIFE-003 PASS owner rotate returned valid token'; else raise warning 'LINK-LIFE-003 TOKEN_LIFECYCLE_FAIL invalid rotate response'; end if;
  if h=encode(extensions.digest(t,'sha256'),'hex') and h<>t then raise notice 'LINK-LIFE-004 PASS stored hash matches and raw token not stored'; else raise warning 'LINK-LIFE-004 TOKEN_LIFECYCLE_FAIL token storage mismatch'; end if;
  old_result:=public.get_link_shared_project_page('31000000-0000-0000-0000-000000000206',repeat('6',64));
  new_result:=public.get_link_shared_project_page('31000000-0000-0000-0000-000000000206',t);
  if old_result='{"ok":false,"error":"not_found"}'::jsonb and new_result->>'ok'='true' then raise notice 'LINK-LIFE-005 PASS old token invalid and new token valid'; else raise warning 'LINK-LIFE-005 TOKEN_LIFECYCLE_FAIL rotation invalidation failed'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000202',true);
do $$
begin
  perform public.revoke_project_share_token('31000000-0000-0000-0000-000000000206');
  raise warning 'LINK-LIFE-006 UNEXPECTED_ALLOW non-owner revoked token';
exception when others then
  if sqlstate='42501' and sqlerrm='not_allowed' then raise notice 'LINK-LIFE-006 EXPECTED_DENY non-owner revoke denied';
  else raise warning 'LINK-LIFE-006 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
declare r jsonb; page jsonb; r2 jsonb; t text;
begin
  r:=public.revoke_project_share_token('31000000-0000-0000-0000-000000000206');
  if r='{"ok":true,"revoked":true}'::jsonb and exists(select 1 from public.projects where id='31000000-0000-0000-0000-000000000206' and share_token_hash is null and share_token_revoked_at is not null) then raise notice 'LINK-LIFE-007 PASS owner revoke state valid'; else raise warning 'LINK-LIFE-007 TOKEN_LIFECYCLE_FAIL revoke state invalid'; end if;
  page:=public.get_link_shared_project_page('31000000-0000-0000-0000-000000000206',repeat('6',64));
  if page='{"ok":false,"error":"not_found"}'::jsonb then raise notice 'LINK-LIFE-008 PASS revoked token invalid'; else raise warning 'LINK-LIFE-008 UNEXPECTED_ALLOW revoked token worked'; end if;
  r2:=public.rotate_project_share_token('31000000-0000-0000-0000-000000000206'); t:=r2->>'share_token';
  if r2->>'ok'='true' and (public.get_link_shared_project_page('31000000-0000-0000-0000-000000000206',t)->>'ok')='true' then raise notice 'LINK-LIFE-009 PASS rotate after revoke reactivated new token'; else raise warning 'LINK-LIFE-009 TOKEN_LIFECYCLE_FAIL rotate after revoke failed'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
declare p jsonb;
begin
  update public.projects set visibility_status='private' where id='31000000-0000-0000-0000-000000000201';
  p:=public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('1',64));
  if p='{"ok":false,"error":"not_found"}'::jsonb then raise notice 'LINK-LIFE-010 PASS private transition invalidated token'; else raise warning 'LINK-LIFE-010 UNEXPECTED_ALLOW private transition token worked'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
declare p jsonb;
begin
  update public.projects set visibility_status='public' where id='31000000-0000-0000-0000-000000000201';
  p:=public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('1',64));
  if p='{"ok":false,"error":"not_found"}'::jsonb then raise notice 'LINK-LIFE-011 PASS public transition disabled token RPC'; else raise warning 'LINK-LIFE-011 UNEXPECTED_ALLOW public transition token RPC worked'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
declare a jsonb; b jsonb; first_revoked_at timestamptz; second_revoked_at timestamptz;
begin
  a:=public.revoke_project_share_token('31000000-0000-0000-0000-000000000206');
  select share_token_revoked_at into first_revoked_at from public.projects where id='31000000-0000-0000-0000-000000000206';
  b:=public.revoke_project_share_token('31000000-0000-0000-0000-000000000206');
  select share_token_revoked_at into second_revoked_at from public.projects where id='31000000-0000-0000-0000-000000000206';
  if a='{"ok":true,"revoked":true}'::jsonb and b=a and first_revoked_at=second_revoked_at then raise notice 'LINK-LIFE-012 PASS revoke is state-idempotent'; else raise warning 'LINK-LIFE-012 TOKEN_LIFECYCLE_FAIL repeated revoke changed response or timestamp'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
begin
  perform public.rotate_project_share_token('31000000-0000-0000-0000-000000000205');
  raise warning 'LINK-LIFE-013 UNEXPECTED_ALLOW owner rotated archived project token';
exception when others then
  if sqlstate='42501' and sqlerrm='not_allowed' then raise notice 'LINK-LIFE-013 EXPECTED_DENY archived project rotate denied';
  else raise warning 'LINK-LIFE-013 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$
begin
  perform public.revoke_project_share_token('31000000-0000-0000-0000-000000000205');
  raise warning 'LINK-LIFE-014 UNEXPECTED_ALLOW owner revoked archived project token';
exception when others then
  if sqlstate='42501' and sqlerrm='not_allowed' then raise notice 'LINK-LIFE-014 EXPECTED_DENY archived project revoke denied';
  else raise warning 'LINK-LIFE-014 SCRIPT_ERROR unexpected SQLSTATE=% message=%',sqlstate,sqlerrm; end if;
end $$;
rollback;
