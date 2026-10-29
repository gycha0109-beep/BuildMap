"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(160);
const titleSchema = z.string().trim().min(1).max(200);
const criterionTitleSchema = z.string().trim().min(1).max(300);
const ruleSchema = z.enum([
  "PR_MERGED",
  "CHECK_PASSED",
  "ARTIFACT_EXISTS",
  "DEPLOY_VERIFIED",
  "MANUAL_ACCEPTANCE",
]);
const orderSchema = z.coerce.number().int().min(0).max(100000);
const weightSchema = z.coerce.number().finite().gt(0).max(100000);

function textField(form: FormData, field: string) {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

function executionPath(projectId: string, notice?: string) {
  const path = "/projects/" + projectId + "/execution";
  return notice ? path + "?notice=" + encodeURIComponent(notice) : path;
}

async function ownerContext(projectId: string) {
  if (!idSchema.safeParse(projectId).success) redirect("/dashboard?error=project-access");
  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  if (!auth.data.user) redirect("/login");

  const actor = await ensureBuilderContext(supabase, auth.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", actor.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) redirect("/dashboard?error=project-access");
  return { supabase, actor };
}

function finish(projectId: string, notice: string): never {
  revalidatePath(executionPath(projectId));
  redirect(executionPath(projectId, notice));
}

export async function createExecutionTrackAction(projectId: string, form: FormData) {
  const parsed = z.object({
    name: nameSchema,
    description: z.string().trim().max(1000),
    position: orderSchema,
  }).safeParse({
    name: textField(form, "name"),
    description: textField(form, "description"),
    position: textField(form, "position") || "0",
  });

  if (!parsed.success) redirect(executionPath(projectId, "invalid-track"));
  const { supabase } = await ownerContext(projectId);
  const inserted = await supabase.from("execution_tracks").insert({
    project_id: projectId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    position: parsed.data.position,
  });
  if (inserted.error) finish(projectId, "track-error");
  finish(projectId, "track-created");
}

export async function createRoadmapRevisionAction(projectId: string, form: FormData) {
  const parsed = z.object({
    trackId: idSchema,
    title: titleSchema,
    changeReason: z.string().trim().max(2000),
  }).safeParse({
    trackId: textField(form, "trackId"),
    title: textField(form, "title"),
    changeReason: textField(form, "changeReason"),
  });
  if (!parsed.success) redirect(executionPath(projectId, "invalid-revision"));

  const { supabase } = await ownerContext(projectId);
  const track = await supabase.from("execution_tracks")
    .select("id")
    .eq("id", parsed.data.trackId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (track.error || !track.data) finish(projectId, "invalid-track");

  const latest = await supabase.from("roadmap_revisions")
    .select("version, status")
    .eq("project_id", projectId)
    .eq("track_id", parsed.data.trackId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) finish(projectId, "revision-error");
  if (latest.data?.status === "draft") finish(projectId, "draft-exists");

  const inserted = await supabase.from("roadmap_revisions").insert({
    project_id: projectId,
    track_id: parsed.data.trackId,
    version: (latest.data?.version ?? 0) + 1,
    title: parsed.data.title,
    change_reason: parsed.data.changeReason || null,
    status: "draft",
  });
  if (inserted.error) finish(projectId, "revision-error");
  finish(projectId, "revision-created");
}

export async function createExecutionMilestoneAction(projectId: string, form: FormData) {
  const parsed = z.object({
    trackId: idSchema,
    revisionId: idSchema,
    title: titleSchema,
    description: z.string().trim().max(2000),
    position: orderSchema,
    weight: weightSchema,
  }).safeParse({
    trackId: textField(form, "trackId"),
    revisionId: textField(form, "revisionId"),
    title: textField(form, "title"),
    description: textField(form, "description"),
    position: textField(form, "position"),
    weight: textField(form, "weight"),
  });
  if (!parsed.success) redirect(executionPath(projectId, "invalid-milestone"));
  const { supabase } = await ownerContext(projectId);
  const revision = await supabase.from("roadmap_revisions")
    .select("id")
    .eq("id", parsed.data.revisionId)
    .eq("project_id", projectId)
    .eq("track_id", parsed.data.trackId)
    .eq("status", "draft")
    .maybeSingle();
  if (revision.error || !revision.data) finish(projectId, "draft-required");

  const inserted = await supabase.from("execution_milestones").insert({
    project_id: projectId,
    track_id: parsed.data.trackId,
    roadmap_revision_id: parsed.data.revisionId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    position: parsed.data.position,
    weight: parsed.data.weight,
  });
  if (inserted.error) finish(projectId, "milestone-error");
  finish(projectId, "milestone-created");
}

export async function createCompletionCriterionAction(projectId: string, form: FormData) {
  const parsed = z.object({
    trackId: idSchema,
    revisionId: idSchema,
    milestoneId: idSchema,
    title: criterionTitleSchema,
    position: orderSchema,
    ruleType: ruleSchema,
  }).safeParse({
    trackId: textField(form, "trackId"),
    revisionId: textField(form, "revisionId"),
    milestoneId: textField(form, "milestoneId"),
    title: textField(form, "title"),
    position: textField(form, "position"),
    ruleType: textField(form, "ruleType"),
  });
  if (!parsed.success) redirect(executionPath(projectId, "invalid-criterion"));
  const { supabase } = await ownerContext(projectId);
  const revision = await supabase.from("roadmap_revisions")
    .select("id")
    .eq("id", parsed.data.revisionId)
    .eq("project_id", projectId)
    .eq("track_id", parsed.data.trackId)
    .eq("status", "draft")
    .maybeSingle();
  if (revision.error || !revision.data) finish(projectId, "draft-required");

  const milestone = await supabase.from("execution_milestones")
    .select("id")
    .eq("id", parsed.data.milestoneId)
    .eq("project_id", projectId)
    .eq("track_id", parsed.data.trackId)
    .eq("roadmap_revision_id", parsed.data.revisionId)
    .maybeSingle();
  if (milestone.error || !milestone.data) finish(projectId, "invalid-milestone");

  const inserted = await supabase.from("completion_criteria").insert({
    project_id: projectId,
    track_id: parsed.data.trackId,
    roadmap_revision_id: parsed.data.revisionId,
    milestone_id: parsed.data.milestoneId,
    title: parsed.data.title,
    position: parsed.data.position,
    rule_type: parsed.data.ruleType,
    is_required: form.get("isRequired") === "on",
    rule_config: {},
  });
  if (inserted.error) finish(projectId, "criterion-error");
  finish(projectId, "criterion-created");
}

export async function approveRoadmapRevisionAction(projectId: string, form: FormData) {
  const parsed = z.object({
    trackId: idSchema,
    revisionId: idSchema,
  }).safeParse({
    trackId: textField(form, "trackId"),
    revisionId: textField(form, "revisionId"),
  });
  if (!parsed.success) redirect(executionPath(projectId, "invalid-revision"));

  const { supabase, actor } = await ownerContext(projectId);
  const result = await supabase.from("roadmap_revisions")
    .update({
      status: "approved",
      approved_by_builder_profile_id: actor.builderProfileId,
    })
    .eq("id", parsed.data.revisionId)
    .eq("project_id", projectId)
    .eq("track_id", parsed.data.trackId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (result.error || !result.data) finish(projectId, "approve-error");
  finish(projectId, "revision-approved");
}
