-- ============================================================================
-- LOCAL ONLY LINK SHARING SECURE RPC FIXTURE
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- Fixed tokens are local-test secrets only and must never be reused outside this fixture.
-- ============================================================================
\echo 'phase25_01_seed_link_fixture.sql'
reset role;

-- Cleanup local Phase25 fixtures only.
delete from public.feedbacks where id::text like '71000000-0000-0000-0000-0000000002%';
delete from public.feedback_requests where id::text like '61000000-0000-0000-0000-0000000002%';
delete from public.change_cards where id::text like '51000000-0000-0000-0000-0000000002%';
delete from public.projects where id::text like '31000000-0000-0000-0000-0000000002%';
delete from public.builder_profiles where id::text like '21000000-0000-0000-0000-0000000002%';
delete from public.user_profiles where id::text like '11000000-0000-0000-0000-0000000002%';
delete from auth.users where id::text like '01000000-0000-0000-0000-0000000002%';

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
 ('01000000-0000-0000-0000-000000000201','authenticated','authenticated','link-owner@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('01000000-0000-0000-0000-000000000202','authenticated','authenticated','link-non-owner@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('01000000-0000-0000-0000-000000000203','authenticated','authenticated','link-feedback-user@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('01000000-0000-0000-0000-000000000204','authenticated','authenticated','link-no-profile@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now())
on conflict (id) do update set updated_at=excluded.updated_at;

insert into public.user_profiles(id,auth_user_id,display_name,account_status) values
 ('11000000-0000-0000-0000-000000000201','01000000-0000-0000-0000-000000000201','Link Owner','active'),
 ('11000000-0000-0000-0000-000000000202','01000000-0000-0000-0000-000000000202','Link Non Owner','active'),
 ('11000000-0000-0000-0000-000000000203','01000000-0000-0000-0000-000000000203','Link Feedback User','active')
on conflict (id) do update set display_name=excluded.display_name,updated_at=now();

insert into public.builder_profiles(id,user_profile_id,public_display_name,bio,role_tags,interest_tags,is_public) values
 ('21000000-0000-0000-0000-000000000201','11000000-0000-0000-0000-000000000201','Link Owner Builder','Phase25 owner','{builder}','{security}',true),
 ('21000000-0000-0000-0000-000000000202','11000000-0000-0000-0000-000000000202','Link Non Owner Builder','Phase25 non-owner','{builder}','{security}',true)
on conflict (id) do update set public_display_name=excluded.public_display_name,updated_at=now();

insert into public.projects(
 id,owner_builder_profile_id,title,one_line_description,current_need_summary,lifecycle_status,
 visibility_status,public_slug,share_token_hash,share_token_rotated_at,share_token_revoked_at,archived_at
) values
 ('31000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','Link Main Project','Main link fixture','Need link review','testing','link_shared','phase25-link-main',public.hash_share_token_draft(repeat('1',64)),now(),null,null),
 ('31000000-0000-0000-0000-000000000202','21000000-0000-0000-0000-000000000201','Link Private Project','Private fixture','Private','testing','private','phase25-private',public.hash_share_token_draft(repeat('2',64)),now(),null,null),
 ('31000000-0000-0000-0000-000000000203','21000000-0000-0000-0000-000000000201','Link Public Project','Public fixture','Public','testing','public','phase25-public',public.hash_share_token_draft(repeat('3',64)),now(),null,null),
 ('31000000-0000-0000-0000-000000000204','21000000-0000-0000-0000-000000000201','Link Revoked Project','Revoked fixture','Revoked','testing','link_shared','phase25-revoked',public.hash_share_token_draft(repeat('4',64)),now(),now(),null),
 ('31000000-0000-0000-0000-000000000205','21000000-0000-0000-0000-000000000201','Link Archived Project','Archived fixture','Archived','testing','link_shared','phase25-archived',public.hash_share_token_draft(repeat('5',64)),now(),null,now()),
 ('31000000-0000-0000-0000-000000000206','21000000-0000-0000-0000-000000000201','Link Lifecycle Project','Lifecycle fixture','Lifecycle','testing','link_shared','phase25-lifecycle',public.hash_share_token_draft(repeat('6',64)),now(),null,null)
on conflict (id) do update set
 title=excluded.title,visibility_status=excluded.visibility_status,public_slug=excluded.public_slug,
 share_token_hash=excluded.share_token_hash,share_token_rotated_at=excluded.share_token_rotated_at,
 share_token_revoked_at=excluded.share_token_revoked_at,archived_at=excluded.archived_at,updated_at=now();

insert into public.change_cards(
 id,project_id,author_builder_profile_id,approved_by_builder_profile_id,card_type,title,
 structured_summary,evidence,decision,change_content,next_check,work_status,visibility_status,sensitivity_status,approved_at
) values
 ('51000000-0000-0000-0000-000000000201','31000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','experiment','Link Public Card','public summary','public evidence','public decision','public change','public next','approved','published','normal',now()),
 ('51000000-0000-0000-0000-000000000202','31000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','experiment','Link Sensitive Card','sensitive summary','secret evidence','secret decision','secret change','secret next','approved','published','sensitive',now()),
 ('51000000-0000-0000-0000-000000000203','31000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201',null,'experiment','Link Draft Card','draft summary',null,null,null,null,'draft','published','normal',null),
 ('51000000-0000-0000-0000-000000000204','31000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','experiment','Link Internal Card','internal summary','internal evidence','internal decision','internal change','internal next','approved','internal','normal',now())
on conflict (id) do update set title=excluded.title,work_status=excluded.work_status,visibility_status=excluded.visibility_status,sensitivity_status=excluded.sensitivity_status,updated_at=now();

insert into public.feedback_requests(
 id,project_id,change_card_id,created_by_builder_profile_id,title,question,context,visibility_status,status
) values
 ('61000000-0000-0000-0000-000000000201','31000000-0000-0000-0000-000000000201',null,'21000000-0000-0000-0000-000000000201','Link Project Request','Project feedback?','project-level public request','public','open'),
 ('61000000-0000-0000-0000-000000000202','31000000-0000-0000-0000-000000000201','51000000-0000-0000-0000-000000000201','21000000-0000-0000-0000-000000000201','Link Public Card Request','Card feedback?','public card request','public','open'),
 ('61000000-0000-0000-0000-000000000203','31000000-0000-0000-0000-000000000201','51000000-0000-0000-0000-000000000202','21000000-0000-0000-0000-000000000201','Link Sensitive Card Request','Sensitive feedback?','must not expose','public','open'),
 ('61000000-0000-0000-0000-000000000204','31000000-0000-0000-0000-000000000201',null,'21000000-0000-0000-0000-000000000201','Link Internal Request','Internal?','internal request','internal','open'),
 ('61000000-0000-0000-0000-000000000205','31000000-0000-0000-0000-000000000201',null,'21000000-0000-0000-0000-000000000201','Link Closed Request','Closed?','closed request','public','closed'),
 ('61000000-0000-0000-0000-000000000206','31000000-0000-0000-0000-000000000202',null,'21000000-0000-0000-0000-000000000201','Private Project Request','Private?','must not allow','public','open')
on conflict (id) do update set title=excluded.title,visibility_status=excluded.visibility_status,status=excluded.status,updated_at=now();

select 'LINK-SEED-001' as scenario_id,case when count(*)=4 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from auth.users where id::text like '01000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-002' as scenario_id,case when count(*)=3 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.user_profiles where id::text like '11000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-003' as scenario_id,case when count(*)=2 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.builder_profiles where id::text like '21000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-004' as scenario_id,case when count(*)=6 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.projects where id::text like '31000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-005' as scenario_id,case when count(*)=4 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.change_cards where id::text like '51000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-006' as scenario_id,case when count(*)=6 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.feedback_requests where id::text like '61000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-007' as scenario_id,case when count(*)=0 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.feedbacks where id::text like '71000000-0000-0000-0000-0000000002%';
select 'LINK-SEED-008' as scenario_id,case when count(*)=6 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.projects where id::text like '31000000-0000-0000-0000-0000000002%' and share_token_hash is not null;
select 'LINK-SEED-009' as scenario_id,case when share_token_revoked_at is not null then 'PASS' else 'SEED_FAIL' end as result from public.projects where id='31000000-0000-0000-0000-000000000204';
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
select 'LINK-SEED-010' as scenario_id,case when public.current_user_profile_id()='11000000-0000-0000-0000-000000000203' then 'PASS' else 'AUTH_CONTEXT_FAIL' end as result;
rollback;
