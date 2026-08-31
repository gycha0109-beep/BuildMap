import { NextRequest, NextResponse } from "next/server";
import fixturesJson from "@/scripts/phase53a-github-triage-fixtures.json";
import { triageGitHubObservations } from "@/lib/github/decision-triage";
import type { GitHubActivityObservation } from "@/lib/github/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function requiredSuccess(fixture: Fixture, runs: number) {
  if (fixture.expectedPromote !== "must") return runs;
  if (["critical_promote", "direction_change"].includes(fixture.group) && runs === 5) return 4;
  if (["borderline", "multilingual"].includes(fixture.group) && runs === 3) return 2;
  return runs;
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

  const requestedRuns = Number(request.nextUrl.searchParams.get("runs") ?? "1");
  if (!Number.isInteger(requestedRuns) || requestedRuns < 1 || requestedRuns > 5) {
    return NextResponse.json({ error: "invalid_runs" }, { status: 400 });
  }

  const selected = fixtures.filter((fixture) => fixture.group === group);
  const attempts = await Promise.allSettled(
    Array.from({ length: requestedRuns }, () =>
      triageGitHubObservations(selected.map((fixture) => fixture.observation)),
    ),
  );

  const successfulRuns = attempts.filter(
    (attempt): attempt is PromiseFulfilledResult<Awaited<ReturnType<typeof triageGitHubObservations>>> =>
      attempt.status === "fulfilled",
  );
  const transportFailures = attempts
    .filter((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected")
    .map((attempt) =>
      attempt.reason instanceof Error ? attempt.reason.message : String(attempt.reason),
    );

  const byFixture = new Map(
    selected.map((fixture) => [
      fixture.id,
      {
        fixture,
        results: [] as Array<{
          classification: string;
          shouldPromote: boolean;
          reason: string;
          forbiddenClaims: string[];
          pass: boolean;
        }>,
      },
    ]),
  );

  for (const attempt of successfulRuns) {
    const bySource = new Map(attempt.value.map((result) => [result.sourceId, result]));
    for (const fixture of selected) {
      const result = bySource.get(fixture.observation.sourceId);
      if (!result) continue;
      const forbiddenClaims = fixture.forbiddenClaims.filter((claim) =>
        containsUnsupportedClaim(result.reason, claim),
      );
      const classificationOk = fixture.expectedClassification.includes(result.classification);
      const promoteOk =
        fixture.expectedPromote === "must" ? result.shouldPromote : !result.shouldPromote;
      byFixture.get(fixture.id)?.results.push({
        classification: result.classification,
        shouldPromote: result.shouldPromote,
        reason: result.reason,
        forbiddenClaims,
        pass: classificationOk && promoteOk && forbiddenClaims.length === 0,
      });
    }
  }

  const fixtureResults = [...byFixture.values()].map(({ fixture, results }) => {
    const success = results.filter((result) => result.pass).length;
    const required = requiredSuccess(fixture, requestedRuns);
    return {
      id: fixture.id,
      expectedPromote: fixture.expectedPromote,
      expectedClassification: fixture.expectedClassification,
      success,
      required,
      pass: success >= required && results.length === requestedRuns,
      results,
    };
  });

  const falsePromotes = fixtureResults
    .filter((fixture) => fixture.expectedPromote !== "must")
    .flatMap((fixture) => fixture.results)
    .filter((result) => result.shouldPromote).length;
  const unsupportedClaims = fixtureResults
    .flatMap((fixture) => fixture.results)
    .reduce((count, result) => count + result.forbiddenClaims.length, 0);
  const pass =
    transportFailures.length === 0 &&
    falsePromotes === 0 &&
    unsupportedClaims === 0 &&
    fixtureResults.every((fixture) => fixture.pass);

  return NextResponse.json(
    {
      group,
      requestedRuns,
      successfulRuns: successfulRuns.length,
      transportFailures,
      falsePromotes,
      unsupportedClaims,
      pass,
      fixtures: fixtureResults,
    },
    { status: pass ? 200 : 422, headers: { "Cache-Control": "no-store" } },
  );
}
