import {
  createInstallationAccessToken,
  GitHubProviderError,
} from "@/lib/github/api";
import {
  createGitHubAppJwt,
  getGitHubAppConfig,
  githubRequestHeaders,
} from "@/lib/github/app";

export type InstallationScopeStatus =
  | "READ_GRANTED_BUT_TOKEN_NOT_REQUESTED"
  | "NOT_GRANTED"
  | "UNKNOWN";

export type InstallationDiagnostic = {
  checkedAt: string;
  repository: string;
  repositoryIdentity: "MATCH" | "UNKNOWN";
  installationIdentity: "MATCH" | "UNKNOWN";
  repositoryReason: string | null;
  scopes: Record<"checks" | "actions" | "deployments" | "issues", InstallationScopeStatus>;
  activeTokenScopes: readonly ["contents:read", "pull_requests:read"];
  scopeReadProbe: "NOT_RUN";
  evidenceEvaluation: "NOT_AVAILABLE";
};

const timeoutMs = 8_000;
const ungranted: InstallationScopeStatus = "NOT_GRANTED";
const limitedTokenScopes = ["contents:read", "pull_requests:read"] as const;
type InstallationInfo = {
  id?: unknown;
  app_id?: unknown;
  permissions?: Record<string, unknown>;
  suspended_at?: unknown;
};
type RepositoryInfo = { id?: unknown; full_name?: unknown };

async function githubJson<T>(path: string, authorization: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      method: "GET",
      headers: { ...githubRequestHeaders, Authorization: `Bearer ${authorization}` },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new GitHubProviderError("GitHub diagnostics request unavailable.", 0);
  }
  if (!response.ok) {
    throw new GitHubProviderError(
      `GitHub diagnostics request failed with ${response.status}.`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

function permissionStatus(value: unknown): InstallationScopeStatus {
  return value === "read" || value === "write" || value === "admin"
    ? "READ_GRANTED_BUT_TOKEN_NOT_REQUESTED"
    : ungranted;
}

export async function inspectGitHubExecutionInstallation(input: {
  installationId: string;
  repositoryId: string;
  owner: string;
  repository: string;
}): Promise<InstallationDiagnostic> {
  if (!/^[1-9][0-9]{0,15}$/.test(input.installationId)
    || !/^[1-9][0-9]{0,15}$/.test(input.repositoryId)
    || !/^[A-Za-z0-9-]{1,100}$/.test(input.owner)
    || !/^[A-Za-z0-9._-]{1,100}$/.test(input.repository)) {
    throw new GitHubProviderError("Invalid bound GitHub installation identity.", 400);
  }
  const appId = getGitHubAppConfig().appId;
  const checkedAt = new Date().toISOString();
  const repository = `${input.owner}/${input.repository}`;
  const installation = await githubJson<InstallationInfo>(
    `/app/installations/${input.installationId}`,
    createGitHubAppJwt(),
  );

  if (String(installation.id) !== input.installationId
    || String(installation.app_id) !== appId
    || installation.suspended_at != null) {
    return {
      checkedAt, repository, repositoryIdentity: "UNKNOWN",
      installationIdentity: "UNKNOWN",
      repositoryReason: installation.suspended_at != null
        ? "installation_suspended"
        : "installation_identity_mismatch",
      scopes: { checks: "UNKNOWN", actions: "UNKNOWN", deployments: "UNKNOWN", issues: "UNKNOWN" },
      activeTokenScopes: limitedTokenScopes,
      scopeReadProbe: "NOT_RUN",
      evidenceEvaluation: "NOT_AVAILABLE",
    };
  }

  const granted = installation.permissions ?? {};
  const scopes = {
    checks: permissionStatus(granted.checks),
    actions: permissionStatus(granted.actions),
    deployments: permissionStatus(granted.deployments),
    issues: permissionStatus(granted.issues),
  };

  // Only the already-approved narrow repository token is minted.
  // Do not widen permissions based on installation metadata.
  const token = await createInstallationAccessToken({
    installationId: input.installationId,
    repositoryId: input.repositoryId,
  });

  const result = await githubJson<RepositoryInfo>(
    `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repository)}`,
    token,
  );

  const repositoryIdentity =
    String(result.id) === input.repositoryId &&
    typeof result.full_name === "string" &&
    result.full_name.toLowerCase() === repository.toLowerCase()
      ? "MATCH" : "UNKNOWN";

  return {
    checkedAt, repository, repositoryIdentity,
    installationIdentity: "MATCH",
    repositoryReason: repositoryIdentity === "MATCH" ? null : "repository_identity_mismatch",
    scopes,
    activeTokenScopes: limitedTokenScopes,
    scopeReadProbe: "NOT_RUN",
    evidenceEvaluation: "NOT_AVAILABLE",
  };
}
