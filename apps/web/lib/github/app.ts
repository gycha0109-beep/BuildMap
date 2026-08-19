import {
  createHash,
  createHmac,
  createSign,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const GITHUB_API_VERSION = "2026-03-10";
const INSTALL_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_COOKIE_TTL_SECONDS = 10 * 60;

export type GitHubAppConfig = {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  appSlug: string;
  stateSecret: string;
  callbackUrl: string;
};

export type GitHubInstallState = {
  version: 1;
  projectId: string;
  linkId: string;
  userId: string;
  nonce: string;
  expiresAt: number;
};

export type GitHubOAuthCookie = {
  version: 1;
  projectId: string;
  linkId: string;
  userId: string;
  installationId: string;
  oauthState: string;
  codeVerifier: string;
  expiresAt: number;
};

export type GitHubBindingIdentity = {
  projectLinkId: string;
  installationId: string;
  repositoryId: string;
  fullName: string;
};

function base64Url(input: string | Buffer) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buffer.toString("base64url");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function siteUrl() {
  return requiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
}

export function isGitHubAppConfigured() {
  return [
    "GITHUB_APP_ID",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_CLIENT_SECRET",
    "GITHUB_APP_PRIVATE_KEY",
    "GITHUB_APP_SLUG",
    "GITHUB_APP_STATE_SECRET",
    "NEXT_PUBLIC_SITE_URL",
  ].every((name) => Boolean(process.env[name]?.trim()));
}

export function getGitHubAppConfig(): GitHubAppConfig {
  const callbackUrl =
    process.env.GITHUB_APP_CALLBACK_URL?.trim() ||
    `${siteUrl()}/api/integrations/github/callback`;

  return {
    appId: requiredEnv("GITHUB_APP_ID"),
    clientId: requiredEnv("GITHUB_APP_CLIENT_ID"),
    clientSecret: requiredEnv("GITHUB_APP_CLIENT_SECRET"),
    privateKey: normalizePrivateKey(requiredEnv("GITHUB_APP_PRIVATE_KEY")),
    appSlug: requiredEnv("GITHUB_APP_SLUG"),
    stateSecret: requiredEnv("GITHUB_APP_STATE_SECRET"),
    callbackUrl,
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
  const encoded = base64Url(JSON.stringify(value));
  return `${encoded}.${signValue(encoded, secret)}`;
}

function decodeSignedPayload<T>(value: string, secret: string): T | null {
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra) return null;

  const expected = signValue(encoded, secret);
  if (!secureEqual(signature, expected)) return null;

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createGitHubInstallState(input: {
  projectId: string;
  linkId: string;
  userId: string;
}) {
  const config = getGitHubAppConfig();
  const payload: GitHubInstallState = {
    version: 1,
    ...input,
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: Math.floor(Date.now() / 1000) + INSTALL_STATE_TTL_SECONDS,
  };
  return encodeSignedPayload(payload, config.stateSecret);
}

export function verifyGitHubInstallState(value: string) {
  const payload = decodeSignedPayload<GitHubInstallState>(
    value,
    getGitHubAppConfig().stateSecret,
  );
  if (!payload || payload.version !== 1) return null;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (!payload.projectId || !payload.linkId || !payload.userId || !payload.nonce) return null;
  return payload;
}

export function createGitHubInstallUrl(state: string) {
  const config = getGitHubAppConfig();
  const url = new URL(`https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new`);
  url.searchParams.set("state", state);
  return url.toString();
}

export function createGitHubOAuthSession(input: {
  projectId: string;
  linkId: string;
  userId: string;
  installationId: string;
}) {
  const config = getGitHubAppConfig();
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const oauthState = randomBytes(24).toString("base64url");
  const payload: GitHubOAuthCookie = {
    version: 1,
    ...input,
    oauthState,
    codeVerifier,
    expiresAt: Math.floor(Date.now() / 1000) + OAUTH_COOKIE_TTL_SECONDS,
  };

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.callbackUrl);
  authorizeUrl.searchParams.set("state", oauthState);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return {
    authorizeUrl: authorizeUrl.toString(),
    sealedCookie: encodeSignedPayload(payload, config.stateSecret),
    maxAge: OAUTH_COOKIE_TTL_SECONDS,
  };
}

export function verifyGitHubOAuthCookie(value: string) {
  const payload = decodeSignedPayload<GitHubOAuthCookie>(
    value,
    getGitHubAppConfig().stateSecret,
  );
  if (!payload || payload.version !== 1) return null;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (
    !payload.projectId ||
    !payload.linkId ||
    !payload.userId ||
    !payload.installationId ||
    !payload.oauthState ||
    !payload.codeVerifier
  ) {
    return null;
  }
  return payload;
}

function bindingProofPayload(input: GitHubBindingIdentity) {
  return [
    "github",
    input.projectLinkId,
    input.installationId,
    input.repositoryId,
    input.fullName.toLowerCase(),
  ].join("\n");
}

export function createGitHubBindingProof(input: GitHubBindingIdentity) {
  const config = getGitHubAppConfig();
  return createHmac("sha256", config.stateSecret)
    .update(bindingProofPayload(input))
    .digest("base64url");
}

export function verifyGitHubBindingProof(input: GitHubBindingIdentity, proof: string) {
  return secureEqual(createGitHubBindingProof(input), proof);
}

export function createGitHubAppJwt() {
  const config = getGitHubAppConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: config.appId,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(config.privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

export const githubRequestHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": GITHUB_API_VERSION,
};

export function githubOAuthCookieName() {
  return "buildmap_github_oauth";
}
