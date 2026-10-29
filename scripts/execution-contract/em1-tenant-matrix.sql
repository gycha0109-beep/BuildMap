-- Run after em1-scenarios.sql. Adversarial tenant matrix in disposable PostgreSQL.

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000222';

insert into public.roadmap_revisions
  (id,project_id,track_id,version,title) values
  ('00000000-0000-4000-8000-000000000703',
   '00000000-0000-4000-8000-000000000522',
   '00000000-0000-4000-8000-000000000602',1,'Other private roadmap');

insert into public.execution_milestones
  (id,project_id,track_id,roadmap_revision_id,title,position,weight) values
  ('00000000-0000-4000-8000-000000000803',
   '00000000-0000-4000-8000-000000000522',
   '00000000-0000-4000-8000-000000000602',
   '00000000-0000-4000-8000-000000000703',
   'Other private milestone',0,1);

do $$
declare
  v_table text;
  v_column text;
  v_object uuid;
  v_rows bigint;
  v_denied boolean;
begin
  for v_table, v_column, v_object in
    select * from (values
      ('execution_tracks'::text, 'name'::text, '00000000-0000-4000-8000-000000000601'::uuid),
      ('roadmap_revisions', 'title', '00000000-0000-4000-8000-000000000701'::uuid),
      ('execution_milestones', 'title', '00000000-0000-4000-8000-000000000801'::uuid),
      ('completion_criteria', 'title', '00000000-0000-4000-8000-000000000901'::uuid)
    ) as cases(table_name, column_name, target_id)
  loop
    execute pg_catalog.format('select count(*) from public.%I where id = $1', v_table)
      into v_rows using v_object;
    if v_rows <> 0 then
      raise exception 'FAIL: non-owner SELECT leaked on %', v_table;
    end if;

    execute pg_catalog.format('update public.%I set %I = $1 where id = $2', v_table, v_column)
      using 'tampered', v_object;
    get diagnostics v_rows = row_count;
    if v_rows <> 0 then
      raise exception 'FAIL: non-owner UPDATE succeeded on %', v_table;
    end if;
  end loop;

  v_denied := false;
  begin
    insert into public.roadmap_revisions (project_id,track_id,version,title) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000601',3,'Forbidden revision');
  exception when others then v_denied := true;
  end;
  if not v_denied then raise exception 'FAIL: cross-project revision INSERT succeeded'; end if;

  v_denied := false;
  begin
    insert into public.execution_milestones
      (project_id,track_id,roadmap_revision_id,title,position,weight) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000601',
       '00000000-0000-4000-8000-000000000702','Forbidden milestone',10,1);
  exception when others then v_denied := true;
  end;
  if not v_denied then raise exception 'FAIL: cross-project milestone INSERT succeeded'; end if;

  v_denied := false;
  begin
    insert into public.completion_criteria
      (project_id,track_id,roadmap_revision_id,milestone_id,title,position,rule_type) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000601',
       '00000000-0000-4000-8000-000000000701',
       '00000000-0000-4000-8000-000000000801',
       'Forbidden criterion',10,'PR_MERGED');
  exception when others then v_denied := true;
  end;
  if not v_denied then raise exception 'FAIL: cross-project criterion INSERT succeeded'; end if;
end
$$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000111';

do $$
declare rejected boolean := false;
begin
  begin
    insert into public.completion_criteria
      (project_id,track_id,roadmap_revision_id,milestone_id,title,position,rule_type) values
      ('00000000-0000-4000-8000-000000000511',
       '00000000-0000-4000-8000-000000000601',
       '00000000-0000-4000-8000-000000000702',
       '00000000-0000-4000-8000-000000000803',
       'Wrong tenant criterion',10,'PR_MERGED');
  exception when foreign_key_violation or raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: cross-project criterion accepted'; end if;
end
$$;

reset role;
set role anon;

do $$
declare
  v_table text;
  v_rejected boolean;
begin
  foreach v_table in array array[
    'execution_tracks','roadmap_revisions','execution_milestones','completion_criteria'
  ] loop
    v_rejected := false;
    begin
      execute pg_catalog.format('select count(*) from public.%I', v_table);
    exception when insufficient_privilege then v_rejected := true;
    end;
    if not v_rejected then raise exception 'FAIL: anonymous SELECT allowed on %', v_table; end if;
  end loop;
end
$$;

reset role;
select 'EM1_FULL_TENANT_MATRIX_PASS' as result;
