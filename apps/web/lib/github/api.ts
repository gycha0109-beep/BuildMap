import {
  createGitHubAppJwt,
  getGitHubAppConfig,
  githubRequestHeaders,
} from "./app";

const GITHUB_REQUEST_TIMEOUT_MS = 8_000;

export type VerifiedGitHubRepository = {
  installationId: string;
  repositoryId: string;
  fullName: string;
  ownerId: string | null;
  ownerLogin: string | null;
};

export type GitHubActivityObservation = {
  sourceType: "merged_pull_request" | "release";
  sourceId: string;
  title: string;
  summary: string | null;
  url: string;
  occurredAt: string;
  context: string | null;
};

type PullRequestPayload = {
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  merged_at?: string | null;
  base?: { ref?: string };
  head?: { ref?: string };
};

type ReleasePayload = {
  id: number;
  name?: string | null;
  tag_name: string;
  body?: string | null;
  html_url: string;
  published_at?: string | null;
  created_at: string;
  draft?: boolean;
};

export class GitHubProviderError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubProviderError";
    this.status = status;
  }
}

async function githubFetchJson<T>(url: string, init: RequestInit = {}) {
  const headers = new Headers(githubRequestHeaders);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers,
      signal: init.signal ?? AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GitHubProviderError("GitHub request failed.", 0);
  }

  if (!response.ok) {
    throw new GitHubProviderError(`GitHub request failed with ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

export async function exchangeGitHubOAuthCode(code: string, codeVerifier: string) {
  const config = getGitHubAppConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.callbackUrl,
    code_verifier: codeVerifier,
  });

  let response: Response;
  try {
    response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GitHubProviderError("GitHub OAuth exchange failed.", 0);
  }

  if (!response.ok) {
    throw new GitHubProviderError("GitHub OAuth exchange failed.", response.status);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!payload.access_token) {
    throw new GitHubProviderError(
      payload.error_description || payload.error || "GitHub OAuth token missing.",
      401,
    );
  }

  return payload.access_token;
}

export async function verifyUserInstallationRepository(input: {
  userAccessToken: string;
  installationId: string;
  expectedFullName: string;
}): Promise<VerifiedGitHubRepository | null> {
  const config = getGitHubAppConfig();
  const installations = await githubFetchJson<{
    installations?: Array<{ id: number; app_id: number }>;
  }>("https://api.github.com/user/installations?per_page=100", {
    headers: { Authorization: `Bearer ${input.userAccessToken}` },
  });

  const installation = (installations.installations ?? []).find(
    (item) =>
      String(item.id) === input.installationId &&
      String(item.app_id) === String(config.appId),
  );
  if (!installation) return null;

  for (let page = 1; page <= 10; page += 1) {
    const result = await githubFetchJson<{
      repositories?: Array<{
        id: number;
        full_name: string;
        owner?: { id?: number; login?: string } | null;
      }>;
    }>(
      `https://api.github.com/user/installations/${encodeURIComponent(input.installationId)}/repositories?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${input.userAccessToken}` } },
    );

    const repositories = result.repositories ?? [];
    const repository = repositories.find(
      (item) => item.full_name.toLowerCase() === input.expectedFullName.toLowerCase(),
    );
    if (repository) {
      return {
        installationId: input.installationId,
        repositoryId: String(repository.id),
        fullName: repository.full_name,
        ownerId: repository.owner?.id ? String(repository.owner.id) : null,
        ownerLogin: repository.owner?.login ?? null,
      };
    }

    if (repositories.length < 100) break;
  }

  return null;
}

export async function createInstallationAccessToken(input: {
  installationId: string;
  repositoryId: string;
}) {
  const repositoryId = Number(input.repositoryId);
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    throw new GitHubProviderError("Stored GitHub repository identity is invalid.", 409);
  }

  const jwt = createGitHubAppJwt();
  const result = await githubFetchJson<{ token?: string }>(
    `https://api.github.com/app/installations/${encodeURIComponent(input.installationId)}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repository_ids: [repositoryId],
        permissions: {
          contents: "read",
          pull_requests: "read",
        },
      }),
    },
  );

  if (!result.token) {
    throw new GitHubProviderError("GitHub installation token missing.", 502);
  }
  return result.token;
}

function compactSummary(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > 360 ? `${normalized.slice(0, 357)}...` : normalized;
}

function normalizeMergedPullRequest(
  pullRequest: PullRequestPayload,
): GitHubActivityObservation | null {
  if (!pullRequest.merged_at) return null;
  return {
    sourceType: "merged_pull_request",
    sourceId: `pr:${pullRequest.number}`,
    title: pullRequest.title,
    summary: compactSummary(pullRequest.body),
    url: pullRequest.html_url,
    occurredAt: pullRequest.merged_at,
    context:
      pullRequest.base?.ref && pullRequest.head?.ref
        ? `${pullRequest.head.ref} → ${pullRequest.base.ref}`
        : `PR #${pullRequest.number}`,
  };
}

function normalizeRelease(release: ReleasePayload): GitHubActivityObservation | null {
  if (release.draft) return null;
  return {
    sourceType: "release",
    sourceId: `release:${release.id}`,
    title: release.name?.trim() || release.tag_name,
    summary: compactSummary(release.body),
    url: release.html_url,
    occurredAt: release.published_at || release.created_at,
    context: release.tag_name,
  };
}

function repositoryPath(owner: string, repository: string) {
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
}

export async function readGitHubActivity(input: {
  installationId: string;
  repositoryId: string;
  owner: string;
  repository: string;
}) {
  const token = await createInstallationAccessToken(input);
  const path = repositoryPath(input.owner, input.repository);

  const [pullRequests, releases] = await Promise.all([
    githubFetchJson<PullRequestPayload[]>(
      `https://api.github.com/repos/${path}/pulls?state=closed&sort=updated&direction=desc&per_page=30`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
    githubFetchJson<ReleasePayload[]>(
      `https://api.github.com/repos/${path}/releases?per_page=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  ]);

  const observations: GitHubActivityObservation[] = [];

  for (const pullRequest of pullRequests) {
    const observation = normalizeMergedPullRequest(pullRequest);
    if (observation) observations.push(observation);
  }

  for (const release of releases) {
    const observation = normalizeRelease(release);
    if (observation) observations.push(observation);
  }

  observations.sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
  return observations.slice(0, 30);
}

export async function readGitHubObservation(input: {
  installationId: string;
  repositoryId: string;
  owner: string;
  repository: string;
  sourceType: GitHubActivityObservation["sourceType"];
  sourceId: string;
}): Promise<GitHubActivityObservation | null> {
  const token = await createInstallationAccessToken(input);
  const path = repositoryPath(input.owner, input.repository);

  if (input.sourceType === "merged_pull_request") {
    const match = /^pr:(\d+)$/.exec(input.sourceId);
    const number = match ? Number(match[1]) : NaN;
    if (!Number.isSafeInteger(number) || number <= 0) {
      throw new GitHubProviderError("Invalid GitHub Pull Request source identity.", 400);
    }
    const pullRequest = await githubFetchJson<PullRequestPayload>(
      `https://api.github.com/repos/${path}/pulls/${number}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const observation = normalizeMergedPullRequest(pullRequest);
    return observation?.sourceId === input.sourceId ? observation : null;
  }

  const match = /^release:(\d+)$/.exec(input.sourceId);
  const releaseId = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
    throw new GitHubProviderError("Invalid GitHub Release source identity.", 400);
  }
  const release = await githubFetchJson<ReleasePayload>(
    `https://api.github.com/repos/${path}/releases/${releaseId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const observation = normalizeRelease(release);
  return observation?.sourceId === input.sourceId ? observation : null;
}
