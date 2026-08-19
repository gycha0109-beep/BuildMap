"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import {
  createGitHubInstallState,
  createGitHubInstallUrl,
  isGitHubAppConfigured,
} from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

function integrationsPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/integrations${query ? `?${query}` : ""}`;
}

async function ownedGitHubLink(projectId: string, linkId: string) {
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) redirect("/login");

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

  const link = await supabase
    .from("project_links")
    .select("id, url")
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .maybeSingle();
  if (link.error || !link.data || !parseCanonicalGitHubRepositoryUrl(link.data.url)) {
    redirect(integrationsPath(projectId, { error: "github-read-link-invalid" }));
  }

  return {
    supabase,
    context,
    user: currentUser.data.user,
    link: link.data,
  };
}

export async function beginGitHubReadConnectionAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "github-read-link-invalid" }));
  }
  if (!isGitHubAppConfigured()) {
    redirect(integrationsPath(projectId, { error: "github-app-not-configured" }));
  }

  const { user } = await ownedGitHubLink(projectId, linkId);
  const state = createGitHubInstallState({
    projectId,
    linkId,
    userId: user.id,
  });
  redirect(createGitHubInstallUrl(state));
}

export async function disconnectGitHubReadConnectionAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "github-read-link-invalid" }));
  }

  const { supabase } = await ownedGitHubLink(projectId, linkId);
  const archived = await supabase
    .from("integration_bindings")
    .update({
      status: "disconnected",
      archived_at: new Date().toISOString(),
    })
    .eq("project_link_id", linkId)
    .eq("provider", "github")
    .is("archived_at", null)
    .select("id");

  if (archived.error) {
    redirect(integrationsPath(projectId, { error: "github-read-disconnect" }));
  }

  revalidatePath(`/projects/${projectId}/integrations`);
  redirect(integrationsPath(projectId, { updated: "github-read-disconnected" }));
}
