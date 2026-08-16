-- BuildMap additive migration 14
-- Align Project INSERT ownership with the existing SECURITY DEFINER ownership helper.
-- Historical migrations 00-13 remain immutable.

begin;

drop policy if exists projects_insert_owner_builder_draft on public.projects;

create policy projects_insert_owner_builder_draft
on public.projects
for insert
to authenticated
with check (
  public.is_project_owner_by_builder(owner_builder_profile_id)
);

commit;
