import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { isGitHubAppConfigured, verifyGitHubBindingProof } from "@/lib/github/app";
import { GitHubProviderError } from "@/lib/github/api";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { readGitHubExecutionEvidencePreview } from "@/lib/execution/github-evidence";
import { createClient } from "@/lib/supabase/server";

function send(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function deny(code: string, status: number) {
  return send({ error: { code }, storageStatus: "UNKNOWN", criterionEvaluation: "NOT_AVAILABLE" }, status);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  // Explicit same-origin gate for a cookie-authenticated state-changing request.
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return deny("invalid_origin", 403);
  }

  const { projectId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return deny("invalid_body", 400);
  }
  const linkId = body && typeof body === "object" && "linkId" in body
    ? (body as { linkId?: unknown }).linkId
    : null;
  if (typeof linkId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(linkId)) {
    return deny("invalid_link", 400);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) return deny("unauthenticated", 401);

  const builder = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase.from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", builder.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) return deny("project_access", 404);

  if (!isGitHubAppConfigured()) return deny("github_app_not_configured", 503);

  const [link, binding] = await Promise.all([
    supabase.from("project_links").select("id, url")
      .eq("id", linkId).eq("project_id", projectId)
      .eq("link_type", "github").is("archived_at", null).maybeSingle(),
    supabase.from("integration_bindings")
      .select("project_link_id, external_connection_id, external_resource_id, external_resource_label, binding_proof")
      .eq("project_link_id", linkId).eq("provider", "github")
      .eq("status", "active").is("archived_at", null)
      .limit(1).maybeSingle(),
  ]);
  if (link.error || !link.data) return deny("invalid_link", 404);
  if (binding.error) return deny("binding_unavailable", 503);
  if (!binding.data) return deny("github_not_connected", 409);

  const repository = parseCanonicalGitHubRepositoryUrl(link.data.url);
  if (!repository) return deny("invalid_repository_pointer", 409);

  const repositoryId = Number(binding.data.external_resource_id);
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0 ||
      binding.data.external_resource_label.toLowerCase() !== repository.fullName.toLowerCase() ||
      !verifyGitHubBindingProof({
        projectLinkId: linkId,
        installationId: binding.data.external_connection_id,
        repositoryId: binding.data.external_resource_id,
        fullName: repository.fullName,
      }, binding.data.binding_proof)) {
    return deny("github_binding_integrity_failure", 409);
  }

  try {
    const preview = await readGitHubExecutionEvidencePreview({
      installationId: binding.data.external_connection_id,
      repositoryId: binding.data.external_resource_id,
      owner: repository.owner,
      repository: repository.repository,
    });

    // Bounded, server-observed source metadata only. Database snapshots remain
    // untrusted cache; deterministic acceptance requires fresh GitHub re-read.
    const observations = preview.evidence.map((entry) => ({
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      sourceState: entry.sourceState,
      sourceSha: entry.sourceSha,
      sourceUrl: entry.sourceUrl,
      title: entry.title,
      reason: entry.reason,
      occurredAt: entry.occurredAt,
    }));

    const persisted = await supabase.rpc("execution_record_evidence_batch", {
      p_project_id: projectId,
      p_repository_id: repositoryId,
      p_repository_name: repository.fullName,
      p_items: observations,
    });
    if (persisted.error || !persisted.data) {
      return deny("evidence_cache_write_failed", 503);
    }

    return send({
      repository: preview.repository,
      observedAt: preview.observedAt,
      capabilities: preview.capabilities,
      objectsObserved: persisted.data.objectsObserved,
      newSnapshots: persisted.data.newSnapshots,
      storageStatus: "CACHED_UNTRUSTED",
      criterionEvaluation: "NOT_AVAILABLE",
      progress: "NOT_CALCULABLE",
    });
  } catch (error) {
    if (error instanceof GitHubProviderError && [401, 403, 404].includes(error.status)) {
      return deny("github_authorization_unavailable", 409);
    }
    return deny("github_provider_unavailable", 502);
  }
}
