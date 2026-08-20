import { NextRequest, NextResponse } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createNotionCaptureToken } from "@/lib/notion/provenance";
import {
  NotionReadBoundaryError,
  readVerifiedNotionProjectResource,
} from "@/lib/notion/read";
import { createClient } from "@/lib/supabase/server";

function jsonError(
  code: string,
  message: string,
  status: number,
  retryAfterSeconds?: number | null,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const linkId = request.nextUrl.searchParams.get("linkId")?.trim() ?? "";
  if (!linkId) {
    return jsonError("invalid_link", "Notion resource link is required.", 400);
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return jsonError("unauthenticated", "Authentication is required.", 401);
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) {
    return jsonError("project_access", "Project access denied.", 404);
  }

  try {
    const observation = await readVerifiedNotionProjectResource({
      supabase,
      projectId,
      linkId,
    });
    const captureToken = createNotionCaptureToken({
      projectId,
      projectLinkId: linkId,
      observation,
    });

    return NextResponse.json(
      { ...observation, captureToken },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof NotionReadBoundaryError) {
      return jsonError(
        error.code,
        error.message,
        error.status,
        error.retryAfterSeconds,
      );
    }
    return jsonError(
      "notion_provider_unavailable",
      "Notion context could not be read right now. BuildMap data was not changed.",
      502,
    );
  }
}
