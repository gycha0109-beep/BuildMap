-- Isolated PostgreSQL-only stand-in for the existing BuildMap parent tables and auth.
-- This fixture is NEVER applied to the hosted Supabase project.

create role authenticated nologin;
create role anon nologin;
create schema auth;
grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant execute on function auth.uid() to authenticated, anon;

create table auth.users (id uuid primary key);
create table public.user_profiles (
  id uuid primary key,
  auth_user_id uuid not null unique references auth.users(id)
);
create table public.builder_profiles (
  id uuid primary key,
  user_profile_id uuid not null unique references public.user_profiles(id)
);
create table public.projects (
  id uuid primary key,
  owner_builder_profile_id uuid not null references public.builder_profiles(id),
  archived_at timestamptz
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    join public.builder_profiles bp on bp.id = p.owner_builder_profile_id
    join public.user_profiles up on up.id = bp.user_profile_id
    where p.id = p_project_id
      and p.archived_at is null
      and up.auth_user_id = auth.uid()
  );
$$;

revoke execute on function public.is_project_owner(uuid) from public, anon, authenticated;
grant execute on function public.is_project_owner(uuid) to authenticated;
grant select on public.user_profiles, public.builder_profiles, public.projects to authenticated;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000111'),
  ('00000000-0000-4000-8000-000000000222');
insert into public.user_profiles (id, auth_user_id) values
  ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000111'),
  ('00000000-0000-4000-8000-000000000322', '00000000-0000-4000-8000-000000000222');
insert into public.builder_profiles (id, user_profile_id) values
  ('00000000-0000-4000-8000-000000000411', '00000000-0000-4000-8000-000000000311'),
  ('00000000-0000-4000-8000-000000000422', '00000000-0000-4000-8000-000000000322');
insert into public.projects (id, owner_builder_profile_id) values
  ('00000000-0000-4000-8000-000000000511', '00000000-0000-4000-8000-000000000411'),
  ('00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000422');
