-- ============================================================================
-- LOCAL ONLY P0 RLS TEST SCRIPT
-- DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.
-- This script is intended for local Docker Supabase DB container only.
-- It prints PASS / EXPECTED_DENY / UNEXPECTED_ALLOW / GRANT_FAIL / TRIGGER_FAIL / NEEDS_REVIEW signals.
-- ============================================================================

\echo 'phase20_07_approved_change_card_trigger_p0.sql'
\echo 'PATCH 23.5: exact negative-control oracle for approved Change Card trigger denials.'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);

do $$
begin
  update public.change_cards set structured_summary = structured_summary || ' mutated' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-001 UNEXPECTED_ALLOW approved structured_summary mutation allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-001 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-001 EXPECTED_DENY approved structured_summary mutation blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-001 TRIGGER_FAIL structured_summary mutation raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set evidence = evidence || ' mutated' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-002 UNEXPECTED_ALLOW approved evidence mutation allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-002 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-002 EXPECTED_DENY approved evidence mutation blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-002 TRIGGER_FAIL evidence mutation raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set decision = decision || ' mutated' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-003 UNEXPECTED_ALLOW approved decision mutation allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-003 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-003 EXPECTED_DENY approved decision mutation blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-003 TRIGGER_FAIL decision mutation raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set change_content = change_content || ' mutated' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-004 UNEXPECTED_ALLOW approved change_content mutation allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-004 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-004 EXPECTED_DENY approved change_content mutation blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-004 TRIGGER_FAIL change_content mutation raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set approved_at = now() + interval '1 minute' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-005 UNEXPECTED_ALLOW approved_at mutation allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-005 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-005 EXPECTED_DENY approved_at mutation blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-005 TRIGGER_FAIL approved_at mutation raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set approved_by_builder_profile_id = '20000000-0000-0000-0000-000000000102' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-006 UNEXPECTED_ALLOW approved_by_builder_profile_id mutation allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-006 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-006 EXPECTED_DENY approved_by_builder_profile_id mutation blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-006 TRIGGER_FAIL approved_by_builder_profile_id mutation raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set work_status = 'draft' where id = '50000000-0000-0000-0000-000000000101';
  raise warning 'TRG-P0-007 UNEXPECTED_ALLOW approved work_status rollback allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-007 GRANT_FAIL authenticated change_cards UPDATE missing before trigger test: %', sqlstate;
  when others then
    if sqlstate = 'P0001' and sqlerrm = 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.' then
      raise notice 'TRG-P0-007 EXPECTED_DENY approved work_status rollback blocked by exact trigger oracle: % %', sqlstate, sqlerrm;
    else
      raise warning 'TRG-P0-007 TRIGGER_FAIL work_status rollback raised unexpected error: % %', sqlstate, sqlerrm;
    end if;
end $$;

do $$
begin
  update public.change_cards set visibility_status = 'internal' where id = '50000000-0000-0000-0000-000000000101';
  raise notice 'TRG-P0-008 PASS/RECORDED owner visibility_status change candidate allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-008 GRANT_FAIL authenticated change_cards UPDATE missing before allowed-candidate test: %', sqlstate;
  when others then raise warning 'TRG-P0-008 NEEDS_REVIEW visibility_status change blocked: % %', sqlstate, sqlerrm;
end $$;

do $$
begin
  update public.change_cards set sensitivity_status = 'sensitive' where id = '50000000-0000-0000-0000-000000000101';
  raise notice 'TRG-P0-009 PASS/RECORDED owner sensitivity_status change candidate allowed';
exception
  when insufficient_privilege then raise warning 'TRG-P0-009 GRANT_FAIL authenticated change_cards UPDATE missing before allowed-candidate test: %', sqlstate;
  when others then raise warning 'TRG-P0-009 NEEDS_REVIEW sensitivity_status change blocked: % %', sqlstate, sqlerrm;
end $$;

rollback;
