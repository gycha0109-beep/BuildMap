import {
  createInstallationAccessToken,
  GitHubProviderError,
} from "@/lib/github/api";
import { githubRequestHeaders } from "@/lib/github/app";
import {
  normalizeMergedPullRequestEvidence,
  normalizeReleaseReference,
  type ExecutionGitHubEvidence,
} from "./github-evidence-normalize";

type GitHubPullListItem = { number?: number; merged_at?: string | null };
type GitHubPullDetail = {
  number?: number;
  merged?: boolean;
  merged_at?: string | null;
  merge_commit_sha?: string | null;
  title?: string;
};
type GitHubReleaseItem = {
  id?: number;
  name?: string | null;
  tag_name?: string;
  draft?: boolean;
  published_at?: string | null;
  created_at?: string;
};

export type ExecutionEvidenceCapability =
  | { status: "OBSERVED"; reason: null }
  | { status: "UNKNOWN"; reason: string };

export type GitHubEvidencePreview = {
  repository: string;
  observedAt: string;
  snapshotWindow: "last_30_closed_prs_and_10_releases";
  evidence: ExecutionGitHubEvidence[];
  capabilities: {
    prMerge: ExecutionEvidenceCapability;
    releaseReference: ExecutionEvidenceCapability;
    issue: ExecutionEvidenceCapability;
    commitChecks: ExecutionEvidenceCapability;
    workflowRuns: ExecutionEvidenceCapability;
    deployment: ExecutionEvidenceCapability;
  };
};

const UNKNOWN_PERMISSION: ExecutionEvidenceCapability = {
  status: "UNKNOWN",
  reason: "github_app_permission_not_verified_for_execution",
};
const CONFIRMED: ExecutionEvidenceCapability = { status: "OBSERVED", reason: null };
const REQUEST_TIMEOUT = 8_000;

async function getGitHub<T>(resource: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${resource}`, {
      headers: {
        ...githubRequestHeaders,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch {
    throw new GitHubProviderError("GitHub execution evidence request failed.", 0);
  }
  if (!response.ok) {
    throw new GitHubProviderError(
      `GitHub execution evidence request failed with ${response.status}.`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

function errorReason(error: unknown) {
  if (error instanceof GitHubProviderError) {
    if ([401, 403, 404].includes(error.status)) return "github_read_permission_or_access_unavailable";
    if (error.status === 429) return "github_rate_limited";
  }
  return "github_source_detail_unavailable";
}

function unverifiedPullReference(
  repository: string,
  number: number,
  observedAt: string,
  reason: string,
): ExecutionGitHubEvidence {
  return {
    provider: "github",
    repository,
    sourceType: "merged_pull_request",
    sourceId: `pr:${number}`,
    sourceUrl: `https://github.com/${repository}/pull/${number}`,
    title: `PR #${number}`,
    sourceState: "UNKNOWN",
    reason,
    sourceSha: null,
    occurredAt: null,
    observedAt,
  };
}

export async function readGitHubExecutionEvidencePreview(input: {
  installationId: string;
  repositoryId: string;
  owner: string;
  repository: string;
}): Promise<GitHubEvidencePreview> {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(input.owner) ||
      !/^[A-Za-z0-9._-]{1,100}$/.test(input.repository)) {
    throw new GitHubProviderError("Invalid GitHub repository identity.", 400);
  }

  const token = await createInstallationAccessToken({
    installationId: input.installationId,
    repositoryId: input.repositoryId,
  });
  const repository = `${input.owner}/${input.repository}`;
  const path = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repository)}`;
  const observedAt = new Date().toISOString();

  // No Issues / Checks / Actions / Deployment calls until required permissions are
  // explicitly granted and tested. Never treat missing scopes as passing evidence.
  const [pullResult, releaseResult] = await Promise.allSettled([
    getGitHub<GitHubPullListItem[]>(
      `${path}/pulls?state=closed&sort=updated&direction=desc&per_page=30`,
      token,
    ),
    getGitHub<GitHubReleaseItem[]>(`${path}/releases?per_page=10`, token),
  ]);

  if (pullResult.status === "rejected" && releaseResult.status === "rejected") {
    throw pullResult.reason;
  }

  const pulls = pullResult.status === "fulfilled" && Array.isArray(pullResult.value)
    ? pullResult.value
    : [];
  const releases = releaseResult.status === "fulfilled" && Array.isArray(releaseResult.value)
    ? releaseResult.value
    : [];

  const latestMerged = pulls
    .filter((item) =>
      Number.isSafeInteger(item.number) && (item.number ?? 0) > 0 &&
      typeof item.merged_at === "string",
    )
    .slice(0, 10);

  const evidence: ExecutionGitHubEvidence[] = [];
  // Re-read each candidate's exact PR identity, never trust merge SHA from a list.
  for (let offset = 0; offset < latestMerged.length; offset += 4) {
    const group = latestMerged.slice(offset, offset + 4);
    const results = await Promise.all(group.map(async (item) => {
      const number = item.number!;
      try {
        const detail = await getGitHub<GitHubPullDetail>(`${path}/pulls/${number}`, token);
        if (detail.number !== number) {
          return unverifiedPullReference(repository, number, observedAt, "source_identity_mismatch");
        }
        return normalizeMergedPullRequestEvidence(detail, repository, observedAt) ??
          unverifiedPullReference(repository, number, observedAt, "merge_state_unverified");
      } catch (error) {
        return unverifiedPullReference(repository, number, observedAt, errorReason(error));
      }
    }));
    evidence.push(...results);
  }

  for (const item of releases) {
    const reference = normalizeReleaseReference(item, repository, observedAt);
    if (reference) evidence.push(reference);
  }

  return {
    repository,
    observedAt,
    snapshotWindow: "last_30_closed_prs_and_10_releases",
    evidence,
    capabilities: {
      prMerge: pullResult.status === "fulfilled" && Array.isArray(pullResult.value)
        ? CONFIRMED
        : { status: "UNKNOWN", reason: pullResult.status === "rejected"
          ? errorReason(pullResult.reason)
          : "github_source_list_invalid" },
      releaseReference: releaseResult.status === "fulfilled" && Array.isArray(releaseResult.value)
        ? CONFIRMED
        : { status: "UNKNOWN", reason: releaseResult.status === "rejected"
          ? errorReason(releaseResult.reason)
          : "github_release_list_invalid" },
      issue: UNKNOWN_PERMISSION,
      commitChecks: UNKNOWN_PERMISSION,
      workflowRuns: UNKNOWN_PERMISSION,
      deployment: UNKNOWN_PERMISSION,
    },
  };
}
