import { generateObject } from "ai";
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

export type ChangeCardType = (typeof changeCardTypes)[number];

export type GeneratedAiDraft = {
  suggestedType: ChangeCardType;
  suggestedTitle: string;
  structuredSummary: string;
  evidence: string;
  decision: string;
  changeContent: string;
  nextCheck: string;
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

export async function generateStructuredDraft(
  roughNote: string,
): Promise<GeneratedAiDraft> {
  const { object } = await generateObject({
    model: "openai/gpt-5-mini",
    schema: structuredDraftSchema,
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

  return normalizeDraft(object);
}
