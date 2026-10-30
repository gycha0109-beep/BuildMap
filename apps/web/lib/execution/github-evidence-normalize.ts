// Provider-neutral, display-only source observation. Never equivalent to acceptance PASS.
export type ExecutionSourceState = "SOURCE_CONFIRMED" | "UNKNOWN";
export type ExecutionGitHubEvidence = {
  provider: "github";
  repository: string;
  sourceType: "merged_pull_request" | "release";
  sourceId: string;
  sourceUrl: string;
  title: string;
  sourceState: ExecutionSourceState;
  reason: string | null;
  sourceSha: string | null;
  occurredAt: string | null;
  observedAt: string;
};

type PullRequestDetail = {
  number?: unknown;
  title?: unknown;
  merged?: unknown;
  merged_at?: unknown;
  merge_commit_sha?: unknown;
};

type ReleaseDetail = {
  id?: unknown;
  name?: unknown;
  tag_name?: unknown;
  draft?: unknown;
  published_at?: unknown;
  created_at?: unknown;
};

const SHA_40 = /^[0-9a-f]{40}$/i;
const REPOSITORY = /^[A-Za-z0-9-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;
const MAX_TITLE = 180;

function boundedTitle(title: unknown, fallback: string) {
  if (typeof title !== "string") return fallback;
  const cleaned = title.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, MAX_TITLE);
}

function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 50) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && /[Zz]|[+-]\d{2}:?\d{2}$/.test(value)
    ? new Date(timestamp).toISOString()
    : null;
}

function validRepository(repository: string) {
  if (!REPOSITORY.test(repository)) throw Error("Untrusted GitHub repository identity");
}

export function normalizeMergedPullRequestEvidence(
  value: PullRequestDetail,
  repository: string,
  observedAt: string,
): ExecutionGitHubEvidence | null {
  validRepository(repository);
  const number = value.number;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < 1) {
    return null;
  }
  if (value.merged !== true) return null;

  const occurredAt = validTimestamp(value.merged_at);
  const sourceSha =
    typeof value.merge_commit_sha === "string" && SHA_40.test(value.merge_commit_sha)
      ? value.merge_commit_sha.toLowerCase()
      : null;
  const sourceState: ExecutionSourceState =
    occurredAt && sourceSha ? "SOURCE_CONFIRMED" : "UNKNOWN";

  return {
    provider: "github",
    repository,
    sourceType: "merged_pull_request",
    sourceId: `pr:${number}`,
    sourceUrl: `https://github.com/${repository}/pull/${number}`,
    title: boundedTitle(value.title, `PR #${number}`),
    sourceState,
    reason: sourceState === "SOURCE_CONFIRMED" ? null : "missing_valid_merge_sha_or_timestamp",
    sourceSha,
    occurredAt,
    observedAt,
  };
}

export function normalizeReleaseReference(
  value: ReleaseDetail,
  repository: string,
  observedAt: string,
): ExecutionGitHubEvidence | null {
  validRepository(repository);
  const id = value.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || value.draft !== false) {
    return null;
  }
  const occurredAt = validTimestamp(value.published_at) ?? validTimestamp(value.created_at);
  const tag = typeof value.tag_name === "string" ? value.tag_name.trim() : "";
  if (!tag || tag.length > 150) return null;

  // A release reference alone is NOT deployment proof and has no verified commit SHA.
  return {
    provider: "github",
    repository,
    sourceType: "release",
    sourceId: `release:${id}`,
    sourceUrl: `https://github.com/${repository}/releases/tag/${encodeURIComponent(tag)}`,
    title: boundedTitle(value.name, tag),
    sourceState: "UNKNOWN",
    reason: "release_tag_revision_and_deployment_not_verified",
    sourceSha: null,
    occurredAt,
    observedAt,
  };
}
