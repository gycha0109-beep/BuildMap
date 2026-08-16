-- BuildMap additive migration 13
-- Atomically convert a Builder-owned AI Structured Draft into an editable Change Card draft.

create or replace function public.convert_ai_draft_to_change_card(
  p_ai_draft_id uuid,
  p_card_type text,
  p_title text,
  p_structured_summary text,
  p_evidence text,
  p_decision text,
  p_change_content text,
  p_next_check text,
  p_linked_problem_definition_id uuid,
  p_linked_hypothesis_id uuid,
  p_importance text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_project_id uuid;
  v_rough_note_id uuid;
  v_author_builder_profile_id uuid;
  v_change_card_id uuid;
begin
  if p_ai_draft_id is null then
    raise exception 'AI Draft id is required.';
  end if;

  if p_card_type not in (
    'problem_found',
    'problem_definition_changed',
    'hypothesis_created',
    'hypothesis_refuted',
    'experiment',
    'user_feedback',
    'feature_added',
    'feature_removed',
    'decision_kept',
    'decision_changed',
    'pivot',
    'release',
    'handoff_note'
  ) then
    raise exception 'Unsupported Change Card type.';
  end if;

  if p_importance not in ('normal', 'major_turning_point') then
    raise exception 'Unsupported Change Card importance.';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Change Card title is required.';
  end if;

  if nullif(btrim(p_structured_summary), '') is null then
    raise exception 'Change Card structured summary is required.';
  end if;

  select d.project_id, d.rough_note_id, p.owner_builder_profile_id
    into v_project_id, v_rough_note_id, v_author_builder_profile_id
  from public.ai_structured_drafts d
  join public.projects p on p.id = d.project_id
  where d.id = p_ai_draft_id
    and d.archived_at is null
    and d.converted_change_card_id is null
    and d.status in ('generated', 'editing')
    and public.is_project_owner(d.project_id)
  for update of d;

  if not found then
    raise exception 'AI Draft is unavailable for conversion.';
  end if;

  if v_rough_note_id is not null then
    perform 1
    from public.rough_notes rn
    where rn.id = v_rough_note_id
      and rn.project_id = v_project_id
      and rn.archived_at is null
      and rn.converted_to_change_card_at is null
    for update;

    if not found then
      raise exception 'Source Rough Note is unavailable for conversion.';
    end if;
  end if;

  if p_linked_problem_definition_id is not null and not exists (
    select 1
    from public.problem_definitions pd
    where pd.id = p_linked_problem_definition_id
      and pd.project_id = v_project_id
      and pd.archived_at is null
  ) then
    raise exception 'Linked Problem Definition does not belong to this Project.';
  end if;

  if p_linked_hypothesis_id is not null and not exists (
    select 1
    from public.hypotheses h
    where h.id = p_linked_hypothesis_id
      and h.project_id = v_project_id
      and h.archived_at is null
  ) then
    raise exception 'Linked Hypothesis does not belong to this Project.';
  end if;

  insert into public.change_cards (
    project_id,
    author_builder_profile_id,
    rough_note_id,
    ai_draft_id,
    card_type,
    title,
    structured_summary,
    evidence,
    decision,
    change_content,
    next_check,
    linked_problem_definition_id,
    linked_hypothesis_id,
    work_status,
    visibility_status,
    sensitivity_status,
    importance
  ) values (
    v_project_id,
    v_author_builder_profile_id,
    v_rough_note_id,
    p_ai_draft_id,
    p_card_type,
    btrim(p_title),
    btrim(p_structured_summary),
    nullif(btrim(p_evidence), ''),
    nullif(btrim(p_decision), ''),
    nullif(btrim(p_change_content), ''),
    nullif(btrim(p_next_check), ''),
    p_linked_problem_definition_id,
    p_linked_hypothesis_id,
    'draft',
    'internal',
    'normal',
    p_importance
  )
  returning id into v_change_card_id;

  update public.ai_structured_drafts
  set status = 'converted_to_change_card',
      converted_change_card_id = v_change_card_id
  where id = p_ai_draft_id;

  if v_rough_note_id is not null then
    update public.rough_notes
    set converted_to_change_card_at = now()
    where id = v_rough_note_id
      and project_id = v_project_id
      and converted_to_change_card_at is null;
  end if;

  return v_change_card_id;
end;
$$;

revoke all on function public.convert_ai_draft_to_change_card(
  uuid, text, text, text, text, text, text, text, uuid, uuid, text
) from public;
revoke all on function public.convert_ai_draft_to_change_card(
  uuid, text, text, text, text, text, text, text, uuid, uuid, text
) from anon;
grant execute on function public.convert_ai_draft_to_change_card(
  uuid, text, text, text, text, text, text, text, uuid, uuid, text
) to authenticated;
