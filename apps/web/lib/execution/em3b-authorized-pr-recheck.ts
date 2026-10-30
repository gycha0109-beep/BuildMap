import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isGitHubAppConfigured, verifyGitHubBindingProof } from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { inspectGitHubExecutionInstallation } from "./github-installation-diagnostic";
import { inspectExecutionSourceHealth } from "./github-source-health";
import { composeFreshPrRecheck } from "./em3b-proof-guard";
import type { FreshProviderRecheck } from "./deterministic-evaluator";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const numeric = /^[1-9][0-9]{0,15}$/;
const prId = /^pr:[1-9][0-9]{0,14}$/;

/**
 * Server-only, read-only preliminary EM-3B source adapter.
 * No HTTP route or database writes. Only authoritative server reads may
 * construct a FreshProviderRecheck; cached evidence remains untrusted.
 * Do not deploy until EM-1/EM-2 controlled hosted migration and live E2E.
 */
export async function readAuthorizedExecutionPrRecheck(input: {
  projectId: string;
  linkId: string;
  criterionId: string;
  evidenceId: string;
}): Promise<FreshProviderRecheck | null> {
  if (!uuid.test(input.projectId) || !uuid.test(input.linkId) ||
      !uuid.test(input.criterionId) || !uuid.test(input.evidenceId) ||
      !isGitHubAppConfigured()) return null;
  try {
    const db = await createClient();
    const user = await db.auth.getUser();
    if (user.error || !user.data.user) return null;

    // Read-only identity lookup; ensureBuilderContext would insert profiles.
    const profile = await db.from("user_profiles").select("id")
      .eq("auth_user_id", user.data.user.id).maybeSingle();
    if (profile.error || !profile.data) return null;
    const builder = await db.from("builder_profiles").select("id")
      .eq("user_profile_id", profile.data.id).maybeSingle();
    if (builder.error || !builder.data) return null;
    const builderId = builder.data.id;
    const project = await db.from("projects").select("id")
      .eq("id", input.projectId)
      .eq("owner_builder_profile_id", builderId)
      .is("archived_at", null).maybeSingle();
    if (project.error || !project.data) return null;

    const criterion = await db.from("completion_criteria")
      .select("id,roadmap_revision_id,rule_type")
      .eq("id", input.criterionId).eq("project_id", input.projectId)
      .is("archived_at", null).maybeSingle();
    if (criterion.error || !criterion.data || criterion.data.rule_type !== "PR_MERGED") return null;
    const revision = await db.from("roadmap_revisions")
      .select("id,status,approved_at,approved_by_builder_profile_id")
      .eq("id", criterion.data.roadmap_revision_id)
      .eq("project_id", input.projectId).maybeSingle();
    if (revision.error || !revision.data || revision.data.status !== "approved" ||
        !revision.data.approved_at || !revision.data.approved_by_builder_profile_id) return null;

    const review = await db.from("criterion_evidence_links")
      .select("review_status,reviewed_by_builder_profile_id,reviewed_at")
      .eq("project_id", input.projectId)
      .eq("criterion_id", input.criterionId)
      .eq("evidence_id", input.evidenceId).maybeSingle();
    if (review.error || !review.data || review.data.review_status !== "reviewed" ||
        review.data.reviewed_by_builder_profile_id !== builderId ||
        !review.data.reviewed_at) return null;

    const [link, binding, evidence, snapshot] = await Promise.all([
      db.from("project_links").select("id,url")
        .eq("id", input.linkId).eq("project_id", input.projectId)
        .eq("link_type", "github").is("archived_at", null).maybeSingle(),
      db.from("integration_bindings")
        .select("external_connection_id,external_resource_id,external_resource_label,binding_proof")
        .eq("project_link_id", input.linkId).eq("provider", "github")
        .eq("status", "active").is("archived_at", null).limit(1).maybeSingle(),
      db.from("execution_evidence")
        .select("id,repository_id,repository_name,source_type,source_id")
        .eq("id", input.evidenceId).eq("project_id", input.projectId)
        .eq("provider", "github").maybeSingle(),
      db.from("execution_evidence_observations")
        .select("source_state,source_sha,version_sequence")
        .eq("project_id", input.projectId).eq("evidence_id", input.evidenceId)
        .order("version_sequence", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (link.error || binding.error || evidence.error || snapshot.error ||
        !link.data || !binding.data || !evidence.data || !snapshot.data) return null;
    const repository = parseCanonicalGitHubRepositoryUrl(link.data.url);
    const installationId = binding.data.external_connection_id;
    const repositoryId = String(binding.data.external_resource_id);
    if (!repository || !numeric.test(repositoryId) || !numeric.test(installationId) ||
        evidence.data.source_type !== "merged_pull_request" ||
        !prId.test(evidence.data.source_id) ||
        String(evidence.data.repository_id) !== repositoryId ||
        evidence.data.repository_name.toLowerCase() !== repository.fullName.toLowerCase() ||
        binding.data.external_resource_label.toLowerCase() !== repository.fullName.toLowerCase() ||
        snapshot.data.source_state !== "SOURCE_CONFIRMED" ||
        typeof snapshot.data.source_sha !== "string" ||
        !verifyGitHubBindingProof({
          projectLinkId: input.linkId,
          installationId,
          repositoryId,
          fullName: repository.fullName,
        }, binding.data.binding_proof)) return null;

    // The App installation AND the narrow token must confirm the exact repo.
    const diagnostic = await inspectGitHubExecutionInstallation({
      installationId,
      repositoryId,
      owner: repository.owner,
      repository: repository.repository,
    });
    if (diagnostic.installationIdentity !== "MATCH" ||
        diagnostic.repositoryIdentity !== "MATCH") return null;

    // An actual, new GitHub pull detail request determines source status.
    const health = await inspectExecutionSourceHealth({
      installationId,
      repositoryId,
      owner: repository.owner,
      repository: repository.repository,
      sourceType: "merged_pull_request",
      sourceId: evidence.data.source_id,
      cachedSha: snapshot.data.source_sha,
    });
    return composeFreshPrRecheck({
      evidenceId: evidence.data.id,
      repositoryId,
      sourceId: evidence.data.source_id,
      cachedSha: snapshot.data.source_sha,
      nowIso: new Date().toISOString(),
    }, health);
  } catch {
    // Authentication, RLS, token, provider and transport failures are UNKNOWN.
    return null;
  }
}
