"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import {
  generateStructuredDraft,
  type ChangeCardType,
} from "@/lib/buildmap/ai-draft";
import { createClient } from "@/lib/supabase/server";

const hypothesisStatuses = new Set([
  "assumed",
  "validating",
  "partially_validated",
  "validated",
  "refuted",
  "held",
]);

const changeCardTypes = new Set<ChangeCardType>([
  "problem_found",
  "problem_definition_changed",
  "hypothesis_created",
  "hypothesis_refuted",
  "experiment",
  "user_feedback",
  "feature_added",
  "feature_removed",
  "decision_kept",
  "decision_changed",
  "pivot",
  "release",
  "handoff_note",
]);

const importanceValues = new Set(["normal", "major_turning_point"]);

async function ownedProjectContext(projectId: string) {
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data.user) {
    redirect("/login");
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) {
    redirect("/dashboard?error=project-access");
  }

  return { supabase, context };
}

function workspaceWritePath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/workspace`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function workspaceReviewPath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/workspace/review`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function decisionsPath(projectId: string) {
  return `/projects/${projectId}/decisions`;
}

function revalidateProjectSurfaces(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(workspaceWritePath(projectId));
  revalidatePath(workspaceReviewPath(projectId));
  revalidatePath(decisionsPath(projectId));
}

function boundedText(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length <= maxLength ? value : null;
}

function aiFailureCategory(error: unknown) {
  const errorObject =
    error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const causeObject =
    errorObject?.cause && typeof errorObject.cause === "object"
      ? (errorObject.cause as Record<string, unknown>)
      : null;
  const statusCode =
    typeof errorObject?.statusCode === "number"
      ? errorObject.statusCode
      : typeof causeObject?.statusCode === "number"
        ? causeObject.statusCode
        : null;
  const code =
    typeof errorObject?.code === "string"
      ? errorObject.code
      : typeof causeObject?.code === "string"
        ? causeObject.code
        : null;
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : String(error);

  console.error("BuildMap AI draft generation failed", {
    name,
    statusCode,
    code,
    message,
  });

  if (statusCode === 401) return "AI Gateway authentication failed (401).";
  if (statusCode === 402) return "AI Gateway credits or billing are unavailable (402).";
  if (statusCode === 403) return "AI Gateway access was denied (403).";
  if (statusCode === 404) return "AI Gateway model or endpoint was not found (404).";
  if (statusCode === 429) return "AI Gateway rate limit was exceeded (429).";
  if (statusCode) return `AI Gateway request failed (${statusCode}).`;
  if (code) return `AI generation failed (${code}).`;
  return `AI generation failed (${name}).`;
}

export async function saveProblemDefinitionAction(
  projectId: string,
  formData: FormData,
) {
  const currentText = String(formData.get("currentText") ?? "").trim();
  if (!currentText || currentText.length > 4000) {
    redirect(workspaceWritePath(projectId, "invalid-problem"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const existing = await supabase
    .from("problem_definitions")
    .select("id")
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    redirect(workspaceWritePath(projectId, "problem-save"));
  }

  const saved = existing.data
    ? await supabase
        .from("problem_definitions")
        .update({ current_text: currentText })
        .eq("id", existing.data.id)
    : await supabase.from("problem_definitions").insert({
        project_id: projectId,
        current_text: currentText,
        created_by_builder_profile_id: context.builderProfileId,
      });

  if (saved.error) {
    redirect(workspaceWritePath(projectId, "problem-save"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceWritePath(projectId));
}

export async function createHypothesisAction(
  projectId: string,
  formData: FormData,
) {
  const statement = String(formData.get("statement") ?? "").trim();
  if (!statement || statement.length > 2000) {
    redirect(workspaceWritePath(projectId, "invalid-hypothesis"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const inserted = await supabase.from("hypotheses").insert({
    project_id: projectId,
    statement,
    created_by_builder_profile_id: context.builderProfileId,
  });

  if (inserted.error) {
    redirect(workspaceWritePath(projectId, "hypothesis-create"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceWritePath(projectId));
}

export async function updateHypothesisStatusAction(
  projectId: string,
  formData: FormData,
) {
  const hypothesisId = String(formData.get("hypothesisId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!hypothesisId || !hypothesisStatuses.has(status)) {
    redirect(workspaceWritePath(projectId, "invalid-hypothesis-status"));
  }

  const { supabase } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("hypotheses")
    .update({ status })
    .eq("id", hypothesisId)
    .eq("project_id", projectId);

  if (updated.error) {
    redirect(workspaceWritePath(projectId, "hypothesis-update"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceWritePath(projectId));
}

export async function createRoughNoteAction(
  projectId: string,
  formData: FormData,
) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 10000) {
    redirect(workspaceWritePath(projectId, "invalid-note"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const inserted = await supabase.from("rough_notes").insert({
    project_id: projectId,
    author_builder_profile_id: context.builderProfileId,
    body,
  });

  if (inserted.error) {
    redirect(workspaceWritePath(projectId, "note-create"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceWritePath(projectId));
}

export async function generateAiDraftAction(
  projectId: string,
  formData: FormData,
) {
  const roughNoteId = String(formData.get("roughNoteId") ?? "");
  if (!roughNoteId) {
    redirect(workspaceReviewPath(projectId, "invalid-ai-source"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const roughNote = await supabase
    .from("rough_notes")
    .select("id, body, converted_to_change_card_at")
    .eq("id", roughNoteId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (roughNote.error || !roughNote.data || roughNote.data.converted_to_change_card_at) {
    redirect(workspaceReviewPath(projectId, "invalid-ai-source"));
  }

  const activeDraft = await supabase
    .from("ai_structured_drafts")
    .select("id")
    .eq("rough_note_id", roughNoteId)
    .eq("project_id", projectId)
    .in("status", ["generating", "generated", "editing"])
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (activeDraft.error) {
    redirect(workspaceReviewPath(projectId, "ai-draft-create"));
  }
  if (activeDraft.data) {
    redirect(workspaceReviewPath(projectId, "ai-draft-exists"));
  }

  const failedDrafts = await supabase
    .from("ai_structured_drafts")
    .select("id")
    .eq("rough_note_id", roughNoteId)
    .eq("project_id", projectId)
    .eq("status", "failed")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (failedDrafts.error) {
    redirect(workspaceReviewPath(projectId, "ai-draft-create"));
  }

  let draftId: string;
  const retryDraft = failedDrafts.data?.[0];

  if (retryDraft) {
    const duplicateIds = (failedDrafts.data ?? []).slice(1).map((draft) => draft.id);
    if (duplicateIds.length > 0) {
      const archived = await supabase
        .from("ai_structured_drafts")
        .update({ archived_at: new Date().toISOString() })
        .in("id", duplicateIds)
        .eq("project_id", projectId)
        .eq("status", "failed");

      if (archived.error) {
        redirect(workspaceReviewPath(projectId, "ai-draft-create"));
      }
    }

    const reset = await supabase
      .from("ai_structured_drafts")
      .update({
        requested_by_builder_profile_id: context.builderProfileId,
        suggested_type: null,
        suggested_title: null,
        structured_summary: null,
        evidence: null,
        decision: null,
        change_content: null,
        next_check: null,
        status: "generating",
        error_message: null,
      })
      .eq("id", retryDraft.id)
      .eq("project_id", projectId)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();

    if (reset.error || !reset.data) {
      redirect(workspaceReviewPath(projectId, "ai-draft-create"));
    }
    draftId = reset.data.id;
  } else {
    const inserted = await supabase
      .from("ai_structured_drafts")
      .insert({
        project_id: projectId,
        rough_note_id: roughNoteId,
        requested_by_builder_profile_id: context.builderProfileId,
        status: "generating",
      })
      .select("id")
      .single();

    if (inserted.error) {
      redirect(workspaceReviewPath(projectId, "ai-draft-create"));
    }
    draftId = inserted.data.id;
  }

  try {
    const generated = await generateStructuredDraft(roughNote.data.body);
    const updated = await supabase
      .from("ai_structured_drafts")
      .update({
        suggested_type: generated.suggestedType,
        suggested_title: generated.suggestedTitle,
        structured_summary: generated.structuredSummary,
        evidence: generated.evidence || null,
        decision: generated.decision || null,
        change_content: generated.changeContent || null,
        next_check: generated.nextCheck || null,
        status: "generated",
        error_message: null,
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating")
      .select("id")
      .maybeSingle();

    if (updated.error || !updated.data) {
      redirect(workspaceReviewPath(projectId, "ai-draft-save"));
    }
  } catch (error) {
    const category = aiFailureCategory(error);

    await supabase
      .from("ai_structured_drafts")
      .update({ status: "failed", error_message: category })
      .eq("id", draftId)
      .eq("project_id", projectId);

    redirect(workspaceReviewPath(projectId, "ai-generation"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceReviewPath(projectId));
}

export async function updateAiDraftAction(
  projectId: string,
  formData: FormData,
) {
  const draftId = String(formData.get("draftId") ?? "");
  const suggestedType = String(formData.get("suggestedType") ?? "") as ChangeCardType;
  const suggestedTitle = boundedText(formData, "suggestedTitle", 500);
  const structuredSummary = boundedText(formData, "structuredSummary", 10000);
  const evidence = boundedText(formData, "evidence", 10000);
  const decision = boundedText(formData, "decision", 10000);
  const changeContent = boundedText(formData, "changeContent", 10000);
  const nextCheck = boundedText(formData, "nextCheck", 10000);

  if (
    !draftId ||
    !changeCardTypes.has(suggestedType) ||
    !suggestedTitle ||
    !structuredSummary ||
    evidence === null ||
    decision === null ||
    changeContent === null ||
    nextCheck === null
  ) {
    redirect(workspaceReviewPath(projectId, "invalid-ai-draft"));
  }

  const { supabase } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("ai_structured_drafts")
    .update({
      suggested_type: suggestedType,
      suggested_title: suggestedTitle,
      structured_summary: structuredSummary,
      evidence: evidence || null,
      decision: decision || null,
      change_content: changeContent || null,
      next_check: nextCheck || null,
      status: "editing",
      error_message: null,
    })
    .eq("id", draftId)
    .eq("project_id", projectId)
    .in("status", ["generated", "editing"])
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(workspaceReviewPath(projectId, "ai-draft-save"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceReviewPath(projectId));
}

export async function convertAiDraftAction(
  projectId: string,
  formData: FormData,
) {
  const draftId = String(formData.get("draftId") ?? "");
  const cardType = String(formData.get("suggestedType") ?? "") as ChangeCardType;
  const title = boundedText(formData, "suggestedTitle", 500);
  const summary = boundedText(formData, "structuredSummary", 10000);
  const evidence = boundedText(formData, "evidence", 10000);
  const decision = boundedText(formData, "decision", 10000);
  const changeContent = boundedText(formData, "changeContent", 10000);
  const nextCheck = boundedText(formData, "nextCheck", 10000);
  const problemDefinitionId = String(formData.get("problemDefinitionId") ?? "").trim();
  const hypothesisId = String(formData.get("hypothesisId") ?? "").trim();
  const importance = String(formData.get("importance") ?? "normal");

  if (
    !draftId ||
    !changeCardTypes.has(cardType) ||
    !title ||
    !summary ||
    evidence === null ||
    decision === null ||
    changeContent === null ||
    nextCheck === null ||
    !importanceValues.has(importance)
  ) {
    redirect(workspaceReviewPath(projectId, "invalid-ai-draft"));
  }

  const { supabase } = await ownedProjectContext(projectId);
  const source = await supabase
    .from("ai_structured_drafts")
    .select("id")
    .eq("id", draftId)
    .eq("project_id", projectId)
    .in("status", ["generated", "editing"])
    .is("archived_at", null)
    .maybeSingle();

  if (source.error || !source.data) {
    redirect(workspaceReviewPath(projectId, "ai-draft-convert"));
  }

  const converted = await supabase.rpc("convert_ai_draft_to_change_card", {
    p_ai_draft_id: draftId,
    p_card_type: cardType,
    p_title: title,
    p_structured_summary: summary,
    p_evidence: evidence,
    p_decision: decision,
    p_change_content: changeContent,
    p_next_check: nextCheck,
    p_linked_problem_definition_id: problemDefinitionId || null,
    p_linked_hypothesis_id: hypothesisId || null,
    p_importance: importance,
  });

  if (converted.error || !converted.data) {
    redirect(workspaceReviewPath(projectId, "ai-draft-convert"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceReviewPath(projectId));
}

export async function updateChangeCardDraftAction(
  projectId: string,
  formData: FormData,
) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  const cardType = String(formData.get("cardType") ?? "") as ChangeCardType;
  const title = boundedText(formData, "title", 500);
  const summary = boundedText(formData, "structuredSummary", 10000);
  const evidence = boundedText(formData, "evidence", 10000);
  const decision = boundedText(formData, "decision", 10000);
  const changeContent = boundedText(formData, "changeContent", 10000);
  const nextCheck = boundedText(formData, "nextCheck", 10000);
  const importance = String(formData.get("importance") ?? "normal");

  if (
    !changeCardId ||
    !changeCardTypes.has(cardType) ||
    !title ||
    !summary ||
    evidence === null ||
    decision === null ||
    changeContent === null ||
    nextCheck === null ||
    !importanceValues.has(importance)
  ) {
    redirect(workspaceReviewPath(projectId, "invalid-change-card"));
  }

  const { supabase } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("change_cards")
    .update({
      card_type: cardType,
      title,
      structured_summary: summary,
      evidence: evidence || null,
      decision: decision || null,
      change_content: changeContent || null,
      next_check: nextCheck || null,
      importance,
      work_status: "editing",
    })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .in("work_status", ["draft", "editing"])
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(workspaceReviewPath(projectId, "change-card-save"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(workspaceReviewPath(projectId));
}

export async function approveChangeCardAction(
  projectId: string,
  formData: FormData,
) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  if (!changeCardId) {
    redirect(workspaceReviewPath(projectId, "invalid-change-card"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const approved = await supabase
    .from("change_cards")
    .update({
      work_status: "approved",
      approved_by_builder_profile_id: context.builderProfileId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .in("work_status", ["draft", "editing"])
    .select("id")
    .maybeSingle();

  if (approved.error || !approved.data) {
    redirect(workspaceReviewPath(projectId, "change-card-approve"));
  }

  revalidateProjectSurfaces(projectId);
  redirect(decisionsPath(projectId));
}
