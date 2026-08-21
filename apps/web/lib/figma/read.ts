import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FigmaProviderError,
  readBoundedFigmaContext,
  refreshFigmaTokens,
} from "@/lib/figma/api";
import {
  claimFigmaRefresh,
  completeFigmaRefresh,
  loadFigmaCredential,
  releaseFigmaRefresh,
} from "@/lib/figma/credential";
import {
  figmaCredentialKeyVersion,
  isFigmaOAuthConfigured,
  openFigmaCredential,
  sealFigmaCredential,
  verifyFigmaBindingProof,
} from "@/lib/figma/oauth";
import { parseCanonicalFigmaResourceUrl } from "@/lib/figma/resource";
import type { FigmaObservedResource } from "@/lib/figma/provenance";

const REFRESH_SAFETY_WINDOW_MS = 5 * 60 * 1000;

export class FigmaReadBoundaryError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "FigmaReadBoundaryError";
  }
}

function mappedProviderError(error: unknown): FigmaReadBoundaryError {
  if (!(error instanceof FigmaProviderError)) {
    return new FigmaReadBoundaryError(
      "figma_provider_unavailable",
      502,
      "Figma context could not be read right now. BuildMap data was not changed.",
    );
  }
  if (error.status === 401 || error.status === 403) {
    return new FigmaReadBoundaryError(
      "figma_reconnect_required",
      409,
      "Figma authorization is no longer usable. Reconnect read access.",
    );
  }
  if (error.status === 400 || error.status === 404) {
    return new FigmaReadBoundaryError(
      "figma_resource_unavailable",
      409,
      "The linked Figma file or selected node is no longer accessible to this authorization.",
    );
  }
  if (error.status === 429) {
    return new FigmaReadBoundaryError(
      "figma_rate_limited",
      429,
      "Figma is rate limiting this connection. Retry after the provider window.",
      error.retryAfterSeconds,
    );
  }
  return new FigmaReadBoundaryError(
    "figma_provider_unavailable",
    502,
    "Figma context could not be read right now. BuildMap data was not changed.",
  );
}

function expiryFromSeconds(expiresIn: number) {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

function needsRefresh(expiresAt: string) {
  const value = Date.parse(expiresAt);
  return !Number.isFinite(value) || value <= Date.now() + REFRESH_SAFETY_WINDOW_MS;
}

async function refreshCredentialAndRead(input: {
  supabase: SupabaseClient;
  linkId: string;
  fileKey: string;
  nodeId: string | null;
}) {
  const claimed = await claimFigmaRefresh(input.supabase, input.linkId);
  if (claimed.error) {
    throw new FigmaReadBoundaryError(
      "credential_unavailable",
      503,
      "Figma credential refresh boundary could not be loaded.",
    );
  }
  if (!claimed.claim) {
    throw new FigmaReadBoundaryError(
      "figma_refresh_in_progress",
      409,
      "Another request is rotating this Figma authorization. Retry the read.",
    );
  }

  const claim = claimed.claim;
  try {
    const refreshToken = openFigmaCredential(
      claim.figmaUserId,
      "refresh",
      claim.refreshTokenCiphertext,
      claim.encryptionKeyVersion,
    );
    const rotated = await refreshFigmaTokens(refreshToken);
    const nextRefreshToken = rotated.refreshToken ?? refreshToken;
    const completed = await completeFigmaRefresh(input.supabase, {
      projectLinkId: input.linkId,
      lockId: claim.lockId,
      expectedCredentialVersion: claim.credentialVersion,
      accessTokenCiphertext: sealFigmaCredential(claim.figmaUserId, "access", rotated.accessToken),
      refreshTokenCiphertext: sealFigmaCredential(claim.figmaUserId, "refresh", nextRefreshToken),
      accessTokenExpiresAt: expiryFromSeconds(rotated.expiresIn),
      encryptionKeyVersion: figmaCredentialKeyVersion(),
    });

    let accessToken = rotated.accessToken;
    if (!completed.completed) {
      await releaseFigmaRefresh(input.supabase, input.linkId, claim.lockId);
      const latest = await loadFigmaCredential(input.supabase, input.linkId);
      if (!latest.credential || latest.credential.figmaUserId !== claim.figmaUserId) {
        throw new FigmaReadBoundaryError(
          "figma_reconnect_required",
          409,
          "Figma authorization changed while refreshing. Reconnect read access.",
        );
      }
      accessToken = openFigmaCredential(
        latest.credential.figmaUserId,
        "access",
        latest.credential.accessTokenCiphertext,
        latest.credential.encryptionKeyVersion,
      );
    }

    return await readBoundedFigmaContext({
      accessToken,
      fileKey: input.fileKey,
      nodeId: input.nodeId,
    });
  } catch (error) {
    await releaseFigmaRefresh(input.supabase, input.linkId, claim.lockId);
    if (error instanceof FigmaReadBoundaryError) throw error;
    if (error instanceof FigmaProviderError && [400, 401, 403].includes(error.status)) {
      throw new FigmaReadBoundaryError(
        "figma_reconnect_required",
        409,
        "Figma authorization could not be refreshed. Reconnect read access.",
      );
    }
    throw mappedProviderError(error);
  }
}

export async function readVerifiedFigmaProjectContext(input: {
  supabase: SupabaseClient;
  projectId: string;
  linkId: string;
}): Promise<FigmaObservedResource> {
  if (!isFigmaOAuthConfigured()) {
    throw new FigmaReadBoundaryError(
      "figma_oauth_not_configured",
      503,
      "Figma OAuth server configuration is missing.",
    );
  }

  const [link, binding] = await Promise.all([
    input.supabase
      .from("project_links")
      .select("id, url")
      .eq("id", input.linkId)
      .eq("project_id", input.projectId)
      .eq("link_type", "figma")
      .is("archived_at", null)
      .maybeSingle(),
    input.supabase
      .from("integration_bindings")
      .select(
        "external_connection_id, external_resource_id, external_resource_type, binding_proof",
      )
      .eq("project_link_id", input.linkId)
      .eq("provider", "figma")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (link.error || !link.data) {
    throw new FigmaReadBoundaryError("invalid_link", 404, "Figma resource link is unavailable.");
  }
  if (binding.error) {
    throw new FigmaReadBoundaryError(
      "binding_unavailable",
      503,
      "Figma read binding could not be loaded.",
    );
  }
  if (!binding.data) {
    throw new FigmaReadBoundaryError("not_connected", 409, "Figma read access is not connected.");
  }

  const resource = parseCanonicalFigmaResourceUrl(link.data.url);
  const resourceType = binding.data.external_resource_type;
  if (
    !resource ||
    (resourceType !== "file" && resourceType !== "branch") ||
    binding.data.external_resource_id !== resource.fileKey
  ) {
    throw new FigmaReadBoundaryError(
      "binding_invalid",
      409,
      "Figma read binding does not match the linked file. Reconnect read access.",
    );
  }

  try {
    if (
      !verifyFigmaBindingProof(
        {
          projectLinkId: input.linkId,
          figmaUserId: binding.data.external_connection_id,
          resourceId: binding.data.external_resource_id,
          resourceType,
          nodeId: resource.nodeId,
        },
        binding.data.binding_proof,
      )
    ) {
      throw new FigmaReadBoundaryError(
        "binding_invalid",
        409,
        "Figma read binding failed integrity verification. Reconnect read access.",
      );
    }
  } catch (error) {
    if (error instanceof FigmaReadBoundaryError) throw error;
    throw new FigmaReadBoundaryError(
      "figma_oauth_config_invalid",
      503,
      "Figma OAuth server security configuration is invalid.",
    );
  }

  const loaded = await loadFigmaCredential(input.supabase, input.linkId);
  if (loaded.error) {
    throw new FigmaReadBoundaryError(
      "credential_unavailable",
      503,
      "Figma credential could not be loaded.",
    );
  }
  if (
    !loaded.credential ||
    loaded.credential.figmaUserId !== binding.data.external_connection_id
  ) {
    throw new FigmaReadBoundaryError(
      "figma_reconnect_required",
      409,
      "Figma read authorization is disconnected or does not match this binding.",
    );
  }

  let preview;
  try {
    if (needsRefresh(loaded.credential.accessTokenExpiresAt)) {
      preview = await refreshCredentialAndRead({
        supabase: input.supabase,
        linkId: input.linkId,
        fileKey: resource.fileKey,
        nodeId: resource.nodeId,
      });
    } else {
      const accessToken = openFigmaCredential(
        loaded.credential.figmaUserId,
        "access",
        loaded.credential.accessTokenCiphertext,
        loaded.credential.encryptionKeyVersion,
      );
      try {
        preview = await readBoundedFigmaContext({
          accessToken,
          fileKey: resource.fileKey,
          nodeId: resource.nodeId,
        });
      } catch (error) {
        if (!(error instanceof FigmaProviderError) || ![401, 403].includes(error.status)) {
          throw mappedProviderError(error);
        }
        preview = await refreshCredentialAndRead({
          supabase: input.supabase,
          linkId: input.linkId,
          fileKey: resource.fileKey,
          nodeId: resource.nodeId,
        });
      }
    }
  } catch (error) {
    if (error instanceof FigmaReadBoundaryError) throw error;
    throw mappedProviderError(error);
  }

  if (preview.fileKey !== resource.fileKey || preview.resourceType !== resourceType) {
    throw new FigmaReadBoundaryError(
      "binding_invalid",
      409,
      "Figma provider resource identity no longer matches the verified binding.",
    );
  }

  return {
    canonicalUrl: resource.url,
    observedAt: new Date().toISOString(),
    ...preview,
  };
}
