"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureUserProfile } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

function publicFeedbackPath(publicSlug: string, params?: { error?: string; submitted?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.submitted) search.set("submitted", params.submitted);
  const query = search.toString();
  return `/p/${publicSlug}/feedback${query ? `?${query}` : ""}`;
}

export async function submitExternalFeedbackAction(publicSlug: string, formData: FormData) {
  const feedbackRequestId = String(formData.get("feedbackRequestId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const testerInterest = formData.get("testerInterest") === "on";

  if (!feedbackRequestId || !body || body.length > 4000) {
    redirect(publicFeedbackPath(publicSlug, { error: "invalid-feedback" }));
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  const returnPath = publicFeedbackPath(publicSlug);

  if (!currentUser.data.user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  let userProfileId: string;
  try {
    const context = await ensureUserProfile(supabase, currentUser.data.user);
    userProfileId = context.userProfileId;
  } catch {
    redirect(publicFeedbackPath(publicSlug, { error: "profile" }));
  }

  const project = await supabase
    .from("projects")
    .select("id")
    .eq("public_slug", publicSlug)
    .eq("visibility_status", "public")
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) {
    redirect(publicFeedbackPath(publicSlug, { error: "project-unavailable" }));
  }

  const request = await supabase
    .from("feedback_requests")
    .select("id, project_id, change_card_id")
    .eq("id", feedbackRequestId)
    .eq("project_id", project.data.id)
    .eq("visibility_status", "public")
    .eq("status", "open")
    .is("archived_at", null)
    .maybeSingle();

  if (request.error || !request.data) {
    redirect(publicFeedbackPath(publicSlug, { error: "request-unavailable" }));
  }

  if (request.data.change_card_id) {
    const targetDecision = await supabase
      .from("change_cards")
      .select("id")
      .eq("id", request.data.change_card_id)
      .eq("project_id", project.data.id)
      .eq("work_status", "approved")
      .eq("visibility_status", "published")
      .eq("sensitivity_status", "normal")
      .is("archived_at", null)
      .maybeSingle();

    if (targetDecision.error || !targetDecision.data) {
      redirect(publicFeedbackPath(publicSlug, { error: "request-unavailable" }));
    }
  }

  const inserted = await supabase.from("feedbacks").insert({
    feedback_request_id: request.data.id,
    author_user_profile_id: userProfileId,
    body,
    feedback_type: null,
    tester_interest: testerInterest,
    review_status: "new",
    visibility_status: "internal_review",
    public_author_display_mode: "anonymous",
  });

  if (inserted.error) {
    redirect(publicFeedbackPath(publicSlug, { error: "submit" }));
  }

  revalidatePath(`/p/${publicSlug}/feedback`);
  revalidatePath(`/projects/${project.data.id}/feedback`);
  redirect(publicFeedbackPath(publicSlug, { submitted: feedbackRequestId }));
}
