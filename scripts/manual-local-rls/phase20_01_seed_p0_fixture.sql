-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW style signals.
-- ============================================================================

\echo 'phase20_01_seed_p0_fixture.sql'

reset role;

-- Clean up only local P0 fixture UUIDs. This is local-only and assumes resettable local DB.
delete from public.feedbacks where id in (
  '70000000-0000-0000-0000-000000000101',
  '70000000-0000-0000-0000-000000000102',
  '70000000-0000-0000-0000-000000000201',
  '70000000-0000-0000-0000-000000000202',
  '70000000-0000-0000-0000-000000000203'
);
delete from public.feedback_requests where id in (
  '60000000-0000-0000-0000-000000000101',
  '60000000-0000-0000-0000-000000000102',
  '60000000-0000-0000-0000-000000000103'
);
delete from public.project_links where id in ('80000000-0000-0000-0000-000000000101');
delete from public.change_cards where id in (
  '50000000-0000-0000-0000-000000000101',
  '50000000-0000-0000-0000-000000000102',
  '50000000-0000-0000-0000-000000000103',
  '50000000-0000-0000-0000-000000000104',
  '50000000-0000-0000-0000-000000000105'
);
delete from public.ai_structured_drafts where id = '41000000-0000-0000-0000-000000000101';
delete from public.rough_notes where id = '40000000-0000-0000-0000-000000000101';
delete from public.hypotheses where id = '39000000-0000-0000-0000-000000000101';
delete from public.problem_definitions where id = '38000000-0000-0000-0000-000000000101';
delete from public.projects where id in (
  '30000000-0000-0000-0000-000000000101',
  '30000000-0000-0000-0000-000000000102',
  '30000000-0000-0000-0000-000000000103',
  '30000000-0000-0000-0000-000000000104'
);
delete from public.builder_profiles where id in (
  '20000000-0000-0000-0000-000000000101',
  '20000000-0000-0000-0000-000000000102',
  '20000000-0000-0000-0000-000000000104'
);
delete from public.user_profiles where id in (
  '10000000-0000-0000-0000-000000000101',
  '10000000-0000-0000-0000-000000000102',
  '10000000-0000-0000-0000-000000000103',
  '10000000-0000-0000-0000-000000000104'
);
delete from auth.users where id in (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000104'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000101','authenticated','authenticated','buildmap-owner@example.local',crypt('local-test-password', gen_salt('bf')),now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000102','authenticated','authenticated','buildmap-non-owner@example.local',crypt('local-test-password', gen_salt('bf')),now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000103','authenticated','authenticated','buildmap-feedback-author@example.local',crypt('local-test-password', gen_salt('bf')),now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
  ('00000000-0000-0000-0000-000000000104','authenticated','authenticated','buildmap-link-shared@example.local',crypt('local-test-password', gen_salt('bf')),now(),'{}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do update set updated_at = excluded.updated_at;

insert into public.user_profiles (id, auth_user_id, display_name, account_status)
values
  ('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101','P0 Owner','active'),
  ('10000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000102','P0 Non Owner','active'),
  ('10000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103','P0 Feedback Author','active'),
  ('10000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000104','P0 Link User','active')
on conflict (id) do update set display_name = excluded.display_name, updated_at = now();

insert into public.builder_profiles (id, user_profile_id, public_display_name, bio, role_tags, interest_tags, is_public)
values
  ('20000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000101','P0 Owner Builder','Local P0 owner builder','{builder}','{rls}',true),
  ('20000000-0000-0000-0000-000000000102','10000000-0000-0000-0000-000000000102','P0 Non Owner Builder','Local P0 non-owner builder','{builder}','{rls}',true),
  ('20000000-0000-0000-0000-000000000104','10000000-0000-0000-0000-000000000104','P0 Private Builder','Local P0 private builder','{builder}','{rls}',false)
on conflict (id) do update
set public_display_name = excluded.public_display_name,
    bio = excluded.bio,
    role_tags = excluded.role_tags,
    interest_tags = excluded.interest_tags,
    is_public = excluded.is_public,
    updated_at = now();

insert into public.projects (id, owner_builder_profile_id, title, one_line_description, current_need_summary, lifecycle_status, visibility_status, public_slug, share_token_hash, share_token_rotated_at)
values
  ('30000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','P0 Private Project','Private fixture','Internal only','building','private',null,null,null),
  ('30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101','P0 Public Project','Public fixture','Need public feedback','building','public','p0-public-project',null,null),
  ('30000000-0000-0000-0000-000000000103','20000000-0000-0000-0000-000000000102','P0 Other Public Project','Other owner fixture','Other need','building','public','p0-other-public-project',null,null),
  ('30000000-0000-0000-0000-000000000104','20000000-0000-0000-0000-000000000101','P0 Link Shared Project','Link fixture','Need link feedback','testing','link_shared',null,encode(extensions.digest('buildmap-local-link-token-p0','sha256'),'hex'),now())
on conflict (id) do update set title = excluded.title, updated_at = now();

insert into public.problem_definitions (id, project_id, current_text, created_by_builder_profile_id)
values ('38000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','P0 public problem definition','20000000-0000-0000-0000-000000000101')
on conflict (id) do update set current_text = excluded.current_text, updated_at = now();

insert into public.hypotheses (id, project_id, statement, status, created_by_builder_profile_id)
values ('39000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','P0 public hypothesis','validating','20000000-0000-0000-0000-000000000101')
on conflict (id) do update set statement = excluded.statement, updated_at = now();

insert into public.rough_notes (id, project_id, author_builder_profile_id, body)
values ('40000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101','P0 private rough note body')
on conflict (id) do update set body = excluded.body, updated_at = now();

insert into public.ai_structured_drafts (id, project_id, rough_note_id, requested_by_builder_profile_id, suggested_type, suggested_title, structured_summary, status)
values ('41000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','40000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','experiment','P0 AI Draft','P0 AI draft private summary','generated')
on conflict (id) do update set structured_summary = excluded.structured_summary, updated_at = now();

insert into public.change_cards (id, project_id, author_builder_profile_id, approved_by_builder_profile_id, rough_note_id, ai_draft_id, card_type, title, structured_summary, evidence, decision, change_content, next_check, work_status, visibility_status, sensitivity_status, approved_at)
values
  ('50000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','40000000-0000-0000-0000-000000000101','41000000-0000-0000-0000-000000000101','experiment','P0 Public Normal Card','P0 public normal summary','P0 evidence','P0 decision','P0 change','P0 next','approved','published','normal',now()),
  ('50000000-0000-0000-0000-000000000102','30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101',null,null,'experiment','P0 Sensitive Card','P0 sensitive summary','P0 evidence','P0 decision','P0 change','P0 next','approved','published','sensitive',now()),
  ('50000000-0000-0000-0000-000000000103','30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101',null,null,null,'experiment','P0 Draft Card','P0 draft summary',null,null,null,null,'draft','published','normal',null),
  ('50000000-0000-0000-0000-000000000104','30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101',null,null,'experiment','P0 Internal Card','P0 internal summary','P0 evidence','P0 decision','P0 change','P0 next','approved','internal','normal',now()),
  ('50000000-0000-0000-0000-000000000105','30000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101',null,null,'experiment','P0 Private Published Card','P0 private published summary','P0 evidence','P0 decision','P0 change','P0 next','approved','published','normal',now())
on conflict (id) do update set title = excluded.title, updated_at = now();

insert into public.feedback_requests (id, project_id, change_card_id, created_by_builder_profile_id, title, question, context, visibility_status, status)
values
  ('60000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102',null,'20000000-0000-0000-0000-000000000101','P0 Public Feedback Request','Can you understand this project?','Public P0 request','public','open'),
  ('60000000-0000-0000-0000-000000000102','30000000-0000-0000-0000-000000000102',null,'20000000-0000-0000-0000-000000000101','P0 Internal Feedback Request','Internal only question','Internal P0 request','internal','open'),
  ('60000000-0000-0000-0000-000000000103','30000000-0000-0000-0000-000000000102','50000000-0000-0000-0000-000000000101','20000000-0000-0000-0000-000000000101','P0 Card Feedback Request','Question for public card','Change Card level request','public','open')
on conflict (id) do update set title = excluded.title, updated_at = now();

-- ----------------------------------------------------------------------------
-- Feedback baseline fixtures must be inserted under the matching actor context.
-- The prevent_feedback_author_spoofing trigger compares author_user_profile_id
-- with current_user_profile_id(), which depends on auth.uid().
-- Invalid spoofing rows are intentionally NOT seeded here; they are tested as
-- EXPECTED_DENY in phase20_05_feedback_author_spoofing_p0.sql.
-- ----------------------------------------------------------------------------
\echo 'SEED-FB-000 setting feedback_author actor context for valid baseline feedbacks'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
select 'SEED-FB-CTX-001' as check_id,
  case
    when auth.uid()::text = '00000000-0000-0000-0000-000000000103'
     and public.current_user_profile_id()::text = '10000000-0000-0000-0000-000000000103'
    then 'PASS' else 'AUTH_CONTEXT_FAIL'
  end as result,
  auth.uid()::text as auth_uid,
  public.current_user_profile_id()::text as current_user_profile_id;

insert into public.feedbacks (id, feedback_request_id, author_user_profile_id, body, feedback_type, tester_interest, review_status, visibility_status, public_author_display_mode)
values
  ('70000000-0000-0000-0000-000000000101','60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000103','P0 public selected feedback','understanding',false,'reviewing','public_selected','anonymous'),
  ('70000000-0000-0000-0000-000000000102','60000000-0000-0000-0000-000000000101','10000000-0000-0000-0000-000000000103','P0 internal feedback','understanding',false,'new','internal_review','anonymous');
commit;
reset role;

insert into public.project_links (id, project_id, created_by_builder_profile_id, label, url, link_type, visibility_status, sort_order)
values ('80000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000102','20000000-0000-0000-0000-000000000101','P0 Demo','https://example.local/buildmap-p0','demo','public',1)
on conflict (id) do update set label = excluded.label, updated_at = now();

select 'SEED-001' as check_id,
  case when count(*) = 4 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  4 as expected_count
from auth.users where id::text like '00000000-0000-0000-0000-00000000010%';
select 'SEED-002' as check_id,
  case when count(*) = 4 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  4 as expected_count
from public.user_profiles where id::text like '10000000-0000-0000-0000-00000000010%';
select 'SEED-003' as check_id,
  case when count(*) = 3 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  3 as expected_count
from public.builder_profiles where id::text like '20000000-0000-0000-0000-00000000010%';
select 'SEED-004' as check_id,
  case when count(*) = 4 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  4 as expected_count
from public.projects where id::text like '30000000-0000-0000-0000-00000000010%';
select 'SEED-005' as check_id,
  case when count(*) = 5 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  5 as expected_count
from public.change_cards where id::text like '50000000-0000-0000-0000-00000000010%';
select 'SEED-006' as check_id,
  case when count(*) = 2 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  2 as expected_count
from public.feedbacks where id::text like '70000000-0000-0000-0000-00000000010%';
select 'SEED-007' as check_id,
  case when count(*) = 3 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  3 as expected_count
from public.feedback_requests where id::text like '60000000-0000-0000-0000-00000000010%';
select 'SEED-008' as check_id,
  case when count(*) = 1 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  1 as expected_count
from public.project_links where id::text like '80000000-0000-0000-0000-00000000010%';
select 'SEED-009' as check_id,
  case when count(*) = 1 then 'PASS' else 'SEED_FAIL' end as result,
  count(*) as actual_count,
  1 as expected_count
from public.rough_notes where id = '40000000-0000-0000-0000-000000000101';
