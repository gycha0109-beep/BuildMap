"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

const hypothesisStatuses = new Set([
  "assumed",
  "validating",
  "partially_validated",
  "validated",
  "refuted",
  "held",
]);

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

function workspacePath(projectId: string, error?: string) {
  return error
    ? `/projects/${projectId}?error=${encodeURIComponent(error)}`
    : `/projects/${projectId}`;
}

export async function saveProblemDefinitionAction(
  projectId: string,
  formData: FormData,
) {
  const currentText = String(formData.get("currentText") ?? "").trim();
  if (!currentText || currentText.length > 4000) {
    redirect(workspacePath(projectId, "invalid-problem"));
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
    redirect(workspacePath(projectId, "problem-save"));
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
    redirect(workspacePath(projectId, "problem-save"));
  }

  revalidatePath(workspacePath(projectId));
  redirect(workspacePath(projectId));
}

export async function createHypothesisAction(
  projectId: string,
  formData: FormData,
) {
  const statement = String(formData.get("statement") ?? "").trim();
  if (!statement || statement.length > 2000) {
    redirect(workspacePath(projectId, "invalid-hypothesis"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const inserted = await supabase.from("hypotheses").insert({
    project_id: projectId,
    statement,
    created_by_builder_profile_id: context.builderProfileId,
  });

  if (inserted.error) {
    redirect(workspacePath(projectId, "hypothesis-create"));
  }

  revalidatePath(workspacePath(projectId));
  redirect(workspacePath(projectId));
}

export async function updateHypothesisStatusAction(
  projectId: string,
  formData: FormData,
) {
  const hypothesisId = String(formData.get("hypothesisId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!hypothesisId || !hypothesisStatuses.has(status)) {
    redirect(workspacePath(projectId, "invalid-hypothesis-status"));
  }

  const { supabase } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("hypotheses")
    .update({ status })
    .eq("id", hypothesisId)
    .eq("project_id", projectId);

  if (updated.error) {
    redirect(workspacePath(projectId, "hypothesis-update"));
  }

  revalidatePath(workspacePath(projectId));
  redirect(workspacePath(projectId));
}

export async function createRoughNoteAction(
  projectId: string,
  formData: FormData,
) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 10000) {
    redirect(workspacePath(projectId, "invalid-note"));
  }

  const { supabase, context } = await ownedProjectContext(projectId);
  const inserted = await supabase.from("rough_notes").insert({
    project_id: projectId,
    author_builder_profile_id: context.builderProfileId,
    body,
  });

  if (inserted.error) {
    redirect(workspacePath(projectId, "note-create"));
  }

  revalidatePath(workspacePath(projectId));
  redirect(workspacePath(projectId));
}
