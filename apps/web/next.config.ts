import { createPrivateKey } from "node:crypto";
import type { NextConfig } from "next";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function envUrl(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function validGitHubPrivateKey() {
  const value = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!value) return false;
  try {
    createPrivateKey(value);
    return true;
  } catch {
    return false;
  }
}

function validNotionStateSecret() {
  const value = process.env.NOTION_OAUTH_STATE_SECRET?.trim();
  return Boolean(value && Buffer.byteLength(value, "utf8") >= 32);
}

function validNotionEncryptionKey() {
  const value = process.env.NOTION_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

if (
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "agent/phase51-activation-readiness"
) {
  const site = envUrl("NEXT_PUBLIC_SITE_URL");
  const githubCallback = envUrl("GITHUB_APP_CALLBACK_URL");
  const notionRedirect = envUrl("NOTION_REDIRECT_URI");
  const supabase = envUrl("NEXT_PUBLIC_SUPABASE_URL");

  console.info("BuildMap Phase51 provider format validation", {
    supabaseTarget: supabase?.hostname === "fuzwuotlbodlpkwcqygj.supabase.co",
    siteHost: site?.hostname ?? null,
    github: {
      allPresent: [
        "GITHUB_APP_ID",
        "GITHUB_APP_CLIENT_ID",
        "GITHUB_APP_CLIENT_SECRET",
        "GITHUB_APP_PRIVATE_KEY",
        "GITHUB_APP_SLUG",
        "GITHUB_APP_STATE_SECRET",
      ].every(hasEnv),
      appIdNumeric: /^\d+$/.test(process.env.GITHUB_APP_ID?.trim() ?? ""),
      privateKeyParse: validGitHubPrivateKey(),
      callbackOriginMatch: Boolean(site && githubCallback && site.origin === githubCallback.origin),
      callbackPathMatch: githubCallback?.pathname === "/api/integrations/github/callback",
    },
    notion: {
      allPresent: [
        "NOTION_CLIENT_ID",
        "NOTION_CLIENT_SECRET",
        "NOTION_OAUTH_STATE_SECRET",
        "NOTION_CREDENTIAL_ENCRYPTION_KEY",
      ].every(hasEnv),
      stateSecretAtLeast32Bytes: validNotionStateSecret(),
      encryptionKeyExactly32Bytes: validNotionEncryptionKey(),
      redirectOriginMatch: Boolean(site && notionRedirect && site.origin === notionRedirect.origin),
      redirectPathMatch: notionRedirect?.pathname === "/api/integrations/notion/callback",
    },
  });
}

const nextConfig: NextConfig = {};

export default nextConfig;
