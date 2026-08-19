import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import {
  createGitHubOAuthSession,
  githubOAuthCookieName,
  isGitHubAppConfigured,
  verifyGitHubInstallState,
} from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

function appRedirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  if (!isGitHubAppConfigured()) {
    return appRedirect(request, "/dashboard?error=github-app-not-configured");
  }

  const installationId = request.nextUrl.searchParams.get("installation_id")?.trim() ?? "";
  const stateValue = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  if (!/^\d+$/.test(installationId) || !stateValue) {
    return appRedirect(request, "/dashboard?error=github-install-invalid");
  }

  const installState = verifyGitHubInstallState(stateValue);
  if (!installState) {
    return appRedirect(request, "/dashboard?error=github-install-state");
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return appRedirect(request, "/login");
  }
  if (currentUser.data.user.id !== installState.userId) {
    return appRedirect(
      request,
      `/projects/${installState.projectId}/integrations?error=github-install-user`,
    );
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", installState.projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) {
    return appRedirect(request, "/dashboard?error=project-access");
  }

  const link = await supabase
    .from("project_links")
    .select("id, url")
    .eq("id", installState.linkId)
    .eq("project_id", installState.projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .maybeSingle();
  if (link.error || !link.data || !parseCanonicalGitHubRepositoryUrl(link.data.url)) {
    return appRedirect(
      request,
      `/projects/${installState.projectId}/integrations?error=github-read-link-invalid`,
    );
  }

  const oauth = createGitHubOAuthSession({
    projectId: installState.projectId,
    linkId: installState.linkId,
    userId: currentUser.data.user.id,
    installationId,
  });
  const response = NextResponse.redirect(oauth.authorizeUrl);
  response.cookies.set(githubOAuthCookieName(), oauth.sealedCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/github",
    maxAge: oauth.maxAge,
  });
  return response;
}
