-- BuildMap migration 12
-- Reduce public relation ACLs to the operation surface already intended by RLS/views.
-- Existing migrations 00-11 remain immutable.

begin;

-- Source tables: anonymous users must use public-safe views/RPCs.
-- Authenticated users receive only the CRUD operations represented by the existing
-- RLS policy surface. RLS remains the row-level authorization boundary.
revoke all privileges on table
  public.user_profiles,
  public.builder_profiles,
  public.projects,
  public.problem_definitions,
  public.hypotheses,
  public.rough_notes,
  public.ai_structured_drafts,
  public.change_cards,
  public.feedback_requests,
  public.feedbacks,
  public.project_links
from anon, authenticated;

grant select, insert, update on table
  public.user_profiles,
  public.builder_profiles,
  public.projects,
  public.problem_definitions,
  public.hypotheses,
  public.rough_notes,
  public.ai_structured_drafts,
  public.change_cards,
  public.feedback_requests,
  public.feedbacks,
  public.project_links
 to authenticated;

-- Public-safe views are read-only boundaries for both anonymous and authenticated users.
revoke all privileges on table
  public.public_builder_profiles,
  public.public_project_cards,
  public.public_project_pages,
  public.public_decision_timeline,
  public.public_change_cards,
  public.public_feedback_requests,
  public.public_feedbacks,
  public.public_project_links
from anon, authenticated;

grant select on table
  public.public_builder_profiles,
  public.public_project_cards,
  public.public_project_pages,
  public.public_decision_timeline,
  public.public_change_cards,
  public.public_feedback_requests,
  public.public_feedbacks,
  public.public_project_links
 to anon, authenticated;

do $$
declare
  source_name text;
  view_name text;
  forbidden_privilege text;
begin
  foreach source_name in array array[
    'user_profiles',
    'builder_profiles',
    'projects',
    'problem_definitions',
    'hypotheses',
    'rough_notes',
    'ai_structured_drafts',
    'change_cards',
    'feedback_requests',
    'feedbacks',
    'project_links'
  ] loop
    if not has_table_privilege('authenticated', 'public.' || source_name, 'SELECT')
      or not has_table_privilege('authenticated', 'public.' || source_name, 'INSERT')
      or not has_table_privilege('authenticated', 'public.' || source_name, 'UPDATE') then
      raise exception 'authenticated source-table CRUD privilege missing on public.%', source_name;
    end if;

    foreach forbidden_privilege in array array[
      'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'
    ] loop
      if has_table_privilege('authenticated', 'public.' || source_name, forbidden_privilege) then
        raise exception 'unexpected authenticated % privilege on public.%', forbidden_privilege, source_name;
      end if;
    end loop;

    if has_table_privilege('anon', 'public.' || source_name, 'SELECT')
      or has_table_privilege('anon', 'public.' || source_name, 'INSERT')
      or has_table_privilege('anon', 'public.' || source_name, 'UPDATE')
      or has_table_privilege('anon', 'public.' || source_name, 'DELETE')
      or has_table_privilege('anon', 'public.' || source_name, 'TRUNCATE')
      or has_table_privilege('anon', 'public.' || source_name, 'REFERENCES')
      or has_table_privilege('anon', 'public.' || source_name, 'TRIGGER')
      or has_table_privilege('anon', 'public.' || source_name, 'MAINTAIN') then
      raise exception 'anonymous source-table privilege remains on public.%', source_name;
    end if;
  end loop;

  foreach view_name in array array[
    'public_builder_profiles',
    'public_project_cards',
    'public_project_pages',
    'public_decision_timeline',
    'public_change_cards',
    'public_feedback_requests',
    'public_feedbacks',
    'public_project_links'
  ] loop
    if not has_table_privilege('anon', 'public.' || view_name, 'SELECT')
      or not has_table_privilege('authenticated', 'public.' || view_name, 'SELECT') then
      raise exception 'public-safe view SELECT privilege missing on public.%', view_name;
    end if;

    foreach forbidden_privilege in array array[
      'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'
    ] loop
      if has_table_privilege('anon', 'public.' || view_name, forbidden_privilege)
        or has_table_privilege('authenticated', 'public.' || view_name, forbidden_privilege) then
        raise exception 'unexpected % privilege on public-safe view public.%', forbidden_privilege, view_name;
      end if;
    end loop;
  end loop;
end
$$;

commit;
