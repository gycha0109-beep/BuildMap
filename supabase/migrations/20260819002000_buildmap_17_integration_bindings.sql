-- BuildMap migration 17
-- Provider-neutral private integration binding for authenticated external read access.
-- Existing migrations 00-16 remain immutable.
-- No provider access token, OAuth token, private key, webhook secret, or raw provider payload is stored here.

begin;

create table if not exists public.integration_bindings (
  id uuid primary key default gen_random_uuid(),
  project_link_id uuid not null references public.project_links(id) on delete cascade,
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  provider text not null check (provider ~ '^[a-z0-9_]{1,40}$'),
  external_connection_id text not null check (char_length(external_connection_id) between 1 and 255),
  external_account_id text,
  external_account_label text,
  external_resource_id text not null check (char_length(external_resource_id) between 1 and 255),
  external_resource_label text not null check (char_length(external_resource_label) between 1 and 255),
  binding_proof text not null check (char_length(binding_proof) between 32 and 255),
  status text not null default 'active' check (status in ('active', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.integration_bindings is
  'Private provider-neutral association from a Project Link to an externally verified provider connection/resource. Contains no provider access token or raw payload.';
comment on column public.integration_bindings.binding_proof is
  'Server-generated tamper-evidence proof over security-sensitive binding identity. It is not a credential and must be verified before provider token minting.';

create unique index if not exists integration_bindings_active_project_link_provider_idx
  on public.integration_bindings(project_link_id, provider)
  where archived_at is null;

create index if not exists integration_bindings_connection_idx
  on public.integration_bindings(provider, external_connection_id)
  where archived_at is null;

create trigger integration_bindings_set_updated_at
before update on public.integration_bindings
for each row execute function public.set_updated_at();

alter table public.integration_bindings enable row level security;

create policy integration_bindings_select_owner
on public.integration_bindings
for select
to authenticated
using (
  exists (
    select 1
    from public.project_links pl
    where pl.id = integration_bindings.project_link_id
      and public.is_project_owner(pl.project_id)
  )
);

create policy integration_bindings_insert_owner
on public.integration_bindings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.project_links pl
    where pl.id = integration_bindings.project_link_id
      and public.is_project_owner(pl.project_id)
  )
  and exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = integration_bindings.created_by_builder_profile_id
      and up.auth_user_id = auth.uid()
  )
);

create policy integration_bindings_update_owner
on public.integration_bindings
for update
to authenticated
using (
  exists (
    select 1
    from public.project_links pl
    where pl.id = integration_bindings.project_link_id
      and public.is_project_owner(pl.project_id)
  )
)
with check (
  exists (
    select 1
    from public.project_links pl
    where pl.id = integration_bindings.project_link_id
      and public.is_project_owner(pl.project_id)
  )
  and exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = integration_bindings.created_by_builder_profile_id
      and up.auth_user_id = auth.uid()
  )
);

revoke all privileges on table public.integration_bindings from anon, authenticated;
grant select, insert, update on table public.integration_bindings to authenticated;

-- Anonymous users must never receive direct access to provider connection state.
do $$
begin
  if has_table_privilege('anon', 'public.integration_bindings', 'SELECT')
    or has_table_privilege('anon', 'public.integration_bindings', 'INSERT')
    or has_table_privilege('anon', 'public.integration_bindings', 'UPDATE')
    or has_table_privilege('anon', 'public.integration_bindings', 'DELETE') then
    raise exception 'anonymous integration_bindings privilege must remain denied';
  end if;

  if not has_table_privilege('authenticated', 'public.integration_bindings', 'SELECT')
    or not has_table_privilege('authenticated', 'public.integration_bindings', 'INSERT')
    or not has_table_privilege('authenticated', 'public.integration_bindings', 'UPDATE') then
    raise exception 'authenticated integration_bindings RLS-backed CRUD privilege missing';
  end if;

  if has_table_privilege('authenticated', 'public.integration_bindings', 'DELETE')
    or has_table_privilege('authenticated', 'public.integration_bindings', 'TRUNCATE')
    or has_table_privilege('authenticated', 'public.integration_bindings', 'REFERENCES')
    or has_table_privilege('authenticated', 'public.integration_bindings', 'TRIGGER')
    or has_table_privilege('authenticated', 'public.integration_bindings', 'MAINTAIN') then
    raise exception 'unexpected authenticated privilege on integration_bindings';
  end if;
end
$$;

commit;
