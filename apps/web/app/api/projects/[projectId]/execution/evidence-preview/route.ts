import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { isGitHubAppConfigured, verifyGitHubBindingProof } from "@/lib/github/app";
import { GitHubProviderError } from "@/lib/github/api";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { readGitHubExecutionEvidencePreview } from "@/lib/execution/github-evidence";
import { createClient } from "@/lib/supabase/server";

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function error(code: string, status: number) {
  return noStore({ error: { code }, sourceStatus: "UNKNOWN" }, status);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const linkId = request.nextUrl.searchParams.get("linkId");
  if (!linkId || !/^[0-9a-f-]{36}$/i.test(linkId)) {
    return error("invalid_link", 400);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) return error("unauthenticated", 401);

  const builder = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase.from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", builder.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) return error("project_access", 404);

  if (!isGitHubAppConfigured()) {
    return error("github_app_not_configured", 503);
  }

  const [link, binding] = await Promise.all([
    supabase.from("project_links")
      .select("id, url")
      .eq("id", linkId)
      .eq("project_id", projectId)
      .eq("link_type", "github")
      .is("archived_at", null)
      .maybeSingle(),
    supabase.from("integration_bindings")
      .select("project_link_id, external_connection_id, external_resource_id, external_resource_label, binding_proof")
      .eq("project_link_id", linkId)
      .eq("provider", "github")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (link.error || !link.data) return error("invalid_link", 404);
  if (binding.error) return error("binding_unavailable", 503);
  if (!binding.data) return error("github_not_connected", 409);

  const repository = parseCanonicalGitHubRepositoryUrl(link.data.url);
  if (!repository) return error("invalid_repository_pointer", 409);

  if (binding.data.external_resource_label.toLowerCase() !== repository.fullName.toLowerCase() ||
    !verifyGitHubBindingProof({
      projectLinkId: linkId,
      installationId: binding.data.external_connection_id,
      repositoryId: binding.data.external_resource_id,
      fullName: repository.fullName,
    }, binding.data.binding_proof)) {
    return error("github_binding_integrity_failure", 409);
  }

  try {
    const preview = await readGitHubExecutionEvidencePreview({
      installationId: binding.data.external_connection_id,
      repositoryId: binding.data.external_resource_id,
      owner: repository.owner,
      repository: repository.repository,
    });

    return noStore({
      ...preview,
      storageStatus: "NOT_PERSISTED",
      criterionEvaluation: "NOT_AVAILABLE",
    });
  } catch (failure) {
    if (failure instanceof GitHubProviderError &&
        [401, 403, 404].includes(failure.status)) {
      return error("github_authorization_unavailable", 409);
    }
    return error("github_source_unavailable", 502);
  }
}
