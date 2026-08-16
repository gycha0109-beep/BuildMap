"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
}

export async function createProjectAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || title.length > 120 || description.length > 280) {
    redirect("/dashboard?error=invalid-project");
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
    redirect("/dashboard?error=project-create");
  }

  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
