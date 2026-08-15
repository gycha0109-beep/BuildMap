-- BuildMap migration 11
-- Align authenticated table privileges with the existing RLS policy surface.
-- Existing migrations 00-10 remain immutable.

begin;

grant update on table public.user_profiles to authenticated;
grant update on table public.builder_profiles to authenticated;
grant insert, update on table public.projects to authenticated;

do $$
begin
  if not has_table_privilege('authenticated', 'public.user_profiles', 'UPDATE') then
    raise exception 'authenticated UPDATE privilege missing on public.user_profiles';
  end if;

  if not has_table_privilege('authenticated', 'public.builder_profiles', 'UPDATE') then
    raise exception 'authenticated UPDATE privilege missing on public.builder_profiles';
  end if;

  if not has_table_privilege('authenticated', 'public.projects', 'INSERT') then
    raise exception 'authenticated INSERT privilege missing on public.projects';
  end if;

  if not has_table_privilege('authenticated', 'public.projects', 'UPDATE') then
    raise exception 'authenticated UPDATE privilege missing on public.projects';
  end if;
end
$$;

commit;
