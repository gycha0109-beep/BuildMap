-- BuildMap migration 20
-- Extend provider-neutral Capture provenance with a bounded observation identity.
-- Existing migrations 00-19 remain immutable.
-- observation_key is not a provider revision ID; it identifies the exact bounded normalized observation captured by BuildMap.

begin;

alter table public.capture_source_refs
  add column if not exists observation_key text;

alter table public.capture_source_refs
  drop constraint if exists capture_source_refs_observation_key_check;

alter table public.capture_source_refs
  add constraint capture_source_refs_observation_key_check
  check (
    observation_key is null
    or observation_key ~ '^[a-f0-9]{64}$'
  );

comment on column public.capture_source_refs.observation_key is
  'Optional server-derived SHA-256 identity for a bounded normalized provider observation. It allows mutable sources such as Notion pages/databases to be captured again only when the bounded observed state changes. It is not a provider revision/history identifier.';

drop index if exists public.capture_source_refs_provider_source_unique;

create unique index capture_source_refs_provider_source_unique
  on public.capture_source_refs(project_link_id, provider, source_type, external_source_id)
  where observation_key is null;

create unique index capture_source_refs_provider_observation_unique
  on public.capture_source_refs(
    project_link_id,
    provider,
    source_type,
    external_source_id,
    observation_key
  )
  where observation_key is not null;

-- Existing GitHub provenance remains source-identity unique because its rows keep
-- observation_key NULL. Mutable provider observations may use a deterministic
-- observation_key without changing external_source_id away from the provider's
-- actual resource identity.

commit;
