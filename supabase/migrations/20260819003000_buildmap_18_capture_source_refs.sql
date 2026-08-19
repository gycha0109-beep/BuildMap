-- BuildMap migration 18
-- Preserve provider-neutral external observation provenance for explicit Builder Captures.
-- Existing migrations 00-17 remain immutable.
-- This table is private provenance, not a provider event ledger or public Evidence surface.

begin;

create table if not exists public.capture_source_refs (
  id uuid primary key default gen_random_uuid(),
  rough_note_id uuid not null references public.rough_notes(id) on delete cascade,
  project_link_id uuid not null references public.project_links(id) on delete restrict,
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  provider text not null check (provider ~ '^[a-z0-9_]{1,40}$'),
  source_type text not null check (source_type ~ '^[a-z0-9_]{1,80}$'),
  external_source_id text not null check (char_length(external_source_id) between 1 and 255),
  canonical_url text not null check (char_length(canonical_url) between 1 and 2048),
  source_title text not null check (char_length(source_title) between 1 and 500),
  source_context text check (source_context is null or char_length(source_context) <= 1000),
  occurred_at timestamptz,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.capture_source_refs is
  'Private immutable provenance for a Builder-selected external observation captured into a Rough Note. Stores normalized source identity only, never provider credentials or raw provider payloads.';
comment on column public.capture_source_refs.external_source_id is
  'Stable provider-side source identity within the linked external resource. It never replaces a BuildMap ID.';
comment on column public.capture_source_refs.canonical_url is
  'Canonical provider URL recorded at explicit Capture time. Public exposure is not authorized by this table.';

create unique index if not exists capture_source_refs_rough_note_unique
  on public.capture_source_refs(rough_note_id);

create unique index if not exists capture_source_refs_provider_source_unique
  on public.capture_source_refs(project_link_id, provider, source_type, external_source_id);

create index if not exists capture_source_refs_project_link_idx
  on public.capture_source_refs(project_link_id, provider, created_at desc);

create or replace function public.validate_capture_source_ref()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_rough_note_project_id uuid;
  v_rough_note_author_id uuid;
  v_rough_note_feedback_id uuid;
  v_rough_note_archived_at timestamptz;
  v_project_link_project_id uuid;
  v_project_link_type text;
  v_project_link_archived_at timestamptz;
begin
  select rn.project_id,
         rn.author_builder_profile_id,
         rn.source_feedback_id,
         rn.archived_at
    into v_rough_note_project_id,
         v_rough_note_author_id,
         v_rough_note_feedback_id,
         v_rough_note_archived_at
  from public.rough_notes rn
  where rn.id = new.rough_note_id;

  if v_rough_note_project_id is null or v_rough_note_archived_at is not null then
    raise exception 'Capture source Rough Note is unavailable.';
  end if;

  if v_rough_note_feedback_id is not null then
    raise exception 'A Feedback-sourced Capture cannot also claim provider observation provenance.';
  end if;

  if v_rough_note_author_id is distinct from new.created_by_builder_profile_id then
    raise exception 'Capture source creator must match the Rough Note author.';
  end if;

  select pl.project_id, pl.link_type, pl.archived_at
    into v_project_link_project_id, v_project_link_type, v_project_link_archived_at
  from public.project_links pl
  where pl.id = new.project_link_id;

  if v_project_link_project_id is null or v_project_link_archived_at is not null then
    raise exception 'Capture source Project Link is unavailable.';
  end if;

  if v_project_link_project_id is distinct from v_rough_note_project_id then
    raise exception 'Capture source Project Link does not belong to the Rough Note Project.';
  end if;

  if v_project_link_type is distinct from new.provider then
    raise exception 'Capture source provider does not match the Project Link type.';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_capture_source_ref()
  from public, anon, authenticated;

create trigger capture_source_refs_validate_insert
before insert on public.capture_source_refs
for each row execute function public.validate_capture_source_ref();

alter table public.capture_source_refs enable row level security;

create policy capture_source_refs_select_owner
on public.capture_source_refs
for select
to authenticated
using (
  exists (
    select 1
    from public.rough_notes rn
    where rn.id = capture_source_refs.rough_note_id
      and public.is_project_owner(rn.project_id)
  )
);

create policy capture_source_refs_insert_owner
on public.capture_source_refs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.rough_notes rn
    where rn.id = capture_source_refs.rough_note_id
      and public.is_project_owner(rn.project_id)
  )
  and exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = capture_source_refs.created_by_builder_profile_id
      and up.auth_user_id = auth.uid()
  )
);

revoke all privileges on table public.capture_source_refs from anon, authenticated;
grant select, insert on table public.capture_source_refs to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.capture_source_refs', 'SELECT')
    or has_table_privilege('anon', 'public.capture_source_refs', 'INSERT')
    or has_table_privilege('anon', 'public.capture_source_refs', 'UPDATE')
    or has_table_privilege('anon', 'public.capture_source_refs', 'DELETE') then
    raise exception 'anonymous capture_source_refs privilege must remain denied';
  end if;

  if not has_table_privilege('authenticated', 'public.capture_source_refs', 'SELECT')
    or not has_table_privilege('authenticated', 'public.capture_source_refs', 'INSERT') then
    raise exception 'authenticated capture_source_refs owner-backed read/insert privilege missing';
  end if;

  if has_table_privilege('authenticated', 'public.capture_source_refs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.capture_source_refs', 'DELETE')
    or has_table_privilege('authenticated', 'public.capture_source_refs', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.capture_source_refs', 'REFERENCES')
    or has_table_privilege('authenticated', 'public.capture_source_refs', 'TRIGGER')
    or has_table_privilege('authenticated', 'public.capture_source_refs', 'MAINTAIN') then
    raise exception 'unexpected authenticated privilege on capture_source_refs';
  end if;
end
$$;

commit;
