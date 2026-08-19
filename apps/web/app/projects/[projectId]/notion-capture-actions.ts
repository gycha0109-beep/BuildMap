"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { generateStructuredDraft } from "@/lib/buildmap/ai-draft";
import {
  createNotionCaptureSourceProof,
  createNotionObservationKey,
  notionCaptureSourceType,
  type NotionObservedResource,
  verifyNotionCaptureSourceProof,
  verifyNotionCaptureToken,
} from "@/lib/notion/provenance";
import {
  NotionReadBoundaryError,
  readVerifiedNotionProjectResource,
} from "@/lib/notion/read";
import { createClient } from "@/lib/supabase/server";

function integrationsPath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/integrations`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function reviewPath(projectId: string, error?: string) {
  const path = `/projects/${projectId}/workspace/review`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

function revalidateCaptureSurfaces(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/workspace`);
  revalidatePath(`/projects/${projectId}/workspace/review`);
  revalidatePath(`/projects/${projectId}/decisions`);
  revalidatePath(`/projects/${projectId}/evidence`);
  revalidatePath(`/projects/${projectId}/integrations`);
}

function notionEvidenceBody(observation: NotionObservedResource) {
  const lines = [
    "Notion Knowledge Context Evidence",
    `Resource: ${observation.title}`,
    `Object type: ${observation.objectType === "page" ? "Page" : "Database"}`,
    `Resource identity: ${observation.resourceId}`,
    observation.lastEditedTime ? `Last edited: ${observation.lastEditedTime}` : null,
    `Observed by BuildMap at: ${observation.observedAt}`,
    `Source URL: ${observation.canonicalUrl}`,
    "",
  ];

  if (observation.preview.kind === "page") {
    lines.push(
      "Bounded current content:",
      observation.preview.text || "[No top-level text in the bounded read]",
      "",
      `Read boundary: ${observation.preview.topLevelBlocksRead} top-level blocks; truncated=${observation.preview.truncated ? "yes" : "no"}; no recursive traversal.`,
    );
  } else {
    lines.push("Bounded current database structure:");
    if (observation.preview.dataSources.length === 0) {
      lines.push("[No child data source metadata in the bounded read]");
    } else {
      for (const dataSource of observation.preview.dataSources) {
        lines.push(`- ${dataSource.name}`);
      }
    }
    lines.push(
      "",
      `Read boundary: child data-source metadata only; truncated=${observation.preview.truncated ? "yes" : "no"}; no row query or mirror.`,
    );
  }

  return lines.filter((line): line is string => line !== null).join("\n");
}

function notionSourceContext(observation: NotionObservedResource) {
  if (observation.preview.kind === "page") {
    return [
      "Bounded current Notion page state.",
      observation.lastEditedTime ? `Provider last_edited_time: ${observation.lastEditedTime}.` : null,
      `Top-level blocks read: ${observation.preview.topLevelBlocksRead}.`,
      `Truncated: ${observation.preview.truncated ? "yes" : "no"}.`,
      "No recursive traversal; not a revision-history claim.",
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .slice(0, 1000);
  }

  return [
    "Bounded current Notion database container state.",
    observation.lastEditedTime ? `Provider last_edited_time: ${observation.lastEditedTime}.` : null,
    `Child data sources read: ${observation.preview.dataSources.length}.`,
    `Truncated: ${observation.preview.truncated ? "yes" : "no"}.`,
    "No row query or mirror; not a revision-history claim.",
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .slice(0, 1000);
}

async function structureNotionCapture(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  draftId: string,
  body: string,
) {
  let candidate: Awaited<ReturnType<typeof generateStructuredDraft>> | null = null;
  try {
    candidate = await generateStructuredDraft(body);
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("BuildMap Notion evidence structuring failed", { name });
  }

  if (!candidate) {
    await supabase
      .from("ai_structured_drafts")
      .update({
        status: "failed",
        error_message: "AI processing failed during Notion evidence structuring.",
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating");
    return "failed" as const;
  }

  const saved = await supabase
    .from("ai_structured_drafts")
    .update({
      suggested_type: candidate.suggestedType,
      suggested_title: candidate.suggestedTitle,
      structured_summary: candidate.structuredSummary,
      evidence: candidate.evidence || null,
      decision: candidate.decision || null,
      change_content: candidate.changeContent || null,
      next_check: candidate.nextCheck || null,
      status: "generated",
      error_message: null,
    })
    .eq("id", draftId)
    .eq("project_id", projectId)
    .eq("status", "generating")
    .select("id")
    .maybeSingle();

  if (saved.error || !saved.data) {
    await supabase
      .from("ai_structured_drafts")
      .update({
        status: "failed",
        error_message: "Notion evidence was structured but could not be persisted.",
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating");
    return "save-failed" as const;
  }

  return "promoted" as const;
}

export async function captureNotionObservationAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  const captureTokenValue = String(formData.get("captureToken") ?? "").trim();
  if (!linkId || !captureTokenValue) {
    redirect(integrationsPath(projectId, "notion-observation-token"));
  }

  let captureToken: ReturnType<typeof verifyNotionCaptureToken> = null;
  try {
    captureToken = verifyNotionCaptureToken(captureTokenValue);
  } catch {
    redirect(integrationsPath(projectId, "notion-oauth-config-invalid"));
  }
  if (
    !captureToken ||
    captureToken.projectId !== projectId ||
    captureToken.projectLinkId !== linkId
  ) {
    redirect(integrationsPath(projectId, "notion-observation-token"));
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) redirect("/login");

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) {
    redirect("/dashboard?error=project-access");
  }

  let observation: NotionObservedResource;
  try {
    observation = await readVerifiedNotionProjectResource({ supabase, projectId, linkId });
  } catch (error) {
    if (error instanceof NotionReadBoundaryError) {
      redirect(integrationsPath(projectId, error.code));
    }
    redirect(integrationsPath(projectId, "notion-provider-unavailable"));
  }

  const observationKey = createNotionObservationKey(observation);
  if (
    observation.resourceId.replaceAll("-", "").toLowerCase() !==
      captureToken.resourceId.replaceAll("-", "").toLowerCase() ||
    observation.objectType !== captureToken.resourceType ||
    observationKey !== captureToken.observationKey
  ) {
    redirect(integrationsPath(projectId, "notion-observation-changed"));
  }

  const sourceType = notionCaptureSourceType(observation.objectType);
  const existingSource = await supabase
    .from("capture_source_refs")
    .select(
      "rough_note_id, canonical_url, source_title, occurred_at, observed_at, source_proof, observation_key",
    )
    .eq("project_link_id", linkId)
    .eq("provider", "notion")
    .eq("source_type", sourceType)
    .eq("external_source_id", observation.resourceId)
    .eq("observation_key", observationKey)
    .maybeSingle();
  if (existingSource.error) {
    redirect(integrationsPath(projectId, "notion-capture-source"));
  }
  if (existingSource.data) {
    const existingCapture = await supabase
      .from("rough_notes")
      .select("id, body")
      .eq("id", existingSource.data.rough_note_id)
      .eq("project_id", projectId)
      .maybeSingle();
    const valid =
      !existingCapture.error &&
      existingCapture.data &&
      existingSource.data.observation_key &&
      verifyNotionCaptureSourceProof(
        {
          roughNoteId: existingSource.data.rough_note_id,
          projectLinkId: linkId,
          sourceType,
          sourceId: observation.resourceId,
          observationKey: existingSource.data.observation_key,
          canonicalUrl: existingSource.data.canonical_url,
          sourceTitle: existingSource.data.source_title,
          occurredAt: existingSource.data.occurred_at,
          observedAt: existingSource.data.observed_at,
          captureBody: existingCapture.data.body,
        },
        existingSource.data.source_proof,
      );
    if (!valid) {
      redirect(integrationsPath(projectId, "notion-capture-source-integrity"));
    }
    revalidateCaptureSurfaces(projectId);
    redirect(reviewPath(projectId));
  }

  const body = notionEvidenceBody(observation);
  if (body.length > 10000) {
    redirect(integrationsPath(projectId, "notion-observation-too-large"));
  }

  const capture = await supabase
    .from("rough_notes")
    .insert({
      project_id: projectId,
      author_builder_profile_id: context.builderProfileId,
      body,
    })
    .select("id")
    .single();
  if (capture.error) {
    redirect(integrationsPath(projectId, "notion-capture-create"));
  }

  const sourceTitle = observation.title.slice(0, 500);
  const occurredAt = observation.lastEditedTime;
  const sourceProof = createNotionCaptureSourceProof({
    roughNoteId: capture.data.id,
    projectLinkId: linkId,
    sourceType,
    sourceId: observation.resourceId,
    observationKey,
    canonicalUrl: observation.canonicalUrl,
    sourceTitle,
    occurredAt,
    observedAt: observation.observedAt,
    captureBody: body,
  });
  const sourceRef = await supabase
    .from("capture_source_refs")
    .insert({
      rough_note_id: capture.data.id,
      project_link_id: linkId,
      created_by_builder_profile_id: context.builderProfileId,
      provider: "notion",
      source_type: sourceType,
      external_source_id: observation.resourceId,
      canonical_url: observation.canonicalUrl,
      source_title: sourceTitle,
      source_context: notionSourceContext(observation),
      occurred_at: occurredAt,
      observed_at: observation.observedAt,
      source_proof: sourceProof,
      observation_key: observationKey,
    })
    .select("id")
    .single();

  if (sourceRef.error) {
    await supabase
      .from("rough_notes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", capture.data.id)
      .eq("project_id", projectId)
      .is("converted_to_change_card_at", null);

    if (sourceRef.error.code === "23505") {
      revalidateCaptureSurfaces(projectId);
      redirect(reviewPath(projectId));
    }
    redirect(integrationsPath(projectId, "notion-capture-source"));
  }

  const draft = await supabase
    .from("ai_structured_drafts")
    .insert({
      project_id: projectId,
      rough_note_id: capture.data.id,
      requested_by_builder_profile_id: context.builderProfileId,
      status: "generating",
    })
    .select("id")
    .single();
  if (draft.error) {
    revalidateCaptureSurfaces(projectId);
    redirect(reviewPath(projectId, "ai-draft-create"));
  }

  const result = await structureNotionCapture(supabase, projectId, draft.data.id, body);
  revalidateCaptureSurfaces(projectId);
  if (result === "promoted") redirect(reviewPath(projectId));
  if (result === "save-failed") redirect(reviewPath(projectId, "ai-draft-save"));
  redirect(reviewPath(projectId, "ai-generation"));
}
