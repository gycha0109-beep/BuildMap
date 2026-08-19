import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const NOTION_OAUTH_STATE_TTL_SECONDS = 10 * 60;
const NOTION_CREDENTIAL_KEY_VERSION = 1;
const NOTION_CREDENTIAL_AAD_VERSION = "notion-credential-v1";

export type NotionResourceType = "page" | "database";

type NotionOAuthState = {
  version: 1;
  provider: "notion";
  projectId: string;
  linkId: string;
  userId: string;
  returnPath: string;
  nonce: string;
  expiresAt: number;
};

export type NotionBindingIdentity = {
  projectLinkId: string;
  botId: string;
  workspaceId: string;
  resourceId: string;
  resourceType: NotionResourceType;
};

type NotionOAuthConfig = {
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
  const encoded = requiredEnv("NOTION_CREDENTIAL_ENCRYPTION_KEY");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("NOTION_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function isNotionOAuthConfigured() {
  const redirectConfigured =
    Boolean(process.env.NOTION_REDIRECT_URI?.trim()) || Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
  return (
    redirectConfigured &&
    [
      "NOTION_CLIENT_ID",
      "NOTION_CLIENT_SECRET",
      "NOTION_OAUTH_STATE_SECRET",
      "NOTION_CREDENTIAL_ENCRYPTION_KEY",
    ].every((name) => Boolean(process.env[name]?.trim()))
  );
}

export function getNotionOAuthConfig(): NotionOAuthConfig {
  return {
    clientId: requiredEnv("NOTION_CLIENT_ID"),
    clientSecret: requiredEnv("NOTION_CLIENT_SECRET"),
    stateSecret: requiredSecret("NOTION_OAUTH_STATE_SECRET"),
    encryptionKey: encryptionKey(),
    redirectUri:
      process.env.NOTION_REDIRECT_URI?.trim() ||
      `${siteUrl()}/api/integrations/notion/callback`,
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

export function createNotionAuthorization(input: {
  projectId: string;
  linkId: string;
  userId: string;
}) {
  const config = getNotionOAuthConfig();
  const state: NotionOAuthState = {
    version: 1,
    provider: "notion",
    ...input,
    returnPath: `/projects/${input.projectId}/integrations`,
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: Math.floor(Date.now() / 1000) + NOTION_OAUTH_STATE_TTL_SECONDS,
  };

  const encodedState = encodeSignedPayload(state, config.stateSecret);
  const authorizeUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  authorizeUrl.searchParams.set("owner", "user");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", encodedState);

  return authorizeUrl.toString();
}

export function verifyNotionOAuthState(value: string) {
  const state = decodeSignedPayload<NotionOAuthState>(
    value,
    getNotionOAuthConfig().stateSecret,
  );
  if (!state || state.version !== 1 || state.provider !== "notion") return null;
  if (state.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (!state.projectId || !state.linkId || !state.userId || !state.nonce) return null;
  if (state.returnPath !== `/projects/${state.projectId}/integrations`) return null;
  return state;
}

function credentialAad(projectLinkId: string, kind: "access" | "refresh") {
  return Buffer.from(
    [
      NOTION_CREDENTIAL_AAD_VERSION,
      projectLinkId,
      kind,
      String(NOTION_CREDENTIAL_KEY_VERSION),
    ].join("\n"),
    "utf8",
  );
}

export function sealNotionCredential(
  projectLinkId: string,
  kind: "access" | "refresh",
  token: string,
) {
  if (!token) throw new Error("Cannot seal an empty Notion credential.");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getNotionOAuthConfig().encryptionKey, nonce);
  cipher.setAAD(credentialAad(projectLinkId, kind));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    `v${NOTION_CREDENTIAL_KEY_VERSION}`,
    nonce.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function openNotionCredential(
  projectLinkId: string,
  kind: "access" | "refresh",
  sealed: string,
  keyVersion: number,
) {
  if (keyVersion !== NOTION_CREDENTIAL_KEY_VERSION) {
    throw new Error("Unsupported Notion credential encryption key version.");
  }
  const [version, nonceValue, tagValue, ciphertextValue, extra] = sealed.split(".");
  if (
    version !== `v${NOTION_CREDENTIAL_KEY_VERSION}` ||
    !nonceValue ||
    !tagValue ||
    !ciphertextValue ||
    extra
  ) {
    throw new Error("Invalid sealed Notion credential format.");
  }

  const nonce = Buffer.from(nonceValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const ciphertext = Buffer.from(ciphertextValue, "base64url");
  if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid sealed Notion credential payload.");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getNotionOAuthConfig().encryptionKey,
      nonce,
    );
    decipher.setAAD(credentialAad(projectLinkId, kind));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Notion credential integrity verification failed.");
  }
}

function bindingProofPayload(input: NotionBindingIdentity) {
  return [
    "notion-binding-v1",
    input.projectLinkId,
    input.botId,
    input.workspaceId,
    input.resourceId.toLowerCase(),
    input.resourceType,
  ].join("\n");
}

export function createNotionBindingProof(input: NotionBindingIdentity) {
  return createHmac("sha256", getNotionOAuthConfig().stateSecret)
    .update(bindingProofPayload(input))
    .digest("base64url");
}

export function verifyNotionBindingProof(input: NotionBindingIdentity, proof: string) {
  return secureEqual(createNotionBindingProof(input), proof);
}

export function notionCredentialKeyVersion() {
  return NOTION_CREDENTIAL_KEY_VERSION;
}
