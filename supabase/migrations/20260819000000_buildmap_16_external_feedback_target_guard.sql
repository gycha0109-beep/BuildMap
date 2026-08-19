-- Phase 38 External Feedback target-visibility hardening.
-- Additive migration after historical 00-10 and post-Phase31 migrations 11-15.
-- This migration is committed for controlled promotion; it is not applied to any live DB by this change.

-- Public source-table reads must not reveal a Request whose linked Decision is
-- no longer public-safe. Project-level Requests remain eligible.
drop policy if exists feedback_requests_select_public_draft
on public.feedback_requests;

create policy feedback_requests_select_public_draft
on public.feedback_requests
for select
to anon, authenticated
using (
  visibility_status = 'public'
  and status = 'open'
  and archived_at is null
  and public.can_read_public_project(project_id)
  and (
    change_card_id is null
    or public.can_read_public_change_card(change_card_id)
  )
);

-- Feedback insert authorization must re-check the current target Decision,
-- not only the Request and Project. This prevents stale Request IDs from being
-- used after the target Decision has been hidden or marked sensitive.
create or replace function public.can_insert_feedback(
  p_feedback_request_id uuid,
  p_author_user_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.feedback_requests fr
    join public.projects p on p.id = fr.project_id
    left join public.change_cards cc
      on cc.id = fr.change_card_id
     and cc.project_id = fr.project_id
    where fr.id = p_feedback_request_id
      and fr.visibility_status = 'public'
      and fr.status = 'open'
      and fr.archived_at is null
      and p.visibility_status = 'public'
      and p.archived_at is null
      and p_author_user_profile_id = public.current_user_profile_id()
      and (
        fr.change_card_id is null
        or (
          cc.id is not null
          and cc.work_status = 'approved'
          and cc.visibility_status = 'published'
          and cc.sensitivity_status = 'normal'
          and cc.archived_at is null
        )
      )
  )
$$;

revoke execute on function public.can_insert_feedback(uuid, uuid) from public, anon;
grant execute on function public.can_insert_feedback(uuid, uuid) to authenticated;
