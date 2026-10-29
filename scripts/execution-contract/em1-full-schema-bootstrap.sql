-- Disposable full BuildMap migration rehearsal bootstrap.
-- Models the minimal Supabase auth.uid() / role / pgcrypto environment.
-- Never run against the connected hosted BuildMap Supabase project.
-- Roles already created cluster-wide by em1-bootstrap.sql in the first CI database.
create schema auth;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;
create table auth.users (id uuid primary key);
create function auth.uid()
returns uuid language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
