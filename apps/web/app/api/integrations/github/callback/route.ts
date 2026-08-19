import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import {
  createGitHubBindingProof,
  githubOAuthCookieName,
  isGitHubAppConfigured,
  verifyGitHubOAuthCookie,
} from "@/lib/github/app";
import {
  exchangeGitHubOAuthCode,
  GitHubProviderError,
  verifyUserInstallationRepository,
} from "@/lib/github/api";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

function redirectWithClearedCookie(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.set(githubOAuthCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/github",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  if (!isGitHubAppConfigured()) {
    return redirectWithClearedCookie(request, "/dashboard?error=github-app-not-configured");
  }

  const sealedCookie = request.cookies.get(githubOAuthCookieName())?.value ?? "";
  const oauth = sealedCookie ? verifyGitHubOAuthCookie(sealedCookie) : null;
  if (!oauth) {
    return redirectWithClearedCookie(request, "/dashboard?error=github-oauth-state");
  }

  const integrationPath = `/projects/${oauth.projectId}/integrations`;
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    return redirectWithClearedCookie(request, `${integrationPath}?error=github-oauth-denied`);
  }

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  if (!code || !state || state !== oauth.oauthState) {
    return redirectWithClearedCookie(request, `${integrationPath}?error=github-oauth-state`);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return redirectWithClearedCookie(request, "/login");
  }
  if (currentUser.data.user.id !== oauth.userId) {
    return redirectWithClearedCookie(request, `${integrationPath}?error=github-oauth-user`);
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", oauth.projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) {
    return redirectWithClearedCookie(request, "/dashboard?error=project-access");
  }

  const link = await supabase
    .from("project_links")
    .select("id, url")
    .eq("id", oauth.linkId)
    .eq("project_id", oauth.projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .maybeSingle();
  const repository = link.data ? parseCanonicalGitHubRepositoryUrl(link.data.url) : null;
  if (link.error || !link.data || !repository) {
    return redirectWithClearedCookie(request, `${integrationPath}?error=github-read-link-invalid`);
  }

  try {
    const userAccessToken = await exchangeGitHubOAuthCode(code, oauth.codeVerifier);
    const verified = await verifyUserInstallationRepository({
      userAccessToken,
      installationId: oauth.installationId,
      expectedFullName: repository.fullName,
    });
    if (!verified) {
      return redirectWithClearedCookie(
        request,
        `${integrationPath}?error=github-repository-not-authorized`,
      );
    }

    const bindingProof = createGitHubBindingProof({
      projectLinkId: oauth.linkId,
      installationId: verified.installationId,
      repositoryId: verified.repositoryId,
      fullName: verified.fullName,
    });
    const bindingValue = {
      external_connection_id: verified.installationId,
      external_account_id: verified.ownerId,
      external_account_label: verified.ownerLogin,
      external_resource_id: verified.repositoryId,
      external_resource_label: verified.fullName,
      binding_proof: bindingProof,
      status: "active",
    };

    const existing = await supabase
      .from("integration_bindings")
      .select("id")
      .eq("project_link_id", oauth.linkId)
      .eq("provider", "github")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      return redirectWithClearedCookie(request, `${integrationPath}?error=github-binding-save`);
    }

    if (existing.data) {
      const updated = await supabase
        .from("integration_bindings")
        .update(bindingValue)
        .eq("id", existing.data.id)
        .eq("project_link_id", oauth.linkId)
        .eq("provider", "github")
        .is("archived_at", null)
        .select("id")
        .maybeSingle();
      if (updated.error || !updated.data) {
        return redirectWithClearedCookie(request, `${integrationPath}?error=github-binding-save`);
      }
    } else {
      const inserted = await supabase.from("integration_bindings").insert({
        project_link_id: oauth.linkId,
        created_by_builder_profile_id: context.builderProfileId,
        provider: "github",
        ...bindingValue,
      });
      if (inserted.error) {
        return redirectWithClearedCookie(request, `${integrationPath}?error=github-binding-save`);
      }
    }

    return redirectWithClearedCookie(request, `${integrationPath}?updated=github-read-connected`);
  } catch (error) {
    const codeName =
      error instanceof GitHubProviderError && [401, 403, 404].includes(error.status)
        ? "github-authorization-invalid"
        : "github-provider-unavailable";
    return redirectWithClearedCookie(request, `${integrationPath}?error=${codeName}`);
  }
}
