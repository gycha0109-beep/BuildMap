import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { GitHubProviderError } from "@/lib/github/api";
import { isGitHubAppConfigured, verifyGitHubBindingProof } from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { inspectGitHubExecutionInstallation } from "@/lib/execution/github-installation-diagnostic";
import { inspectExecutionSourceHealth } from "@/lib/execution/github-source-health";
import { createClient } from "@/lib/supabase/server";

function respond(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
function error(code: string, status: number) {
  return respond({ error: { code }, providerState: "UNKNOWN", criterionEvaluation: "NOT_AVAILABLE" }, status);
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const linkId = request.nextUrl.searchParams.get("linkId");
  const evidenceId = request.nextUrl.searchParams.get("evidenceId");
  if (!uuid.test(projectId) || !linkId || !uuid.test(linkId) ||
      (evidenceId !== null && !uuid.test(evidenceId))) {
    return error("invalid_identifiers", 400);
  }

  const supabase = await createClient();
  const userResult = await supabase.auth.getUser();
  if (!userResult.data.user) return error("unauthenticated", 401);
  const builder = await ensureBuilderContext(supabase, userResult.data.user);
  const project = await supabase.from("projects").select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", builder.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) return error("project_access", 404);
  if (!isGitHubAppConfigured()) return error("github_app_not_configured", 503);

  const [link, binding] = await Promise.all([
    supabase.from("project_links").select("id, url")
      .eq("id", linkId).eq("project_id", projectId)
      .eq("link_type", "github").is("archived_at", null).maybeSingle(),
    supabase.from("integration_bindings")
      .select("project_link_id, external_connection_id, external_resource_id, external_resource_label, binding_proof")
      .eq("project_link_id", linkId).eq("provider", "github")
      .eq("status", "active").is("archived_at", null).limit(1).maybeSingle(),
  ]);

  if (link.error || !link.data) return error("invalid_project_link", 404);
  if (binding.error) return error("binding_lookup_failed", 503);
  if (!binding.data) return error("binding_inactive", 409);

  const repository = parseCanonicalGitHubRepositoryUrl(link.data.url);
  if (!repository) return error("invalid_repository_url", 409);

  const repositoryId = Number(binding.data.external_resource_id);
  const installationId = binding.data.external_connection_id;
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0 ||
    !/^[1-9][0-9]{0,15}$/.test(installationId) ||
    binding.data.external_resource_label.toLowerCase() !== repository.fullName.toLowerCase() ||
    !verifyGitHubBindingProof({
      projectLinkId: linkId,
      installationId,
      repositoryId: binding.data.external_resource_id,
      fullName: repository.fullName,
    }, binding.data.binding_proof)) {
    return error("binding_identity_mismatch", 409);
  }

  try {
    const diagnostic = await inspectGitHubExecutionInstallation({
      installationId,
      repositoryId: String(repositoryId),
      owner: repository.owner,
      repository: repository.repository,
    });
    if (diagnostic.installationIdentity !== "MATCH" ||
        diagnostic.repositoryIdentity !== "MATCH") {
      return respond({
        providerState: "UNKNOWN", reason: diagnostic.repositoryReason,
        criterionEvaluation: "NOT_AVAILABLE",
        diagnostic,
      }, 409);
    }

    let sourceHealth = null;
    if (evidenceId) {
      const evidence = await supabase.from("execution_evidence")
        .select("id,repository_id,repository_name,source_type,source_id")
        .eq("id", evidenceId).eq("project_id", projectId)
        .eq("provider", "github").maybeSingle();
      if (evidence.error || !evidence.data) return error("source_access_denied", 404);
      if (String(evidence.data.repository_id) !== String(repositoryId) ||
        evidence.data.repository_name.toLowerCase() !== repository.fullName.toLowerCase()) {
        return error("source_repository_identity_mismatch", 409);
      }
      const snapshot = await supabase.from("execution_evidence_observations")
        .select("source_sha,source_state,version_sequence")
        .eq("project_id", projectId).eq("evidence_id", evidenceId)
        .order("version_sequence", { ascending: false })
        .limit(1).maybeSingle();
      if (snapshot.error) return error("source_snapshot_unavailable", 503);

      // Cached source can be forged by its owner; this fresh read is only a
      // diagnostic. Criterion PASS requires EM-3 rule-specific verification.
      sourceHealth = await inspectExecutionSourceHealth({
        installationId,
        repositoryId: String(repositoryId),
        owner: repository.owner,
        repository: repository.repository,
        sourceType: evidence.data.source_type as "merged_pull_request" | "release",
        sourceId: evidence.data.source_id,
        cachedSha: snapshot.data?.source_sha ?? null,
      });
    }

    return respond({
      providerState: "LIVE_REPOSITORY_ACCESS_CONFIRMED",
      diagnostic,
      sourceHealth,
      criterionEvaluation: "NOT_AVAILABLE",
      progress: "NOT_CALCULABLE",
    });
  } catch (failure) {
    if (failure instanceof GitHubProviderError) {
      if ([401,403,404].includes(failure.status)) return error("github_permission_or_installation_unknown", 409);
      if (failure.status === 429) return error("github_rate_limited", 503);
    }
    return error("github_diagnostics_unavailable", 502);
  }
}
