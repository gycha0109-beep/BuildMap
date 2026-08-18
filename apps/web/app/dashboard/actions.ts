"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { captureAndAssessAction } from "@/app/projects/[projectId]/capture-actions";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

async function authenticatedContext() {
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data.user) {
    redirect("/login");
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  return { supabase, context };
}

export async function bootstrapAccountAction() {
  await authenticatedContext();
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function captureFromDashboardAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!projectId) {
    redirect("/dashboard?error=invalid-capture-project");
  }

  await captureAndAssessAction(projectId, formData);
}

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || title.length > 120 || description.length > 280) {
    redirect("/projects?error=invalid-project");
  }

  const { supabase, context } = await authenticatedContext();
  const projectId = randomUUID();

  const inserted = await supabase.from("projects").insert({
    id: projectId,
    owner_builder_profile_id: context.builderProfileId,
    title,
    one_line_description: description || null,
  });

  if (inserted.error) {
    redirect("/projects?error=project-create");
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/projects/${projectId}/workspace`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
