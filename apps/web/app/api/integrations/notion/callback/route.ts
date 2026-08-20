import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import {
  exchangeNotionAuthorizationCode,
  NotionProviderError,
  revokeNotionAccessToken,
  UnsupportedNotionResourceError,
  verifyNotionProjectResource,
} from "@/lib/notion/api";
import { loadNotionCredential } from "@/lib/notion/credential";
import {
  createNotionBindingProof,
  isNotionOAuthConfigured,
  notionCredentialKeyVersion,
  openNotionCredential,
  sealNotionCredential,
  verifyNotionOAuthState,
} from "@/lib/notion/oauth";
import { parseCanonicalNotionResourceUrl } from "@/lib/notion/resource";
import { createClient } from "@/lib/supabase/server";

function appRedirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

async function bestEffortRevoke(accessToken: string | null) {
  if (!accessToken) return;
  try {
    await revokeNotionAccessToken(accessToken);
  } catch {
    // Local state still fails closed; provider revocation is best-effort here.
  }
}

export async function GET(request: NextRequest) {
  if (!isNotionOAuthConfigured()) {
    return appRedirect(request, "/dashboard?error=notion-oauth-not-configured");
  }

  const stateValue = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  let state: ReturnType<typeof verifyNotionOAuthState> = null;
  try {
    state = stateValue ? verifyNotionOAuthState(stateValue) : null;
  } catch {
    return appRedirect(request, "/dashboard?error=notion-oauth-config-invalid");
  }
  if (!state) {
    return appRedirect(request, "/dashboard?error=notion-oauth-state");
  }

  const integrationPath = state.returnPath;
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    return appRedirect(request, `${integrationPath}?error=notion-oauth-denied`);
  }

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  if (!code) {
    return appRedirect(request, `${integrationPath}?error=notion-oauth-state`);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return appRedirect(request, "/login");
  }
  if (currentUser.data.user.id !== state.userId) {
    return appRedirect(request, `${integrationPath}?error=notion-oauth-user`);
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", state.projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) {
    return appRedirect(request, "/dashboard?error=project-access");
  }

  const link = await supabase
    .from("project_links")
    .select("id, url")
    .eq("id", state.linkId)
    .eq("project_id", state.projectId)
    .eq("link_type", "notion")
    .is("archived_at", null)
    .maybeSingle();
  const resource = link.data ? parseCanonicalNotionResourceUrl(link.data.url) : null;
  if (link.error || !link.data || !resource) {
    return appRedirect(request, `${integrationPath}?error=notion-read-link-invalid`);
  }

  let previousAccessToken: string | null = null;
  let previousBotId: string | null = null;
  const previous = await loadNotionCredential(supabase, state.linkId);
  if (previous.credential) {
    previousBotId = previous.credential.botId;
    try {
      previousAccessToken = openNotionCredential(
        previous.credential.botId,
        "access",
        previous.credential.accessTokenCiphertext,
        previous.credential.encryptionKeyVersion,
      );
    } catch {
      previousAccessToken = null;
    }
  }

  let issuedAccessToken: string | null = null;
  let providerStage: "token_exchange" | "resource_verify" | "binding_save" = "token_exchange";
  try {
    const tokenSet = await exchangeNotionAuthorizationCode(code);
    issuedAccessToken = tokenSet.accessToken;

    providerStage = "resource_verify";
    const verified = await verifyNotionProjectResource(tokenSet.accessToken, resource.resourceId);
    if (!verified) {
      await bestEffortRevoke(tokenSet.accessToken);
      return appRedirect(request, `${integrationPath}?error=notion-resource-not-authorized`);
    }

    const bindingProof = createNotionBindingProof({
      projectLinkId: state.linkId,
      botId: tokenSet.botId,
      workspaceId: tokenSet.workspaceId,
      resourceId: verified.id,
      resourceType: verified.type,
    });
    const accessTokenCiphertext = sealNotionCredential(
      tokenSet.botId,
      "access",
      tokenSet.accessToken,
    );
    const refreshTokenCiphertext = sealNotionCredential(
      tokenSet.botId,
      "refresh",
      tokenSet.refreshToken,
    );

    providerStage = "binding_save";
    const saved = await supabase.rpc("save_notion_oauth_authorization", {
      p_project_link_id: state.linkId,
      p_created_by_builder_profile_id: context.builderProfileId,
      p_bot_id: tokenSet.botId,
      p_workspace_id: tokenSet.workspaceId,
      p_workspace_name: tokenSet.workspaceName ?? "",
      p_authorizer_user_id: tokenSet.authorizerUserId ?? "",
      p_resource_id: verified.id,
      p_resource_type: verified.type,
      p_resource_label: verified.title.slice(0, 255),
      p_binding_proof: bindingProof,
      p_access_token_ciphertext: accessTokenCiphertext,
      p_refresh_token_ciphertext: refreshTokenCiphertext,
      p_encryption_key_version: notionCredentialKeyVersion(),
    });
    const savedRow =
      saved.data && typeof saved.data === "object"
        ? (saved.data as Record<string, unknown>)
        : null;
    if (saved.error || savedRow?.ok !== true) {
      console.warn("BuildMap Phase51 Notion OAuth binding save rejected", {
        stage: providerStage,
        rpcCode: saved.error?.code ?? null,
      });
      await bestEffortRevoke(tokenSet.accessToken);
      return appRedirect(request, `${integrationPath}?error=notion-binding-save`);
    }

    if (
      savedRow.old_credential_disconnected === true &&
      previousAccessToken &&
      previousBotId &&
      previousBotId !== tokenSet.botId
    ) {
      await bestEffortRevoke(previousAccessToken);
    }

    issuedAccessToken = null;
    return appRedirect(request, `${integrationPath}?updated=notion-read-connected`);
  } catch (error) {
    await bestEffortRevoke(issuedAccessToken);
    if (error instanceof UnsupportedNotionResourceError) {
      return appRedirect(request, `${integrationPath}?error=notion-resource-type-unsupported`);
    }
    if (error instanceof NotionProviderError) {
      console.warn("BuildMap Phase51 Notion provider rejection", {
        stage: providerStage,
        status: error.status,
        providerCode: error.providerCode,
      });
      const codeName = [400, 401, 403].includes(error.status)
        ? "notion-authorization-invalid"
        : error.status === 429
          ? "notion-rate-limited"
          : "notion-provider-unavailable";
      return appRedirect(request, `${integrationPath}?error=${codeName}`);
    }
    console.warn("BuildMap Phase51 Notion OAuth unexpected failure", {
      stage: providerStage,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return appRedirect(request, `${integrationPath}?error=notion-oauth-config-invalid`);
  }
}