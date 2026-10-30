-- BuildMap EM-2B: private, untrusted GitHub source observation cache.
-- Additive after EM-1 migration 22. Evidence cache is NOT criterion acceptance authority.
-- All writes remain user-session RLS-bound; only EM-3 may evaluate independently re-read proof.
-- This migration MUST NOT merge while EM-1/EM-2 release gates remain pending.

begin;

alter table public.completion_criteria
  add constraint completion_criteria_project_id_unique unique (project_id, id);

create table public.execution_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  provider text not null default 'github' check (provider = 'github'),
  repository_id bigint not null check (repository_id > 0),
  repository_name text not null check (
    char_length(repository_name) between 3 and 202
    and repository_name ~ '^[A-Za-z0-9-]{1,100}/[A-Za-z0-9._-]{1,100}$'
  ),
  source_type text not null check (source_type in ('merged_pull_request', 'release')),
  source_id text not null check (
    (source_type = 'merged_pull_request' and source_id ~ '^pr:[1-9][0-9]{0,14}$')
    or
    (source_type = 'release' and source_id ~ '^release:[1-9][0-9]{0,14}$')
  ),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  constraint execution_evidence_identity_unique
    unique (project_id, provider, repository_id, source_type, source_id),
  constraint execution_evidence_project_id_unique unique (project_id, id),
  constraint execution_evidence_observation_order_check
    check (last_observed_at >= first_observed_at)
);

comment on table public.execution_evidence is
  'Untrusted, owner-visible GitHub source identity cache. This table never proves a criterion PASS.';

create index execution_evidence_project_recent_idx
  on public.execution_evidence(project_id, last_observed_at desc);

create table public.execution_evidence_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  evidence_id uuid not null,
  version_sequence integer not null check (version_sequence > 0),
  snapshot_fingerprint text not null check (snapshot_fingerprint ~ '^[0-9a-f]{32}
  source_state text not null check (source_state in ('SOURCE_CONFIRMED', 'UNKNOWN')),
  source_sha text check (source_sha is null or source_sha ~ '^[0-9a-f]{40}$'),
  reason text check (reason is null or char_length(reason) between 1 and 128),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  source_url text not null check (
    char_length(source_url) between 20 and 512
    and source_url like 'https://github.com/%'
  ),
  occurred_at timestamptz,
  observed_at timestamptz not null default now(),
  constraint execution_evidence_observations_parent_fk
    foreign key (project_id, evidence_id)
    references public.execution_evidence(project_id, id) on delete restrict,
  constraint execution_evidence_observations_sequence_unique
    unique (evidence_id, version_sequence),
  constraint execution_evidence_observations_status_check
    check (
      (source_state = 'SOURCE_CONFIRMED' and source_sha is not null and occurred_at is not null and reason is null)
      or
      (source_state = 'UNKNOWN' and reason is not null)
    )
);

comment on table public.execution_evidence_observations is
  'Append-only untrusted cached source snapshots; digest is a dedup key, NOT an attestation or completion proof.';

create index execution_evidence_observations_recent_idx
  on public.execution_evidence_observations(evidence_id, version_sequence desc);

create table public.criterion_evidence_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  criterion_id uuid not null,
  evidence_id uuid not null,
  review_status text not null default 'proposed'
    check (review_status in ('proposed', 'reviewed', 'rejected')),
  reviewed_by_builder_profile_id uuid references public.builder_profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint criterion_evidence_links_criterion_fk
    foreign key (project_id, criterion_id)
    references public.completion_criteria(project_id, id) on delete restrict,
  constraint criterion_evidence_links_source_fk
    foreign key (project_id, evidence_id)
    references public.execution_evidence(project_id, id) on delete restrict,
  constraint criterion_evidence_links_unique unique (criterion_id, evidence_id),
  constraint criterion_evidence_links_review_pair_check
    check (
      (review_status = 'proposed' and reviewed_by_builder_profile_id is null and reviewed_at is null)
      or
      (review_status <> 'proposed' and reviewed_by_builder_profile_id is not null and reviewed_at is not null)
    )
);

comment on table public.criterion_evidence_links is
  'Builder-reviewed association only, not evidence verification or deterministic PASS.';

create index criterion_evidence_links_project_idx
  on public.criterion_evidence_links(project_id, criterion_id);

create function public.execution_evidence_identity_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.provider is distinct from old.provider
    or new.repository_id is distinct from old.repository_id
    or new.repository_name is distinct from old.repository_name
    or new.source_type is distinct from old.source_type
    or new.source_id is distinct from old.source_id
    or new.first_observed_at is distinct from old.first_observed_at then
    raise exception 'Evidence source identity is immutable.';
  end if;
  if new.last_observed_at < old.last_observed_at then
    raise exception 'Evidence observation time must not move backwards.';
  end if;
  return new;
end;
$$;

create trigger execution_evidence_identity_before_update
before update on public.execution_evidence
for each row execute function public.execution_evidence_identity_guard();

create function public.execution_evidence_snapshot_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  raise exception 'Execution evidence observation snapshots are immutable.';
end;
$$;

create trigger execution_evidence_snapshot_guard
before update or delete on public.execution_evidence_observations
for each row execute function public.execution_evidence_snapshot_immutable();

create function public.execution_link_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.review_status <> 'proposed'
      or new.reviewed_by_builder_profile_id is not null or new.reviewed_at is not null then
      raise exception 'Evidence links are created as unreviewed proposals.';
    end if;
    return new;
  end if;

  if old.review_status <> 'proposed' then
    raise exception 'Reviewed or rejected evidence links are immutable.';
  end if;

  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.criterion_id is distinct from old.criterion_id
    or new.evidence_id is distinct from old.evidence_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Criterion evidence association identity is immutable.';
  end if;

  if new.review_status <> 'proposed' then
    if not public.is_project_owner(new.project_id)
      or new.reviewed_by_builder_profile_id is null
      or not exists (
        select 1 from public.builder_profiles bp
        join public.user_profiles up on up.id = bp.user_profile_id
        where bp.id = new.reviewed_by_builder_profile_id
          and up.auth_user_id = auth.uid()
      ) then
      raise exception 'Only the current owning Builder may review a link.';
    end if;
    new.reviewed_at := now();
  else
    if new.reviewed_by_builder_profile_id is not null or new.reviewed_at is not null then
      raise exception 'Unreviewed association must not claim review evidence.';
    end if;
  end if;

  return new;
end;
$$;

create trigger criterion_evidence_link_guard
before insert or update on public.criterion_evidence_links
for each row execute function public.execution_link_guard();

create trigger criterion_evidence_link_set_updated_at
before update on public.criterion_evidence_links
for each row execute function public.set_updated_at();

-- SECURITY INVOKER requires ordinary authenticated table grants and RLS.
-- Callers can forge cached source rows through direct table writes; therefore no cached
-- row may be treated as trusted acceptance proof. EM-3 MUST re-read GitHub source.
create function public.execution_record_evidence_batch(
  p_project_id uuid,
  p_repository_id bigint,
  p_repository_name text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_item jsonb;
  v_source_type text;
  v_source_id text;
  v_title text;
  v_source_state text;
  v_source_sha text;
  v_source_url text;
  v_reason text;
  v_occurred_at timestamptz;
  v_evidence_id uuid;
  v_fingerprint text;
  v_previous_fingerprint text;
  v_previous_sequence integer;
  v_items integer := 0;
  v_versions integer := 0;
begin
  if auth.uid() is null or not public.is_project_owner(p_project_id) then
    raise exception using errcode='42501',message='owner_required';
  end if;
  if p_repository_id is null or p_repository_id < 1
    or p_repository_name is null
    or p_repository_name !~ '^[A-Za-z0-9-]{1,100}/[A-Za-z0-9._-]{1,100}$'
    or pg_catalog.jsonb_typeof(p_items) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_items) > 40
    or pg_catalog.octet_length(p_items::text) > 98304 then
    raise exception using errcode='22023',message='invalid_evidence_batch';
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_items) loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'object'
      or pg_catalog.jsonb_typeof(v_item -> 'sourceType') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'sourceId') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'sourceState') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'title') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_item -> 'sourceUrl') is distinct from 'string' then
      raise exception using errcode='22023',message='invalid_source_fields';
    end if;

    v_source_type := v_item ->> 'sourceType';
    v_source_id := v_item ->> 'sourceId';
    v_source_state := v_item ->> 'sourceState';
    v_source_sha := nullif(v_item ->> 'sourceSha', '');
    v_source_url := v_item ->> 'sourceUrl';
    v_title := btrim(v_item ->> 'title');
    v_reason := nullif(v_item ->> 'reason','');

    if v_source_type not in ('merged_pull_request','release')
      or v_source_state not in ('SOURCE_CONFIRMED','UNKNOWN')
      or char_length(v_title) not between 1 and 180
      or (v_source_sha is not null and v_source_sha !~ '^[0-9a-f]{40}$')
      or (v_reason is not null and char_length(v_reason) > 128)
      or (v_item ? 'occurredAt'
          and pg_catalog.jsonb_typeof(v_item -> 'occurredAt') not in ('null','string'))
      or (v_item ? 'sourceSha'
          and pg_catalog.jsonb_typeof(v_item -> 'sourceSha') not in ('null','string'))
      or (v_item ? 'reason'
          and pg_catalog.jsonb_typeof(v_item -> 'reason') not in ('null','string')) then
      raise exception using errcode='22023',message='invalid_observation_values';
    end if;

    if v_source_type = 'merged_pull_request' then
      if v_source_id !~ '^pr:[1-9][0-9]{0,14}$'
        or v_source_url is distinct from
          ('https://github.com/' || p_repository_name || '/pull/' || split_part(v_source_id,':',2)) then
        raise exception using errcode='22023',message='invalid_pull_reference';
      end if;
    elsif v_source_id !~ '^release:[1-9][0-9]{0,14}$'
      or v_source_url not like ('https://github.com/' || p_repository_name || '/releases/tag/%')
      or char_length(v_source_url) > 512
      or v_source_sha is not null
      or v_source_state <> 'UNKNOWN' then
      raise exception using errcode='22023',message='invalid_release_reference';
    end if;

    if v_item ->> 'occurredAt' is not null then
      begin
        v_occurred_at := (v_item ->> 'occurredAt')::timestamptz;
      exception when invalid_datetime_format or datetime_field_overflow then
        raise exception using errcode='22023',message='invalid_source_time';
      end;
    else
      v_occurred_at := null;
    end if;

    if (v_source_state = 'SOURCE_CONFIRMED'
       and (v_source_type <> 'merged_pull_request'
         or v_source_sha is null or v_occurred_at is null or v_reason is not null))
       or (v_source_state = 'UNKNOWN' and v_reason is null) then
      raise exception using errcode='22023',message='invalid_source_status';
    end if;

    insert into public.execution_evidence
      (project_id,provider,repository_id,repository_name,source_type,source_id)
    values
      (p_project_id,'github',p_repository_id,p_repository_name,v_source_type,v_source_id)
    on conflict on constraint execution_evidence_identity_unique
    do update set last_observed_at = greatest(
      public.execution_evidence.last_observed_at, now()
    )
    returning id into v_evidence_id;

    -- md5 is only an idempotent content fingerprint, never a security proof.
    v_fingerprint := pg_catalog.md5(
      pg_catalog.jsonb_build_object(
        'sourceState',v_source_state,'sourceSha',v_source_sha,
        'reason',v_reason,'title',v_title,'sourceUrl',v_source_url,
        'occurredAt',v_occurred_at
      )::text
    );

    -- Parent UPSERT holds the identity row lock until commit, serializing
    -- concurrent refreshes. Repeated identical state creates no extra version,
    -- while A -> B -> A is preserved as three distinct chronological changes.
    select snapshot_fingerprint, version_sequence
      into v_previous_fingerprint, v_previous_sequence
    from public.execution_evidence_observations
    where evidence_id = v_evidence_id
    order by version_sequence desc limit 1;

    if v_previous_fingerprint is distinct from v_fingerprint then
      insert into public.execution_evidence_observations
        (project_id,evidence_id,version_sequence,snapshot_fingerprint,source_state,
         source_sha,reason,title,source_url,occurred_at)
      values
        (p_project_id,v_evidence_id,coalesce(v_previous_sequence,0) + 1,v_fingerprint,
         v_source_state,v_source_sha,v_reason,v_title,v_source_url,v_occurred_at);
      v_versions := v_versions + 1;
    end if;
    v_items := v_items + 1;
  end loop;

  return pg_catalog.jsonb_build_object(
    'objectsObserved',v_items,
    'newSnapshots',v_versions,
    'storageStatus','CACHED_UNTRUSTED',
    'criterionEvaluation','NOT_AVAILABLE'
  );
end;
$$;

alter table public.execution_evidence enable row level security;
alter table public.execution_evidence_observations enable row level security;
alter table public.criterion_evidence_links enable row level security;

create policy execution_evidence_owner_select on public.execution_evidence
  for select to authenticated using (public.is_project_owner(project_id));
create policy execution_evidence_owner_insert on public.execution_evidence
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy execution_evidence_owner_update on public.execution_evidence
  for update to authenticated using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy execution_evidence_observations_owner_select on public.execution_evidence_observations
  for select to authenticated using (public.is_project_owner(project_id));
create policy execution_evidence_observations_owner_insert on public.execution_evidence_observations
  for insert to authenticated with check (public.is_project_owner(project_id));

create policy criterion_evidence_links_owner_select on public.criterion_evidence_links
  for select to authenticated using (public.is_project_owner(project_id));
create policy criterion_evidence_links_owner_insert on public.criterion_evidence_links
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy criterion_evidence_links_owner_update on public.criterion_evidence_links
  for update to authenticated using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

revoke all privileges on table
  public.execution_evidence, public.execution_evidence_observations,
  public.criterion_evidence_links
from public, anon, authenticated;

grant select, insert, update on table public.execution_evidence to authenticated;
grant select, insert on table public.execution_evidence_observations to authenticated;
grant select, insert, update on table public.criterion_evidence_links to authenticated;

revoke execute on function
  public.execution_evidence_identity_guard(),
  public.execution_evidence_snapshot_immutable(),
  public.execution_link_guard(),
  public.execution_record_evidence_batch(uuid,bigint,text,jsonb)
from public, anon, authenticated;
grant execute on function
  public.execution_record_evidence_batch(uuid,bigint,text,jsonb) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'execution_evidence','execution_evidence_observations','criterion_evidence_links'
  ] loop
    if not has_table_privilege('authenticated','public.' || v_table,'SELECT')
      or has_table_privilege('anon','public.' || v_table,'SELECT')
      or has_table_privilege('authenticated','public.' || v_table,'DELETE') then
      raise exception 'EM-2B evidence table privilege matrix invalid: %',v_table;
    end if;
  end loop;
end;
$$;

commit;
