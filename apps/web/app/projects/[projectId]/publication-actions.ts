"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

function decisionsPath(projectId: string, key?: "error" | "updated", value?: string) {
  const path = `/projects/${projectId}/decisions`;
  return key && value ? `${path}?${key}=${encodeURIComponent(value)}` : path;
}

function publicSlugFor(title: string, projectId: string) {
  const base = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = projectId.replace(/-/g, "").slice(0, 8);
  return `${base || "project"}-${suffix}`;
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
    .select("id, title, visibility_status, public_slug")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) {
    redirect("/dashboard?error=project-access");
  }

  return { supabase, project: project.data };
}

function revalidatePublicationSurfaces(projectId: string, publicSlug?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/decisions`);
  if (publicSlug) {
    revalidatePath(`/p/${publicSlug}`);
  }
}

export async function publishProjectAction(projectId: string) {
  const { supabase, project } = await ownedProjectContext(projectId);
  const publicSlug = project.public_slug || publicSlugFor(project.title, projectId);

  const updated = await supabase
    .from("projects")
    .update({ visibility_status: "public", public_slug: publicSlug })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(decisionsPath(projectId, "error", "project-publish"));
  }

  revalidatePublicationSurfaces(projectId, publicSlug);
  redirect(decisionsPath(projectId, "updated", "project-published"));
}

export async function unpublishProjectAction(projectId: string) {
  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("projects")
    .update({ visibility_status: "private" })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(decisionsPath(projectId, "error", "project-unpublish"));
  }

  revalidatePublicationSurfaces(projectId, project.public_slug);
  redirect(decisionsPath(projectId, "updated", "project-private"));
}

export async function publishDecisionAction(projectId: string, formData: FormData) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  if (!changeCardId) {
    redirect(decisionsPath(projectId, "error", "invalid-decision"));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("change_cards")
    .update({ visibility_status: "published" })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .eq("sensitivity_status", "normal")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(decisionsPath(projectId, "error", "decision-publish"));
  }

  revalidatePublicationSurfaces(projectId, project.public_slug);
  redirect(decisionsPath(projectId, "updated", "decision-published"));
}

export async function hideDecisionAction(projectId: string, formData: FormData) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  if (!changeCardId) {
    redirect(decisionsPath(projectId, "error", "invalid-decision"));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("change_cards")
    .update({ visibility_status: "internal" })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(decisionsPath(projectId, "error", "decision-hide"));
  }

  revalidatePublicationSurfaces(projectId, project.public_slug);
  redirect(decisionsPath(projectId, "updated", "decision-hidden"));
}

export async function markDecisionSensitiveAction(projectId: string, formData: FormData) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  if (!changeCardId) {
    redirect(decisionsPath(projectId, "error", "invalid-decision"));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("change_cards")
    .update({ sensitivity_status: "sensitive", visibility_status: "internal" })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(decisionsPath(projectId, "error", "decision-sensitive"));
  }

  revalidatePublicationSurfaces(projectId, project.public_slug);
  redirect(decisionsPath(projectId, "updated", "decision-sensitive"));
}

export async function markDecisionNormalAction(projectId: string, formData: FormData) {
  const changeCardId = String(formData.get("changeCardId") ?? "");
  if (!changeCardId) {
    redirect(decisionsPath(projectId, "error", "invalid-decision"));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("change_cards")
    .update({ sensitivity_status: "normal" })
    .eq("id", changeCardId)
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(decisionsPath(projectId, "error", "decision-normal"));
  }

  revalidatePublicationSurfaces(projectId, project.public_slug);
  redirect(decisionsPath(projectId, "updated", "decision-normal"));
}
