-- ============================================================================
-- LOCAL ONLY RPC RESPONSE EXPOSURE MATRIX
-- ============================================================================
\echo 'phase25_06_response_exposure.sql'

begin;
set local role anon;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-EXPOSE-001' as scenario_id,case when j::text not like '%share_token%' and j::text not like '%owner_builder_profile_id%' and j::text not like '%auth_user_id%' and j::text not like '%user_profile_id%' then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
with r as (select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-EXPOSE-002' as scenario_id,case when j::text not like '%rough_note_id%' and j::text not like '%ai_draft_id%' and j::text not like '%author_builder_profile_id%' and j::text not like '%approved_by_builder_profile_id%' then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
with r as (select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-EXPOSE-003' as scenario_id,case when j::text not like '%created_by_builder_profile_id%' and j::text not like '%share_token%' and j::text not like '%author_user_profile_id%' then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
with r as (select public.get_link_shared_decision_timeline('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-EXPOSE-004' as scenario_id,case when jsonb_array_length(j->'change_cards')=1 and j::text not like '%secret evidence%' and j::text not like '%draft summary%' and j::text not like '%internal summary%' then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
with r as (select public.get_link_shared_feedback_requests('31000000-0000-0000-0000-000000000201',repeat('1',64)) j)
select 'LINK-EXPOSE-005' as scenario_id,case when jsonb_array_length(j->'feedback_requests')=2 and j::text not like '%must not expose%' and j::text not like '%internal request%' and j::text not like '%closed request%' then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
with r as (select public.get_link_shared_project_page('31000000-0000-0000-0000-000000000201',repeat('f',64)) j)
select 'LINK-EXPOSE-006' as scenario_id,case when (select count(*) from jsonb_object_keys(j))=2 and j ? 'ok' and j ? 'error' and j='{"ok":false,"error":"not_found"}'::jsonb then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
do $$ declare r jsonb; t text; h text; key_count integer;
begin
 r:=public.rotate_project_share_token('31000000-0000-0000-0000-000000000206'); t:=r->>'share_token'; select share_token_hash into h from public.projects where id='31000000-0000-0000-0000-000000000206';
 select count(*) into key_count from jsonb_object_keys(r);
 if key_count=2 and r ? 'ok' and r ? 'share_token' and t ~ '^[0-9a-f]{64}$' then raise notice 'LINK-EXPOSE-007 PASS rotate response has exact public keys'; else raise warning 'LINK-EXPOSE-007 RESPONSE_EXPOSURE_FAIL rotate response shape'; end if;
 if h<>t and h=encode(extensions.digest(t,'sha256'),'hex') then raise notice 'LINK-EXPOSE-008 PASS raw token absent from stored project value'; else raise warning 'LINK-EXPOSE-008 RESPONSE_EXPOSURE_FAIL raw token storage'; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000201',true);
with r as (select public.revoke_project_share_token('31000000-0000-0000-0000-000000000206') j)
select 'LINK-EXPOSE-009' as scenario_id,case when (select count(*) from jsonb_object_keys(j))=2 and j='{"ok":true,"revoked":true}'::jsonb then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','01000000-0000-0000-0000-000000000203',true);
with r as (select public.create_link_shared_feedback('61000000-0000-0000-0000-000000000201',repeat('1',64),'shape test',null,false) j)
select 'LINK-EXPOSE-010' as scenario_id,case when (select count(*) from jsonb_object_keys(j))=2 and j ? 'ok' and j ? 'feedback_id' and not (j ? 'author_user_profile_id') then 'PASS' else 'RESPONSE_EXPOSURE_FAIL' end as result from r;
rollback;
