import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { BoundedNotionPreview } from "@/lib/notion/api";

const NOTION_CAPTURE_TOKEN_TTL_SECONDS = 10 * 60;
const NOTION_PROOF_SECRET_MIN_BYTES = 32;

export type NotionCaptureSourceType = "page_current_state" | "database_current_state";

export type NotionObservedResource = BoundedNotionPreview & {
  canonicalUrl: string;
  workspaceLabel: string | null;
  observedAt: string;
};

type NotionCaptureTokenPayload = {
  version: 1;
  provider: "notion";
  projectId: string;
  projectLinkId: string;
  resourceId: string;
  resourceType: "page" | "database";
  observationKey: string;
  nonce: string;
  expiresAt: number;
};

export type NotionCaptureSourceProofInput = {
  roughNoteId: string;
  projectLinkId: string;
  sourceType: NotionCaptureSourceType;
  sourceId: string;
  observationKey: string;
  canonicalUrl: string;
  sourceTitle: string;
  occurredAt: string | null;
  observedAt: string;
  captureBody: string;
};

function proofSecret() {
  const value = process.env.NOTION_OAUTH_STATE_SECRET?.trim();
  if (!value || Buffer.byteLength(value, "utf8") < NOTION_PROOF_SECRET_MIN_BYTES) {
    throw new Error(
      `NOTION_OAUTH_STATE_SECRET must contain at least ${NOTION_PROOF_SECRET_MIN_BYTES} bytes of secret material.`,
    );
  }
  return value;
}

export function isNotionCaptureProofConfigured() {
  const value = process.env.NOTION_OAUTH_STATE_SECRET?.trim();
  return Boolean(
    value && Buffer.byteLength(value, "utf8") >= NOTION_PROOF_SECRET_MIN_BYTES,
  );
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hmac(value: string) {
  return createHmac("sha256", proofSecret()).update(value).digest("base64url");
}

function encodeSignedPayload(value: object) {
  const encoded = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encoded}.${hmac(encoded)}`;
}

function decodeSignedPayload<T>(value: string): T | null {
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra) return null;
  if (!secureEqual(hmac(encoded), signature)) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function canonicalObservationLines(observation: NotionObservedResource) {
  const lines = [
    "notion-bounded-observation-v1",
    observation.resourceId.replaceAll("-", "").toLowerCase(),
    observation.objectType,
    observation.title,
    observation.lastEditedTime ?? "",
    observation.canonicalUrl,
    observation.preview.kind,
  ];

  if (observation.preview.kind === "page") {
    lines.push(
      observation.preview.text,
      String(observation.preview.topLevelBlocksRead),
      observation.preview.truncated ? "1" : "0",
    );
  } else {
    for (const dataSource of observation.preview.dataSources) {
      lines.push(
        dataSource.id.replaceAll("-", "").toLowerCase(),
        dataSource.name,
      );
    }
    lines.push(observation.preview.truncated ? "1" : "0");
  }

  return lines;
}

export function createNotionObservationKey(observation: NotionObservedResource) {
  return createHash("sha256")
    .update(canonicalObservationLines(observation).join("\n"))
    .digest("hex");
}

export function createNotionCaptureToken(input: {
  projectId: string;
  projectLinkId: string;
  observation: NotionObservedResource;
}) {
  const payload: NotionCaptureTokenPayload = {
    version: 1,
    provider: "notion",
    projectId: input.projectId,
    projectLinkId: input.projectLinkId,
    resourceId: input.observation.resourceId,
    resourceType: input.observation.objectType,
    observationKey: createNotionObservationKey(input.observation),
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: Math.floor(Date.now() / 1000) + NOTION_CAPTURE_TOKEN_TTL_SECONDS,
  };
  return encodeSignedPayload(payload);
}

export function verifyNotionCaptureToken(value: string) {
  const payload = decodeSignedPayload<NotionCaptureTokenPayload>(value);
  if (!payload || payload.version !== 1 || payload.provider !== "notion") return null;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (
    !payload.projectId ||
    !payload.projectLinkId ||
    !payload.resourceId ||
    !payload.observationKey ||
    !payload.nonce ||
    (payload.resourceType !== "page" && payload.resourceType !== "database") ||
    !/^[a-f0-9]{64}$/.test(payload.observationKey)
  ) {
    return null;
  }
  return payload;
}

function captureBodyHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function captureSourceProofPayload(input: NotionCaptureSourceProofInput) {
  return [
    "notion-capture-source-v1",
    input.roughNoteId,
    input.projectLinkId,
    input.sourceType,
    input.sourceId.replaceAll("-", "").toLowerCase(),
    input.observationKey,
    input.canonicalUrl,
    input.sourceTitle,
    input.occurredAt ?? "",
    input.observedAt,
    captureBodyHash(input.captureBody),
  ].join("\n");
}

export function createNotionCaptureSourceProof(input: NotionCaptureSourceProofInput) {
  return hmac(captureSourceProofPayload(input));
}

export function verifyNotionCaptureSourceProof(
  input: NotionCaptureSourceProofInput,
  proof: string,
) {
  return secureEqual(createNotionCaptureSourceProof(input), proof);
}

export function notionCaptureSourceType(
  resourceType: "page" | "database",
): NotionCaptureSourceType {
  return resourceType === "page" ? "page_current_state" : "database_current_state";
}
