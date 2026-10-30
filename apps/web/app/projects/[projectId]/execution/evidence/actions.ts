"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
function input(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
function target(projectId: string, notice: string): never {
  const path = `/projects/${projectId}/execution/evidence`;
  revalidatePath(path);
  redirect(path + "?notice=" + encodeURIComponent(notice));
}

async function owner(projectId: string) {
  if (!uuid.safeParse(projectId).success) redirect("/dashboard?error=project-access");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const builder = await ensureBuilderContext(supabase, auth.user);
  const project = await supabase.from("projects").select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", builder.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project.data || project.error) redirect("/dashboard?error=project-access");
  return { supabase, builder };
}

export async function proposeCriterionEvidenceLinkAction(projectId: string, form: FormData) {
  const data = z.object({
    criterionId: uuid,
    evidenceId: uuid,
  }).safeParse({
    criterionId: input(form, "criterionId"),
    evidenceId: input(form, "evidenceId"),
  });
  if (!data.success) target(projectId, "invalid-link");
  const { supabase } = await owner(projectId);
  const criterion = await supabase.from("completion_criteria")
    .select("id, roadmap_revision_id")
    .eq("id", data.data.criterionId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (!criterion.data || criterion.error) target(projectId, "invalid-criterion");
  const revision = await supabase.from("roadmap_revisions")
    .select("id").eq("id", criterion.data.roadmap_revision_id)
    .eq("project_id", projectId)
    .eq("status", "approved")
    .maybeSingle();
  if (!revision.data || revision.error) target(projectId, "approved-revision-required");

  const evidence = await supabase.from("execution_evidence")
    .select("id").eq("id", data.data.evidenceId)
    .eq("project_id", projectId).maybeSingle();
  if (!evidence.data || evidence.error) target(projectId, "invalid-evidence");

  const result = await supabase.from("criterion_evidence_links").insert({
    project_id: projectId,
    criterion_id: criterion.data.id,
    evidence_id: evidence.data.id,
  });
  if (result.error) target(projectId, "proposal-failed");
  target(projectId, "proposal-created");
}

export async function reviewCriterionEvidenceLinkAction(projectId: string, form: FormData) {
  const data = z.object({
    linkId: uuid,
    action: z.enum(["reviewed", "rejected"]),
  }).safeParse({
    linkId: input(form, "linkId"),
    action: input(form, "action"),
  });
  if (!data.success) target(projectId, "invalid-link");
  const { supabase, builder } = await owner(projectId);
  const result = await supabase.from("criterion_evidence_links")
    .update({
      review_status: data.data.action,
      reviewed_by_builder_profile_id: builder.builderProfileId,
    })
    .eq("id", data.data.linkId)
    .eq("project_id", projectId)
    .eq("review_status", "proposed")
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) target(projectId, "review-failed");
  target(projectId, "review-recorded");
}

export async function recordManualAcceptanceAction(projectId: string, form: FormData) {
  const data = z.object({
    criterionId: uuid,
    eventType: z.enum(["accepted", "revoked"]),
    reason: z.string().trim().min(12).max(2000),
  }).safeParse({
    criterionId: input(form, "criterionId"),
    eventType: input(form, "eventType"),
    reason: input(form, "reason"),
  });
  if (!data.success) target(projectId, "manual-invalid-input");
  const { supabase } = await owner(projectId);
  const criterion = await supabase.from("completion_criteria")
    .select("id,track_id,roadmap_revision_id,rule_type")
    .eq("id", data.data.criterionId)
    .eq("project_id", projectId)
    .eq("rule_type", "MANUAL_ACCEPTANCE")
    .is("archived_at", null)
    .maybeSingle();
  if (!criterion.data || criterion.error) target(projectId, "manual-criterion-invalid");
  const revision = await supabase.from("roadmap_revisions")
    .select("id")
    .eq("id", criterion.data.roadmap_revision_id)
    .eq("project_id", projectId)
    .eq("track_id", criterion.data.track_id)
    .eq("status", "approved").maybeSingle();
  if (!revision.data || revision.error) target(projectId, "approved-revision-required");

  // The database trigger supplies the actor, timestamp and event ID. These
  // fields MUST NOT originate in the HTML form or this server action.
  const result = await supabase.from("execution_manual_acceptance_events").insert({
    project_id: projectId,
    track_id: criterion.data.track_id,
    roadmap_revision_id: criterion.data.roadmap_revision_id,
    criterion_id: criterion.data.id,
    event_type: data.data.eventType,
    reason: data.data.reason,
  });
  if (result.error) target(projectId, "manual-event-failed");
  target(projectId, data.data.eventType === "accepted"
    ? "manual-accepted" : "manual-revoked");
}
