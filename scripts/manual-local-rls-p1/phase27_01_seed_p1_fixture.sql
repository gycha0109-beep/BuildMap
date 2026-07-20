-- ============================================================================
-- BUILDMAP PHASE27 P1 RLS FIXTURE - LOCAL ONLY
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- ============================================================================
\echo 'phase27_01_seed_p1_fixture.sql'
reset role;

-- Cleanup Phase27 fixtures in dependency order.
delete from public.feedbacks where id::text like '73000000-0000-0000-0000-0000000003%';
delete from public.feedback_requests where id::text like '63000000-0000-0000-0000-0000000003%';
delete from public.project_links where id::text like '83000000-0000-0000-0000-0000000003%';
delete from public.change_cards where id::text like '53000000-0000-0000-0000-0000000003%';
delete from public.hypotheses where id::text like '43000000-0000-0000-0000-0000000003%';
delete from public.problem_definitions where id::text like '42000000-0000-0000-0000-0000000003%';
delete from public.projects where id::text like '33000000-0000-0000-0000-0000000003%';
delete from public.builder_profiles where id::text like '23000000-0000-0000-0000-0000000003%';
delete from public.user_profiles where id::text like '13000000-0000-0000-0000-0000000003%';
delete from auth.users where id::text like '03000000-0000-0000-0000-0000000003%';

insert into auth.users(
 id,aud,role,email,encrypted_password,email_confirmed_at,
 raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
 ('03000000-0000-0000-0000-000000000301','authenticated','authenticated','p1-owner-a@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('03000000-0000-0000-0000-000000000302','authenticated','authenticated','p1-owner-b@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('03000000-0000-0000-0000-000000000303','authenticated','authenticated','p1-scout@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('03000000-0000-0000-0000-000000000304','authenticated','authenticated','p1-no-profile@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now()),
 ('03000000-0000-0000-0000-000000000305','authenticated','authenticated','p1-unbound-profile@example.local',crypt('local-test-password',gen_salt('bf')),now(),'{}','{}',now(),now())
on conflict (id) do update set updated_at=excluded.updated_at;

insert into public.user_profiles(id,auth_user_id,display_name,account_status) values
 ('13000000-0000-0000-0000-000000000301','03000000-0000-0000-0000-000000000301','P1 Owner A','active'),
 ('13000000-0000-0000-0000-000000000302','03000000-0000-0000-0000-000000000302','P1 Owner B','active'),
 ('13000000-0000-0000-0000-000000000303','03000000-0000-0000-0000-000000000303','P1 Scout','active'),
 ('13000000-0000-0000-0000-000000000305','03000000-0000-0000-0000-000000000305','P1 Unbound Profile','active')
on conflict (id) do update set display_name=excluded.display_name,account_status=excluded.account_status,updated_at=now();

insert into public.builder_profiles(
 id,user_profile_id,public_display_name,bio,role_tags,interest_tags,is_public
) values
 ('23000000-0000-0000-0000-000000000301','13000000-0000-0000-0000-000000000301','P1 Owner A Builder','public owner A','{builder}','{security}',true),
 ('23000000-0000-0000-0000-000000000302','13000000-0000-0000-0000-000000000302','P1 Owner B Builder','public owner B','{builder}','{security}',true),
 ('23000000-0000-0000-0000-000000000303','13000000-0000-0000-0000-000000000303','P1 Private Scout Builder','private scout','{scout}','{feedback}',false)
on conflict (id) do update set public_display_name=excluded.public_display_name,bio=excluded.bio,is_public=excluded.is_public,updated_at=now();

insert into public.projects(
 id,owner_builder_profile_id,title,one_line_description,current_need_summary,lifecycle_status,
 visibility_status,public_slug,archived_at
) values
 ('33000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','P1 A Private','owner A private','private need','building','private',null,null),
 ('33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','P1 A Public','owner A public','public need','testing','public','p1-a-public',null),
 ('33000000-0000-0000-0000-000000000303','23000000-0000-0000-0000-000000000302','P1 B Public','owner B public','other public need','testing','public','p1-b-public',null),
 ('33000000-0000-0000-0000-000000000304','23000000-0000-0000-0000-000000000301','P1 A Archived','archived public','archived','paused','public','p1-a-archived',now()),
 ('33000000-0000-0000-0000-000000000305','23000000-0000-0000-0000-000000000301','P1 A Link Shared','link shared','link only','testing','link_shared',null,null)
on conflict (id) do update set title=excluded.title,visibility_status=excluded.visibility_status,public_slug=excluded.public_slug,archived_at=excluded.archived_at,updated_at=now();

insert into public.problem_definitions(id,project_id,current_text,created_by_builder_profile_id,archived_at) values
 ('42000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000301','P1 private problem','23000000-0000-0000-0000-000000000301',null),
 ('42000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000302','P1 public problem','23000000-0000-0000-0000-000000000301',null),
 ('42000000-0000-0000-0000-000000000303','33000000-0000-0000-0000-000000000303','P1 other public problem','23000000-0000-0000-0000-000000000302',null),
 ('42000000-0000-0000-0000-000000000304','33000000-0000-0000-0000-000000000302','P1 archived problem','23000000-0000-0000-0000-000000000301',now())
on conflict (id) do update set current_text=excluded.current_text,archived_at=excluded.archived_at,updated_at=now();

insert into public.hypotheses(id,project_id,statement,status,created_by_builder_profile_id,archived_at) values
 ('43000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000301','P1 private hypothesis','assumed','23000000-0000-0000-0000-000000000301',null),
 ('43000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000302','P1 public hypothesis','validating','23000000-0000-0000-0000-000000000301',null),
 ('43000000-0000-0000-0000-000000000303','33000000-0000-0000-0000-000000000303','P1 other public hypothesis','validating','23000000-0000-0000-0000-000000000302',null),
 ('43000000-0000-0000-0000-000000000304','33000000-0000-0000-0000-000000000302','P1 archived hypothesis','held','23000000-0000-0000-0000-000000000301',now())
on conflict (id) do update set statement=excluded.statement,status=excluded.status,archived_at=excluded.archived_at,updated_at=now();

insert into public.change_cards(
 id,project_id,author_builder_profile_id,approved_by_builder_profile_id,card_type,title,
 structured_summary,evidence,decision,change_content,next_check,work_status,visibility_status,
 sensitivity_status,importance,approved_at,archived_at
) values
 ('53000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301',null,'experiment','P1 Draft Card','draft summary',null,null,null,null,'draft','internal','normal','normal',null,null),
 ('53000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','experiment','P1 Public Card','public summary','public evidence','public decision','public change','public next','approved','published','normal','major_turning_point',now(),null),
 ('53000000-0000-0000-0000-000000000303','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','experiment','P1 Internal Approved','internal summary','internal evidence','internal decision','internal change','internal next','approved','internal','normal','normal',now(),null),
 ('53000000-0000-0000-0000-000000000304','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','experiment','P1 Sensitive Approved','sensitive summary','secret evidence','secret decision','secret change','secret next','approved','published','sensitive','normal',now(),null),
 ('53000000-0000-0000-0000-000000000305','33000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','experiment','P1 Private Published','private summary','private evidence','private decision','private change','private next','approved','published','normal','normal',now(),null),
 ('53000000-0000-0000-0000-000000000306','33000000-0000-0000-0000-000000000303','23000000-0000-0000-0000-000000000302',null,'experiment','P1 Other Draft','other draft',null,null,null,null,'draft','internal','normal','normal',null,null),
 ('53000000-0000-0000-0000-000000000307','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','experiment','P1 Publishable Approved','publishable summary','publishable evidence','publishable decision','publishable change','publishable next','approved','publishable','normal','normal',now(),null),
 ('53000000-0000-0000-0000-000000000308','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','experiment','P1 Archived Approved','archived summary','archived evidence','archived decision','archived change','archived next','approved','published','normal','normal',now(),now())
on conflict (id) do update set title=excluded.title,work_status=excluded.work_status,visibility_status=excluded.visibility_status,sensitivity_status=excluded.sensitivity_status,archived_at=excluded.archived_at,updated_at=now();

insert into public.feedback_requests(
 id,project_id,change_card_id,created_by_builder_profile_id,title,question,context,visibility_status,status,archived_at
) values
 ('63000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000302',null,'23000000-0000-0000-0000-000000000301','P1 Public Project Request','project feedback?','public project request','public','open',null),
 ('63000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000302',null,'23000000-0000-0000-0000-000000000301','P1 Internal Request','internal feedback?','internal request','internal','open',null),
 ('63000000-0000-0000-0000-000000000303','33000000-0000-0000-0000-000000000302',null,'23000000-0000-0000-0000-000000000301','P1 Closed Request','closed feedback?','closed request','public','closed',null),
 ('63000000-0000-0000-0000-000000000304','33000000-0000-0000-0000-000000000301',null,'23000000-0000-0000-0000-000000000301','P1 Private Project Request','private?','private project request','public','open',null),
 ('63000000-0000-0000-0000-000000000305','33000000-0000-0000-0000-000000000302','53000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','P1 Safe Card Request','safe card?','safe linked request','public','open',null),
 ('63000000-0000-0000-0000-000000000306','33000000-0000-0000-0000-000000000302','53000000-0000-0000-0000-000000000304','23000000-0000-0000-0000-000000000301','P1 Sensitive Card Request','sensitive?','blocked linked request','public','open',null),
 ('63000000-0000-0000-0000-000000000307','33000000-0000-0000-0000-000000000302','53000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','P1 Draft Card Request','draft?','blocked draft request','public','open',null),
 ('63000000-0000-0000-0000-000000000308','33000000-0000-0000-0000-000000000302',null,'23000000-0000-0000-0000-000000000301','P1 Archived Request','archived?','archived request','public','open',now()),
 ('63000000-0000-0000-0000-000000000309','33000000-0000-0000-0000-000000000303',null,'23000000-0000-0000-0000-000000000302','P1 Other Public Request','other project?','owner B request','public','open',null)
on conflict (id) do update set title=excluded.title,visibility_status=excluded.visibility_status,status=excluded.status,archived_at=excluded.archived_at,updated_at=now();

-- Feedback trigger requires matching actor context.
begin;
-- Keep postgres role to bypass RLS only for adversarial fixture rows while preserving the author trigger context.
select set_config('request.jwt.claim.sub','03000000-0000-0000-0000-000000000303',true);
insert into public.feedbacks(
 id,feedback_request_id,author_user_profile_id,body,feedback_type,tester_interest,
 review_status,visibility_status,public_author_display_mode
) values
 ('73000000-0000-0000-0000-000000000301','63000000-0000-0000-0000-000000000301','13000000-0000-0000-0000-000000000303','P1 public selected project feedback','understanding',false,'reviewing','public_selected','anonymous'),
 ('73000000-0000-0000-0000-000000000302','63000000-0000-0000-0000-000000000301','13000000-0000-0000-0000-000000000303','P1 internal review feedback','understanding',false,'new','internal_review','anonymous'),
 ('73000000-0000-0000-0000-000000000303','63000000-0000-0000-0000-000000000302','13000000-0000-0000-0000-000000000303','P1 selected on internal request','understanding',false,'reviewing','public_selected','anonymous'),
 ('73000000-0000-0000-0000-000000000304','63000000-0000-0000-0000-000000000305','13000000-0000-0000-0000-000000000303','P1 selected safe card feedback','understanding',true,'reviewing','public_selected','context_role'),
 ('73000000-0000-0000-0000-000000000305','63000000-0000-0000-0000-000000000306','13000000-0000-0000-0000-000000000303','P1 selected sensitive card feedback','understanding',false,'reviewing','public_selected','anonymous')
on conflict (id) do update set body=excluded.body,visibility_status=excluded.visibility_status,updated_at=now();
commit;
reset role;

insert into public.project_links(
 id,project_id,created_by_builder_profile_id,label,url,link_type,visibility_status,sort_order,archived_at
) values
 ('83000000-0000-0000-0000-000000000301','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','P1 Public Demo','https://example.local/p1-demo','demo','public',1,null),
 ('83000000-0000-0000-0000-000000000302','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','P1 Internal Docs','https://example.local/p1-internal','docs','internal',2,null),
 ('83000000-0000-0000-0000-000000000303','33000000-0000-0000-0000-000000000301','23000000-0000-0000-0000-000000000301','P1 Private Public-marked','https://example.local/p1-private','demo','public',1,null),
 ('83000000-0000-0000-0000-000000000304','33000000-0000-0000-0000-000000000302','23000000-0000-0000-0000-000000000301','P1 Archived Link','https://example.local/p1-archived-link','other','public',3,now()),
 ('83000000-0000-0000-0000-000000000305','33000000-0000-0000-0000-000000000303','23000000-0000-0000-0000-000000000302','P1 Other Public','https://example.local/p1-other','github','public',1,null),
 ('83000000-0000-0000-0000-000000000306','33000000-0000-0000-0000-000000000304','23000000-0000-0000-0000-000000000301','P1 Archived Project Link','https://example.local/p1-archived-project','other','public',1,null)
on conflict (id) do update set label=excluded.label,visibility_status=excluded.visibility_status,archived_at=excluded.archived_at,updated_at=now();

select 'P1-SEED-001' as scenario_id,case when count(*)=5 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from auth.users where id::text like '03000000-0000-0000-0000-0000000003%';
select 'P1-SEED-002' as scenario_id,case when count(*)=4 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.user_profiles where id::text like '13000000-0000-0000-0000-0000000003%';
select 'P1-SEED-003' as scenario_id,case when count(*)=3 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.builder_profiles where id::text like '23000000-0000-0000-0000-0000000003%';
select 'P1-SEED-004' as scenario_id,case when count(*)=5 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.projects where id::text like '33000000-0000-0000-0000-0000000003%';
select 'P1-SEED-005' as scenario_id,case when count(*)=4 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.problem_definitions where id::text like '42000000-0000-0000-0000-0000000003%';
select 'P1-SEED-006' as scenario_id,case when count(*)=4 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.hypotheses where id::text like '43000000-0000-0000-0000-0000000003%';
select 'P1-SEED-007' as scenario_id,case when count(*)=8 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.change_cards where id::text like '53000000-0000-0000-0000-0000000003%';
select 'P1-SEED-008' as scenario_id,case when count(*)=9 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.feedback_requests where id::text like '63000000-0000-0000-0000-0000000003%';
select 'P1-SEED-009' as scenario_id,case when count(*)=5 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.feedbacks where id::text like '73000000-0000-0000-0000-0000000003%';
select 'P1-SEED-010' as scenario_id,case when count(*)=6 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.project_links where id::text like '83000000-0000-0000-0000-0000000003%';
select 'P1-SEED-011' as scenario_id,case when count(*)=1 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.projects where id='33000000-0000-0000-0000-000000000304' and archived_at is not null;
select 'P1-SEED-012' as scenario_id,case when count(*)=1 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.problem_definitions where id='42000000-0000-0000-0000-000000000304' and archived_at is not null;
select 'P1-SEED-013' as scenario_id,case when count(*)=1 then 'PASS' else 'SEED_FAIL' end as result,count(*) as actual_count from public.hypotheses where id='43000000-0000-0000-0000-000000000304' and archived_at is not null;
select 'P1-SEED-014' as scenario_id,case when count(*)=5 then 'PASS' else 'AUTH_CONTEXT_FAIL' end as result,count(*) as actual_count from public.feedbacks where author_user_profile_id='13000000-0000-0000-0000-000000000303';
