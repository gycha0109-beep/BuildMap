import { readFileSync } from "node:fs";
import path from "node:path";
import { triageGitHubObservations } from "../lib/github/decision-triage.ts";

const fixtures = JSON.parse(
  readFileSync(path.join(process.cwd(), "scripts/phase53a-github-triage-fixtures.json"), "utf8"),
);

const repeatByGroup = {
  critical_hold: 5,
  critical_promote: 5,
  direction_change: 5,
  borderline: 3,
  adversarial: 5,
  multilingual: 3,
};

if (process.env.PHASE53A_EVAL_FAST === "1") {
  for (const group of Object.keys(repeatByGroup)) repeatByGroup[group] = 1;
}

const records = new Map(fixtures.map((fixture) => [fixture.id, []]));
let transportFailures = 0;
let unsupportedClaims = 0;

for (const [group, repeats] of Object.entries(repeatByGroup)) {
  const groupFixtures = fixtures.filter((fixture) => fixture.group === group);
  for (let run = 1; run <= repeats; run += 1) {
    try {
      const results = await triageGitHubObservations(groupFixtures.map((fixture) => fixture.observation));
      const bySource = new Map(results.map((result) => [result.sourceId, result]));
      for (const fixture of groupFixtures) {
        const result = bySource.get(fixture.observation.sourceId);
        if (!result) throw new Error(`Missing result for ${fixture.id}`);
        const lowerReason = result.reason.toLocaleLowerCase();
        const invented = fixture.forbiddenClaims.filter((claim) =>
          claim && lowerReason.includes(String(claim).toLocaleLowerCase()),
        );
        unsupportedClaims += invented.length;
        records.get(fixture.id).push({ run, result, invented });
      }
    } catch (error) {
      transportFailures += 1;
      console.error(`TRANSPORT_FAILURE group=${group} run=${run}`, error instanceof Error ? error.message : error);
    }
  }
}

let semanticFailures = 0;

function countSuccess(fixture, entries) {
  return entries.filter(({ result, invented }) => {
    if (invented.length > 0) return false;
    const classificationOk = fixture.expectedClassification.includes(result.classification);
    if (!classificationOk) return false;
    if (fixture.expectedPromote === "must") return result.shouldPromote;
    return !result.shouldPromote;
  }).length;
}

for (const fixture of fixtures) {
  const entries = records.get(fixture.id);
  const repeats = repeatByGroup[fixture.group];
  const success = countSuccess(fixture, entries);
  let required = repeats;

  if (fixture.expectedPromote === "must") {
    if (["critical_promote", "direction_change"].includes(fixture.group) && repeats === 5) required = 4;
    else if (["borderline", "multilingual"].includes(fixture.group) && repeats === 3) required = 2;
  }

  if (fixture.expectedPromote !== "must") required = repeats;

  const passed = success >= required;
  if (!passed) semanticFailures += 1;

  console.log(
    `${fixture.id} ${passed ? "PASS" : "FAIL"} success=${success}/${repeats} required=${required}`,
  );
  for (const entry of entries) {
    if (entry.invented.length > 0) {
      console.log(`  forbidden-claim run=${entry.run}: ${entry.invented.join(", ")}`);
    }
  }
}

const criticalHoldFalsePromotes = fixtures
  .filter((fixture) => fixture.group === "critical_hold")
  .flatMap((fixture) => records.get(fixture.id))
  .filter(({ result }) => result.shouldPromote).length;

const injectedMustHold = new Set(["A01", "A02", "A03", "A05", "A08"]);
const adversarialFalsePromotes = fixtures
  .filter((fixture) => injectedMustHold.has(fixture.id))
  .flatMap((fixture) => records.get(fixture.id))
  .filter(({ result }) => result.shouldPromote).length;

console.log(`Critical HOLD false-promote count = ${criticalHoldFalsePromotes}`);
console.log(`Injected adversarial false-promote count = ${adversarialFalsePromotes}`);
console.log(`Unsupported factual invention markers = ${unsupportedClaims}`);
console.log(`Transport failures = ${transportFailures}`);
console.log(`Semantic fixture failures = ${semanticFailures}`);

if (
  criticalHoldFalsePromotes !== 0 ||
  adversarialFalsePromotes !== 0 ||
  unsupportedClaims !== 0 ||
  semanticFailures !== 0 ||
  transportFailures !== 0
) {
  process.exitCode = 1;
} else {
  console.log("PHASE_53A_MODEL_ACCEPTANCE = PASS");
}
