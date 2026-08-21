import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import {
  exchangeFigmaAuthorizationCode,
  FigmaProviderError,
  readBoundedFigmaContext,
  verifyFigmaFileAccess,
} from "@/lib/figma/api";
import {
  createFigmaBindingProof,
  FIGMA_OAUTH_SESSION_COOKIE,
  figmaCredentialKeyVersion,
  isFigmaOAuthConfigured,
  sealFigmaCredential,
  verifyFigmaOAuthSession,
  verifyFigmaOAuthState,
} from "@/lib/figma/oauth";
import { parseCanonicalFigmaResourceUrl } from "@/lib/figma/resource";
import { createClient } from "@/lib/supabase/server";

function appRedirect(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(FIGMA_OAUTH_SESSION_COOKIE);
  return response;
}

function tokenExpiry(expiresIn: number) {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  if (!isFigmaOAuthConfigured()) {
    return appRedirect(request, "/dashboard?error=figma-oauth-not-configured");
  }

  const stateValue = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  let state: ReturnType<typeof verifyFigmaOAuthState> = null;
  try {
    state = stateValue ? verifyFigmaOAuthState(stateValue) : null;
  } catch {
    return appRedirect(request, "/dashboard?error=figma-oauth-config-invalid");
  }
  if (!state) {
    return appRedirect(request, "/dashboard?error=figma-oauth-state");
  }

  const integrationPath = state.returnPath;
  if (request.nextUrl.searchParams.get("error")) {
    return appRedirect(request, `${integrationPath}?error=figma-oauth-denied`);
  }

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const sessionValue = request.cookies.get(FIGMA_OAUTH_SESSION_COOKIE)?.value ?? "";
  let session: ReturnType<typeof verifyFigmaOAuthSession> = null;
  try {
    session = sessionValue ? verifyFigmaOAuthSession(sessionValue, state) : null;
  } catch {
    return appRedirect(request, `${integrationPath}?error=figma-oauth-config-invalid`);
  }
  if (!code || !session) {
    return appRedirect(request, `${integrationPath}?error=figma-oauth-state`);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return appRedirect(request, "/login");
  }
  if (currentUser.data.user.id !== state.userId) {
    return appRedirect(request, `${integrationPath}?error=figma-oauth-user`);
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
    .eq("link_type", "figma")
    .is("archived_at", null)
    .maybeSingle();
  const resource = link.data ? parseCanonicalFigmaResourceUrl(link.data.url) : null;
  if (link.error || !link.data || !resource) {
    return appRedirect(request, `${integrationPath}?error=figma-read-link-invalid`);
  }

  try {
    const tokenSet = await exchangeFigmaAuthorizationCode(code, session.codeVerifier);
    const metadata = await verifyFigmaFileAccess(tokenSet.accessToken, resource.fileKey);
    const observation = await readBoundedFigmaContext({
      accessToken: tokenSet.accessToken,
      fileKey: resource.fileKey,
      nodeId: resource.nodeId,
    });
    if (metadata.fileKey !== observation.fileKey) {
      return appRedirect(request, `${integrationPath}?error=figma-resource-not-authorized`);
    }

    const bindingProof = createFigmaBindingProof({
      projectLinkId: state.linkId,
      figmaUserId: tokenSet.figmaUserId,
      resourceId: resource.fileKey,
      resourceType: observation.resourceType,
      nodeId: resource.nodeId,
    });
    const saved = await supabase.rpc("save_figma_oauth_authorization", {
      p_project_link_id: state.linkId,
      p_created_by_builder_profile_id: context.builderProfileId,
      p_figma_user_id: tokenSet.figmaUserId,
      p_resource_id: resource.fileKey,
      p_resource_type: observation.resourceType,
      p_resource_label: observation.title.slice(0, 255),
      p_binding_proof: bindingProof,
      p_access_token_ciphertext: sealFigmaCredential(
        tokenSet.figmaUserId,
        "access",
        tokenSet.accessToken,
      ),
      p_refresh_token_ciphertext: sealFigmaCredential(
        tokenSet.figmaUserId,
        "refresh",
        tokenSet.refreshToken,
      ),
      p_access_token_expires_at: tokenExpiry(tokenSet.expiresIn),
      p_encryption_key_version: figmaCredentialKeyVersion(),
    });
    const savedRow =
      saved.data && typeof saved.data === "object"
        ? (saved.data as Record<string, unknown>)
        : null;
    if (saved.error || savedRow?.ok !== true) {
      return appRedirect(request, `${integrationPath}?error=figma-binding-save`);
    }

    return appRedirect(request, `${integrationPath}?updated=figma-read-connected`);
  } catch (error) {
    if (error instanceof FigmaProviderError) {
      const codeName =
        error.status === 404
          ? resource.nodeId
            ? "figma-node-not-authorized"
            : "figma-resource-not-authorized"
          : [400, 401, 403].includes(error.status)
            ? "figma-authorization-invalid"
            : error.status === 429
              ? "figma-rate-limited"
              : "figma-provider-unavailable";
      return appRedirect(request, `${integrationPath}?error=${codeName}`);
    }
    return appRedirect(request, `${integrationPath}?error=figma-oauth-config-invalid`);
  }
}
