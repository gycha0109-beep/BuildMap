"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { generateStructuredDraft } from "@/lib/buildmap/ai-draft";
import {
  createFigmaCaptureSourceProof,
  createFigmaObservationKey,
  figmaCaptureSourceId,
  figmaCaptureSourceType,
  type FigmaObservedResource,
  verifyFigmaCaptureSourceProof,
  verifyFigmaCaptureToken,
} from "@/lib/figma/provenance";
import {
  FigmaReadBoundaryError,
  readVerifiedFigmaProjectContext,
} from "@/lib/figma/read";
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

function figmaEvidenceBody(observation: FigmaObservedResource) {
  const lines = [
    "Figma Design Context Evidence",
    `File: ${observation.title}`,
    `File identity: ${observation.fileKey}`,
    `Resource type: ${observation.resourceType === "branch" ? "Branch" : "File"}`,
    observation.selectedNodeId ? `Selected node identity: ${observation.selectedNodeId}` : null,
    observation.providerVersionId ? `Provider version ID: ${observation.providerVersionId}` : null,
    observation.lastModified ? `Last modified: ${observation.lastModified}` : null,
    `Observed by BuildMap at: ${observation.observedAt}`,
    `Source URL: ${observation.canonicalUrl}`,
    "",
  ];

  if (observation.preview.kind === "file") {
    lines.push("Bounded page/canvas structure:");
    if (observation.preview.pages.length === 0) {
      lines.push("[No page/canvas metadata in the bounded read]");
    } else {
      for (const page of observation.preview.pages) {
        lines.push(`- ${page.name} [${page.type}] (${page.id})`);
      }
    }
    lines.push(
      "",
      `Read boundary: depth=1 page/canvas metadata only; truncated=${observation.preview.truncated ? "yes" : "no"}; no full-file mirror.`,
    );
  } else {
    const node = observation.preview.node;
    lines.push(
      `Selected node: ${node.name} [${node.type}] (${node.id})`,
      `Direct child count: ${node.childCount}`,
    );
    if (node.children.length > 0) {
      lines.push("Bounded child structure:");
      for (const child of node.children) {
        lines.push(`- ${child.name} [${child.type}] (${child.id})`);
      }
    }
    if (node.text.length > 0) {
      lines.push("", "Bounded text excerpts:", ...node.text);
    }
    lines.push(
      "",
      `Read boundary: selected node depth=2 normalization only; truncated=${observation.preview.truncated ? "yes" : "no"}; raw Figma JSON is not persisted.`,
    );
  }

  return lines.filter((line): line is string => line !== null).join("\n");
}

function figmaSourceContext(observation: FigmaObservedResource) {
  const previewBoundary =
    observation.preview.kind === "file"
      ? `Pages read: ${observation.preview.pages.length}.`
      : `Selected node ${observation.preview.node.id}; direct children summarized: ${observation.preview.node.children.length}; text excerpts: ${observation.preview.node.text.length}.`;
  return [
    "Bounded current Figma Design Context.",
    `Exact file key: ${observation.fileKey}.`,
    observation.selectedNodeId ? `Selected node: ${observation.selectedNodeId}.` : null,
    observation.resourceType === "branch" && observation.mainFileKey
      ? `Branch of main file key: ${observation.mainFileKey}.`
      : null,
    observation.providerVersionId ? `Provider version ID: ${observation.providerVersionId}.` : null,
    observation.lastModified ? `Provider lastModified: ${observation.lastModified}.` : null,
    previewBoundary,
    `Truncated: ${observation.preview.truncated ? "yes" : "no"}.`,
    "No full-file mirror; BuildMap observation_key identifies this bounded normalized observation independently from provider version history.",
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .slice(0, 1000);
}

function figmaSourceTitle(observation: FigmaObservedResource) {
  return observation.preview.kind === "node"
    ? `${observation.title} · ${observation.preview.node.name}`.slice(0, 500)
    : observation.title.slice(0, 500);
}

async function structureFigmaCapture(
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
    console.error("BuildMap Figma evidence structuring failed", { name });
  }

  if (!candidate) {
    await supabase
      .from("ai_structured_drafts")
      .update({
        status: "failed",
        error_message: "AI processing failed during Figma evidence structuring.",
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
        error_message: "Figma evidence was structured but could not be persisted.",
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating");
    return "save-failed" as const;
  }

  return "promoted" as const;
}

export async function captureFigmaObservationAction(projectId: string, formData: FormData) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  const captureTokenValue = String(formData.get("captureToken") ?? "").trim();
  if (!linkId || !captureTokenValue) {
    redirect(integrationsPath(projectId, "figma-observation-token"));
  }

  let captureToken: ReturnType<typeof verifyFigmaCaptureToken> = null;
  try {
    captureToken = verifyFigmaCaptureToken(captureTokenValue);
  } catch {
    redirect(integrationsPath(projectId, "figma-oauth-config-invalid"));
  }
  if (
    !captureToken ||
    captureToken.projectId !== projectId ||
    captureToken.projectLinkId !== linkId
  ) {
    redirect(integrationsPath(projectId, "figma-observation-token"));
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

  let observation: FigmaObservedResource;
  try {
    observation = await readVerifiedFigmaProjectContext({ supabase, projectId, linkId });
  } catch (error) {
    if (error instanceof FigmaReadBoundaryError) {
      redirect(integrationsPath(projectId, error.code.replaceAll("_", "-")));
    }
    redirect(integrationsPath(projectId, "figma-provider-unavailable"));
  }

  const observationKey = createFigmaObservationKey(observation);
  if (
    observation.fileKey !== captureToken.fileKey ||
    observation.resourceType !== captureToken.resourceType ||
    observation.selectedNodeId !== captureToken.nodeId ||
    observationKey !== captureToken.observationKey
  ) {
    redirect(integrationsPath(projectId, "figma-observation-changed"));
  }

  const sourceType = figmaCaptureSourceType(observation.selectedNodeId);
  const sourceId = figmaCaptureSourceId(observation);
  const existingSource = await supabase
    .from("capture_source_refs")
    .select(
      "rough_note_id, canonical_url, source_title, occurred_at, observed_at, source_proof, observation_key",
    )
    .eq("project_link_id", linkId)
    .eq("provider", "figma")
    .eq("source_type", sourceType)
    .eq("external_source_id", sourceId)
    .eq("observation_key", observationKey)
    .maybeSingle();
  if (existingSource.error) {
    redirect(integrationsPath(projectId, "figma-capture-source"));
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
      verifyFigmaCaptureSourceProof(
        {
          roughNoteId: existingSource.data.rough_note_id,
          projectLinkId: linkId,
          sourceType,
          sourceId,
          fileKey: observation.fileKey,
          nodeId: observation.selectedNodeId,
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
      redirect(integrationsPath(projectId, "figma-capture-source-integrity"));
    }
    revalidateCaptureSurfaces(projectId);
    redirect(reviewPath(projectId));
  }

  const body = figmaEvidenceBody(observation);
  if (body.length > 10000) {
    redirect(integrationsPath(projectId, "figma-observation-too-large"));
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
    redirect(integrationsPath(projectId, "figma-capture-create"));
  }

  const sourceTitle = figmaSourceTitle(observation);
  const occurredAt = observation.lastModified;
  const sourceProof = createFigmaCaptureSourceProof({
    roughNoteId: capture.data.id,
    projectLinkId: linkId,
    sourceType,
    sourceId,
    fileKey: observation.fileKey,
    nodeId: observation.selectedNodeId,
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
      provider: "figma",
      source_type: sourceType,
      external_source_id: sourceId,
      canonical_url: observation.canonicalUrl,
      source_title: sourceTitle,
      source_context: figmaSourceContext(observation),
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
    redirect(integrationsPath(projectId, "figma-capture-source"));
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

  const result = await structureFigmaCapture(supabase, projectId, draft.data.id, body);
  revalidateCaptureSurfaces(projectId);
  if (result === "promoted") redirect(reviewPath(projectId));
  if (result === "save-failed") redirect(reviewPath(projectId, "ai-draft-save"));
  redirect(reviewPath(projectId, "ai-generation"));
}
