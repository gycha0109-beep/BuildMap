"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { revokeNotionAccessToken } from "@/lib/notion/api";
import {
  disconnectStoredNotionAuthorization,
  loadNotionCredential,
} from "@/lib/notion/credential";
import {
  createNotionAuthorization,
  isNotionOAuthConfigured,
  openNotionCredential,
} from "@/lib/notion/oauth";
import { parseCanonicalNotionResourceUrl } from "@/lib/notion/resource";
import { createClient } from "@/lib/supabase/server";

function integrationsPath(projectId: string, params?: { error?: string; updated?: string }) {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.updated) search.set("updated", params.updated);
  const query = search.toString();
  return `/projects/${projectId}/integrations${query ? `?${query}` : ""}`;
}

async function ownedNotionLink(projectId: string, linkId: string) {
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
    .eq("link_type", "notion")
    .is("archived_at", null)
    .maybeSingle();
  if (link.error || !link.data || !parseCanonicalNotionResourceUrl(link.data.url)) {
    redirect(integrationsPath(projectId, { error: "notion-read-link-invalid" }));
  }

  return {
    supabase,
    context,
    user: currentUser.data.user,
    link: link.data,
  };
}

export async function beginNotionReadConnectionAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "notion-read-link-invalid" }));
  }
  if (!isNotionOAuthConfigured()) {
    redirect(integrationsPath(projectId, { error: "notion-oauth-not-configured" }));
  }

  const { user } = await ownedNotionLink(projectId, linkId);
  redirect(
    createNotionAuthorization({
      projectId,
      linkId,
      userId: user.id,
    }),
  );
}

export async function disconnectNotionReadConnectionAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  if (!linkId) {
    redirect(integrationsPath(projectId, { error: "notion-read-link-invalid" }));
  }

  const { supabase } = await ownedNotionLink(projectId, linkId);
  let accessTokenForRevocation: string | null = null;

  if (isNotionOAuthConfigured()) {
    const loaded = await loadNotionCredential(supabase, linkId);
    if (loaded.credential) {
      try {
        accessTokenForRevocation = openNotionCredential(
          loaded.credential.botId,
          "access",
          loaded.credential.accessTokenCiphertext,
          loaded.credential.encryptionKeyVersion,
        );
      } catch {
        accessTokenForRevocation = null;
      }
    }
  }

  const localDisconnect = await disconnectStoredNotionAuthorization(supabase, linkId);
  if (!localDisconnect.disconnected) {
    redirect(integrationsPath(projectId, { error: "notion-read-disconnect" }));
  }

  let providerRevocationConfirmed = !localDisconnect.providerRevokeRequired;
  if (localDisconnect.providerRevokeRequired && accessTokenForRevocation) {
    try {
      await revokeNotionAccessToken(accessTokenForRevocation);
      providerRevocationConfirmed = true;
    } catch {
      providerRevocationConfirmed = false;
    }
  }

  revalidatePath(`/projects/${projectId}/integrations`);
  redirect(
    integrationsPath(projectId, {
      updated: providerRevocationConfirmed
        ? "notion-read-disconnected"
        : "notion-read-disconnected-local",
    }),
  );
}
