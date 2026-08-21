import { getFigmaOAuthConfig, type FigmaResourceType } from "@/lib/figma/oauth";

const FIGMA_REQUEST_TIMEOUT_MS = 8_000;
const FILE_PAGE_LIMIT = 30;
const NODE_CHILD_LIMIT = 24;
const NODE_TEXT_LIMIT = 20;
const NODE_TEXT_CHARS = 160;

export class FigmaProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly providerCode: string | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "FigmaProviderError";
  }
}

export type FigmaTokenSet = {
  accessToken: string;
  refreshToken: string;
  figmaUserId: string;
  expiresIn: number;
};

export type FigmaRefreshSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};

export type VerifiedFigmaFile = {
  fileKey: string;
  title: string;
  editorType: string | null;
  providerVersionId: string | null;
  lastModified: string | null;
};

export type BoundedFigmaPreview = {
  fileKey: string;
  resourceType: FigmaResourceType;
  title: string;
  editorType: string | null;
  providerVersionId: string | null;
  lastModified: string | null;
  mainFileKey: string | null;
  selectedNodeId: string | null;
  preview:
    | {
        kind: "file";
        pages: Array<{ id: string; name: string; type: string }>;
        truncated: boolean;
      }
    | {
        kind: "node";
        node: {
          id: string;
          name: string;
          type: string;
          childCount: number;
          children: Array<{ id: string; name: string; type: string }>;
          text: string[];
          layout: {
            layoutMode: string | null;
            primaryAxisAlignItems: string | null;
            counterAxisAlignItems: string | null;
            opacity: number | null;
            blendMode: string | null;
          };
        };
        truncated: boolean;
      };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringField(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key] ? (value[key] as string) : null;
}

function numberField(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "number" && Number.isFinite(value[key])
    ? (value[key] as number)
    : null;
}

function basicAuthorization() {
  const config = getFigmaOAuthConfig();
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64")}`;
}

function parseRetryAfter(response: Response) {
  const value = response.headers.get("Retry-After")?.trim() ?? "";
  if (!/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : null;
}

async function readProviderErrorCode(response: Response) {
  try {
    const payload = asRecord(await response.json());
    if (!payload) return null;
    if (typeof payload.err === "string") return payload.err.slice(0, 120);
    if (typeof payload.message === "string") return payload.message.slice(0, 120);
    return null;
  } catch {
    return null;
  }
}

async function figmaJsonRequest(
  url: string,
  init: RequestInit,
  authMode: "basic" | "bearer",
  bearerToken?: string,
) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set(
    "Authorization",
    authMode === "basic" ? basicAuthorization() : `Bearer ${bearerToken ?? ""}`,
  );
  if (init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(FIGMA_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new FigmaProviderError("Figma request failed.", 0);
  }

  if (!response.ok) {
    const providerCode = await readProviderErrorCode(response);
    throw new FigmaProviderError(
      "Figma request was rejected.",
      response.status,
      providerCode,
      response.status === 429 ? parseRetryAfter(response) : null,
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new FigmaProviderError("Figma response was invalid.", 502);
  }
}

function parseExpiresIn(row: Record<string, unknown>) {
  const value = numberField(row, "expires_in");
  if (value === null || value <= 0 || value > 60 * 60 * 24 * 366) {
    throw new FigmaProviderError("Figma token expiration was invalid.", 502);
  }
  return Math.floor(value);
}

export async function exchangeFigmaAuthorizationCode(code: string, codeVerifier: string) {
  const config = getFigmaOAuthConfig();
  const body = new URLSearchParams({
    redirect_uri: config.redirectUri,
    code,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });
  const payload = await figmaJsonRequest(
    "https://api.figma.com/v1/oauth/token",
    { method: "POST", body },
    "basic",
  );
  const row = asRecord(payload);
  if (!row) throw new FigmaProviderError("Figma token response was invalid.", 502);
  const accessToken = stringField(row, "access_token");
  const refreshToken = stringField(row, "refresh_token");
  const figmaUserId = stringField(row, "user_id_string");
  if (!accessToken || !refreshToken || !figmaUserId) {
    throw new FigmaProviderError("Figma token response was incomplete.", 502);
  }
  return {
    accessToken,
    refreshToken,
    figmaUserId,
    expiresIn: parseExpiresIn(row),
  } satisfies FigmaTokenSet;
}

export async function refreshFigmaTokens(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const payload = await figmaJsonRequest(
    "https://api.figma.com/v1/oauth/token",
    { method: "POST", body },
    "basic",
  );
  const row = asRecord(payload);
  if (!row) throw new FigmaProviderError("Figma refresh response was invalid.", 502);
  const accessToken = stringField(row, "access_token");
  if (!accessToken) throw new FigmaProviderError("Figma refresh response was incomplete.", 502);
  return {
    accessToken,
    refreshToken: stringField(row, "refresh_token"),
    expiresIn: parseExpiresIn(row),
  } satisfies FigmaRefreshSet;
}

export async function verifyFigmaFileAccess(
  accessToken: string,
  fileKey: string,
): Promise<VerifiedFigmaFile> {
  const payload = await figmaJsonRequest(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/meta`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
  const root = asRecord(payload);
  const file = root ? asRecord(root.file) : null;
  const title = file ? stringField(file, "name") : null;
  if (!file || !title) {
    throw new FigmaProviderError("Figma file metadata was incomplete.", 502);
  }
  return {
    fileKey,
    title,
    editorType: stringField(file, "editorType"),
    providerVersionId: stringField(file, "version"),
    lastModified: stringField(file, "last_touched_at"),
  };
}

function nodeIdentity(value: unknown) {
  const row = asRecord(value);
  if (!row) return null;
  const id = stringField(row, "id");
  const name = stringField(row, "name");
  const type = stringField(row, "type");
  return id && name && type ? { id, name, type } : null;
}

function boundedText(root: Record<string, unknown>) {
  const results: string[] = [];
  let truncated = false;

  function visit(value: unknown) {
    if (results.length >= NODE_TEXT_LIMIT) {
      truncated = true;
      return;
    }
    const row = asRecord(value);
    if (!row) return;
    if (row.type === "TEXT" && typeof row.characters === "string" && row.characters.trim()) {
      const normalized = row.characters.replace(/\s+/g, " ").trim();
      results.push(normalized.slice(0, NODE_TEXT_CHARS));
      if (normalized.length > NODE_TEXT_CHARS) truncated = true;
    }
    if (Array.isArray(row.children)) {
      for (const child of row.children) {
        if (results.length >= NODE_TEXT_LIMIT) {
          truncated = true;
          break;
        }
        visit(child);
      }
    }
  }

  visit(root);
  return { text: results, truncated };
}

async function readFileRoot(accessToken: string, fileKey: string) {
  return figmaJsonRequest(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}?depth=1&branch_data=true`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
}

async function readSelectedNode(accessToken: string, fileKey: string, nodeId: string) {
  const query = new URLSearchParams({ ids: nodeId, depth: "2" });
  return figmaJsonRequest(
    `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?${query.toString()}`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
}

export async function readBoundedFigmaContext(input: {
  accessToken: string;
  fileKey: string;
  nodeId: string | null;
}): Promise<BoundedFigmaPreview> {
  const rootPayload = await readFileRoot(input.accessToken, input.fileKey);
  const root = asRecord(rootPayload);
  const title = root ? stringField(root, "name") : null;
  const document = root ? asRecord(root.document) : null;
  if (!root || !title || !document) {
    throw new FigmaProviderError("Figma file content response was incomplete.", 502);
  }

  const mainFileKey = stringField(root, "mainFileKey");
  const resourceType: FigmaResourceType = mainFileKey ? "branch" : "file";
  const common = {
    fileKey: input.fileKey,
    resourceType,
    title,
    editorType: stringField(root, "editorType"),
    providerVersionId: stringField(root, "version"),
    lastModified: stringField(root, "lastModified"),
    mainFileKey,
    selectedNodeId: input.nodeId,
  } as const;

  if (!input.nodeId) {
    const rawPages = Array.isArray(document.children) ? document.children : [];
    const pages = rawPages
      .map(nodeIdentity)
      .filter((value): value is { id: string; name: string; type: string } => Boolean(value));
    return {
      ...common,
      preview: {
        kind: "file",
        pages: pages.slice(0, FILE_PAGE_LIMIT),
        truncated: pages.length > FILE_PAGE_LIMIT,
      },
    };
  }

  const nodePayload = await readSelectedNode(input.accessToken, input.fileKey, input.nodeId);
  const nodeRoot = asRecord(nodePayload);
  const nodes = nodeRoot ? asRecord(nodeRoot.nodes) : null;
  const nodeEnvelope = nodes ? asRecord(nodes[input.nodeId]) : null;
  const selected = nodeEnvelope ? asRecord(nodeEnvelope.document) : null;
  const identity = selected ? nodeIdentity(selected) : null;
  if (!selected || !identity || identity.id !== input.nodeId) {
    throw new FigmaProviderError("Selected Figma node was not found in the linked file.", 404);
  }

  const rawChildren = Array.isArray(selected.children) ? selected.children : [];
  const children = rawChildren
    .map(nodeIdentity)
    .filter((value): value is { id: string; name: string; type: string } => Boolean(value));
  const text = boundedText(selected);

  return {
    ...common,
    preview: {
      kind: "node",
      node: {
        ...identity,
        childCount: rawChildren.length,
        children: children.slice(0, NODE_CHILD_LIMIT),
        text: text.text,
        layout: {
          layoutMode: stringField(selected, "layoutMode"),
          primaryAxisAlignItems: stringField(selected, "primaryAxisAlignItems"),
          counterAxisAlignItems: stringField(selected, "counterAxisAlignItems"),
          opacity: numberField(selected, "opacity"),
          blendMode: stringField(selected, "blendMode"),
        },
      },
      truncated:
        rawChildren.length > NODE_CHILD_LIMIT ||
        children.length > NODE_CHILD_LIMIT ||
        text.truncated,
    },
  };
}
