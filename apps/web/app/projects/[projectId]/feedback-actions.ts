"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

const reviewStatuses = new Set(["new", "reviewing", "reflected", "not_reflected"]);
const outcomeStatuses = new Set(["reviewing", "reflected", "not_reflected"]);
const feedbackVisibilities = new Set(["internal_review", "public_selected"]);

function feedbackPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/feedback${query ? `?${query}` : ""}`;
}

function outcomesPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/feedback/outcomes${query ? `?${query}` : ""}`;
}

function boundedText(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  if (value.length > maxLength) return null;
  return value;
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
    .select("id, visibility_status, public_slug")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) {
    redirect("/dashboard?error=project-access");
  }

  return { supabase, context, project: project.data };
}

async function isPublicDecisionTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  changeCardId: string,
) {
  const target = await supabase
    .from("change_cards")
    .select("id")
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .eq("visibility_status", "published")
    .eq("sensitivity_status", "normal")
    .is("archived_at", null)
    .maybeSingle();

  return !target.error && Boolean(target.data);
}

function revalidateFeedbackSurfaces(projectId: string, publicSlug: string | null) {
  revalidatePath(`/projects/${projectId}/feedback`);
  revalidatePath(`/projects/${projectId}/feedback/outcomes`);
  revalidatePath(`/projects/${projectId}/evidence`);
  revalidatePath(`/projects/${projectId}/decisions`);
  if (publicSlug) {
    revalidatePath(`/p/${publicSlug}`);
    revalidatePath(`/p/${publicSlug}/feedback`);
  }
}

export async function createFeedbackRequestAction(projectId: string, formData: FormData) {
  const title = boundedText(formData, "title", 160);
  const question = boundedText(formData, "question", 1600);
  const contextText = boundedText(formData, "context", 2500);
  const target = String(formData.get("target") ?? "project").trim();

  if (!title || !question || contextText === null) {
    redirect(feedbackPath(projectId, { error: "invalid-request" }));
  }

  const { supabase, context, project } = await ownedProjectContext(projectId);
  if (project.visibility_status !== "public") {
    redirect(feedbackPath(projectId, { error: "project-private" }));
  }

  let changeCardId: string | null = null;
  if (target !== "project") {
    if (!target.startsWith("decision:")) {
      redirect(feedbackPath(projectId, { error: "invalid-target" }));
    }
    changeCardId = target.slice("decision:".length);
    if (!changeCardId || !(await isPublicDecisionTarget(supabase, projectId, changeCardId))) {
      redirect(feedbackPath(projectId, { error: "invalid-target" }));
    }
  }

  const inserted = await supabase.from("feedback_requests").insert({
    project_id: projectId,
    change_card_id: changeCardId,
    created_by_builder_profile_id: context.builderProfileId,
    title,
    question,
    context: contextText || null,
    visibility_status: "public",
    status: "open",
  });

  if (inserted.error) {
    redirect(feedbackPath(projectId, { error: "request-create" }));
  }

  revalidateFeedbackSurfaces(projectId, project.public_slug);
  redirect(feedbackPath(projectId, { updated: "request-created" }));
}

export async function setFeedbackRequestStatusAction(projectId: string, formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!requestId || !["open", "closed"].includes(status)) {
    redirect(feedbackPath(projectId, { error: "invalid-request" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const request = await supabase
    .from("feedback_requests")
    .select("id, change_card_id")
    .eq("id", requestId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (request.error || !request.data) {
    redirect(feedbackPath(projectId, { error: "invalid-request" }));
  }

  if (
    status === "open" &&
    request.data.change_card_id &&
    !(await isPublicDecisionTarget(supabase, projectId, request.data.change_card_id))
  ) {
    redirect(feedbackPath(projectId, { error: "target-not-public" }));
  }

  const updated = await supabase
    .from("feedback_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("project_id", projectId);

  if (updated.error) {
    redirect(feedbackPath(projectId, { error: "request-status" }));
  }

  revalidateFeedbackSurfaces(projectId, project.public_slug);
  redirect(feedbackPath(projectId, { updated: status === "open" ? "request-opened" : "request-closed" }));
}

async function ownedFeedback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  feedbackId: string,
) {
  const feedback = await supabase
    .from("feedbacks")
    .select("id, feedback_request_id")
    .eq("id", feedbackId)
    .is("archived_at", null)
    .maybeSingle();

  if (feedback.error || !feedback.data) return null;

  const request = await supabase
    .from("feedback_requests")
    .select("id, project_id, change_card_id, visibility_status, status")
    .eq("id", feedback.data.feedback_request_id)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (request.error || !request.data) return null;
  return { feedback: feedback.data, request: request.data };
}

export async function setFeedbackReviewStatusAction(projectId: string, formData: FormData) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const reviewStatus = String(formData.get("reviewStatus") ?? "").trim();

  if (!feedbackId || !reviewStatuses.has(reviewStatus)) {
    redirect(feedbackPath(projectId, { error: "invalid-feedback" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const owned = await ownedFeedback(supabase, projectId, feedbackId);
  if (!owned) {
    redirect(feedbackPath(projectId, { error: "invalid-feedback" }));
  }

  const updated = await supabase
    .from("feedbacks")
    .update({ review_status: reviewStatus })
    .eq("id", feedbackId);

  if (updated.error) {
    redirect(feedbackPath(projectId, { error: "feedback-review" }));
  }

  revalidateFeedbackSurfaces(projectId, project.public_slug);
  redirect(feedbackPath(projectId, { updated: "feedback-reviewed" }));
}

export async function setFeedbackOutcomeStatusAction(projectId: string, formData: FormData) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const outcomeStatus = String(formData.get("outcomeStatus") ?? "").trim();

  if (!feedbackId || !outcomeStatuses.has(outcomeStatus)) {
    redirect(outcomesPath(projectId, { error: "feedback-outcome" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const owned = await ownedFeedback(supabase, projectId, feedbackId);
  if (!owned) {
    redirect(outcomesPath(projectId, { error: "feedback-outcome" }));
  }

  const updated = await supabase
    .from("feedbacks")
    .update({ review_status: outcomeStatus })
    .eq("id", feedbackId)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(outcomesPath(projectId, { error: "feedback-outcome" }));
  }

  revalidateFeedbackSurfaces(projectId, project.public_slug);
  redirect(outcomesPath(projectId, { updated: "feedback-outcome" }));
}

export async function setFeedbackVisibilityAction(projectId: string, formData: FormData) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();

  if (!feedbackId || !feedbackVisibilities.has(visibility)) {
    redirect(feedbackPath(projectId, { error: "invalid-feedback" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const owned = await ownedFeedback(supabase, projectId, feedbackId);
  if (!owned) {
    redirect(feedbackPath(projectId, { error: "invalid-feedback" }));
  }

  if (visibility === "public_selected") {
    const targetPublic =
      !owned.request.change_card_id ||
      (await isPublicDecisionTarget(supabase, projectId, owned.request.change_card_id));

    if (
      project.visibility_status !== "public" ||
      owned.request.visibility_status !== "public" ||
      owned.request.status !== "open" ||
      !targetPublic
    ) {
      redirect(feedbackPath(projectId, { error: "feedback-public" }));
    }
  }

  const updated = await supabase
    .from("feedbacks")
    .update({ visibility_status: visibility })
    .eq("id", feedbackId);

  if (updated.error) {
    redirect(feedbackPath(projectId, { error: "feedback-public" }));
  }

  revalidateFeedbackSurfaces(projectId, project.public_slug);
  redirect(
    feedbackPath(projectId, {
      updated: visibility === "public_selected" ? "feedback-published" : "feedback-hidden",
    }),
  );
}
