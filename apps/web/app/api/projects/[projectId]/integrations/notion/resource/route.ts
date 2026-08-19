import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
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
  NotionResourceType,
  openNotionCredential,
  sealNotionCredential,
  verifyNotionBindingProof,
} from "@/lib/notion/oauth";
import { parseCanonicalNotionResourceUrl } from "@/lib/notion/resource";
import { createClient } from "@/lib/supabase/server";

function jsonError(
  code: string,
  message: string,
  status: number,
  retryAfterSeconds?: number | null,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function compactUuid(value: string) {
  return value.replaceAll("-", "").toLowerCase();
}

function providerErrorResponse(error: unknown) {
  if (!(error instanceof NotionProviderError)) {
    return jsonError(
      "notion_provider_unavailable",
      "Notion context could not be read right now. BuildMap data was not changed.",
      502,
    );
  }
  if (error.status === 401) {
    return jsonError(
      "notion_reconnect_required",
      "Notion authorization is no longer usable. Reconnect read access.",
      409,
    );
  }
  if ([403, 404].includes(error.status)) {
    return jsonError(
      "notion_resource_unavailable",
      "The linked Notion resource is no longer accessible to this authorization.",
      409,
    );
  }
  if (error.status === 429) {
    return jsonError(
      "notion_rate_limited",
      "Notion is rate limiting this connection. Retry after the provider window.",
      429,
      error.retryAfterSeconds,
    );
  }
  return jsonError(
    "notion_provider_unavailable",
    "Notion context could not be read right now. BuildMap data was not changed.",
    502,
  );
}

async function readWithAccessToken(input: {
  accessToken: string;
  resourceId: string;
  resourceType: NotionResourceType;
}) {
  return readBoundedNotionResource(input);
}

async function refreshCredentialAndRead(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  linkId: string;
  resourceId: string;
  resourceType: NotionResourceType;
}) {
  const claimed = await claimNotionRefresh(input.supabase, input.linkId);
  if (claimed.error) {
    throw new Error("Notion refresh lock could not be loaded.");
  }
  if (!claimed.claim) {
    return { kind: "busy" as const };
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
      return { kind: "reconnect" as const };
    }

    const accessTokenCiphertext = sealNotionCredential(
      claim.botId,
      "access",
      rotated.accessToken,
    );
    const refreshTokenCiphertext = sealNotionCredential(
      claim.botId,
      "refresh",
      rotated.refreshToken,
    );
    const completed = await completeNotionRefresh(input.supabase, {
      projectLinkId: input.linkId,
      lockId: claim.lockId,
      expectedCredentialVersion: claim.credentialVersion,
      accessTokenCiphertext,
      refreshTokenCiphertext,
      encryptionKeyVersion: notionCredentialKeyVersion(),
    });

    if (!completed.completed) {
      const latest = await loadNotionCredential(input.supabase, input.linkId);
      if (!latest.credential) {
        return { kind: "reconnect" as const };
      }
      const latestAccessToken = openNotionCredential(
        latest.credential.botId,
        "access",
        latest.credential.accessTokenCiphertext,
        latest.credential.encryptionKeyVersion,
      );
      const preview = await readWithAccessToken({
        accessToken: latestAccessToken,
        resourceId: input.resourceId,
        resourceType: input.resourceType,
      });
      return { kind: "ok" as const, preview };
    }

    const preview = await readWithAccessToken({
      accessToken: rotated.accessToken,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    });
    return { kind: "ok" as const, preview };
  } catch (error) {
    await releaseNotionRefresh(input.supabase, input.linkId, claim.lockId);
    if (
      error instanceof NotionProviderError &&
      [400, 401, 403].includes(error.status)
    ) {
      return { kind: "reconnect" as const };
    }
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!isNotionOAuthConfigured()) {
    return jsonError(
      "notion_oauth_not_configured",
      "Notion OAuth server configuration is missing.",
      503,
    );
  }

  const linkId = request.nextUrl.searchParams.get("linkId")?.trim() ?? "";
  if (!linkId) {
    return jsonError("invalid_link", "Notion resource link is required.", 400);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return jsonError("unauthenticated", "Authentication is required.", 401);
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) {
    return jsonError("project_access", "Project access denied.", 404);
  }

  const [link, binding] = await Promise.all([
    supabase
      .from("project_links")
      .select("id, url")
      .eq("id", linkId)
      .eq("project_id", projectId)
      .eq("link_type", "notion")
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("integration_bindings")
      .select(
        "id, project_link_id, provider, external_connection_id, external_account_id, external_account_label, external_resource_id, external_resource_type, external_resource_label, binding_proof, status",
      )
      .eq("project_link_id", linkId)
      .eq("provider", "notion")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (link.error || !link.data) {
    return jsonError("invalid_link", "Notion resource link is unavailable.", 404);
  }
  if (binding.error) {
    return jsonError("binding_unavailable", "Notion read binding could not be loaded.", 503);
  }
  if (!binding.data) {
    return jsonError("not_connected", "Notion read access is not connected.", 409);
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
    return jsonError(
      "binding_invalid",
      "Notion read binding does not match the linked resource. Reconnect read access.",
      409,
    );
  }

  try {
    const proofValid = verifyNotionBindingProof(
      {
        projectLinkId: linkId,
        botId: binding.data.external_connection_id,
        workspaceId,
        resourceId: binding.data.external_resource_id,
        resourceType,
      },
      binding.data.binding_proof,
    );
    if (!proofValid) {
      return jsonError(
        "binding_invalid",
        "Notion read binding failed integrity verification. Reconnect read access.",
        409,
      );
    }
  } catch {
    return jsonError(
      "notion_oauth_config_invalid",
      "Notion OAuth server security configuration is invalid.",
      503,
    );
  }

  const loaded = await loadNotionCredential(supabase, linkId);
  if (loaded.error) {
    return jsonError("credential_unavailable", "Notion credential could not be loaded.", 503);
  }
  if (
    !loaded.credential ||
    loaded.credential.botId !== binding.data.external_connection_id ||
    loaded.credential.workspaceId !== workspaceId
  ) {
    return jsonError(
      "notion_reconnect_required",
      "Notion read authorization is disconnected or does not match this binding.",
      409,
    );
  }

  try {
    const accessToken = openNotionCredential(
      loaded.credential.botId,
      "access",
      loaded.credential.accessTokenCiphertext,
      loaded.credential.encryptionKeyVersion,
    );

    try {
      const preview = await readWithAccessToken({
        accessToken,
        resourceId: resource.resourceId,
        resourceType,
      });
      return NextResponse.json(
        {
          canonicalUrl: link.data.url,
          workspaceLabel: binding.data.external_account_label,
          observedAt: new Date().toISOString(),
          ...preview,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (!(error instanceof NotionProviderError) || error.status !== 401) {
        return providerErrorResponse(error);
      }
    }

    const refreshed = await refreshCredentialAndRead({
      supabase,
      linkId,
      resourceId: resource.resourceId,
      resourceType,
    });
    if (refreshed.kind === "busy") {
      return jsonError(
        "notion_refresh_in_progress",
        "Another request is rotating this Notion authorization. Retry the read.",
        409,
      );
    }
    if (refreshed.kind === "reconnect") {
      return jsonError(
        "notion_reconnect_required",
        "Notion authorization changed or could not be refreshed. Reconnect read access.",
        409,
      );
    }

    return NextResponse.json(
      {
        canonicalUrl: link.data.url,
        workspaceLabel: binding.data.external_account_label,
        observedAt: new Date().toISOString(),
        ...refreshed.preview,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return providerErrorResponse(error);
  }
}
