-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL signals.
-- ============================================================================

\echo 'phase20_03_rough_note_ai_draft_p0.sql'
\echo 'PATCH 22: anon source permission denied is expected; public-safe views must not expose Rough Note / AI Draft columns.'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$
declare
  v_rough integer;
  v_ai integer;
begin
  select count(*) into v_rough from public.rough_notes where id = '40000000-0000-0000-0000-000000000101';
  select count(*) into v_ai from public.ai_structured_drafts where id = '41000000-0000-0000-0000-000000000101';
  if v_rough = 1 then raise notice 'RNAI-P0-001 PASS owner can read own rough note'; else raise warning 'RNAI-P0-001 FAIL owner rough note count=%', v_rough; end if;
  if v_ai = 1 then raise notice 'RNAI-P0-005 PASS owner can read own AI draft'; else raise warning 'RNAI-P0-005 FAIL owner AI draft count=%', v_ai; end if;
exception
  when insufficient_privilege then raise warning 'RNAI-P0-001/005 GRANT_FAIL authenticated source read privilege missing: %', sqlstate;
  when others then raise warning 'RNAI-P0-001/005 FAIL owner rough note/AI draft test errored: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role anon;
do $$
begin
  perform count(*) from public.rough_notes where id = '40000000-0000-0000-0000-000000000101';
  raise warning 'RNAI-P0-002 UNEXPECTED_ALLOW anon reached rough_notes source table; source privilege should stay absent';
exception
  when insufficient_privilege then raise notice 'RNAI-P0-002 EXPECTED_DENY anon rough_notes source SELECT blocked by table privilege';
  when others then raise warning 'RNAI-P0-002 SCRIPT_ERROR anon rough_notes source SELECT produced unexpected error: % %', sqlstate, sqlerrm;
end $$;

do $$
begin
  perform count(*) from public.ai_structured_drafts where id = '41000000-0000-0000-0000-000000000101';
  raise warning 'RNAI-P0-006 UNEXPECTED_ALLOW anon reached ai_structured_drafts source table; source privilege should stay absent';
exception
  when insufficient_privilege then raise notice 'RNAI-P0-006 EXPECTED_DENY anon AI draft source SELECT blocked by table privilege';
  when others then raise warning 'RNAI-P0-006 SCRIPT_ERROR anon AI draft source SELECT produced unexpected error: % %', sqlstate, sqlerrm;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
do $$
declare
  v_rough integer;
  v_ai integer;
begin
  select count(*) into v_rough from public.rough_notes where id = '40000000-0000-0000-0000-000000000101';
  select count(*) into v_ai from public.ai_structured_drafts where id = '41000000-0000-0000-0000-000000000101';
  if v_rough = 0 then raise notice 'RNAI-P0-003 EXPECTED_DENY non-owner cannot read rough note'; else raise warning 'RNAI-P0-003 UNEXPECTED_ALLOW non-owner read rough note, count=%', v_rough; end if;
  if v_ai = 0 then raise notice 'RNAI-P0-007 EXPECTED_DENY non-owner cannot read AI draft'; else raise warning 'RNAI-P0-007 UNEXPECTED_ALLOW non-owner read AI draft, count=%', v_ai; end if;
exception
  when insufficient_privilege then raise warning 'RNAI-P0-003/007 GRANT_FAIL authenticated source read privilege missing: %', sqlstate;
  when others then raise warning 'RNAI-P0-003/007 FAIL non-owner rough note/AI draft test errored: % %', sqlstate, sqlerrm;
end $$;
rollback;

select 'RNAI-P0-008' as scenario_id,
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_project_cards','public_project_pages','public_change_cards','public_decision_timeline','public_feedbacks')
      and (column_name ilike '%rough%' or column_name ilike '%ai_draft%' or column_name ilike '%draft%')
  ) then 'VIEW_BOUNDARY_FAIL' else 'PASS' end as result,
  'public-safe views do not expose rough note / AI draft columns' as note;
