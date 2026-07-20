-- ============================================================================
-- DRAFT ONLY - DO NOT APPLY TO REMOTE/STAGING/PRODUCTION
-- BuildMap Phase27.1 P1 Access & Integrity Hardening
-- Depends on migration drafts 00 through 08.
-- Local disposable Supabase verification only.
-- ============================================================================

-- Purpose:
--   1. remove authenticated direct UPDATE access to internal identity/token fields;
--   2. align public source-table RLS with archived and linked Change Card boundaries;
--   3. bind creator/author identities to the current authenticated Builder;
--   4. harden Feedback Request target validation against caller RLS visibility;
--   5. make approved Change Card evidence and approval metadata immutable.

-- ----------------------------------------------------------------------------
-- Authenticated column-level UPDATE surface
-- ----------------------------------------------------------------------------
-- Existing migration 08 granted table-wide UPDATE. Replace it with explicit
-- self-service/product-editable columns for profiles and projects.

revoke update on table public.user_profiles from authenticated;
grant update (display_name, avatar_url)
  on table public.user_profiles to authenticated;

revoke update on table public.builder_profiles from authenticated;
grant update (public_display_name, bio, role_tags, interest_tags, is_public)
  on table public.builder_profiles to authenticated;

revoke insert on table public.projects from authenticated;
grant insert (
  id,
  owner_builder_profile_id,
  title,
  one_line_description,
  current_need_summary,
  lifecycle_status,
  visibility_status,
  public_slug,
  last_activity_at,
  archived_at
) on table public.projects to authenticated;

revoke update on table public.projects from authenticated;
grant update (
  title,
  one_line_description,
  current_need_summary,
  lifecycle_status,
  visibility_status,
  public_slug,
  last_activity_at,
  archived_at
) on table public.projects to authenticated;

-- owner_builder_profile_id and all share_token_* columns remain writable only
-- through privileged/admin paths or the Phase24 SECURITY DEFINER lifecycle RPCs.

-- ----------------------------------------------------------------------------
-- Harden helper functions used by P1 public/read/write policies
-- ----------------------------------------------------------------------------

create or replace function public.is_project_owner_by_builder(p_builder_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.builder_profiles bp
    join public.user_profiles up on up.id = bp.user_profile_id
    where bp.id = p_builder_profile_id
      and up.auth_user_id = auth.uid()
  )
$$;

revoke execute on function public.is_project_owner_by_builder(uuid)
  from public, anon, authenticated;
grant execute on function public.is_project_owner_by_builder(uuid)
  to authenticated;

create or replace function public.can_read_public_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.visibility_status = 'public'
      and p.archived_at is null
  )
$$;

create or replace function public.can_read_public_change_card(p_change_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.change_cards cc
    join public.projects p on p.id = cc.project_id
    where cc.id = p_change_card_id
      and p.visibility_status = 'public'
      and p.archived_at is null
      and cc.work_status = 'approved'
      and cc.visibility_status = 'published'
      and cc.sensitivity_status = 'normal'
      and cc.archived_at is null
  )
$$;

revoke execute on function public.can_read_public_project(uuid)
  from public, anon, authenticated;
revoke execute on function public.can_read_public_change_card(uuid)
  from public, anon, authenticated;
grant execute on function public.can_read_public_project(uuid)
  to anon, authenticated;
grant execute on function public.can_read_public_change_card(uuid)
  to anon, authenticated;

create or replace function public.can_insert_feedback(
  p_feedback_request_id uuid,
  p_author_user_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.feedback_requests fr
    join public.projects p on p.id = fr.project_id
    where fr.id = p_feedback_request_id
      and fr.visibility_status = 'public'
      and fr.status = 'open'
      and fr.archived_at is null
      and p.visibility_status = 'public'
      and p.archived_at is null
      and p_author_user_profile_id = public.current_user_profile_id()
      and (
        fr.change_card_id is null
        or public.can_read_public_change_card(fr.change_card_id)
      )
  )
$$;

create or replace function public.can_read_feedback(p_feedback_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from public.feedbacks f
    join public.feedback_requests fr on fr.id = f.feedback_request_id
    join public.projects p on p.id = fr.project_id
    where f.id = p_feedback_id
      and f.archived_at is null
      and (
        f.author_user_profile_id = public.current_user_profile_id()
        or public.is_project_owner(p.id)
        or (
          f.visibility_status = 'public_selected'
          and fr.visibility_status = 'public'
          and fr.status = 'open'
          and fr.archived_at is null
          and p.visibility_status = 'public'
          and p.archived_at is null
          and (
            fr.change_card_id is null
            or public.can_read_public_change_card(fr.change_card_id)
          )
        )
      )
  )
$$;

revoke execute on function public.can_insert_feedback(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.can_read_feedback(uuid)
  from public, anon, authenticated;
grant execute on function public.can_insert_feedback(uuid, uuid)
  to authenticated;
grant execute on function public.can_read_feedback(uuid)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Public source-table RLS parity and creator/author binding
-- ----------------------------------------------------------------------------

-- Problem Definitions

drop policy if exists problem_definitions_select_public_draft
  on public.problem_definitions;
create policy problem_definitions_select_public_draft
on public.problem_definitions
for select
to anon, authenticated
using (
  archived_at is null
  and public.can_read_public_project(project_id)
);

drop policy if exists problem_definitions_insert_owner_draft
  on public.problem_definitions;
create policy problem_definitions_insert_owner_draft
on public.problem_definitions
for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

drop policy if exists problem_definitions_update_owner_draft
  on public.problem_definitions;
create policy problem_definitions_update_owner_draft
on public.problem_definitions
for update
to authenticated
using (public.is_project_owner(project_id))
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

-- Hypotheses

drop policy if exists hypotheses_select_public_draft
  on public.hypotheses;
create policy hypotheses_select_public_draft
on public.hypotheses
for select
to anon, authenticated
using (
  archived_at is null
  and public.can_read_public_project(project_id)
);

drop policy if exists hypotheses_insert_owner_draft
  on public.hypotheses;
create policy hypotheses_insert_owner_draft
on public.hypotheses
for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

drop policy if exists hypotheses_update_owner_draft
  on public.hypotheses;
create policy hypotheses_update_owner_draft
on public.hypotheses
for update
to authenticated
using (public.is_project_owner(project_id))
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

-- Feedback Requests

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

drop policy if exists feedback_requests_insert_owner_draft
  on public.feedback_requests;
create policy feedback_requests_insert_owner_draft
on public.feedback_requests
for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

drop policy if exists feedback_requests_update_owner_draft
  on public.feedback_requests;
create policy feedback_requests_update_owner_draft
on public.feedback_requests
for update
to authenticated
using (public.is_project_owner(project_id))
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

-- Project Links

drop policy if exists project_links_insert_owner_draft
  on public.project_links;
create policy project_links_insert_owner_draft
on public.project_links
for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

drop policy if exists project_links_update_owner_draft
  on public.project_links;
create policy project_links_update_owner_draft
on public.project_links
for update
to authenticated
using (public.is_project_owner(project_id))
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(created_by_builder_profile_id)
);

-- Change Cards

drop policy if exists change_cards_insert_owner_draft
  on public.change_cards;
create policy change_cards_insert_owner_draft
on public.change_cards
for insert
to authenticated
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(author_builder_profile_id)
  and work_status <> 'approved'
  and approved_by_builder_profile_id is null
  and approved_at is null
);

drop policy if exists change_cards_update_owner_draft
  on public.change_cards;
create policy change_cards_update_owner_draft
on public.change_cards
for update
to authenticated
using (public.is_project_owner(project_id))
with check (
  public.is_project_owner(project_id)
  and public.is_project_owner_by_builder(author_builder_profile_id)
);

-- ----------------------------------------------------------------------------
-- Immutable record identity evidence
-- ----------------------------------------------------------------------------

create or replace function public.prevent_p1_record_identity_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if tg_table_name = 'problem_definitions' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.project_id is distinct from old.project_id
      or new.created_by_builder_profile_id is distinct from old.created_by_builder_profile_id
    then
      raise exception 'Problem Definition project/creator identity cannot be modified directly.';
    end if;
  elsif tg_table_name = 'hypotheses' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.project_id is distinct from old.project_id
      or new.created_by_builder_profile_id is distinct from old.created_by_builder_profile_id
    then
      raise exception 'Hypothesis project/creator identity cannot be modified directly.';
    end if;
  elsif tg_table_name = 'feedback_requests' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.project_id is distinct from old.project_id
      or new.created_by_builder_profile_id is distinct from old.created_by_builder_profile_id
    then
      raise exception 'Feedback Request project/creator identity cannot be modified directly.';
    end if;
  elsif tg_table_name = 'project_links' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.project_id is distinct from old.project_id
      or new.created_by_builder_profile_id is distinct from old.created_by_builder_profile_id
    then
      raise exception 'Project Link project/creator identity cannot be modified directly.';
    end if;
  elsif tg_table_name = 'change_cards' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.project_id is distinct from old.project_id
      or new.author_builder_profile_id is distinct from old.author_builder_profile_id
    then
      raise exception 'Change Card project/author identity cannot be modified directly.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_p1_record_identity_mutation()
  from public, anon, authenticated;

drop trigger if exists problem_definitions_prevent_identity_mutation_draft
  on public.problem_definitions;
create trigger problem_definitions_prevent_identity_mutation_draft
before update on public.problem_definitions
for each row execute function public.prevent_p1_record_identity_mutation();

drop trigger if exists hypotheses_prevent_identity_mutation_draft
  on public.hypotheses;
create trigger hypotheses_prevent_identity_mutation_draft
before update on public.hypotheses
for each row execute function public.prevent_p1_record_identity_mutation();

drop trigger if exists feedback_requests_prevent_identity_mutation_draft
  on public.feedback_requests;
create trigger feedback_requests_prevent_identity_mutation_draft
before update on public.feedback_requests
for each row execute function public.prevent_p1_record_identity_mutation();

drop trigger if exists project_links_prevent_identity_mutation_draft
  on public.project_links;
create trigger project_links_prevent_identity_mutation_draft
before update on public.project_links
for each row execute function public.prevent_p1_record_identity_mutation();

drop trigger if exists change_cards_prevent_identity_mutation_draft
  on public.change_cards;
create trigger change_cards_prevent_identity_mutation_draft
before update on public.change_cards
for each row execute function public.prevent_p1_record_identity_mutation();

-- ----------------------------------------------------------------------------
-- Feedback Request target validation independent of caller RLS visibility
-- ----------------------------------------------------------------------------

create or replace function public.validate_feedback_request_target_project()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_change_card_project_id uuid;
  v_change_card_archived_at timestamptz;
begin
  if new.change_card_id is null then
    return new;
  end if;

  select cc.project_id, cc.archived_at
  into v_change_card_project_id, v_change_card_archived_at
  from public.change_cards cc
  where cc.id = new.change_card_id;

  if v_change_card_project_id is null
    or v_change_card_archived_at is not null
    or v_change_card_project_id is distinct from new.project_id
  then
    raise exception 'Feedback Request target Change Card is invalid for this Project.';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_feedback_request_target_project()
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Approved Change Card lifecycle and immutable evidence boundary
-- ----------------------------------------------------------------------------

create or replace function public.prevent_approved_change_card_content_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if old.work_status = 'approved' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.project_id is distinct from old.project_id
      or new.author_builder_profile_id is distinct from old.author_builder_profile_id
      or new.rough_note_id is distinct from old.rough_note_id
      or new.ai_draft_id is distinct from old.ai_draft_id
      or new.card_type is distinct from old.card_type
      or new.title is distinct from old.title
      or new.structured_summary is distinct from old.structured_summary
      or new.evidence is distinct from old.evidence
      or new.decision is distinct from old.decision
      or new.change_content is distinct from old.change_content
      or new.next_check is distinct from old.next_check
      or new.linked_problem_definition_id is distinct from old.linked_problem_definition_id
      or new.linked_hypothesis_id is distinct from old.linked_hypothesis_id
      or new.linked_feedback_id is distinct from old.linked_feedback_id
      or new.approved_at is distinct from old.approved_at
      or new.approved_by_builder_profile_id is distinct from old.approved_by_builder_profile_id
      or new.work_status is distinct from old.work_status
      or new.importance is distinct from old.importance
    then
      raise exception 'Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.';
    end if;

    return new;
  end if;

  if new.work_status = 'approved' then
    if new.approved_at is null then
      raise exception 'Approved Change Card requires approved_at.';
    end if;

    if new.approved_by_builder_profile_id is null
      or not public.is_project_owner_by_builder(new.approved_by_builder_profile_id)
    then
      raise exception 'Approved Change Card approver must match the current Project Owner Builder.';
    end if;
  elsif new.approved_at is not null or new.approved_by_builder_profile_id is not null then
    raise exception 'Non-approved Change Card cannot retain approval metadata.';
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_approved_change_card_content_mutation()
  from public, anon, authenticated;

-- Recreate explicitly to guarantee the patched function is bound to UPDATE.
drop trigger if exists change_cards_prevent_approved_content_mutation_draft
  on public.change_cards;
create trigger change_cards_prevent_approved_content_mutation_draft
before update on public.change_cards
for each row execute function public.prevent_approved_change_card_content_mutation();

-- End Phase27.1 P1 access/integrity hardening draft.
