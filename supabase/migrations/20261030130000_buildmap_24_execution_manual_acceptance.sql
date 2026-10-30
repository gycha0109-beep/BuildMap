-- BuildMap EM-3C-A: authorized, immutable Builder manual-acceptance events.
-- Additive after migration 23. Do not apply to hosted production until upstream
-- Execution Map staged migration gates are approved.
begin;

create table public.execution_manual_acceptance_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  track_id uuid not null,
  roadmap_revision_id uuid not null,
  criterion_id uuid not null,
  event_type text not null check (event_type in ('accepted','revoked')),
  reason text not null check (char_length(btrim(reason)) between 12 and 2000),
  actor_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  recorded_at timestamptz not null default clock_timestamp(),
  constraint execution_manual_acceptance_criterion_fk
    foreign key (project_id, criterion_id)
    references public.completion_criteria(project_id, id) on delete restrict
);

comment on table public.execution_manual_acceptance_events is
  'Immutable explicit authorized Builder statements. Only the most recent event for a matching approved manual criterion is current; revocation invalidates acceptance. No automatic Change Card decision.';
create index execution_manual_acceptance_latest_idx
  on public.execution_manual_acceptance_events
  (project_id, criterion_id, recorded_at desc, id desc);

create function public.execution_manual_acceptance_insert_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_actor uuid;
  v_revision_status text;
  v_rule_type text;
  v_latest_event_type text;
begin
  if auth.uid() is null or not public.is_project_owner(new.project_id) then
    raise exception using errcode = '42501', message = 'manual_acceptance_owner_required';
  end if;

  -- Resolve the acting owner from the current authenticated user, never a
  -- caller-controlled actor ID. The actor, timestamp and event ID are server-owned.
  select p.owner_builder_profile_id into v_actor
  from public.projects p
  join public.builder_profiles bp on bp.id = p.owner_builder_profile_id
  join public.user_profiles up on up.id = bp.user_profile_id
  where p.id = new.project_id and up.auth_user_id = auth.uid();
  if v_actor is null then
    raise exception using errcode = '42501', message = 'manual_acceptance_actor_not_owner';
  end if;

  -- Revision rows are read under the same session and are immutable when
  -- approved. The FK also prevents a cross-project criterion spoof.
  select r.status, c.rule_type
    into v_revision_status, v_rule_type
  from public.completion_criteria c
  join public.roadmap_revisions r
    on r.id = c.roadmap_revision_id
    and r.project_id = c.project_id
    and r.track_id = c.track_id
  where c.id = new.criterion_id
    and c.project_id = new.project_id
    and c.track_id = new.track_id
    and c.roadmap_revision_id = new.roadmap_revision_id
    and c.archived_at is null;
  if v_revision_status is distinct from 'approved'
     or v_rule_type is distinct from 'MANUAL_ACCEPTANCE' then
    raise exception using errcode = '22023', message = 'approved_manual_criterion_required';
  end if;

  -- Serialize all competing statements for this criterion with a row lock.
  -- Reading the latest event after acquiring this lock makes revoke and
  -- repeated acceptance order stable even under concurrent requests.
  perform 1 from public.completion_criteria
    where id = new.criterion_id and project_id = new.project_id
    for update;
  select e.event_type into v_latest_event_type
    from public.execution_manual_acceptance_events e
    where e.project_id = new.project_id and e.criterion_id = new.criterion_id
    order by e.recorded_at desc, e.id desc limit 1;

  if new.event_type = 'accepted' and v_latest_event_type = 'accepted' then
    raise exception using errcode = '22023', message = 'manual_criterion_already_accepted';
  end if;
  if new.event_type = 'revoked' and v_latest_event_type is distinct from 'accepted' then
    raise exception using errcode = '22023', message = 'no_active_acceptance_to_revoke';
  end if;

  new.id := gen_random_uuid();
  new.actor_builder_profile_id := v_actor;
  new.recorded_at := clock_timestamp();
  return new;
end;
$$;

create function public.execution_manual_acceptance_immutable_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
begin
  raise exception 'Manual acceptance audit events are append-only.';
end;
$$;

create trigger execution_manual_acceptance_insert_guard_trigger
before insert on public.execution_manual_acceptance_events
for each row execute function public.execution_manual_acceptance_insert_guard();

create trigger execution_manual_acceptance_mutation_guard_trigger
before update or delete on public.execution_manual_acceptance_events
for each row execute function public.execution_manual_acceptance_immutable_guard();

alter table public.execution_manual_acceptance_events enable row level security;

create policy execution_manual_acceptance_owner_select
  on public.execution_manual_acceptance_events for select to authenticated
  using (public.is_project_owner(project_id));

create policy execution_manual_acceptance_owner_insert
  on public.execution_manual_acceptance_events for insert to authenticated
  with check (public.is_project_owner(project_id));

revoke all on table public.execution_manual_acceptance_events
  from public, anon, authenticated;
grant select, insert on table public.execution_manual_acceptance_events
  to authenticated;

revoke execute on function
  public.execution_manual_acceptance_insert_guard(),
  public.execution_manual_acceptance_immutable_guard()
from public, anon, authenticated;

do $$
begin
  if not has_table_privilege('authenticated','public.execution_manual_acceptance_events','SELECT')
    or not has_table_privilege('authenticated','public.execution_manual_acceptance_events','INSERT')
    or has_table_privilege('authenticated','public.execution_manual_acceptance_events','UPDATE')
    or has_table_privilege('authenticated','public.execution_manual_acceptance_events','DELETE')
    or has_table_privilege('anon','public.execution_manual_acceptance_events','SELECT')
    or has_table_privilege('anon','public.execution_manual_acceptance_events','INSERT') then
    raise exception 'EM-3C-A manual acceptance privilege matrix invalid';
  end if;
end;
$$;

commit;
