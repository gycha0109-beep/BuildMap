import { generateStructuredDraft } from "@/lib/buildmap/ai-draft";

export const dynamic = "force-dynamic";

function safeFailure(error: unknown) {
  const errorObject =
    error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const causeObject =
    errorObject?.cause && typeof errorObject.cause === "object"
      ? (errorObject.cause as Record<string, unknown>)
      : null;

  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    statusCode:
      typeof errorObject?.statusCode === "number"
        ? errorObject.statusCode
        : typeof causeObject?.statusCode === "number"
          ? causeObject.statusCode
          : null,
    code:
      typeof errorObject?.code === "string"
        ? errorObject.code
        : typeof causeObject?.code === "string"
          ? causeObject.code
          : null,
  };
}

export async function GET() {
  try {
    const draft = await generateStructuredDraft(
      "A staging diagnostic found that a project action failed, then the implementation was corrected and verified.",
    );
    return Response.json({ ok: true, suggestedType: draft.suggestedType });
  } catch (error) {
    return Response.json({ ok: false, error: safeFailure(error) }, { status: 502 });
  }
}
