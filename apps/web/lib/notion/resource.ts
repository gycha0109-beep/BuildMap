const NOTION_HOSTS = new Set(["notion.so", "www.notion.so"]);

const compactIdPattern = /([0-9a-fA-F]{32})$/;
const uuidIdPattern = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

function compactResourceId(segment: string) {
  const uuidMatch = segment.match(uuidIdPattern);
  if (uuidMatch) return uuidMatch[1].replaceAll("-", "").toLowerCase();

  const compactMatch = segment.match(compactIdPattern);
  return compactMatch ? compactMatch[1].toLowerCase() : null;
}

function hyphenateResourceId(compactId: string) {
  return [
    compactId.slice(0, 8),
    compactId.slice(8, 12),
    compactId.slice(12, 16),
    compactId.slice(16, 20),
    compactId.slice(20),
  ].join("-");
}

export type NormalizedNotionResource = {
  url: string;
  resourceId: string;
  defaultLabel: string;
};

export function normalizeNotionResourceUrl(value: string): NormalizedNotionResource | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (!NOTION_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.username || parsed.password || parsed.port) return null;

  const segments = parsed.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const lastSegment = segments.at(-1);
  if (!lastSegment) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    return null;
  }

  const compactId = compactResourceId(decoded);
  if (!compactId) return null;

  return {
    url: `https://www.notion.so/${compactId}`,
    resourceId: hyphenateResourceId(compactId),
    defaultLabel: `Notion · ${compactId.slice(0, 8)}`,
  };
}

export function parseCanonicalNotionResourceUrl(value: string) {
  const normalized = normalizeNotionResourceUrl(value);
  if (!normalized || normalized.url !== value) return null;
  return normalized;
}

export function isCanonicalNotionResourceUrl(value: string) {
  return Boolean(parseCanonicalNotionResourceUrl(value));
}
