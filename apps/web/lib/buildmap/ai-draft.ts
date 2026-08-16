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

type GatewayOutputItem = {
  type?: unknown;
  content?: unknown;
};

type GatewayContentItem = {
  type?: unknown;
  text?: unknown;
};

function isChangeCardType(value: unknown): value is ChangeCardType {
  return typeof value === "string" && changeCardTypes.includes(value as ChangeCardType);
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`AI_DRAFT_INVALID_${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStructuredDraft(value: unknown): GeneratedAiDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI_DRAFT_INVALID_OBJECT");
  }

  const data = value as Record<string, unknown>;
  if (!isChangeCardType(data.suggestedType)) {
    throw new Error("AI_DRAFT_INVALID_TYPE");
  }

  return {
    suggestedType: data.suggestedType,
    suggestedTitle: requiredString(data.suggestedTitle, "TITLE"),
    structuredSummary: requiredString(data.structuredSummary, "SUMMARY"),
    evidence: optionalString(data.evidence),
    decision: optionalString(data.decision),
    changeContent: optionalString(data.changeContent),
    nextCheck: optionalString(data.nextCheck),
  };
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as { output_text?: unknown; output?: unknown };
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return null;
  }

  for (const rawItem of data.output as GatewayOutputItem[]) {
    if (rawItem.type !== "message" || !Array.isArray(rawItem.content)) {
      continue;
    }
    for (const rawContent of rawItem.content as GatewayContentItem[]) {
      if (typeof rawContent.text === "string" && rawContent.text.trim()) {
        return rawContent.text.trim();
      }
    }
  }

  return null;
}

export async function generateStructuredDraft(roughNote: string): Promise<GeneratedAiDraft> {
  const token = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    throw new Error("AI_GATEWAY_AUTH_UNAVAILABLE");
  }

  const response = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-luna",
      input: [
        {
          type: "message",
          role: "system",
          content: [
            "You structure a Builder's rough project note into a conservative BuildMap Change Card draft.",
            "Never invent facts, metrics, users, evidence, decisions, changes, or next steps that are not supported by the note.",
            "Preserve the source language of the rough note.",
            "If evidence, decision, change content, or next check is not supported, return an empty string for that field.",
            "Choose the closest supported Change Card type. This output is only an AI draft; the Builder remains the final editor and approver.",
          ].join(" "),
        },
        {
          type: "message",
          role: "user",
          content: roughNote,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "buildmap_change_card_draft",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestedType: { type: "string", enum: changeCardTypes },
              suggestedTitle: { type: "string" },
              structuredSummary: { type: "string" },
              evidence: { type: "string" },
              decision: { type: "string" },
              changeContent: { type: "string" },
              nextCheck: { type: "string" },
            },
            required: [
              "suggestedType",
              "suggestedTitle",
              "structuredSummary",
              "evidence",
              "decision",
              "changeContent",
              "nextCheck",
            ],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 1600,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`AI_GATEWAY_HTTP_${response.status}`);
  }

  const text = outputText(await response.json());
  if (!text) {
    throw new Error("AI_GATEWAY_EMPTY_OUTPUT");
  }

  return parseStructuredDraft(JSON.parse(text));
}
