-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL / TRIGGER_FAIL / SCRIPT_ERROR signals.
-- ============================================================================

\echo 'phase20_05_feedback_author_spoofing_p0.sql'
\echo 'PATCH 23.5: exact negative-control oracle for feedback author spoofing trigger.'

reset role;
delete from public.feedbacks where id in (
  '70000000-0000-0000-0000-000000000201',
  '70000000-0000-0000-0000-000000000202',
  '70000000-0000-0000-0000-000000000203'
);

begin;
set local role anon;
do $$
begin
  insert into public.feedbacks (id, feedback_request_id, author_user_profile_id, body)
  values ('70000000-0000-0000-0000-000000000201','60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000103','anon should not insert');
  raise warning 'FB-P0-001 UNEXPECTED_ALLOW anon inserted feedback';
exception
  when insufficient_privilege then
    raise notice 'FB-P0-001 EXPECTED_DENY anon feedback INSERT blocked by privilege/RLS: %', sqlstate;
  when others then
    if sqlstate = '42501' and sqlerrm ilike '%row-level security%' then
      raise notice 'FB-P0-001 EXPECTED_DENY anon feedback INSERT blocked by RLS: %', sqlstate;
    else
      raise warning 'FB-P0-001 SCRIPT_ERROR anon feedback INSERT produced unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
select 'FB-P0-002 context' as check_id, auth.uid()::text as auth_uid, public.current_user_profile_id()::text as current_user_profile_id;
do $$
begin
  insert into public.feedbacks (id, feedback_request_id, author_user_profile_id, body, feedback_type)
  values ('70000000-0000-0000-0000-000000000201','60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000103','own feedback insert should pass','understanding');
  raise notice 'FB-P0-002 PASS feedback_author inserted own feedback';
exception
  when insufficient_privilege then raise warning 'FB-P0-002 GRANT_FAIL authenticated feedback INSERT missing: %', sqlstate;
  when others then raise warning 'FB-P0-002 UNEXPECTED_DENY own feedback insert denied: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
select 'FB-P0-003 context' as check_id, auth.uid()::text as auth_uid, public.current_user_profile_id()::text as current_user_profile_id;
do $$
begin
  insert into public.feedbacks (id, feedback_request_id, author_user_profile_id, body)
  values ('70000000-0000-0000-0000-000000000202','60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000101','spoof owner author should fail');
  raise warning 'FB-P0-003 UNEXPECTED_ALLOW feedback_author spoofed owner author_user_profile_id';
exception
  when insufficient_privilege then raise warning 'FB-P0-003 GRANT_FAIL authenticated feedback INSERT missing before spoofing check: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Feedback author_user_profile_id must match the current user profile.' then
      raise notice 'FB-P0-003 EXPECTED_DENY author spoofing blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'FB-P0-003 TRIGGER_FAIL author spoofing raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
select 'FB-P0-004 context' as check_id, auth.uid()::text as auth_uid, public.current_user_profile_id()::text as current_user_profile_id;
do $$
begin
  insert into public.feedbacks (id, feedback_request_id, author_user_profile_id, body)
  values ('70000000-0000-0000-0000-000000000203','60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000103','non-owner spoof feedback author should fail');
  raise warning 'FB-P0-004 UNEXPECTED_ALLOW non-owner spoofed feedback_author author_user_profile_id';
exception
  when insufficient_privilege then raise warning 'FB-P0-004 GRANT_FAIL authenticated feedback INSERT missing before spoofing check: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Feedback author_user_profile_id must match the current user profile.' then
      raise notice 'FB-P0-004 EXPECTED_DENY non-owner author spoofing blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'FB-P0-004 TRIGGER_FAIL non-owner author spoofing raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;
rollback;

begin;
set local role anon;
do $$
declare
  v_public integer;
  v_internal integer;
begin
  select count(*) into v_public from public.public_feedbacks where feedback_id = '70000000-0000-0000-0000-000000000101';
  select count(*) into v_internal from public.public_feedbacks where feedback_id = '70000000-0000-0000-0000-000000000102';
  if v_public = 1 then raise notice 'FB-P0-005 PASS public_selected feedback visible through public_feedbacks'; else raise warning 'FB-P0-005 FAIL public_selected feedback not visible through public_feedbacks, count=%', v_public; end if;
  if v_internal = 0 then raise notice 'FB-P0-006 EXPECTED_DENY internal_review feedback absent from public_feedbacks'; else raise warning 'FB-P0-006 VIEW_BOUNDARY_FAIL internal_review feedback visible through public_feedbacks, count=%', v_internal; end if;
exception
  when insufficient_privilege then raise warning 'FB-P0-005/006 VIEW_ACCESS_ERROR public_feedbacks read blocked: %', sqlstate;
  when others then raise warning 'FB-P0-005/006 VIEW_ACCESS_ERROR public_feedbacks read failed: % %', sqlstate, sqlerrm;
end $$;
rollback;

select 'FB-P0-007' as scenario_id,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_feedbacks'
      and column_name = 'author_user_profile_id'
  ) then 'VIEW_BOUNDARY_FAIL' else 'PASS' end as result,
  'public_feedbacks does not expose author_user_profile_id' as note;
