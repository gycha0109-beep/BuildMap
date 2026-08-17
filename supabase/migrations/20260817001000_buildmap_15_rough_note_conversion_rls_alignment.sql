-- BuildMap migration 15
-- Allow the atomic AI Draft -> Change Card conversion RPC to mark its source Rough Note as converted.
-- The existing UPDATE policy intentionally permits edits only while the note is unconverted,
-- but its WITH CHECK also required converted_to_change_card_at to remain NULL, which made
-- the one-way conversion marker impossible under SECURITY INVOKER.

begin;

drop policy if exists rough_notes_update_owner_unconverted_draft
  on public.rough_notes;

create policy rough_notes_update_owner_unconverted_draft
on public.rough_notes
for update
to authenticated
using (
  public.is_project_owner(project_id)
  and converted_to_change_card_at is null
)
with check (
  public.is_project_owner(project_id)
);

commit;
