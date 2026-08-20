"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { disconnectStoredFigmaAuthorization } from "@/lib/figma/credential";
import {
  createFigmaAuthorization,
  FIGMA_OAUTH_SESSION_COOKIE,
  getFigmaOAuthConfig,
  isFigmaOAuthConfigured,
} from "@/lib/figma/oauth";
import { parseCanonicalFigmaResourceUrl } from "@/lib/figma/resource";
import { createClient } from "@/lib/supabase/server";

function integrationsPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/integrations${query ? `?${query}` : ""}`;
}

async function ownedFigmaLink(projectId: string, linkId: string) {
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
    .eq("link_type", "figma")
    .is("archived_at", null)
    .maybeSingle();
  if (link.error || !link.data || !parseCanonicalFigmaResourceUrl(link.data.url)) {
    redirect(integrationsPath(projectId, { error: "figma-read-link-invalid" }));
  }

  return { supabase, user: currentUser.data.user };
}

export async function beginFigmaReadConnectionAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "figma-read-link-invalid" }));
  }
  if (!isFigmaOAuthConfigured()) {
    redirect(integrationsPath(projectId, { error: "figma-oauth-not-configured" }));
  }

  const { user } = await ownedFigmaLink(projectId, linkId);
  const authorization = createFigmaAuthorization({ projectId, linkId, userId: user.id });
  const cookieStore = await cookies();
  cookieStore.set(FIGMA_OAUTH_SESSION_COOKIE, authorization.sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: getFigmaOAuthConfig().redirectUri.startsWith("https://"),
    path: "/api/integrations/figma",
    maxAge: authorization.maxAge,
  });
  redirect(authorization.url);
}

export async function disconnectFigmaReadConnectionAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "figma-read-link-invalid" }));
  }

  const { supabase } = await ownedFigmaLink(projectId, linkId);
  const localDisconnect = await disconnectStoredFigmaAuthorization(supabase, linkId);
  if (!localDisconnect.disconnected) {
    redirect(integrationsPath(projectId, { error: "figma-read-disconnect" }));
  }

  revalidatePath(`/projects/${projectId}/integrations`);
  redirect(integrationsPath(projectId, { updated: "figma-read-disconnected" }));
}
