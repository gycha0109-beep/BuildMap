import { createInstallationAccessToken, GitHubProviderError } from "@/lib/github/api";
import { githubRequestHeaders } from "@/lib/github/app";
import { normalizeMergedPullRequestEvidence } from "./github-evidence-normalize";

export type GitHubSourceHealth = {
  sourceId: string;
  sourceState: "CURRENT_SOURCE_MATCH" | "UNKNOWN";
  reason: string | null;
  checkedAt: string;
  currentSha: string | null;
  cachedSha: string | null;
  criterionEvaluation: "NOT_AVAILABLE";
};

type PullDetail = {
  number?: unknown;
  merged?: unknown;
  merged_at?: unknown;
  merge_commit_sha?: unknown;
  title?: unknown;
};

export async function inspectExecutionSourceHealth(input: {
  installationId: string;
  repositoryId: string;
  owner: string;
  repository: string;
  sourceType: "merged_pull_request" | "release";
  sourceId: string;
  cachedSha: string | null;
}): Promise<GitHubSourceHealth> {
  const checkedAt = new Date().toISOString();
  const unknown = (reason: string, currentSha: string | null = null): GitHubSourceHealth => ({
    checkedAt, sourceId: input.sourceId, sourceState: "UNKNOWN",
    reason, currentSha, cachedSha: input.cachedSha,
    criterionEvaluation: "NOT_AVAILABLE",
  });

  // Releases never qualify for deployment verification without a separately
  // checked tag revision, environment and deployment status.
  if (input.sourceType === "release") {
    return unknown("release_not_deployment_proof");
  }

  if (!/^[1-9][0-9]{0,15}$/.test(input.repositoryId)
    || !/^[1-9][0-9]{0,15}$/.test(input.installationId)
    || !/^[A-Za-z0-9-]{1,100}$/.test(input.owner)
    || !/^[A-Za-z0-9._-]{1,100}$/.test(input.repository)) {
    return unknown("invalid_repository_binding");
  }
  const match = /^pr:([1-9][0-9]{0,14})$/.exec(input.sourceId);
  if (!match) return unknown("invalid_source_identity");
  if (!input.cachedSha || !/^[0-9a-f]{40}$/.test(input.cachedSha)) {
    return unknown("missing_cached_merge_sha");
  }

  const token = await createInstallationAccessToken({
    installationId: input.installationId,
    repositoryId: input.repositoryId,
  });

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repository)}/pulls/${match[1]}`,
      {
        headers: { ...githubRequestHeaders, Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return unknown("github_source_network_unavailable");
  }

  if (!response.ok) {
    if ([401, 403, 404, 429].includes(response.status)) {
      return unknown("github_source_access_or_freshness_unknown");
    }
    return unknown("github_source_api_unavailable");
  }

  let result: PullDetail;
  try {
    result = (await response.json()) as PullDetail;
  } catch {
    return unknown("github_source_payload_invalid");
  }

  if (result.number !== Number(match[1])) return unknown("source_identity_mismatch");
  const observation = normalizeMergedPullRequestEvidence(
    result, `${input.owner}/${input.repository}`, checkedAt,
  );
  if (!observation) return unknown("source_unmerged_or_invalid");
  if (observation.sourceState !== "SOURCE_CONFIRMED" || !observation.sourceSha) {
    return unknown(observation.reason ?? "source_merge_unverified");
  }
  if (observation.sourceSha !== input.cachedSha) {
    return unknown("source_sha_changed", observation.sourceSha);
  }

  return {
    checkedAt, sourceId: input.sourceId, sourceState: "CURRENT_SOURCE_MATCH",
    reason: null, currentSha: observation.sourceSha, cachedSha: input.cachedSha,
    criterionEvaluation: "NOT_AVAILABLE",
  };
}
