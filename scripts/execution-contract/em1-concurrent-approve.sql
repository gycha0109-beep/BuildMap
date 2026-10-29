set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';
begin;
update public.roadmap_revisions
set status='approved',
    approved_by_builder_profile_id='00000000-0000-4000-8000-000000000411'
where id='00000000-0000-4000-8000-000000000702';
select pg_sleep(3);
commit;
reset role;
