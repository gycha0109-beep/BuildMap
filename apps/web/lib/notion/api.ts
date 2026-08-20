import { getNotionOAuthConfig, NotionResourceType } from "@/lib/notion/oauth";

export const NOTION_API_VERSION = "2026-03-11";
const NOTION_REQUEST_TIMEOUT_MS = 8_000;
const PAGE_BLOCK_LIMIT = 20;
const PAGE_TEXT_LIMIT = 4_000;
const DATABASE_DATA_SOURCE_LIMIT = 5;

export class NotionProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly providerCode: string | null = null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "NotionProviderError";
  }
}

export class UnsupportedNotionResourceError extends Error {
  constructor(readonly resourceType: "data_source") {
    super(`Unsupported Notion Project root: ${resourceType}`);
    this.name = "UnsupportedNotionResourceError";
  }
}

type NotionTokenSet = {
  accessToken: string;
  refreshToken: string;
  botId: string;
  workspaceId: string;
  workspaceName: string | null;
  authorizerUserId: string | null;
};

export type VerifiedNotionResource = {
  id: string;
  type: NotionResourceType;
  title: string;
  lastEditedTime: string | null;
};

export type BoundedNotionPreview = {
  resourceId: string;
  objectType: NotionResourceType;
  title: string;
  lastEditedTime: string | null;
  preview:
    | {
        kind: "page";
        text: string;
        topLevelBlocksRead: number;
        truncated: boolean;
      }
    | {
        kind: "database";
        dataSources: Array<{ id: string; name: string }>;
        truncated: boolean;
      };
};

function basicAuthorization() {
  const config = getNotionOAuthConfig();
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64")}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringField(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key] ? (value[key] as string) : null;
}

function parseRetryAfter(response: Response) {
  const value = response.headers.get("Retry-After")?.trim() ?? "";
  if (!/^\d+$/.test(value)) return null;
  return Math.min(Number(value), 300);
}

async function readErrorCode(response: Response) {
  try {
    const payload = asRecord(await response.json());
    return payload && typeof payload.code === "string"
      ? payload.code
      : payload && typeof payload.error === "string"
        ? payload.error
        : null;
  } catch {
    return null;
  }
}

async function notionJsonRequest(
  url: string,
  init: RequestInit,
  authMode: "basic" | "bearer",
  bearerToken?: string,
) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("Notion-Version", NOTION_API_VERSION);
  headers.set(
    "Authorization",
    authMode === "basic" ? basicAuthorization() : `Bearer ${bearerToken ?? ""}`,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(NOTION_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new NotionProviderError("Notion request failed.", 0);
  }

  if (!response.ok) {
    const code = await readErrorCode(response);
    throw new NotionProviderError(
      "Notion request was rejected.",
      response.status,
      code,
      response.status === 429 ? parseRetryAfter(response) : null,
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new NotionProviderError("Notion response was invalid.", 502);
  }
}

function parseTokenSet(payload: unknown): NotionTokenSet {
  const row = asRecord(payload);
  if (!row) throw new NotionProviderError("Notion token response was invalid.", 502);

  const accessToken = stringField(row, "access_token");
  const refreshToken = stringField(row, "refresh_token");
  const botId = stringField(row, "bot_id");
  const workspaceId = stringField(row, "workspace_id");
  const workspaceName = typeof row.workspace_name === "string" ? row.workspace_name : null;
  const owner = asRecord(row.owner);
  const ownerUser = owner?.type === "user" ? asRecord(owner.user) : null;
  const authorizerUserId = ownerUser ? stringField(ownerUser, "id") : null;

  if (!accessToken || !refreshToken || !botId || !workspaceId) {
    throw new NotionProviderError("Notion token response was incomplete.", 502);
  }

  return {
    accessToken,
    refreshToken,
    botId,
    workspaceId,
    workspaceName,
    authorizerUserId,
  };
}

export async function exchangeNotionAuthorizationCode(code: string) {
  const config = getNotionOAuthConfig();
  const payload = await notionJsonRequest(
    "https://api.notion.com/v1/oauth/token",
    {
      method: "POST",
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    },
    "basic",
  );
  return parseTokenSet(payload);
}

export async function refreshNotionTokens(refreshToken: string) {
  const payload = await notionJsonRequest(
    "https://api.notion.com/v1/oauth/token",
    {
      method: "POST",
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
    "basic",
  );
  return parseTokenSet(payload);
}

export async function revokeNotionAccessToken(accessToken: string) {
  await notionJsonRequest(
    "https://api.notion.com/v1/oauth/revoke",
    {
      method: "POST",
      body: JSON.stringify({ token: accessToken }),
    },
    "basic",
  );
}

function normalizeUuid(value: string) {
  return value.replaceAll("-", "").toLowerCase();
}

function richTextPlainText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      const row = asRecord(item);
      return row && typeof row.plain_text === "string" ? row.plain_text : "";
    })
    .join("")
    .trim();
}

function pageTitle(payload: Record<string, unknown>) {
  const properties = asRecord(payload.properties);
  if (!properties) return "Untitled Notion page";

  for (const property of Object.values(properties)) {
    const row = asRecord(property);
    if (row?.type === "title") {
      const title = richTextPlainText(row.title);
      if (title) return title;
    }
  }
  return "Untitled Notion page";
}

function databaseTitle(payload: Record<string, unknown>) {
  return richTextPlainText(payload.title) || "Untitled Notion database";
}

async function retrievePage(accessToken: string, resourceId: string) {
  return notionJsonRequest(
    `https://api.notion.com/v1/pages/${encodeURIComponent(resourceId)}`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
}

async function retrieveDatabase(accessToken: string, resourceId: string) {
  return notionJsonRequest(
    `https://api.notion.com/v1/databases/${encodeURIComponent(resourceId)}`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
}

async function retrieveDataSource(accessToken: string, resourceId: string) {
  return notionJsonRequest(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(resourceId)}`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
}

function verifiedResourceFromPayload(
  payload: unknown,
  expectedId: string,
  type: NotionResourceType,
): VerifiedNotionResource | null {
  const row = asRecord(payload);
  const id = row ? stringField(row, "id") : null;
  if (!row || !id || normalizeUuid(id) !== normalizeUuid(expectedId) || row.object !== type) {
    return null;
  }
  return {
    id,
    type,
    title: type === "page" ? pageTitle(row) : databaseTitle(row),
    lastEditedTime: typeof row.last_edited_time === "string" ? row.last_edited_time : null,
  };
}

function isResourceLookupMiss(error: unknown) {
  return (
    error instanceof NotionProviderError &&
    (error.status === 404 ||
      (error.status === 400 && error.providerCode === "validation_error"))
  );
}

export async function verifyNotionProjectResource(
  accessToken: string,
  resourceId: string,
): Promise<VerifiedNotionResource | null> {
  try {
    const page = verifiedResourceFromPayload(
      await retrievePage(accessToken, resourceId),
      resourceId,
      "page",
    );
    if (page) return page;
  } catch (error) {
    if (!isResourceLookupMiss(error)) throw error;
  }

  try {
    const database = verifiedResourceFromPayload(
      await retrieveDatabase(accessToken, resourceId),
      resourceId,
      "database",
    );
    if (database) return database;
  } catch (error) {
    if (!isResourceLookupMiss(error)) throw error;
  }

  try {
    const dataSource = asRecord(await retrieveDataSource(accessToken, resourceId));
    const id = dataSource ? stringField(dataSource, "id") : null;
    if (
      dataSource?.object === "data_source" &&
      id &&
      normalizeUuid(id) === normalizeUuid(resourceId)
    ) {
      throw new UnsupportedNotionResourceError("data_source");
    }
  } catch (error) {
    if (error instanceof UnsupportedNotionResourceError) throw error;
    if (!isResourceLookupMiss(error)) throw error;
  }

  return null;
}

function blockPlainText(block: Record<string, unknown>) {
  const type = typeof block.type === "string" ? block.type : "";
  if (!type) return "";
  const body = asRecord(block[type]);
  if (!body) return "";
  const richText = richTextPlainText(body.rich_text);
  if (richText) return richText;
  if (typeof body.title === "string") return body.title.trim();
  if (typeof body.expression === "string") return body.expression.trim();
  return "";
}

async function readPageBlocks(accessToken: string, resourceId: string) {
  const payload = await notionJsonRequest(
    `https://api.notion.com/v1/blocks/${encodeURIComponent(resourceId)}/children?page_size=${PAGE_BLOCK_LIMIT}`,
    { method: "GET" },
    "bearer",
    accessToken,
  );
  const row = asRecord(payload);
  const results = Array.isArray(row?.results) ? row.results : [];
  const lines: string[] = [];
  let hasNestedChildren = false;

  for (const item of results) {
    const block = asRecord(item);
    if (!block) continue;
    if (block.has_children === true) hasNestedChildren = true;
    const text = blockPlainText(block);
    if (text) lines.push(text);
  }

  const combined = lines.join("\n").trim();
  const text = combined.slice(0, PAGE_TEXT_LIMIT);
  return {
    text,
    topLevelBlocksRead: results.length,
    truncated:
      row?.has_more === true || hasNestedChildren || combined.length > PAGE_TEXT_LIMIT,
  };
}

function databaseDataSources(payload: Record<string, unknown>) {
  const raw = Array.isArray(payload.data_sources) ? payload.data_sources : [];
  const rows = raw
    .map((item) => {
      const row = asRecord(item);
      const id = row ? stringField(row, "id") : null;
      if (!row || !id) return null;
      return {
        id,
        name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "Untitled data source",
      };
    })
    .filter((item): item is { id: string; name: string } => Boolean(item));

  return {
    dataSources: rows.slice(0, DATABASE_DATA_SOURCE_LIMIT),
    truncated: rows.length > DATABASE_DATA_SOURCE_LIMIT,
  };
}

export async function readBoundedNotionResource(input: {
  accessToken: string;
  resourceId: string;
  resourceType: NotionResourceType;
}): Promise<BoundedNotionPreview> {
  if (input.resourceType === "page") {
    const payload = await retrievePage(input.accessToken, input.resourceId);
    const verified = verifiedResourceFromPayload(payload, input.resourceId, "page");
    if (!verified) throw new NotionProviderError("Notion page identity mismatch.", 409);
    const preview = await readPageBlocks(input.accessToken, input.resourceId);
    return {
      resourceId: verified.id,
      objectType: "page",
      title: verified.title,
      lastEditedTime: verified.lastEditedTime,
      preview: { kind: "page", ...preview },
    };
  }

  const payload = await retrieveDatabase(input.accessToken, input.resourceId);
  const verified = verifiedResourceFromPayload(payload, input.resourceId, "database");
  if (!verified) throw new NotionProviderError("Notion database identity mismatch.", 409);
  const row = asRecord(payload);
  const preview = row
    ? databaseDataSources(row)
    : { dataSources: [] as Array<{ id: string; name: string }>, truncated: false };
  return {
    resourceId: verified.id,
    objectType: "database",
    title: verified.title,
    lastEditedTime: verified.lastEditedTime,
    preview: { kind: "database", ...preview },
  };
}
