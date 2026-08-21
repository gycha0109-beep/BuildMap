import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { BoundedFigmaPreview } from "@/lib/figma/api";

const FIGMA_CAPTURE_TOKEN_TTL_SECONDS = 10 * 60;
const FIGMA_PROOF_SECRET_MIN_BYTES = 32;

export type FigmaCaptureSourceType = "file_current_state" | "node_current_state";

export type FigmaObservedResource = BoundedFigmaPreview & {
  canonicalUrl: string;
  observedAt: string;
};

type FigmaCaptureTokenPayload = {
  version: 1;
  provider: "figma";
  projectId: string;
  projectLinkId: string;
  fileKey: string;
  resourceType: "file" | "branch";
  nodeId: string | null;
  observationKey: string;
  nonce: string;
  expiresAt: number;
};

export type FigmaCaptureSourceProofInput = {
  roughNoteId: string;
  projectLinkId: string;
  sourceType: FigmaCaptureSourceType;
  sourceId: string;
  fileKey: string;
  nodeId: string | null;
  observationKey: string;
  canonicalUrl: string;
  sourceTitle: string;
  occurredAt: string | null;
  observedAt: string;
  captureBody: string;
};

function proofSecret() {
  const value = process.env.FIGMA_OAUTH_STATE_SECRET?.trim();
  if (!value || Buffer.byteLength(value, "utf8") < FIGMA_PROOF_SECRET_MIN_BYTES) {
    throw new Error(
      `FIGMA_OAUTH_STATE_SECRET must contain at least ${FIGMA_PROOF_SECRET_MIN_BYTES} bytes of secret material.`,
    );
  }
  return value;
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

function canonicalObservationPayload(observation: FigmaObservedResource) {
  return {
    version: "figma-bounded-observation-v1",
    fileKey: observation.fileKey,
    resourceType: observation.resourceType,
    title: observation.title,
    editorType: observation.editorType,
    providerVersionId: observation.providerVersionId,
    lastModified: observation.lastModified,
    mainFileKey: observation.mainFileKey,
    selectedNodeId: observation.selectedNodeId,
    canonicalUrl: observation.canonicalUrl,
    preview: observation.preview,
  };
}

export function createFigmaObservationKey(observation: FigmaObservedResource) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalObservationPayload(observation)), "utf8")
    .digest("hex");
}

export function createFigmaCaptureToken(input: {
  projectId: string;
  projectLinkId: string;
  observation: FigmaObservedResource;
}) {
  const payload: FigmaCaptureTokenPayload = {
    version: 1,
    provider: "figma",
    projectId: input.projectId,
    projectLinkId: input.projectLinkId,
    fileKey: input.observation.fileKey,
    resourceType: input.observation.resourceType,
    nodeId: input.observation.selectedNodeId,
    observationKey: createFigmaObservationKey(input.observation),
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: Math.floor(Date.now() / 1000) + FIGMA_CAPTURE_TOKEN_TTL_SECONDS,
  };
  return encodeSignedPayload(payload);
}

function captureBodyHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalProofTimestamp(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().replace(".000Z", "Z");
}

function captureSourceProofPayload(input: FigmaCaptureSourceProofInput) {
  return JSON.stringify({
    version: "figma-capture-source-v1",
    roughNoteId: input.roughNoteId,
    projectLinkId: input.projectLinkId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    fileKey: input.fileKey,
    nodeId: input.nodeId,
    observationKey: input.observationKey,
    canonicalUrl: input.canonicalUrl,
    sourceTitle: input.sourceTitle,
    occurredAt: canonicalProofTimestamp(input.occurredAt),
    observedAt: canonicalProofTimestamp(input.observedAt),
    captureBodySha256: captureBodyHash(input.captureBody),
  });
}

export function createFigmaCaptureSourceProof(input: FigmaCaptureSourceProofInput) {
  return hmac(captureSourceProofPayload(input));
}

export function verifyFigmaCaptureSourceProof(input: FigmaCaptureSourceProofInput, proof: string) {
  return secureEqual(createFigmaCaptureSourceProof(input), proof);
}

export function figmaCaptureSourceType(nodeId: string | null): FigmaCaptureSourceType {
  return nodeId ? "node_current_state" : "file_current_state";
}

export function figmaCaptureSourceId(observation: FigmaObservedResource) {
  return observation.selectedNodeId ?? observation.fileKey;
}
