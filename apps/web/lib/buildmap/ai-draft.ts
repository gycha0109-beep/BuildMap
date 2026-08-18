import { generateText, Output } from "ai";
import { z } from "zod";

const changeCardTypes = [
  "problem_found",
  "problem_definition_changed",
  "hypothesis_created",
  "hypothesis_refuted",
  "experiment",
  "user_feedback",
  "feature_added",
  "feature_removed",
  "decision_kept",
  "decision_changed",
  "pivot",
  "release",
  "handoff_note",
] as const;

const captureClassifications = [
  "note",
  "observation",
  "insufficient",
  "decision_candidate",
  "direction_change",
] as const;

export type ChangeCardType = (typeof changeCardTypes)[number];
export type CaptureClassification = (typeof captureClassifications)[number];

export type GeneratedAiDraft = {
  suggestedType: ChangeCardType;
  suggestedTitle: string;
  structuredSummary: string;
  evidence: string;
  decision: string;
  changeContent: string;
  nextCheck: string;
};

export type CaptureAssessment = {
  shouldPromote: boolean;
  classification: CaptureClassification;
  reason: string;
  draft: GeneratedAiDraft | null;
};

const structuredDraftSchema = z.object({
  suggestedType: z.enum(changeCardTypes),
  suggestedTitle: z.string().min(1),
  structuredSummary: z.string().min(1),
  evidence: z.string(),
  decision: z.string(),
  changeContent: z.string(),
  nextCheck: z.string(),
});

const captureAssessmentSchema = z.object({
  shouldPromote: z.boolean(),
  classification: z.enum(captureClassifications),
  reason: z.string().min(1),
  suggestedType: z.enum(changeCardTypes).nullable(),
  suggestedTitle: z.string(),
  structuredSummary: z.string(),
  evidence: z.string(),
  decision: z.string(),
  changeContent: z.string(),
  nextCheck: z.string(),
});

function normalizeDraft(draft: z.infer<typeof structuredDraftSchema>): GeneratedAiDraft {
  return {
    suggestedType: draft.suggestedType,
    suggestedTitle: draft.suggestedTitle.trim(),
    structuredSummary: draft.structuredSummary.trim(),
    evidence: draft.evidence.trim(),
    decision: draft.decision.trim(),
    changeContent: draft.changeContent.trim(),
    nextCheck: draft.nextCheck.trim(),
  };
}

function normalizeAssessment(
  result: z.infer<typeof captureAssessmentSchema>,
): CaptureAssessment {
  const suggestedTitle = result.suggestedTitle.trim();
  const structuredSummary = result.structuredSummary.trim();
  const promotableClassification =
    result.classification === "decision_candidate" ||
    result.classification === "direction_change";
  const canPromote = Boolean(
    result.shouldPromote &&
      promotableClassification &&
      result.suggestedType &&
      suggestedTitle &&
      structuredSummary,
  );

  if (!canPromote) {
    const classification = ["note", "observation", "insufficient"].includes(
      result.classification,
    )
      ? result.classification
      : "insufficient";

    return {
      shouldPromote: false,
      classification: classification as CaptureClassification,
      reason: result.reason.trim(),
      draft: null,
    };
  }

  return {
    shouldPromote: true,
    classification: result.classification,
    reason: result.reason.trim(),
    draft: {
      suggestedType: result.suggestedType as ChangeCardType,
      suggestedTitle,
      structuredSummary,
      evidence: result.evidence.trim(),
      decision: result.decision.trim(),
      changeContent: result.changeContent.trim(),
      nextCheck: result.nextCheck.trim(),
    },
  };
}

export async function assessCapture(capture: string): Promise<CaptureAssessment> {
  const { output } = await generateText({
    model: "openai/gpt-5-nano",
    output: Output.object({ schema: captureAssessmentSchema }),
    system: [
      "You assess a Builder's raw project capture for BuildMap, a conservative decision journal.",
      "First decide whether the capture contains a meaningful project decision, direction change, architecture or product trade-off, experiment result, important user feedback, scope change, feature removal, pivot, or other context worth preserving as decision history.",
      "Routine implementation work, cosmetic edits, dependency updates, typos, small bug fixes, status updates, and ordinary progress notes should normally be held rather than promoted unless the capture explicitly contains a meaningful decision or change of direction.",
      "Use shouldPromote=true only for decision_candidate or direction_change.",
      "Use shouldPromote=false for note, observation, or insufficient.",
      "When shouldPromote=false, set suggestedType to null and every structured draft text field to an empty string.",
      "When shouldPromote=true, choose the closest supported Change Card type and structure only what the capture supports.",
      "Never invent facts, metrics, users, evidence, decisions, changes, or next steps that are not supported by the capture.",
      "Preserve the source language of the capture.",
      "If evidence, decision, change content, or next check is not supported, return an empty string for that field.",
      "Keep reason concise and explain only why the capture should or should not be promoted.",
      "This output is only an AI assessment and candidate; the Builder remains the final editor and approver.",
    ].join(" "),
    prompt: capture,
  });

  return normalizeAssessment(output);
}

export async function generateStructuredDraft(
  roughNote: string,
): Promise<GeneratedAiDraft> {
  const { output } = await generateText({
    model: "openai/gpt-5-nano",
    output: Output.object({ schema: structuredDraftSchema }),
    system: [
      "You structure a Builder's rough project note into a conservative BuildMap Change Card draft.",
      "Never invent facts, metrics, users, evidence, decisions, changes, or next steps that are not supported by the note.",
      "Preserve the source language of the rough note.",
      "If evidence, decision, change content, or next check is not supported, return an empty string for that field.",
      "Choose the closest supported Change Card type.",
      "This output is only an AI draft; the Builder remains the final editor and approver.",
    ].join(" "),
    prompt: roughNote,
  });

  return normalizeDraft(output);
}
