import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const FIGMA_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const FIGMA_CREDENTIAL_KEY_VERSION = 1;
const FIGMA_CREDENTIAL_AAD_VERSION = "figma-credential-v1";
export const FIGMA_OAUTH_SESSION_COOKIE = "buildmap_figma_oauth_session";
export const FIGMA_OAUTH_SCOPES = ["file_metadata:read", "file_content:read"] as const;

export type FigmaResourceType = "file" | "branch";

type FigmaOAuthState = {
  version: 1;
  provider: "figma";
  projectId: string;
  linkId: string;
  userId: string;
  returnPath: string;
  nonce: string;
  expiresAt: number;
};

type FigmaOAuthSession = {
  version: 1;
  provider: "figma";
  userId: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
};

export type FigmaBindingIdentity = {
  projectLinkId: string;
  figmaUserId: string;
  resourceId: string;
  resourceType: FigmaResourceType;
  nodeId: string | null;
};

type FigmaOAuthConfig = {
  clientId: string;
  clientSecret: string;
  stateSecret: string;
  encryptionKey: Buffer;
  redirectUri: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function siteUrl() {
  return requiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
}

function requiredSecret(name: string) {
  const value = requiredEnv(name);
  if (Buffer.byteLength(value, "utf8") < 32) {
    throw new Error(`${name} must contain at least 32 bytes of secret material.`);
  }
  return value;
}

function encryptionKey() {
  const encoded = requiredEnv("FIGMA_CREDENTIAL_ENCRYPTION_KEY");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("FIGMA_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function isFigmaOAuthConfigured() {
  const redirectConfigured =
    Boolean(process.env.FIGMA_REDIRECT_URI?.trim()) || Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
  return (
    redirectConfigured &&
    [
      "FIGMA_CLIENT_ID",
      "FIGMA_CLIENT_SECRET",
      "FIGMA_OAUTH_STATE_SECRET",
      "FIGMA_CREDENTIAL_ENCRYPTION_KEY",
    ].every((name) => Boolean(process.env[name]?.trim()))
  );
}

export function getFigmaOAuthConfig(): FigmaOAuthConfig {
  return {
    clientId: requiredEnv("FIGMA_CLIENT_ID"),
    clientSecret: requiredEnv("FIGMA_CLIENT_SECRET"),
    stateSecret: requiredSecret("FIGMA_OAUTH_STATE_SECRET"),
    encryptionKey: encryptionKey(),
    redirectUri:
      process.env.FIGMA_REDIRECT_URI?.trim() ||
      `${siteUrl()}/api/integrations/figma/callback`,
  };
}

function signValue(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSignedPayload(value: object, secret: string) {
  const encoded = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encoded}.${signValue(encoded, secret)}`;
}

function decodeSignedPayload<T>(value: string, secret: string): T | null {
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = signValue(encoded, secret);
  if (!secureEqual(expected, signature)) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createFigmaAuthorization(input: {
  projectId: string;
  linkId: string;
  userId: string;
}) {
  const config = getFigmaOAuthConfig();
  const nonce = randomBytes(24).toString("base64url");
  const expiresAt = Math.floor(Date.now() / 1000) + FIGMA_OAUTH_STATE_TTL_SECONDS;
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
  const state: FigmaOAuthState = {
    version: 1,
    provider: "figma",
    ...input,
    returnPath: `/projects/${input.projectId}/integrations`,
    nonce,
    expiresAt,
  };
  const session: FigmaOAuthSession = {
    version: 1,
    provider: "figma",
    userId: input.userId,
    nonce,
    codeVerifier,
    expiresAt,
  };

  const authorizeUrl = new URL("https://www.figma.com/oauth");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("scope", FIGMA_OAUTH_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", encodeSignedPayload(state, config.stateSecret));
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return {
    url: authorizeUrl.toString(),
    sessionCookie: encodeSignedPayload(session, config.stateSecret),
    maxAge: FIGMA_OAUTH_STATE_TTL_SECONDS,
  };
}

export function verifyFigmaOAuthState(value: string) {
  const state = decodeSignedPayload<FigmaOAuthState>(value, getFigmaOAuthConfig().stateSecret);
  if (!state || state.version !== 1 || state.provider !== "figma") return null;
  if (state.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (!state.projectId || !state.linkId || !state.userId || !state.nonce) return null;
  if (state.returnPath !== `/projects/${state.projectId}/integrations`) return null;
  return state;
}

export function verifyFigmaOAuthSession(value: string, state: FigmaOAuthState) {
  const session = decodeSignedPayload<FigmaOAuthSession>(value, getFigmaOAuthConfig().stateSecret);
  if (!session || session.version !== 1 || session.provider !== "figma") return null;
  if (session.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (session.userId !== state.userId || session.nonce !== state.nonce || !session.codeVerifier) {
    return null;
  }
  return session;
}

function credentialAad(figmaUserId: string, kind: "access" | "refresh") {
  return Buffer.from(
    [FIGMA_CREDENTIAL_AAD_VERSION, figmaUserId, kind, String(FIGMA_CREDENTIAL_KEY_VERSION)].join("\n"),
    "utf8",
  );
}

export function sealFigmaCredential(
  figmaUserId: string,
  kind: "access" | "refresh",
  token: string,
) {
  if (!figmaUserId || !token) throw new Error("Cannot seal an incomplete Figma credential.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getFigmaOAuthConfig().encryptionKey, nonce);
  cipher.setAAD(credentialAad(figmaUserId, kind));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    `v${FIGMA_CREDENTIAL_KEY_VERSION}`,
    nonce.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function openFigmaCredential(
  figmaUserId: string,
  kind: "access" | "refresh",
  sealed: string,
  keyVersion: number,
) {
  if (keyVersion !== FIGMA_CREDENTIAL_KEY_VERSION) {
    throw new Error("Unsupported Figma credential encryption key version.");
  }
  const [version, nonceValue, tagValue, ciphertextValue, extra] = sealed.split(".");
  if (
    version !== `v${FIGMA_CREDENTIAL_KEY_VERSION}` ||
    !nonceValue ||
    !tagValue ||
    !ciphertextValue ||
    extra
  ) {
    throw new Error("Invalid sealed Figma credential format.");
  }
  const nonce = Buffer.from(nonceValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const ciphertext = Buffer.from(ciphertextValue, "base64url");
  if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid sealed Figma credential payload.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", getFigmaOAuthConfig().encryptionKey, nonce);
    decipher.setAAD(credentialAad(figmaUserId, kind));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Figma credential integrity verification failed.");
  }
}

function bindingProofPayload(input: FigmaBindingIdentity) {
  return [
    "figma-binding-v1",
    input.projectLinkId,
    input.figmaUserId,
    input.resourceId,
    input.resourceType,
    input.nodeId ?? "",
  ].join("\n");
}

export function createFigmaBindingProof(input: FigmaBindingIdentity) {
  return createHmac("sha256", getFigmaOAuthConfig().stateSecret)
    .update(bindingProofPayload(input))
    .digest("base64url");
}

export function verifyFigmaBindingProof(input: FigmaBindingIdentity, proof: string) {
  return secureEqual(createFigmaBindingProof(input), proof);
}

export function figmaCredentialKeyVersion() {
  return FIGMA_CREDENTIAL_KEY_VERSION;
}
