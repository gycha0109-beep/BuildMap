"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { normalizeFigmaResourceUrl } from "@/lib/figma/resource";
import { normalizeGitHubRepositoryUrl } from "@/lib/github/repository";
import { normalizeNotionResourceUrl } from "@/lib/notion/resource";
import { createClient } from "@/lib/supabase/server";

const visibilityValues = new Set(["internal", "public"]);

function integrationsPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/integrations${query ? `?${query}` : ""}`;
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
    .select("id, public_slug")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) {
    redirect("/dashboard?error=project-access");
  }

  return { supabase, context, project: project.data };
}

function revalidateIntegrationSurfaces(projectId: string, publicSlug: string | null) {
  revalidatePath(`/projects/${projectId}/integrations`);
  if (publicSlug) {
    revalidatePath(`/p/${publicSlug}`);
  }
}

export async function addGitHubRepositoryAction(projectId: string, formData: FormData) {
  const normalized = normalizeGitHubRepositoryUrl(String(formData.get("repositoryUrl") ?? ""));
  const requestedLabel = String(formData.get("label") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "internal").trim();

  if (!normalized || requestedLabel.length > 120 || !visibilityValues.has(visibility)) {
    redirect(integrationsPath(projectId, { error: "invalid-github-repository" }));
  }

  const label = requestedLabel || normalized.defaultLabel;
  const { supabase, context, project } = await ownedProjectContext(projectId);

  const existing = await supabase
    .from("project_links")
    .select("id")
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .eq("url", normalized.url)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    redirect(integrationsPath(projectId, { error: "github-link-save" }));
  }

  if (existing.data) {
    const updated = await supabase
      .from("project_links")
      .update({ label, visibility_status: visibility })
      .eq("id", existing.data.id)
      .eq("project_id", projectId)
      .eq("link_type", "github")
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (updated.error || !updated.data) {
      redirect(integrationsPath(projectId, { error: "github-link-save" }));
    }
  } else {
    const inserted = await supabase
      .from("project_links")
      .insert({
        project_id: projectId,
        created_by_builder_profile_id: context.builderProfileId,
        label,
        url: normalized.url,
        link_type: "github",
        visibility_status: visibility,
      })
      .select("id")
      .single();

    if (inserted.error) {
      redirect(integrationsPath(projectId, { error: "github-link-save" }));
    }
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "github-linked" }));
}

export async function setGitHubRepositoryVisibilityAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();

  if (!linkId || !visibilityValues.has(visibility)) {
    redirect(integrationsPath(projectId, { error: "github-link-update" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("project_links")
    .update({ visibility_status: visibility })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(integrationsPath(projectId, { error: "github-link-update" }));
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "github-visibility" }));
}

export async function removeGitHubRepositoryAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "github-link-remove" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const now = new Date().toISOString();
  const disconnected = await supabase
    .from("integration_bindings")
    .update({ status: "disconnected", archived_at: now })
    .eq("project_link_id", linkId)
    .eq("provider", "github")
    .is("archived_at", null)
    .select("id");

  if (disconnected.error) {
    redirect(integrationsPath(projectId, { error: "github-link-remove" }));
  }

  const archived = await supabase
    .from("project_links")
    .update({ visibility_status: "internal", archived_at: now })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (archived.error || !archived.data) {
    redirect(integrationsPath(projectId, { error: "github-link-remove" }));
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "github-removed" }));
}

export async function addNotionResourceAction(projectId: string, formData: FormData) {
  const normalized = normalizeNotionResourceUrl(String(formData.get("resourceUrl") ?? ""));
  const requestedLabel = String(formData.get("label") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "internal").trim();

  if (!normalized || requestedLabel.length > 120 || !visibilityValues.has(visibility)) {
    redirect(integrationsPath(projectId, { error: "invalid-notion-resource" }));
  }

  const label = requestedLabel || normalized.defaultLabel;
  const { supabase, context, project } = await ownedProjectContext(projectId);

  const existing = await supabase
    .from("project_links")
    .select("id")
    .eq("project_id", projectId)
    .eq("link_type", "notion")
    .eq("url", normalized.url)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    redirect(integrationsPath(projectId, { error: "notion-link-save" }));
  }

  if (existing.data) {
    const updated = await supabase
      .from("project_links")
      .update({ label, visibility_status: visibility })
      .eq("id", existing.data.id)
      .eq("project_id", projectId)
      .eq("link_type", "notion")
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (updated.error || !updated.data) {
      redirect(integrationsPath(projectId, { error: "notion-link-save" }));
    }
  } else {
    const inserted = await supabase
      .from("project_links")
      .insert({
        project_id: projectId,
        created_by_builder_profile_id: context.builderProfileId,
        label,
        url: normalized.url,
        link_type: "notion",
        visibility_status: visibility,
      })
      .select("id")
      .single();

    if (inserted.error) {
      redirect(integrationsPath(projectId, { error: "notion-link-save" }));
    }
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "notion-linked" }));
}

export async function setNotionResourceVisibilityAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();

  if (!linkId || !visibilityValues.has(visibility)) {
    redirect(integrationsPath(projectId, { error: "notion-link-update" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("project_links")
    .update({ visibility_status: visibility })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "notion")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (updated.error || !updated.data) {
    redirect(integrationsPath(projectId, { error: "notion-link-update" }));
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "notion-visibility" }));
}

export async function removeNotionResourceAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "notion-link-remove" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const activeReadBinding = await supabase
    .from("integration_bindings")
    .select("id")
    .eq("project_link_id", linkId)
    .eq("provider", "notion")
    .eq("status", "active")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (activeReadBinding.error) {
    redirect(integrationsPath(projectId, { error: "notion-link-remove" }));
  }
  if (activeReadBinding.data) {
    redirect(integrationsPath(projectId, { error: "notion-link-read-connected" }));
  }

  const archived = await supabase
    .from("project_links")
    .update({ visibility_status: "internal", archived_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "notion")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (archived.error || !archived.data) {
    redirect(integrationsPath(projectId, { error: "notion-link-remove" }));
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "notion-removed" }));
}

export async function addFigmaResourceAction(projectId: string, formData: FormData) {
  const normalized = normalizeFigmaResourceUrl(String(formData.get("resourceUrl") ?? ""));
  const requestedLabel = String(formData.get("label") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "internal").trim();

  if (!normalized || requestedLabel.length > 120 || !visibilityValues.has(visibility)) {
    redirect(integrationsPath(projectId, { error: "invalid-figma-resource" }));
  }

  const label = requestedLabel || normalized.defaultLabel;
  const { supabase, context, project } = await ownedProjectContext(projectId);
  const existing = await supabase
    .from("project_links")
    .select("id")
    .eq("project_id", projectId)
    .eq("link_type", "figma")
    .eq("url", normalized.url)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    redirect(integrationsPath(projectId, { error: "figma-link-save" }));
  }

  if (existing.data) {
    const updated = await supabase
      .from("project_links")
      .update({ label, visibility_status: visibility })
      .eq("id", existing.data.id)
      .eq("project_id", projectId)
      .eq("link_type", "figma")
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    if (updated.error || !updated.data) {
      redirect(integrationsPath(projectId, { error: "figma-link-save" }));
    }
  } else {
    const inserted = await supabase
      .from("project_links")
      .insert({
        project_id: projectId,
        created_by_builder_profile_id: context.builderProfileId,
        label,
        url: normalized.url,
        link_type: "figma",
        visibility_status: visibility,
      })
      .select("id")
      .single();
    if (inserted.error) {
      redirect(integrationsPath(projectId, { error: "figma-link-save" }));
    }
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "figma-linked" }));
}

export async function setFigmaResourceVisibilityAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();
  if (!linkId || !visibilityValues.has(visibility)) {
    redirect(integrationsPath(projectId, { error: "figma-link-update" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const updated = await supabase
    .from("project_links")
    .update({ visibility_status: visibility })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "figma")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (updated.error || !updated.data) {
    redirect(integrationsPath(projectId, { error: "figma-link-update" }));
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "figma-visibility" }));
}

export async function removeFigmaResourceAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "figma-link-remove" }));
  }

  const { supabase, project } = await ownedProjectContext(projectId);
  const activeReadBinding = await supabase
    .from("integration_bindings")
    .select("id")
    .eq("project_link_id", linkId)
    .eq("provider", "figma")
    .eq("status", "active")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (activeReadBinding.error) {
    redirect(integrationsPath(projectId, { error: "figma-link-remove" }));
  }
  if (activeReadBinding.data) {
    redirect(integrationsPath(projectId, { error: "figma-link-read-connected" }));
  }

  const archived = await supabase
    .from("project_links")
    .update({ visibility_status: "internal", archived_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("project_id", projectId)
    .eq("link_type", "figma")
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (archived.error || !archived.data) {
    redirect(integrationsPath(projectId, { error: "figma-link-remove" }));
  }

  revalidateIntegrationSurfaces(projectId, project.public_slug);
  redirect(integrationsPath(projectId, { updated: "figma-removed" }));
}
