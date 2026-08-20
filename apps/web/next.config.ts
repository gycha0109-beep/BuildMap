import type { NextConfig } from "next";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function envHostname(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return "INVALID_URL";
  }
}

if (
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_GIT_COMMIT_REF === "agent/phase51-activation-readiness"
) {
  console.info("BuildMap Phase51 preview readiness encryption recheck", {
    supabaseHost: envHostname("NEXT_PUBLIC_SUPABASE_URL"),
    siteHost: envHostname("NEXT_PUBLIC_SITE_URL"),
    githubCallbackHost: envHostname("GITHUB_APP_CALLBACK_URL"),
    notionRedirectHost: envHostname("NOTION_REDIRECT_URI"),
    github: {
      appId: hasEnv("GITHUB_APP_ID"),
      clientId: hasEnv("GITHUB_APP_CLIENT_ID"),
      clientSecret: hasEnv("GITHUB_APP_CLIENT_SECRET"),
      privateKey: hasEnv("GITHUB_APP_PRIVATE_KEY"),
      appSlug: hasEnv("GITHUB_APP_SLUG"),
      stateSecret: hasEnv("GITHUB_APP_STATE_SECRET"),
    },
    notion: {
      clientId: hasEnv("NOTION_CLIENT_ID"),
      clientSecret: hasEnv("NOTION_CLIENT_SECRET"),
      stateSecret: hasEnv("NOTION_OAUTH_STATE_SECRET"),
      encryptionKey: hasEnv("NOTION_CREDENTIAL_ENCRYPTION_KEY"),
    },
  });
}

const nextConfig: NextConfig = {};

export default nextConfig;
