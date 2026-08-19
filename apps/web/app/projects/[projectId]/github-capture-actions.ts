"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { generateStructuredDraft } from "@/lib/buildmap/ai-draft";
import {
  createGitHubCaptureSourceProof,
  isGitHubAppConfigured,
  verifyGitHubBindingProof,
  verifyGitHubCaptureSourceProof,
} from "@/lib/github/app";
import {
  GitHubProviderError,
  readGitHubObservation,
  type GitHubActivityObservation,
} from "@/lib/github/api";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";

const sourceTypes = new Set<GitHubActivityObservation["sourceType"]>([
  "merged_pull_request",
  "release",
]);

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

function githubEvidenceBody(
  repository: string,
  observation: GitHubActivityObservation,
  observedAt: string,
) {
  const typeLabel = observation.sourceType === "release" ? "Release" : "Merged Pull Request";
  return [
    "GitHub Build History Evidence",
    `Repository: ${repository}`,
    `Source type: ${typeLabel}`,
    `Source identity: ${observation.sourceId}`,
    `Title: ${observation.title}`,
    observation.context ? `Context: ${observation.context}` : null,
    `Occurred at: ${observation.occurredAt}`,
    `Observed by BuildMap at: ${observedAt}`,
    `Source URL: ${observation.url}`,
    observation.summary ? "" : null,
    observation.summary ? "Provider summary/context:" : null,
    observation.summary,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

async function structureGitHubCapture(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  draftId: string,
  body: string,
) {
  let candidate: Awaited<ReturnType<typeof generateStructuredDraft>> | null = null;
  try {
    candidate = await generateStructuredDraft(body);
  } catch (error) {
    const message = error instanceof Error ? error.name : "UnknownError";
    console.error("BuildMap GitHub evidence structuring failed", { name: message });
  }

  if (!candidate) {
    await supabase
      .from("ai_structured_drafts")
      .update({
        status: "failed",
        error_message: "AI processing failed during GitHub evidence structuring.",
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
        error_message: "GitHub evidence was structured but could not be persisted.",
      })
      .eq("id", draftId)
      .eq("project_id", projectId)
      .eq("status", "generating");
    return "save-failed" as const;
  }

  return "promoted" as const;
}

export async function captureGitHubObservationAction(
  projectId: string,
  formData: FormData,
) {
  const linkId = String(formData.get("linkId") ?? "").trim();
  const requestedSourceType = String(formData.get("sourceType") ?? "").trim();
  const sourceId = String(formData.get("sourceId") ?? "").trim();

  if (
    !linkId ||
    !sourceId ||
    !sourceTypes.has(requestedSourceType as GitHubActivityObservation["sourceType"])
  ) {
    redirect(integrationsPath(projectId, "github-observation-invalid"));
  }
  const sourceType = requestedSourceType as GitHubActivityObservation["sourceType"];

  if (!isGitHubAppConfigured()) {
    redirect(integrationsPath(projectId, "github-app-not-configured"));
  }

  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    redirect("/login");
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
    redirect("/dashboard?error=project-access");
  }

  const [link, binding] = await Promise.all([
    supabase
      .from("project_links")
      .select("id, url")
      .eq("id", linkId)
      .eq("project_id", projectId)
      .eq("link_type", "github")
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("integration_bindings")
      .select(
        "external_connection_id, external_resource_id, external_resource_label, binding_proof",
      )
      .eq("project_link_id", linkId)
      .eq("provider", "github")
      .eq("status", "active")
      .is("archived_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (link.error || !link.data || binding.error || !binding.data) {
    redirect(integrationsPath(projectId, "github-observation-read-access"));
  }

  const repository = parseCanonicalGitHubRepositoryUrl(link.data.url);
  if (!repository) {
    redirect(integrationsPath(projectId, "github-read-link-invalid"));
  }

  const bindingValid =
    binding.data.external_resource_label.toLowerCase() === repository.fullName.toLowerCase() &&
    verifyGitHubBindingProof(
      {
        projectLinkId: linkId,
        installationId: binding.data.external_connection_id,
        repositoryId: binding.data.external_resource_id,
        fullName: repository.fullName,
      },
      binding.data.binding_proof,
    );
  if (!bindingValid) {
    redirect(integrationsPath(projectId, "github-observation-read-access"));
  }

  const existingSource = await supabase
    .from("capture_source_refs")
    .select("rough_note_id, canonical_url, source_proof")
    .eq("project_link_id", linkId)
    .eq("provider", "github")
    .eq("source_type", sourceType)
    .eq("external_source_id", sourceId)
    .maybeSingle();
  if (existingSource.error) {
    redirect(integrationsPath(projectId, "github-capture-source"));
  }
  if (existingSource.data) {
    const existingProofValid = verifyGitHubCaptureSourceProof(
      {
        roughNoteId: existingSource.data.rough_note_id,
        projectLinkId: linkId,
        sourceType,
        sourceId,
        canonicalUrl: existingSource.data.canonical_url,
      },
      existingSource.data.source_proof,
    );
    if (!existingProofValid) {
      redirect(integrationsPath(projectId, "github-capture-source-integrity"));
    }
    revalidateCaptureSurfaces(projectId);
    redirect(reviewPath(projectId));
  }

  let observation: GitHubActivityObservation | null = null;
  try {
    observation = await readGitHubObservation({
      installationId: binding.data.external_connection_id,
      repositoryId: binding.data.external_resource_id,
      owner: repository.owner,
      repository: repository.repository,
      sourceType,
      sourceId,
    });
  } catch (error) {
    if (error instanceof GitHubProviderError && error.status === 400) {
      redirect(integrationsPath(projectId, "github-observation-invalid"));
    }
    if (error instanceof GitHubProviderError && [401, 403, 404].includes(error.status)) {
      redirect(integrationsPath(projectId, "github-observation-unavailable"));
    }
    redirect(integrationsPath(projectId, "github-provider-unavailable"));
  }

  if (!observation) {
    redirect(integrationsPath(projectId, "github-observation-unavailable"));
  }

  const observedAt = new Date().toISOString();
  const body = githubEvidenceBody(repository.fullName, observation, observedAt);
  if (body.length > 10000) {
    redirect(integrationsPath(projectId, "github-observation-too-large"));
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
    redirect(integrationsPath(projectId, "github-capture-create"));
  }

  const sourceProof = createGitHubCaptureSourceProof({
    roughNoteId: capture.data.id,
    projectLinkId: linkId,
    sourceType: observation.sourceType,
    sourceId: observation.sourceId,
    canonicalUrl: observation.url,
  });
  const sourceRef = await supabase
    .from("capture_source_refs")
    .insert({
      rough_note_id: capture.data.id,
      project_link_id: linkId,
      created_by_builder_profile_id: context.builderProfileId,
      provider: "github",
      source_type: observation.sourceType,
      external_source_id: observation.sourceId,
      canonical_url: observation.url,
      source_title: observation.title.slice(0, 500),
      source_context: observation.context?.slice(0, 1000) || null,
      occurred_at: observation.occurredAt,
      observed_at: observedAt,
      source_proof: sourceProof,
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
    redirect(integrationsPath(projectId, "github-capture-source"));
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

  const result = await structureGitHubCapture(
    supabase,
    projectId,
    draft.data.id,
    body,
  );
  revalidateCaptureSurfaces(projectId);

  if (result === "promoted") {
    redirect(reviewPath(projectId));
  }
  if (result === "save-failed") {
    redirect(reviewPath(projectId, "ai-draft-save"));
  }
  redirect(reviewPath(projectId, "ai-generation"));
}
