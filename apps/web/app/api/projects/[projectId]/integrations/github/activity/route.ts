import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { isGitHubAppConfigured, verifyGitHubBindingProof } from "@/lib/github/app";
import { GitHubProviderError, readGitHubActivity } from "@/lib/github/api";
import { triageGitHubObservations } from "@/lib/github/decision-triage";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function triageKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  if (!isGitHubAppConfigured()) {
    return jsonError("github_app_not_configured", "GitHub App server configuration is missing.", 503);
  }

  const linkId = request.nextUrl.searchParams.get("linkId")?.trim() ?? "";
  if (!linkId) {
    return jsonError("invalid_link", "GitHub repository link is required.", 400);
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
      .eq("link_type", "github")
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("integration_bindings")
      .select(
        "id, project_link_id, provider, external_connection_id, external_resource_id, external_resource_label, binding_proof, status",
      )
      .eq("project_link_id", linkId)
      .eq("provider", "github")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (link.error || !link.data) {
    return jsonError("invalid_link", "GitHub repository link is unavailable.", 404);
  }
  if (binding.error) {
    return jsonError("binding_unavailable", "GitHub read binding could not be loaded.", 503);
  }
  if (!binding.data) {
    return jsonError("not_connected", "GitHub read access is not connected.", 409);
  }

  const repository = parseCanonicalGitHubRepositoryUrl(link.data.url);
  if (!repository) {
    return jsonError("invalid_link", "Stored GitHub repository URL is not canonical.", 409);
  }

  const labelMatches =
    binding.data.external_resource_label.toLowerCase() === repository.fullName.toLowerCase();
  const proofValid = verifyGitHubBindingProof(
    {
      projectLinkId: linkId,
      installationId: binding.data.external_connection_id,
      repositoryId: binding.data.external_resource_id,
      fullName: repository.fullName,
    },
    binding.data.binding_proof,
  );
  if (!labelMatches || !proofValid) {
    return jsonError(
      "binding_invalid",
      "GitHub read binding failed integrity verification. Reconnect this repository.",
      409,
    );
  }

  try {
    const observations = await readGitHubActivity({
      installationId: binding.data.external_connection_id,
      repositoryId: binding.data.external_resource_id,
      owner: repository.owner,
      repository: repository.repository,
    });

    let triageStatus: "available" | "unavailable" = "available";
    const triageBySource = new Map<
      string,
      Awaited<ReturnType<typeof triageGitHubObservations>>[number]
    >();

    try {
      const triageResults = await triageGitHubObservations(observations);
      for (const result of triageResults) {
        triageBySource.set(triageKey(result.sourceType, result.sourceId), result);
      }
    } catch (error) {
      triageStatus = "unavailable";
      console.error("BuildMap GitHub ephemeral triage unavailable", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return NextResponse.json(
      {
        repository: repository.fullName,
        observedAt: new Date().toISOString(),
        triageStatus,
        observations: observations.map((observation) => {
          const triage = triageBySource.get(
            triageKey(observation.sourceType, observation.sourceId),
          );
          return {
            ...observation,
            triage: triage
              ? {
                  classification: triage.classification,
                  shouldPromote: triage.shouldPromote,
                  reason: triage.reason,
                }
              : null,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GitHubProviderError && [401, 403, 404].includes(error.status)) {
      return jsonError(
        "github_authorization_unavailable",
        "GitHub authorization or repository access is no longer available. Reconnect if needed.",
        409,
      );
    }
    return jsonError(
      "github_provider_unavailable",
      "GitHub activity could not be read right now. BuildMap data was not changed.",
      502,
    );
  }
}
