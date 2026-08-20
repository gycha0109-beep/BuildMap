import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NotionProviderError,
  readBoundedNotionResource,
  refreshNotionTokens,
} from "@/lib/notion/api";
import {
  claimNotionRefresh,
  completeNotionRefresh,
  loadNotionCredential,
  releaseNotionRefresh,
} from "@/lib/notion/credential";
import {
  isNotionOAuthConfigured,
  notionCredentialKeyVersion,
  openNotionCredential,
  sealNotionCredential,
  verifyNotionBindingProof,
} from "@/lib/notion/oauth";
import { parseCanonicalNotionResourceUrl } from "@/lib/notion/resource";
import type { NotionObservedResource } from "@/lib/notion/provenance";

export class NotionReadBoundaryError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "NotionReadBoundaryError";
  }
}

function compactUuid(value: string) {
  return value.replaceAll("-", "").toLowerCase();
}

function mappedProviderError(error: unknown): NotionReadBoundaryError {
  if (!(error instanceof NotionProviderError)) {
    return new NotionReadBoundaryError(
      "notion_provider_unavailable",
      502,
      "Notion context could not be read right now. BuildMap data was not changed.",
    );
  }
  if (error.status === 401) {
    return new NotionReadBoundaryError(
      "notion_reconnect_required",
      409,
      "Notion authorization is no longer usable. Reconnect read access.",
    );
  }
  if ([403, 404].includes(error.status)) {
    return new NotionReadBoundaryError(
      "notion_resource_unavailable",
      409,
      "The linked Notion resource is no longer accessible to this authorization.",
    );
  }
  if (error.status === 429) {
    return new NotionReadBoundaryError(
      "notion_rate_limited",
      429,
      "Notion is rate limiting this connection. Retry after the provider window.",
      error.retryAfterSeconds,
    );
  }
  return new NotionReadBoundaryError(
    "notion_provider_unavailable",
    502,
    "Notion context could not be read right now. BuildMap data was not changed.",
  );
}

async function refreshCredentialAndRead(input: {
  supabase: SupabaseClient;
  linkId: string;
  resourceId: string;
  resourceType: "page" | "database";
}) {
  const claimed = await claimNotionRefresh(input.supabase, input.linkId);
  if (claimed.error) {
    throw new NotionReadBoundaryError(
      "credential_unavailable",
      503,
      "Notion credential refresh boundary could not be loaded.",
    );
  }
  if (!claimed.claim) {
    throw new NotionReadBoundaryError(
      "notion_refresh_in_progress",
      409,
      "Another request is rotating this Notion authorization. Retry the read.",
    );
  }

  const claim = claimed.claim;
  try {
    const refreshToken = openNotionCredential(
      claim.botId,
      "refresh",
      claim.refreshTokenCiphertext,
      claim.encryptionKeyVersion,
    );
    const rotated = await refreshNotionTokens(refreshToken);
    if (rotated.botId !== claim.botId || rotated.workspaceId !== claim.workspaceId) {
      await releaseNotionRefresh(input.supabase, input.linkId, claim.lockId);
      throw new NotionReadBoundaryError(
        "notion_reconnect_required",
        409,
        "Notion authorization identity changed during refresh. Reconnect read access.",
      );
    }

    const completed = await completeNotionRefresh(input.supabase, {
      projectLinkId: input.linkId,
      lockId: claim.lockId,
      expectedCredentialVersion: claim.credentialVersion,
      accessTokenCiphertext: sealNotionCredential(claim.botId, "access", rotated.accessToken),
      refreshTokenCiphertext: sealNotionCredential(claim.botId, "refresh", rotated.refreshToken),
      encryptionKeyVersion: notionCredentialKeyVersion(),
    });

    let accessToken = rotated.accessToken;
    if (!completed.completed) {
      const latest = await loadNotionCredential(input.supabase, input.linkId);
      if (!latest.credential) {
        throw new NotionReadBoundaryError(
          "notion_reconnect_required",
          409,
          "Notion authorization changed while refreshing. Reconnect read access.",
        );
      }
      accessToken = openNotionCredential(
        latest.credential.botId,
        "access",
        latest.credential.accessTokenCiphertext,
        latest.credential.encryptionKeyVersion,
      );
    }

    return await readBoundedNotionResource({
      accessToken,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    });
  } catch (error) {
    await releaseNotionRefresh(input.supabase, input.linkId, claim.lockId);
    if (error instanceof NotionReadBoundaryError) throw error;
    if (error instanceof NotionProviderError && [400, 401, 403].includes(error.status)) {
      throw new NotionReadBoundaryError(
        "notion_reconnect_required",
        409,
        "Notion authorization could not be refreshed. Reconnect read access.",
      );
    }
    throw mappedProviderError(error);
  }
}

export async function readVerifiedNotionProjectResource(input: {
  supabase: SupabaseClient;
  projectId: string;
  linkId: string;
}): Promise<NotionObservedResource> {
  if (!isNotionOAuthConfigured()) {
    throw new NotionReadBoundaryError(
      "notion_oauth_not_configured",
      503,
      "Notion OAuth server configuration is missing.",
    );
  }

  const [link, binding] = await Promise.all([
    input.supabase
      .from("project_links")
      .select("id, url")
      .eq("id", input.linkId)
      .eq("project_id", input.projectId)
      .eq("link_type", "notion")
      .is("archived_at", null)
      .maybeSingle(),
    input.supabase
      .from("integration_bindings")
      .select(
        "external_connection_id, external_account_id, external_account_label, external_resource_id, external_resource_type, binding_proof",
      )
      .eq("project_link_id", input.linkId)
      .eq("provider", "notion")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (link.error || !link.data) {
    throw new NotionReadBoundaryError("invalid_link", 404, "Notion resource link is unavailable.");
  }
  if (binding.error) {
    throw new NotionReadBoundaryError(
      "binding_unavailable",
      503,
      "Notion read binding could not be loaded.",
    );
  }
  if (!binding.data) {
    throw new NotionReadBoundaryError(
      "not_connected",
      409,
      "Notion read access is not connected.",
    );
  }

  const resource = parseCanonicalNotionResourceUrl(link.data.url);
  const resourceType = binding.data.external_resource_type;
  const workspaceId = binding.data.external_account_id;
  if (
    !resource ||
    !workspaceId ||
    (resourceType !== "page" && resourceType !== "database") ||
    compactUuid(binding.data.external_resource_id) !== compactUuid(resource.resourceId)
  ) {
    throw new NotionReadBoundaryError(
      "binding_invalid",
      409,
      "Notion read binding does not match the linked resource. Reconnect read access.",
    );
  }

  try {
    if (
      !verifyNotionBindingProof(
        {
          projectLinkId: input.linkId,
          botId: binding.data.external_connection_id,
          workspaceId,
          resourceId: binding.data.external_resource_id,
          resourceType,
        },
        binding.data.binding_proof,
      )
    ) {
      throw new NotionReadBoundaryError(
        "binding_invalid",
        409,
        "Notion read binding failed integrity verification. Reconnect read access.",
      );
    }
  } catch (error) {
    if (error instanceof NotionReadBoundaryError) throw error;
    throw new NotionReadBoundaryError(
      "notion_oauth_config_invalid",
      503,
      "Notion OAuth server security configuration is invalid.",
    );
  }

  const loaded = await loadNotionCredential(input.supabase, input.linkId);
  if (loaded.error) {
    throw new NotionReadBoundaryError(
      "credential_unavailable",
      503,
      "Notion credential could not be loaded.",
    );
  }
  if (
    !loaded.credential ||
    loaded.credential.botId !== binding.data.external_connection_id ||
    loaded.credential.workspaceId !== workspaceId
  ) {
    throw new NotionReadBoundaryError(
      "notion_reconnect_required",
      409,
      "Notion read authorization is disconnected or does not match this binding.",
    );
  }

  let preview;
  try {
    const accessToken = openNotionCredential(
      loaded.credential.botId,
      "access",
      loaded.credential.accessTokenCiphertext,
      loaded.credential.encryptionKeyVersion,
    );
    try {
      preview = await readBoundedNotionResource({
        accessToken,
        resourceId: resource.resourceId,
        resourceType,
      });
    } catch (error) {
      if (!(error instanceof NotionProviderError) || error.status !== 401) {
        throw mappedProviderError(error);
      }
      preview = await refreshCredentialAndRead({
        supabase: input.supabase,
        linkId: input.linkId,
        resourceId: resource.resourceId,
        resourceType,
      });
    }
  } catch (error) {
    if (error instanceof NotionReadBoundaryError) throw error;
    throw mappedProviderError(error);
  }

  return {
    canonicalUrl: link.data.url,
    workspaceLabel: binding.data.external_account_label,
    observedAt: new Date().toISOString(),
    ...preview,
  };
}
