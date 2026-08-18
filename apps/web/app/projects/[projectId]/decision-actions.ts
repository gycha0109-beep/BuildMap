"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import type { ChangeCardType } from "@/lib/buildmap/ai-draft";
import { createClient } from "@/lib/supabase/server";

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

function reviewPath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/workspace/review`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function decisionsPath(projectId: string) {
  return `/projects/${projectId}/decisions`;
}

function revalidateProjectSurfaces(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/workspace`);
  revalidatePath(reviewPath(projectId));
  revalidatePath(decisionsPath(projectId));
}

function boundedText(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length <= maxLength ? value : null;
}

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

async function approveDecision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  changeCardId: string,
  builderProfileId: string,
) {
  const approved = await supabase
    .from("change_cards")
    .update({
      work_status: "approved",
      approved_by_builder_profile_id: builderProfileId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .in("work_status", ["draft", "editing"])
    .select("id")
    .maybeSingle();

  if (!approved.error && approved.data) {
    return true;
  }

  const readback = await supabase
    .from("change_cards")
    .select("id, work_status")
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  return !readback.error && readback.data?.work_status === "approved";
}

export async function finalizeAiCandidateAction(
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
    redirect(reviewPath(projectId, "invalid-decision-candidate"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const source = await supabase
    .from("ai_structured_drafts")
    .select("id, status, converted_change_card_id")
    .eq("id", draftId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (source.error || !source.data) {
    redirect(reviewPath(projectId, "decision-candidate-unavailable"));
  }

  let changeCardId = source.data.converted_change_card_id as string | null;

  if (!changeCardId) {
    if (!["generated", "editing"].includes(source.data.status)) {
      redirect(reviewPath(projectId, "decision-candidate-unavailable"));
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

    if (!converted.error && converted.data) {
      changeCardId = String(converted.data);
    } else {
      const recovery = await supabase
        .from("ai_structured_drafts")
        .select("converted_change_card_id")
        .eq("id", draftId)
        .eq("project_id", projectId)
        .is("archived_at", null)
        .maybeSingle();

      changeCardId = recovery.data?.converted_change_card_id ?? null;
      if (recovery.error || !changeCardId) {
        redirect(reviewPath(projectId, "decision-finalize-convert"));
      }
    }
  }

  const approved = await approveDecision(
    supabase,
    projectId,
    changeCardId,
    context.builderProfileId,
  );

  revalidateProjectSurfaces(projectId);

  if (!approved) {
    redirect(reviewPath(projectId, "decision-finalize-approve"));
  }

  redirect(decisionsPath(projectId));
}

export async function finalizePendingDecisionAction(
  projectId: string,
  formData: FormData,
) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  if (!changeCardId) {
    redirect(reviewPath(projectId, "invalid-pending-decision"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const pending = await supabase
    .from("change_cards")
    .select("id, work_status")
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (pending.error || !pending.data) {
    redirect(reviewPath(projectId, "invalid-pending-decision"));
  }

  if (pending.data.work_status === "approved") {
    revalidateProjectSurfaces(projectId);
    redirect(decisionsPath(projectId));
  }

  if (!["draft", "editing"].includes(pending.data.work_status)) {
    redirect(reviewPath(projectId, "invalid-pending-decision"));
  }

  const approved = await approveDecision(
    supabase,
    projectId,
    changeCardId,
    context.builderProfileId,
  );

  revalidateProjectSurfaces(projectId);

  if (!approved) {
    redirect(reviewPath(projectId, "decision-finalize-approve"));
  }

  redirect(decisionsPath(projectId));
}
