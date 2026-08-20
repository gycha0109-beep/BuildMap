"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { assessCapture, generateStructuredDraft } from "@/lib/buildmap/ai-draft";
import {
  isGitHubAppConfigured,
  verifyGitHubCaptureSourceProof,
} from "@/lib/github/app";
import {
  isNotionCaptureProofConfigured,
  type NotionCaptureSourceType,
  verifyNotionCaptureSourceProof,
} from "@/lib/notion/provenance";
import { createClient } from "@/lib/supabase/server";

function workspacePath(projectId: string, error?: string, notice?: string) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (notice) params.set("notice", notice);
  const query = params.toString();
  return `/projects/${projectId}/workspace${query ? `?${query}` : ""}`;
}

function reviewPath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/workspace/review`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function feedbackPath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/feedback`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function revalidateProjectSurfaces(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/workspace`);
  revalidatePath(`/projects/${projectId}/workspace/review`);
  revalidatePath(`/projects/${projectId}/decisions`);
  revalidatePath(`/projects/${projectId}/feedback`);
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

  console.error("BuildMap capture AI processing failed", {
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
  if (code) return `AI processing failed (${code}).`;
  return `AI processing failed (${name}).`;
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

async function markDraftFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  draftId: string,
  error: unknown,
) {
  const category = aiFailureCategory(error);
  await supabase
    .from("ai_structured_drafts")
    .update({ status: "failed", error_message: category })
    .eq("id", draftId)
    .eq("project_id", projectId)
    .eq("status", "generating");
}

async function assessAndPersist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  draftId: string,
  body: string,
) {
  let assessment: Awaited<ReturnType<typeof assessCapture>> | null = null;
  let generationError: unknown = null;

  try {
    assessment = await assessCapture(body);
  } catch (error) {
    generationError = error;
  }

  if (!assessment) {
    await markDraftFailed(supabase, projectId, draftId, generationError);
    return { outcome: "failed" as const };
  }

  const candidate = assessment.draft;
  const savedAssessment = await supabase
    .from("ai_structured_drafts")
    .update({
      suggested_type: candidate?.suggestedType ?? null,
      suggested_title: candidate?.suggestedTitle ?? null,
      structured_summary: candidate?.structuredSummary ?? null,
      evidence: candidate?.evidence || null,
      decision: candidate?.decision || null,
      change_content: candidate?.changeContent || null,
      next_check: candidate?.nextCheck || null,
      status: candidate ? "generated" : "held",
      error_message: null,
    })
    .eq("id", draftId)
    .eq("project_id", projectId)
    .eq("status", "generating")
    .select("id")
    .maybeSingle();

  if (savedAssessment.error || !savedAssessment.data) {
    await supabase
      .from("ai_structured_drafts")
      .update({
        status: "failed",
        error_message: "AI assessment completed but could not be persisted.",
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating");

    return { outcome: "save-failed" as const };
  }

  return { outcome: candidate ? ("promoted" as const) : ("held" as const) };
}

async function structureEvidenceAndPersist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  draftId: string,
  body: string,
) {
  let candidate: Awaited<ReturnType<typeof generateStructuredDraft>> | null = null;
  let generationError: unknown = null;

  try {
    candidate = await generateStructuredDraft(body);
  } catch (error) {
    generationError = error;
  }

  if (!candidate) {
    await markDraftFailed(supabase, projectId, draftId, generationError);
    return { outcome: "failed" as const };
  }

  const saved = await supabase
    .from("ai_structured_drafts")
    .update({
      suggested_type: candidate.suggestedType,
      suggested_title: candidate.suggestedTitle,
      structured_summary: candidate.structuredSummary,
      evidence: candidate.evidence || null,
      decision: candidate.decision || null,
      change_content: candidate.changeContent || null,
      next_check: candidate.nextCheck || null,
      status: "generated",
      error_message: null,
    })
    .eq("id", draftId)
    .eq("project_id", projectId)
    .eq("status", "generating")
    .select("id")
    .maybeSingle();

  if (saved.error || !saved.data) {
    await supabase
      .from("ai_structured_drafts")
      .update({
        status: "failed",
        error_message: "AI evidence structuring completed but could not be persisted.",
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating");

    return { outcome: "save-failed" as const };
  }

  return { outcome: "promoted" as const };
}

function feedbackEvidenceBody(
  request: { title: string; question: string; context: string | null },
  feedback: { body: string; feedback_type: string | null },
) {
  return [
    "External Feedback Evidence",
    `Feedback Request: ${request.title}`,
    `Question: ${request.question}`,
    request.context ? `Context: ${request.context}` : null,
    feedback.feedback_type ? `Feedback type: ${feedback.feedback_type}` : null,
    "",
    "Scout response:",
    feedback.body,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function captureAndAssessAction(
  projectId: string,
  formData: FormData,
) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 10000) {
    redirect(workspacePath(projectId, "invalid-capture"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);

  const capture = await supabase
    .from("rough_notes")
    .insert({
      project_id: projectId,
      author_builder_profile_id: context.builderProfileId,
      body,
    })
    .select("id")
    .single();

  if (capture.error) {
    redirect(workspacePath(projectId, "capture-create"));
  }

  const draft = await supabase
    .from("ai_structured_drafts")
    .insert({
      project_id: projectId,
      rough_note_id: capture.data.id,
      requested_by_builder_profile_id: context.builderProfileId,
      status: "generating",
    })
    .select("id")
    .single();

  if (draft.error) {
    revalidateProjectSurfaces(projectId);
    redirect(workspacePath(projectId, "capture-ai-queue"));
  }

  const result = await assessAndPersist(supabase, projectId, draft.data.id, body);
  revalidateProjectSurfaces(projectId);

  if (result.outcome === "promoted") {
    redirect(reviewPath(projectId));
  }
  if (result.outcome === "held") {
    redirect(workspacePath(projectId, undefined, "capture-held"));
  }
  if (result.outcome === "save-failed") {
    redirect(workspacePath(projectId, "capture-ai-save"));
  }

  redirect(workspacePath(projectId, "capture-ai-generation"));
}

export async function captureFeedbackAsEvidenceAction(
  projectId: string,
  formData: FormData,
) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  if (!feedbackId) {
    redirect(feedbackPath(projectId, "invalid-feedback"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const feedback = await supabase
    .from("feedbacks")
    .select("id, feedback_request_id, body, feedback_type, review_status")
    .eq("id", feedbackId)
    .is("archived_at", null)
    .maybeSingle();

  if (feedback.error || !feedback.data) {
    redirect(feedbackPath(projectId, "invalid-feedback"));
  }

  const request = await supabase
    .from("feedback_requests")
    .select("id, project_id, title, question, context")
    .eq("id", feedback.data.feedback_request_id)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (request.error || !request.data) {
    redirect(feedbackPath(projectId, "invalid-feedback"));
  }

  const existingCapture = await supabase
    .from("rough_notes")
    .select("id")
    .eq("project_id", projectId)
    .eq("source_feedback_id", feedbackId)
    .is("archived_at", null)
    .maybeSingle();

  if (existingCapture.error) {
    redirect(feedbackPath(projectId, "feedback-capture"));
  }
  if (existingCapture.data) {
    revalidateProjectSurfaces(projectId);
    redirect(reviewPath(projectId));
  }

  const body = feedbackEvidenceBody(request.data, feedback.data);
  const capture = await supabase
    .from("rough_notes")
    .insert({
      project_id: projectId,
      author_builder_profile_id: context.builderProfileId,
      source_feedback_id: feedbackId,
      body,
    })
    .select("id")
    .single();

  if (capture.error) {
    if (capture.error.code === "23505") {
      revalidateProjectSurfaces(projectId);
      redirect(reviewPath(projectId));
    }
    redirect(feedbackPath(projectId, "feedback-capture"));
  }

  if (feedback.data.review_status === "new") {
    await supabase
      .from("feedbacks")
      .update({ review_status: "reviewing" })
      .eq("id", feedbackId)
      .eq("review_status", "new");
  }

  const draft = await supabase
    .from("ai_structured_drafts")
    .insert({
      project_id: projectId,
      rough_note_id: capture.data.id,
      requested_by_builder_profile_id: context.builderProfileId,
      status: "generating",
    })
    .select("id")
    .single();

  if (draft.error) {
    revalidateProjectSurfaces(projectId);
    redirect(reviewPath(projectId, "ai-draft-create"));
  }

  const result = await structureEvidenceAndPersist(
    supabase,
    projectId,
    draft.data.id,
    body,
  );
  revalidateProjectSurfaces(projectId);

  if (result.outcome === "promoted") {
    redirect(reviewPath(projectId));
  }
  if (result.outcome === "save-failed") {
    redirect(reviewPath(projectId, "ai-draft-save"));
  }

  redirect(reviewPath(projectId, "ai-generation"));
}

export async function assessExistingCaptureAction(
  projectId: string,
  formData: FormData,
) {
  const roughNoteId = String(formData.get("roughNoteId") ?? "");
  if (!roughNoteId) {
    redirect(reviewPath(projectId, "invalid-ai-source"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const capture = await supabase
    .from("rough_notes")
    .select("id, body, source_feedback_id, converted_to_change_card_at")
    .eq("id", roughNoteId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (capture.error || !capture.data || capture.data.converted_to_change_card_at) {
    redirect(reviewPath(projectId, "invalid-ai-source"));
  }

  const providerSource = await supabase
    .from("capture_source_refs")
    .select(
      "provider, project_link_id, source_type, external_source_id, canonical_url, source_title, occurred_at, observed_at, source_proof, observation_key",
    )
    .eq("rough_note_id", roughNoteId)
    .maybeSingle();
  if (providerSource.error) {
    redirect(reviewPath(projectId, "invalid-ai-source"));
  }

  let verifiedProviderEvidence = false;
  if (providerSource.data) {
    if (
      providerSource.data.provider === "github" &&
      ["merged_pull_request", "release"].includes(providerSource.data.source_type) &&
      isGitHubAppConfigured()
    ) {
      verifiedProviderEvidence = verifyGitHubCaptureSourceProof(
        {
          roughNoteId,
          projectLinkId: providerSource.data.project_link_id,
          sourceType: providerSource.data.source_type as "merged_pull_request" | "release",
          sourceId: providerSource.data.external_source_id,
          canonicalUrl: providerSource.data.canonical_url,
        },
        providerSource.data.source_proof,
      );
    } else if (
      providerSource.data.provider === "notion" &&
      providerSource.data.observation_key &&
      ["page_current_state", "database_current_state"].includes(
        providerSource.data.source_type,
      ) &&
      isNotionCaptureProofConfigured()
    ) {
      try {
        verifiedProviderEvidence = verifyNotionCaptureSourceProof(
          {
            roughNoteId,
            projectLinkId: providerSource.data.project_link_id,
            sourceType: providerSource.data.source_type as NotionCaptureSourceType,
            sourceId: providerSource.data.external_source_id,
            observationKey: providerSource.data.observation_key,
            canonicalUrl: providerSource.data.canonical_url,
            sourceTitle: providerSource.data.source_title,
            occurredAt: providerSource.data.occurred_at,
            observedAt: providerSource.data.observed_at,
            captureBody: capture.data.body,
          },
          providerSource.data.source_proof,
        );
      } catch {
        verifiedProviderEvidence = false;
      }
    }

    if (!verifiedProviderEvidence) {
      redirect(reviewPath(projectId, "invalid-ai-source"));
    }
  }

  const existingDraft = await supabase
    .from("ai_structured_drafts")
    .select("id, status")
    .eq("rough_note_id", roughNoteId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (existingDraft.error) {
    redirect(reviewPath(projectId, "ai-draft-create"));
  }

  const activeDraft = (existingDraft.data ?? []).find((draft) =>
    ["generating", "generated", "editing", "held"].includes(draft.status),
  );
  if (activeDraft) {
    redirect(reviewPath(projectId, "ai-draft-exists"));
  }

  const failedDrafts = (existingDraft.data ?? []).filter((draft) => draft.status === "failed");
  let draftId: string;

  if (failedDrafts.length > 0) {
    const retryDraft = failedDrafts[0];
    const duplicateIds = failedDrafts.slice(1).map((draft) => draft.id);

    if (duplicateIds.length > 0) {
      const archived = await supabase
        .from("ai_structured_drafts")
        .update({ archived_at: new Date().toISOString() })
        .in("id", duplicateIds)
        .eq("project_id", projectId)
        .eq("status", "failed");

      if (archived.error) {
        redirect(reviewPath(projectId, "ai-draft-create"));
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
      redirect(reviewPath(projectId, "ai-draft-create"));
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
      redirect(reviewPath(projectId, "ai-draft-create"));
    }
    draftId = inserted.data.id;
  }

  const isSelectedEvidence = Boolean(capture.data.source_feedback_id || verifiedProviderEvidence);
  const result = isSelectedEvidence
    ? await structureEvidenceAndPersist(supabase, projectId, draftId, capture.data.body)
    : await assessAndPersist(supabase, projectId, draftId, capture.data.body);
  revalidateProjectSurfaces(projectId);

  if (result.outcome === "promoted") {
    redirect(reviewPath(projectId));
  }
  if (result.outcome === "held") {
    redirect(workspacePath(projectId, undefined, "capture-held"));
  }
  if (result.outcome === "save-failed") {
    redirect(reviewPath(projectId, "ai-draft-save"));
  }

  redirect(reviewPath(projectId, "ai-generation"));
}
