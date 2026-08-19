"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

const outcomeStatuses = new Set(["reviewing", "reflected", "not_reflected"]);

function outcomesPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/feedback/outcomes${query ? `?${query}` : ""}`;
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

  return { supabase };
}

export async function setFeedbackOutcomeStatusAction(
  projectId: string,
  formData: FormData,
) {
  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const outcomeStatus = String(formData.get("outcomeStatus") ?? "").trim();

  if (!feedbackId || !outcomeStatuses.has(outcomeStatus)) {
    redirect(outcomesPath(projectId, { error: "feedback-outcome" }));
  }

  const { supabase } = await ownedProjectContext(projectId);
  const feedback = await supabase
    .from("feedbacks")
    .select("id, feedback_request_id")
    .eq("id", feedbackId)
    .is("archived_at", null)
    .maybeSingle();

  if (feedback.error || !feedback.data) {
    redirect(outcomesPath(projectId, { error: "feedback-outcome" }));
  }

  const request = await supabase
    .from("feedback_requests")
    .select("id")
    .eq("id", feedback.data.feedback_request_id)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (request.error || !request.data) {
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

  revalidatePath(`/projects/${projectId}/feedback`);
  revalidatePath(`/projects/${projectId}/feedback/outcomes`);
  revalidatePath(`/projects/${projectId}/evidence`);
  redirect(outcomesPath(projectId, { updated: "feedback-outcome" }));
}
