-- BuildMap EM-1A: Execution Map roadmap/revision foundation.
-- Additive migration after immutable migrations 00-21.
-- No GitHub evidence ingestion, calculation authority, Change Card mutation or provider credentials.
-- IMPORTANT: require isolated Postgres/RLS scenario verification before merge/auto-deploy.

begin;

create table public.execution_tracks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 1000),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, id)
);

create unique index execution_tracks_active_project_name_idx
  on public.execution_tracks(project_id, lower(btrim(name)))
  where archived_at is null;

comment on table public.execution_tracks is
  'Private project-owned technical execution tracks. Independent from official BuildMap Decisions.';

create table public.roadmap_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  track_id uuid not null,
  version integer not null check (version > 0),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  change_reason text check (change_reason is null or char_length(change_reason) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  approved_by_builder_profile_id uuid references public.builder_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmap_revisions_track_fk
    foreign key (project_id, track_id)
    references public.execution_tracks(project_id, id) on delete restrict,
  constraint roadmap_revisions_track_version_unique unique (track_id, version),
  constraint roadmap_revisions_project_track_id_unique unique (project_id, track_id, id),
  constraint roadmap_revisions_approval_pair_check
    check ((status = 'draft' and approved_at is null and approved_by_builder_profile_id is null)
      or (status = 'approved' and approved_at is not null and approved_by_builder_profile_id is not null))
);

create unique index roadmap_revisions_one_draft_per_track_idx
  on public.roadmap_revisions(track_id)
  where status = 'draft';

comment on table public.roadmap_revisions is
  'Explicitly approved revision of a technical roadmap. Approved definitions and denominator are immutable.';

create table public.execution_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  track_id uuid not null,
  roadmap_revision_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  position integer not null check (position >= 0),
  weight numeric(12,4) not null check (weight > 0 and weight <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint execution_milestones_revision_fk
    foreign key (project_id, track_id, roadmap_revision_id)
    references public.roadmap_revisions(project_id, track_id, id) on delete restrict,
  constraint execution_milestones_project_track_revision_id_unique
    unique (project_id, track_id, roadmap_revision_id, id),
  constraint execution_milestones_revision_position_unique
    unique (roadmap_revision_id, position)
);

comment on column public.execution_milestones.weight is
  'Explicit positive milestone weight. Progress denominator uses all milestones in a selected approved revision.';

create table public.completion_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  track_id uuid not null,
  roadmap_revision_id uuid not null,
  milestone_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  position integer not null check (position >= 0),
  rule_type text not null
    check (rule_type in ('PR_MERGED', 'CHECK_PASSED', 'ARTIFACT_EXISTS', 'DEPLOY_VERIFIED', 'MANUAL_ACCEPTANCE')),
  rule_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(rule_config) = 'object'),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completion_criteria_milestone_fk
    foreign key (project_id, track_id, roadmap_revision_id, milestone_id)
    references public.execution_milestones(project_id, track_id, roadmap_revision_id, id) on delete restrict,
  constraint completion_criteria_milestone_position_unique
    unique (milestone_id, position)
);

comment on table public.completion_criteria is
  'Private declared acceptance conditions; no automatic evaluation or decision promotion in EM-1A.';

-- Published scope cannot be modified by editing a previously approved revision.
-- Child locks serialize against a concurrent approval transition.
create function public.execution_guard_revision()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
declare
  v_milestone_count integer;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft'
      or new.approved_at is not null
      or new.approved_by_builder_profile_id is not null then
      raise exception 'Roadmap revisions must be created as drafts.';
    end if;
    return new;
  end if;

  if old.status = 'approved' then
    raise exception 'Approved roadmap revisions are immutable. Create a new revision.';
  end if;

  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.track_id is distinct from old.track_id
    or new.version is distinct from old.version
    or new.created_at is distinct from old.created_at then
    raise exception 'Roadmap revision identity and version are immutable.';
  end if;

  if new.status = 'draft' then
    if new.approved_at is not null or new.approved_by_builder_profile_id is not null then
      raise exception 'Draft roadmap revisions cannot claim approval.';
    end if;
    return new;
  end if;

  if new.status <> 'approved' or new.approved_by_builder_profile_id is null then
    raise exception 'Invalid roadmap revision status transition.';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = new.approved_by_builder_profile_id
      and up.auth_user_id = auth.uid()
  ) or not public.is_project_owner(new.project_id) then
    raise exception 'Roadmap revision approval requires the owning Builder.';
  end if;

  select count(*) into v_milestone_count
  from public.execution_milestones m
  where m.roadmap_revision_id = old.id;

  if v_milestone_count = 0 then
    raise exception 'Cannot approve a roadmap without milestones.';
  end if;

  if exists (
    select 1
    from public.execution_milestones m
    where m.roadmap_revision_id = old.id
      and not exists (
        select 1
        from public.completion_criteria c
        where c.milestone_id = m.id
          and c.is_required
      )
  ) then
    raise exception 'Each approved milestone requires at least one required criterion.';
  end if;

  new.approved_at := now();
  return new;
end;
$$;

create trigger execution_revisions_guard
before insert or update on public.roadmap_revisions
for each row execute function public.execution_guard_revision();

create function public.execution_guard_track_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Execution Track identity cannot be reassigned.';
  end if;
  return new;
end;
$$;

create trigger execution_tracks_guard_identity
before update on public.execution_tracks
for each row execute function public.execution_guard_track_identity();

create function public.execution_guard_draft_child()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
declare
  v_revision_id uuid;
  v_status text;
begin
  if tg_op = 'DELETE' then
    v_revision_id := old.roadmap_revision_id;
  else
    v_revision_id := new.roadmap_revision_id;
  end if;

  select r.status into v_status
  from public.roadmap_revisions r
  where r.id = v_revision_id
  for update;

  if v_status is distinct from 'draft' then
    raise exception 'Approved roadmap milestone and criterion definitions cannot be modified.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.project_id is distinct from old.project_id
      or new.track_id is distinct from old.track_id
      or new.roadmap_revision_id is distinct from old.roadmap_revision_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Execution child identity cannot be reassigned.';
    end if;
    if tg_table_name = 'completion_criteria' then
      if new.milestone_id is distinct from old.milestone_id then
        raise exception 'Completion criterion cannot move to a different milestone.';
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger execution_milestones_guard_draft
before insert or update or delete on public.execution_milestones
for each row execute function public.execution_guard_draft_child();

create trigger completion_criteria_guard_draft
before insert or update or delete on public.completion_criteria
for each row execute function public.execution_guard_draft_child();

create trigger execution_tracks_set_updated_at
before update on public.execution_tracks
for each row execute function public.set_updated_at();

create trigger roadmap_revisions_set_updated_at
before update on public.roadmap_revisions
for each row execute function public.set_updated_at();

create trigger execution_milestones_set_updated_at
before update on public.execution_milestones
for each row execute function public.set_updated_at();

create trigger completion_criteria_set_updated_at
before update on public.completion_criteria
for each row execute function public.set_updated_at();

-- Only a project owner can see or change this private roadmap definition.
alter table public.execution_tracks enable row level security;
alter table public.roadmap_revisions enable row level security;
alter table public.execution_milestones enable row level security;
alter table public.completion_criteria enable row level security;

create policy execution_tracks_select_owner
  on public.execution_tracks for select to authenticated
  using (public.is_project_owner(project_id));
create policy execution_tracks_insert_owner
  on public.execution_tracks for insert to authenticated
  with check (public.is_project_owner(project_id));
create policy execution_tracks_update_owner
  on public.execution_tracks for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy roadmap_revisions_select_owner
  on public.roadmap_revisions for select to authenticated
  using (public.is_project_owner(project_id));
create policy roadmap_revisions_insert_owner
  on public.roadmap_revisions for insert to authenticated
  with check (public.is_project_owner(project_id));
create policy roadmap_revisions_update_owner
  on public.roadmap_revisions for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy execution_milestones_select_owner
  on public.execution_milestones for select to authenticated
  using (public.is_project_owner(project_id));
create policy execution_milestones_insert_owner
  on public.execution_milestones for insert to authenticated
  with check (public.is_project_owner(project_id));
create policy execution_milestones_update_owner
  on public.execution_milestones for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy completion_criteria_select_owner
  on public.completion_criteria for select to authenticated
  using (public.is_project_owner(project_id));
create policy completion_criteria_insert_owner
  on public.completion_criteria for insert to authenticated
  with check (public.is_project_owner(project_id));
create policy completion_criteria_update_owner
  on public.completion_criteria for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

revoke all privileges on table
  public.execution_tracks,
  public.roadmap_revisions,
  public.execution_milestones,
  public.completion_criteria
from public, anon, authenticated;

grant select, insert, update on table
  public.execution_tracks,
  public.roadmap_revisions,
  public.execution_milestones,
  public.completion_criteria
to authenticated;

-- Trigger functions are not direct application APIs.
revoke execute on function public.execution_guard_revision() from public, anon, authenticated;
revoke execute on function public.execution_guard_track_identity() from public, anon, authenticated;
revoke execute on function public.execution_guard_draft_child() from public, anon, authenticated;

do $$
declare
  v_table text;
  v_privilege text;
begin
  foreach v_table in array array[
    'execution_tracks', 'roadmap_revisions', 'execution_milestones', 'completion_criteria'
  ] loop
    foreach v_privilege in array array['SELECT','INSERT','UPDATE'] loop
      if not has_table_privilege('authenticated', 'public.' || v_table, v_privilege) then
        raise exception 'Execution Map missing authenticated % on %', v_privilege, v_table;
      end if;
    end loop;
    foreach v_privilege in array array[
      'DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'
    ] loop
      if has_table_privilege('authenticated', 'public.' || v_table, v_privilege) then
        raise exception 'Execution Map forbidden authenticated % on %', v_privilege, v_table;
      end if;
    end loop;
    foreach v_privilege in array array[
      'SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'
    ] loop
      if has_table_privilege('anon', 'public.' || v_table, v_privilege) then
        raise exception 'Execution Map forbidden anonymous % on %', v_privilege, v_table;
      end if;
    end loop;
  end loop;
end;
$$;

commit;
