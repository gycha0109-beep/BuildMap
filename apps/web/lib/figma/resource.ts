export type CanonicalFigmaResource = {
  fileKey: string;
  fileType: string;
  nodeId: string | null;
  url: string;
  defaultLabel: string;
};

const FILE_KEY_PATTERN = /^[A-Za-z0-9_-]{8,160}$/;
const FILE_TYPE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const NODE_ID_PATTERN = /^[A-Za-z0-9:;._-]{1,255}$/;
const NON_FILE_PATH_TYPES = new Set([
  "community",
  "developers",
  "downloads",
  "files",
  "login",
  "oauth",
  "plugin-docs",
  "pricing",
  "project",
  "team",
]);

function normalizeNodeId(value: string | null) {
  if (!value) return null;
  const decoded = value.trim();
  if (!decoded || !NODE_ID_PATTERN.test(decoded)) return null;
  return /^\d+-\d+$/.test(decoded) ? decoded.replace("-", ":") : decoded;
}

function urlNodeId(nodeId: string) {
  return /^\d+:\d+$/.test(nodeId) ? nodeId.replace(":", "-") : nodeId;
}

export function parseCanonicalFigmaResourceUrl(value: string): CanonicalFigmaResource | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== "figma.com" && host !== "www.figma.com") return null;
  if (parsed.username || parsed.password || parsed.port) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  const [fileType, fileKey] = segments;
  if (
    !FILE_TYPE_PATTERN.test(fileType) ||
    NON_FILE_PATH_TYPES.has(fileType.toLowerCase()) ||
    !FILE_KEY_PATTERN.test(fileKey)
  ) {
    return null;
  }

  const rawNodeId = parsed.searchParams.get("node-id");
  const nodeId = normalizeNodeId(rawNodeId);
  if (rawNodeId && !nodeId) return null;

  const canonical = new URL(`https://www.figma.com/${fileType}/${fileKey}`);
  if (nodeId) canonical.searchParams.set("node-id", urlNodeId(nodeId));

  return {
    fileKey,
    fileType,
    nodeId,
    url: canonical.toString(),
    defaultLabel: nodeId ? `Figma ${fileKey.slice(0, 8)} · ${nodeId}` : `Figma ${fileKey.slice(0, 8)}`,
  };
}

export function normalizeFigmaResourceUrl(value: string) {
  return parseCanonicalFigmaResourceUrl(value);
}
