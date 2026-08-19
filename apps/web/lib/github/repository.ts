export type GitHubRepositoryPointer = {
  owner: string;
  repository: string;
  fullName: string;
  url: string;
  defaultLabel: string;
};

export function normalizeGitHubRepositoryUrl(raw: string): GitHubRepositoryPointer | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  if (parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null;

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") return null;

  const segments = parsed.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return "";
      }
    });

  if (segments.length !== 2 || segments.some((segment) => !segment)) return null;

  const owner = segments[0];
  const repository = segments[1].replace(/\.git$/i, "");
  if (!repository) return null;
  if (!/^[A-Za-z0-9-]{1,100}$/.test(owner)) return null;
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(repository)) return null;

  const fullName = `${owner}/${repository}`;
  return {
    owner,
    repository,
    fullName,
    url: `https://github.com/${fullName}`,
    defaultLabel: fullName,
  };
}

export function parseCanonicalGitHubRepositoryUrl(raw: string): GitHubRepositoryPointer | null {
  const normalized = normalizeGitHubRepositoryUrl(raw);
  if (!normalized || normalized.url !== raw) return null;
  return normalized;
}
