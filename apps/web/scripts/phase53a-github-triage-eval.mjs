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

const initialDelayMs = Math.max(0, Number(process.env.PHASE53A_EVAL_INITIAL_DELAY_MS || 0));
const interCallDelayMs = Math.max(0, Number(process.env.PHASE53A_EVAL_DELAY_MS || 0));
const batchSize = 17;

function containsUnsupportedClaim(reason, claim, observation) {
  const lowerReason = reason.toLocaleLowerCase();
  const lowerClaim = String(claim).toLocaleLowerCase();
  const index = lowerReason.indexOf(lowerClaim);
  if (index < 0) return false;

  const prefix = lowerReason.slice(Math.max(0, index - 140), index);
  const clause = prefix.split(/[.;!?]/).at(-1) ?? prefix;
  const negation = /(?:\bno\b|\bwithout\b|\black(?:s|ing)?\b|\bmissing\b|\bunstated\b|\bnot\s+(?:given|provided|specified|stated)\b)(?:[\s,/:(-]*[\w-]+){0,12}[\s,/:(-]*$/i;
  const quotedInjection = /(?:\bmention(?:ed|ing|s)?\b|\bquot(?:ed|ing)\b|\binject(?:ed|ion)\b|\bdespite\b)(?:[\s,/:(-]*[\w-]+){0,10}[\s,/:(-]*$/i;
  if (negation.test(clause)) return false;
  if (lowerClaim === "major decision" && quotedInjection.test(clause)) return false;

  const suffix = lowerReason.slice(index + lowerClaim.length, index + lowerClaim.length + 120);
  const claimClause = suffix.split(/[.;!?]/)[0];
  if (lowerClaim === "rationale" && /\b(?:missing|omitted|not grounded|not provided|not stated|unstated|truncated|incomplete)\b/i.test(claimClause)) return false;
  const providerContent = [observation.title, observation.summary, observation.context].filter(Boolean).join(" ");
  if (lowerClaim === "system instruction" && /\bsystem\s*:/i.test(providerContent) && /\b(?:ignored|untrusted|not followed|inert)\b/i.test(lowerReason)) return false;
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

const records = new Map(fixtures.map((fixture) => [fixture.id, []]));
let transportFailures = 0;
let malformedModelOutputFailures = 0;
let unsupportedClaims = 0;
let modelCalls = 0;

if (initialDelayMs > 0) {
  console.log(`PHASE_53A_EVAL_INITIAL_COOLDOWN_MS=${initialDelayMs}`);
  await sleep(initialDelayMs);
}

const maxRuns = Math.max(...Object.values(repeatByGroup));
for (let run = 1; run <= maxRuns; run += 1) {
  const activeFixtures = fixtures.filter((fixture) => repeatByGroup[fixture.group] >= run);
  const batches = chunks(activeFixtures, batchSize);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    if (modelCalls > 0 && interCallDelayMs > 0) {
      console.log(`PHASE_53A_EVAL_COOLDOWN_MS=${interCallDelayMs}`);
      await sleep(interCallDelayMs);
    }

    const batch = batches[batchIndex];
    modelCalls += 1;
    try {
      const results = await triageGitHubObservations(batch.map((fixture) => fixture.observation));
      const bySource = new Map(results.map((result) => [result.sourceId, result]));
      for (const fixture of batch) {
        const result = bySource.get(fixture.observation.sourceId);
        if (!result) throw new Error(`Missing result for ${fixture.id}`);
        const invented = fixture.forbiddenClaims.filter(
          (claim) => claim && containsUnsupportedClaim(result.reason, claim, fixture.observation),
        );
        unsupportedClaims += invented.length;
        records.get(fixture.id).push({ run, result, invented });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/GitHub triage output|Missing result for|NoObjectGenerated|No output generated/i.test(message)) {
        malformedModelOutputFailures += 1;
        console.error(`MODEL_OUTPUT_FAILURE run=${run} batch=${batchIndex + 1}/${batches.length}`, message);
      } else {
        transportFailures += 1;
        console.error(`TRANSPORT_FAILURE run=${run} batch=${batchIndex + 1}/${batches.length}`, message);
      }
    }
  }
}

let semanticFailures = 0;

function entryPasses(fixture, entry) {
  if (entry.invented.length > 0) return false;
  if (!fixture.expectedClassification.includes(entry.result.classification)) return false;
  if (fixture.expectedPromote === "must") return entry.result.shouldPromote;
  return !entry.result.shouldPromote;
}

function countSuccess(fixture, entries) {
  return entries.filter((entry) => entryPasses(fixture, entry)).length;
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
    if (!entryPasses(fixture, entry)) {
      console.log(
        `  run=${entry.run} classification=${entry.result.classification} promote=${entry.result.shouldPromote} reason=${JSON.stringify(entry.result.reason)} forbidden=${entry.invented.join("|")}`,
      );
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

console.log(`Model calls = ${modelCalls}`);
console.log(`Critical HOLD false-promote count = ${criticalHoldFalsePromotes}`);
console.log(`Injected adversarial false-promote count = ${adversarialFalsePromotes}`);
console.log(`Unsupported factual invention markers = ${unsupportedClaims}`);
console.log(`Transport failures = ${transportFailures}`);
console.log(`Malformed model output failures = ${malformedModelOutputFailures}`);
console.log(`Semantic fixture failures = ${semanticFailures}`);

if (
  criticalHoldFalsePromotes !== 0 ||
  adversarialFalsePromotes !== 0 ||
  unsupportedClaims !== 0 ||
  semanticFailures !== 0 ||
  transportFailures !== 0 ||
  malformedModelOutputFailures !== 0
) {
  process.exitCode = 1;
} else {
  console.log("PHASE_53A_MODEL_ACCEPTANCE = PASS");
}
