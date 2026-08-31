import { NextRequest, NextResponse } from "next/server";
import fixturesJson from "@/scripts/phase53a-github-triage-fixtures.json";
import { triageGitHubObservations } from "@/lib/github/decision-triage";
import type { GitHubActivityObservation } from "@/lib/github/api";

export const dynamic = "force-dynamic";

const evalToken = "phase53a-eval-8d41f27bcb6c4a19";
const allowedGroups = new Set([
  "critical_hold",
  "critical_promote",
  "direction_change",
  "borderline",
  "adversarial",
  "multilingual",
]);

type Fixture = {
  id: string;
  group: string;
  observation: GitHubActivityObservation;
  expectedPromote: "must" | "must_not" | "prefer_hold";
  expectedClassification: string[];
  forbiddenClaims: string[];
};

const fixtures = fixturesJson as Fixture[];

function containsUnsupportedClaim(reason: string, claim: string) {
  const lowerReason = reason.toLocaleLowerCase();
  const lowerClaim = claim.toLocaleLowerCase();
  const index = lowerReason.indexOf(lowerClaim);
  if (index < 0) return false;

  const prefix = lowerReason.slice(Math.max(0, index - 32), index);
  return !/(?:no|not|without|lacks?|missing|unstated|not stated|no stated)\s+(?:\w+\s+){0,3}$/i.test(prefix);
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (request.nextUrl.searchParams.get("token") !== evalToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const group = request.nextUrl.searchParams.get("group") ?? "";
  if (!allowedGroups.has(group)) {
    return NextResponse.json({ error: "invalid_group" }, { status: 400 });
  }

  const selected = fixtures.filter((fixture) => fixture.group === group);
  try {
    const results = await triageGitHubObservations(selected.map((fixture) => fixture.observation));
    const bySource = new Map(results.map((result) => [result.sourceId, result]));

    return NextResponse.json(
      {
        group,
        results: selected.map((fixture) => {
          const result = bySource.get(fixture.observation.sourceId);
          if (!result) throw new Error(`Missing result for ${fixture.id}`);
          const forbiddenClaims = fixture.forbiddenClaims.filter((claim) =>
            containsUnsupportedClaim(result.reason, claim),
          );
          const classificationOk = fixture.expectedClassification.includes(result.classification);
          const promoteOk =
            fixture.expectedPromote === "must" ? result.shouldPromote : !result.shouldPromote;
          return {
            id: fixture.id,
            expectedPromote: fixture.expectedPromote,
            expectedClassification: fixture.expectedClassification,
            result,
            forbiddenClaims,
            pass: classificationOk && promoteOk && forbiddenClaims.length === 0,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        group,
        error: error instanceof Error ? error.message : "UnknownError",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
