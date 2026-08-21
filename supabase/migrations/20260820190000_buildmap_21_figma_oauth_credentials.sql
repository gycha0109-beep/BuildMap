-- BuildMap migration 21
-- Figma OAuth credential persistence and atomic refresh boundary for Phase 52.
-- Existing migrations 00-20 remain immutable.
-- Provider credentials remain excluded from project_links, integration_bindings, and capture_source_refs.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.figma_oauth_credentials (
  figma_user_id text not null check (char_length(figma_user_id) between 1 and 255),
  created_by_builder_profile_id uuid not null references public.builder_profiles(id) on delete restrict,
  access_token_ciphertext text check (
    access_token_ciphertext is null
    or (
      char_length(access_token_ciphertext) between 16 and 8192
      and access_token_ciphertext ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    )
  ),
  refresh_token_ciphertext text check (
    refresh_token_ciphertext is null
    or (
      char_length(refresh_token_ciphertext) between 16 and 8192
      and refresh_token_ciphertext ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    )
  ),
  access_token_expires_at timestamptz,
  encryption_key_version smallint not null default 1 check (encryption_key_version > 0),
  credential_version bigint not null default 1 check (credential_version > 0),
  status text not null default 'active' check (status in ('active', 'disconnected')),
  refresh_lock_id uuid,
  refresh_lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disconnected_at timestamptz,
  primary key (created_by_builder_profile_id, figma_user_id),
  check (
    (
      status = 'active'
      and access_token_ciphertext is not null
      and refresh_token_ciphertext is not null
      and access_token_expires_at is not null
      and disconnected_at is null
    )
    or
    (
      status = 'disconnected'
      and access_token_ciphertext is null
      and refresh_token_ciphertext is null
      and access_token_expires_at is null
    )
  )
);

comment on table private.figma_oauth_credentials is
  'Server-bound Figma OAuth authorization records scoped by BuildMap Builder + Figma user_id_string. Token values are application-sealed AES-256-GCM ciphertext; direct browser/table access is denied.';
comment on column private.figma_oauth_credentials.access_token_expires_at is
  'Provider-reported OAuth access-token expiry. BuildMap may refresh before expiry; it is not provider resource revision metadata.';
comment on column private.figma_oauth_credentials.credential_version is
  'Monotonic optimistic-concurrency version used with the refresh lock so the single Figma app/user access token cannot be replaced out of order within one Builder boundary.';

create index if not exists figma_oauth_credentials_owner_idx
  on private.figma_oauth_credentials(created_by_builder_profile_id)
  where status = 'active';

create trigger figma_oauth_credentials_set_updated_at
before update on private.figma_oauth_credentials
for each row execute function public.set_updated_at();

alter table private.figma_oauth_credentials enable row level security;
revoke all privileges on table private.figma_oauth_credentials from public, anon, authenticated;

create or replace function public.save_figma_oauth_authorization(
  p_project_link_id uuid,
  p_created_by_builder_profile_id uuid,
  p_figma_user_id text,
  p_resource_id text,
  p_resource_type text,
  p_resource_label text,
  p_binding_proof text,
  p_access_token_ciphertext text,
  p_refresh_token_ciphertext text,
  p_access_token_expires_at timestamptz,
  p_encryption_key_version smallint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_credential_version bigint;
  v_binding_id uuid;
  v_previous_figma_user_id text;
  v_old_credential_disconnected boolean := false;
begin
  select pl.project_id
    into v_project_id
  from public.project_links pl
  where pl.id = p_project_link_id
    and pl.link_type = 'figma'
    and pl.archived_at is null;

  if v_project_id is null or not public.is_project_owner(v_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = p_created_by_builder_profile_id
      and up.auth_user_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  if p_resource_type not in ('file', 'branch')
    or coalesce(pg_catalog.length(p_figma_user_id), 0) = 0
    or coalesce(pg_catalog.length(p_resource_id), 0) = 0
    or coalesce(pg_catalog.length(p_resource_label), 0) = 0
    or pg_catalog.length(p_resource_label) > 255
    or coalesce(pg_catalog.length(p_binding_proof), 0) < 32
    or coalesce(pg_catalog.length(p_access_token_ciphertext), 0) < 16
    or p_access_token_ciphertext !~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or coalesce(pg_catalog.length(p_refresh_token_ciphertext), 0) < 16
    or p_refresh_token_ciphertext !~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_access_token_expires_at is null
    or p_access_token_expires_at <= pg_catalog.now()
    or p_encryption_key_version is null
    or p_encryption_key_version <= 0 then
    raise exception using errcode = '22023', message = 'invalid_figma_authorization';
  end if;

  select ib.id, ib.external_connection_id
    into v_binding_id, v_previous_figma_user_id
  from public.integration_bindings ib
  where ib.project_link_id = p_project_link_id
    and ib.provider = 'figma'
    and ib.archived_at is null
  order by ib.created_at asc
  limit 1;

  insert into private.figma_oauth_credentials as fc (
    figma_user_id,
    created_by_builder_profile_id,
    access_token_ciphertext,
    refresh_token_ciphertext,
    access_token_expires_at,
    encryption_key_version,
    credential_version,
    status,
    refresh_lock_id,
    refresh_lock_expires_at,
    disconnected_at
  ) values (
    p_figma_user_id,
    p_created_by_builder_profile_id,
    p_access_token_ciphertext,
    p_refresh_token_ciphertext,
    p_access_token_expires_at,
    p_encryption_key_version,
    1,
    'active',
    null,
    null,
    null
  )
  on conflict (created_by_builder_profile_id, figma_user_id) do update
  set access_token_ciphertext = excluded.access_token_ciphertext,
      refresh_token_ciphertext = excluded.refresh_token_ciphertext,
      access_token_expires_at = excluded.access_token_expires_at,
      encryption_key_version = excluded.encryption_key_version,
      credential_version = fc.credential_version + 1,
      status = 'active',
      refresh_lock_id = null,
      refresh_lock_expires_at = null,
      disconnected_at = null
  returning credential_version into v_credential_version;

  if v_binding_id is null then
    insert into public.integration_bindings (
      project_link_id,
      created_by_builder_profile_id,
      provider,
      external_connection_id,
      external_account_id,
      external_account_label,
      external_resource_id,
      external_resource_type,
      external_resource_label,
      binding_proof,
      status
    ) values (
      p_project_link_id,
      p_created_by_builder_profile_id,
      'figma',
      p_figma_user_id,
      p_figma_user_id,
      null,
      p_resource_id,
      p_resource_type,
      p_resource_label,
      p_binding_proof,
      'active'
    )
    returning id into v_binding_id;
  else
    update public.integration_bindings
    set created_by_builder_profile_id = p_created_by_builder_profile_id,
        external_connection_id = p_figma_user_id,
        external_account_id = p_figma_user_id,
        external_account_label = null,
        external_resource_id = p_resource_id,
        external_resource_type = p_resource_type,
        external_resource_label = p_resource_label,
        binding_proof = p_binding_proof,
        status = 'active'
    where id = v_binding_id;
  end if;

  if v_previous_figma_user_id is not null
    and v_previous_figma_user_id <> p_figma_user_id
    and not exists (
      select 1
      from public.integration_bindings ib
      where ib.provider = 'figma'
        and ib.external_connection_id = v_previous_figma_user_id
        and ib.status = 'active'
        and ib.archived_at is null
        and ib.created_by_builder_profile_id = p_created_by_builder_profile_id
    ) then
    update private.figma_oauth_credentials fc
    set access_token_ciphertext = null,
        refresh_token_ciphertext = null,
        access_token_expires_at = null,
        credential_version = fc.credential_version + 1,
        status = 'disconnected',
        refresh_lock_id = null,
        refresh_lock_expires_at = null,
        disconnected_at = pg_catalog.now()
    where fc.figma_user_id = v_previous_figma_user_id
      and fc.created_by_builder_profile_id = p_created_by_builder_profile_id
      and fc.status = 'active';

    if found then
      v_old_credential_disconnected := true;
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'figma_user_id', p_figma_user_id,
    'credential_version', v_credential_version,
    'binding_id', v_binding_id,
    'previous_figma_user_id', v_previous_figma_user_id,
    'old_credential_disconnected', v_old_credential_disconnected
  );
end;
$$;

create or replace function public.get_figma_oauth_credential(p_project_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_row private.figma_oauth_credentials%rowtype;
  v_binding_count bigint;
begin
  select pl.project_id
    into v_project_id
  from public.project_links pl
  where pl.id = p_project_link_id
    and pl.link_type = 'figma'
    and pl.archived_at is null;

  if v_project_id is null or not public.is_project_owner(v_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  select fc.*
    into v_row
  from public.integration_bindings ib
  join private.figma_oauth_credentials fc
    on fc.figma_user_id = ib.external_connection_id
   and fc.created_by_builder_profile_id = ib.created_by_builder_profile_id
  where ib.project_link_id = p_project_link_id
    and ib.provider = 'figma'
    and ib.status = 'active'
    and ib.archived_at is null
    and fc.status = 'active'
    and fc.access_token_ciphertext is not null
    and fc.refresh_token_ciphertext is not null
    and exists (
      select 1
      from public.builder_profiles bp
      join public.user_profiles up on up.id = bp.user_profile_id
      where bp.id = fc.created_by_builder_profile_id
        and up.auth_user_id = auth.uid()
    )
  limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'not_connected');
  end if;

  select pg_catalog.count(*)
    into v_binding_count
  from public.integration_bindings ib
  where ib.provider = 'figma'
    and ib.external_connection_id = v_row.figma_user_id
    and ib.status = 'active'
    and ib.archived_at is null
    and ib.created_by_builder_profile_id = v_row.created_by_builder_profile_id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'figma_user_id', v_row.figma_user_id,
    'access_token_ciphertext', v_row.access_token_ciphertext,
    'refresh_token_ciphertext', v_row.refresh_token_ciphertext,
    'access_token_expires_at', v_row.access_token_expires_at,
    'encryption_key_version', v_row.encryption_key_version,
    'credential_version', v_row.credential_version,
    'active_binding_count', v_binding_count
  );
end;
$$;

create or replace function public.claim_figma_oauth_refresh(p_project_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_figma_user_id text;
  v_builder_profile_id uuid;
  v_lock_id uuid;
  v_row private.figma_oauth_credentials%rowtype;
begin
  select pl.project_id
    into v_project_id
  from public.project_links pl
  where pl.id = p_project_link_id
    and pl.link_type = 'figma'
    and pl.archived_at is null;

  if v_project_id is null or not public.is_project_owner(v_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  select ib.external_connection_id, ib.created_by_builder_profile_id
    into v_figma_user_id, v_builder_profile_id
  from public.integration_bindings ib
  where ib.project_link_id = p_project_link_id
    and ib.provider = 'figma'
    and ib.status = 'active'
    and ib.archived_at is null
  limit 1;

  if v_figma_user_id is null or v_builder_profile_id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'refresh_busy_or_disconnected');
  end if;

  v_lock_id := pg_catalog.gen_random_uuid();

  update private.figma_oauth_credentials fc
  set refresh_lock_id = v_lock_id,
      refresh_lock_expires_at = pg_catalog.now() + interval '30 seconds'
  where fc.figma_user_id = v_figma_user_id
    and fc.created_by_builder_profile_id = v_builder_profile_id
    and fc.status = 'active'
    and fc.refresh_token_ciphertext is not null
    and exists (
      select 1
      from public.builder_profiles bp
      join public.user_profiles up on up.id = bp.user_profile_id
      where bp.id = fc.created_by_builder_profile_id
        and up.auth_user_id = auth.uid()
    )
    and (
      fc.refresh_lock_id is null
      or fc.refresh_lock_expires_at is null
      or fc.refresh_lock_expires_at <= pg_catalog.now()
    )
  returning fc.* into v_row;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'refresh_busy_or_disconnected');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'lock_id', v_lock_id,
    'refresh_token_ciphertext', v_row.refresh_token_ciphertext,
    'encryption_key_version', v_row.encryption_key_version,
    'credential_version', v_row.credential_version,
    'figma_user_id', v_row.figma_user_id
  );
end;
$$;

create or replace function public.complete_figma_oauth_refresh(
  p_project_link_id uuid,
  p_lock_id uuid,
  p_expected_credential_version bigint,
  p_access_token_ciphertext text,
  p_refresh_token_ciphertext text,
  p_access_token_expires_at timestamptz,
  p_encryption_key_version smallint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_figma_user_id text;
  v_builder_profile_id uuid;
  v_new_version bigint;
begin
  select pl.project_id
    into v_project_id
  from public.project_links pl
  where pl.id = p_project_link_id
    and pl.link_type = 'figma'
    and pl.archived_at is null;

  if v_project_id is null or not public.is_project_owner(v_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  select ib.external_connection_id, ib.created_by_builder_profile_id
    into v_figma_user_id, v_builder_profile_id
  from public.integration_bindings ib
  where ib.project_link_id = p_project_link_id
    and ib.provider = 'figma'
    and ib.status = 'active'
    and ib.archived_at is null
  limit 1;

  if v_figma_user_id is null
    or v_builder_profile_id is null
    or coalesce(pg_catalog.length(p_access_token_ciphertext), 0) < 16
    or p_access_token_ciphertext !~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or coalesce(pg_catalog.length(p_refresh_token_ciphertext), 0) < 16
    or p_refresh_token_ciphertext !~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    or p_access_token_expires_at is null
    or p_access_token_expires_at <= pg_catalog.now()
    or p_encryption_key_version is null
    or p_encryption_key_version <= 0 then
    raise exception using errcode = '22023', message = 'invalid_figma_refresh';
  end if;

  update private.figma_oauth_credentials fc
  set access_token_ciphertext = p_access_token_ciphertext,
      refresh_token_ciphertext = p_refresh_token_ciphertext,
      access_token_expires_at = p_access_token_expires_at,
      encryption_key_version = p_encryption_key_version,
      credential_version = fc.credential_version + 1,
      refresh_lock_id = null,
      refresh_lock_expires_at = null
  where fc.figma_user_id = v_figma_user_id
    and fc.created_by_builder_profile_id = v_builder_profile_id
    and fc.status = 'active'
    and fc.refresh_lock_id = p_lock_id
    and fc.refresh_lock_expires_at > pg_catalog.now()
    and fc.credential_version = p_expected_credential_version
    and exists (
      select 1
      from public.builder_profiles bp
      join public.user_profiles up on up.id = bp.user_profile_id
      where bp.id = fc.created_by_builder_profile_id
        and up.auth_user_id = auth.uid()
    )
  returning fc.credential_version into v_new_version;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'refresh_conflict');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'credential_version', v_new_version
  );
end;
$$;

create or replace function public.release_figma_oauth_refresh(
  p_project_link_id uuid,
  p_lock_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_figma_user_id text;
  v_builder_profile_id uuid;
begin
  select pl.project_id
    into v_project_id
  from public.project_links pl
  where pl.id = p_project_link_id
    and pl.link_type = 'figma'
    and pl.archived_at is null;

  if v_project_id is null or not public.is_project_owner(v_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  select ib.external_connection_id, ib.created_by_builder_profile_id
    into v_figma_user_id, v_builder_profile_id
  from public.integration_bindings ib
  where ib.project_link_id = p_project_link_id
    and ib.provider = 'figma'
    and ib.status = 'active'
    and ib.archived_at is null
  limit 1;

  if v_figma_user_id is not null and v_builder_profile_id is not null then
    update private.figma_oauth_credentials fc
    set refresh_lock_id = null,
        refresh_lock_expires_at = null
    where fc.figma_user_id = v_figma_user_id
      and fc.created_by_builder_profile_id = v_builder_profile_id
      and fc.status = 'active'
      and fc.refresh_lock_id = p_lock_id
      and exists (
        select 1
        from public.builder_profiles bp
        join public.user_profiles up on up.id = bp.user_profile_id
        where bp.id = fc.created_by_builder_profile_id
          and up.auth_user_id = auth.uid()
      );
  end if;

  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

create or replace function public.disconnect_figma_oauth_authorization(p_project_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_binding_id uuid;
  v_figma_user_id text;
  v_builder_profile_id uuid;
  v_remaining_bindings bigint;
  v_credential_disconnected boolean := false;
  v_now timestamptz := pg_catalog.now();
begin
  select pl.project_id
    into v_project_id
  from public.project_links pl
  where pl.id = p_project_link_id
    and pl.link_type = 'figma'
    and pl.archived_at is null;

  if v_project_id is null or not public.is_project_owner(v_project_id) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  select ib.id, ib.external_connection_id, ib.created_by_builder_profile_id
    into v_binding_id, v_figma_user_id, v_builder_profile_id
  from public.integration_bindings ib
  where ib.project_link_id = p_project_link_id
    and ib.provider = 'figma'
    and ib.status = 'active'
    and ib.archived_at is null
  limit 1;

  if v_binding_id is null then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'credential_disconnected', false,
      'remaining_binding_count', 0
    );
  end if;

  if not exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = v_builder_profile_id
      and up.auth_user_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'not_allowed';
  end if;

  update public.integration_bindings
  set status = 'disconnected',
      archived_at = v_now
  where id = v_binding_id;

  select pg_catalog.count(*)
    into v_remaining_bindings
  from public.integration_bindings ib
  where ib.provider = 'figma'
    and ib.external_connection_id = v_figma_user_id
    and ib.status = 'active'
    and ib.archived_at is null
    and ib.created_by_builder_profile_id = v_builder_profile_id;

  if v_remaining_bindings = 0 then
    update private.figma_oauth_credentials fc
    set access_token_ciphertext = null,
        refresh_token_ciphertext = null,
        access_token_expires_at = null,
        credential_version = fc.credential_version + 1,
        status = 'disconnected',
        refresh_lock_id = null,
        refresh_lock_expires_at = null,
        disconnected_at = v_now
    where fc.figma_user_id = v_figma_user_id
      and fc.created_by_builder_profile_id = v_builder_profile_id
      and fc.status = 'active';

    if found then
      v_credential_disconnected := true;
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'credential_disconnected', v_credential_disconnected,
    'remaining_binding_count', v_remaining_bindings
  );
end;
$$;

revoke execute on function public.save_figma_oauth_authorization(
  uuid, uuid, text, text, text, text, text, text, text, timestamptz, smallint
) from public, anon, authenticated;
revoke execute on function public.get_figma_oauth_credential(uuid)
  from public, anon, authenticated;
revoke execute on function public.claim_figma_oauth_refresh(uuid)
  from public, anon, authenticated;
revoke execute on function public.complete_figma_oauth_refresh(
  uuid, uuid, bigint, text, text, timestamptz, smallint
) from public, anon, authenticated;
revoke execute on function public.release_figma_oauth_refresh(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.disconnect_figma_oauth_authorization(uuid)
  from public, anon, authenticated;

grant execute on function public.save_figma_oauth_authorization(
  uuid, uuid, text, text, text, text, text, text, text, timestamptz, smallint
) to authenticated;
grant execute on function public.get_figma_oauth_credential(uuid)
  to authenticated;
grant execute on function public.claim_figma_oauth_refresh(uuid)
  to authenticated;
grant execute on function public.complete_figma_oauth_refresh(
  uuid, uuid, bigint, text, text, timestamptz, smallint
) to authenticated;
grant execute on function public.release_figma_oauth_refresh(uuid, uuid)
  to authenticated;
grant execute on function public.disconnect_figma_oauth_authorization(uuid)
  to authenticated;

do $$
begin
  if has_schema_privilege('anon', 'private', 'USAGE')
    or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'Figma credential private schema must not be browser-usable';
  end if;

  if has_table_privilege('anon', 'private.figma_oauth_credentials', 'SELECT')
    or has_table_privilege('authenticated', 'private.figma_oauth_credentials', 'SELECT')
    or has_table_privilege('authenticated', 'private.figma_oauth_credentials', 'INSERT')
    or has_table_privilege('authenticated', 'private.figma_oauth_credentials', 'UPDATE')
    or has_table_privilege('authenticated', 'private.figma_oauth_credentials', 'DELETE') then
    raise exception 'Direct Figma credential table privilege must remain denied';
  end if;
end
$$;

commit;
