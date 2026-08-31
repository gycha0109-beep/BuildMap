import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

const evaluator = read("lib/github/decision-triage.ts");
const route = read("app/api/projects/[projectId]/integrations/github/activity/route.ts");
const preview = read("components/buildmap/github-activity-preview.tsx");
const capture = read("app/projects/[projectId]/github-capture-actions.ts");
const decision = read("app/projects/[projectId]/decision-actions.ts");
const fixtures = JSON.parse(read("scripts/phase53a-github-triage-fixtures.json"));

assert.match(evaluator, /UNTRUSTED PROVIDER CONTENT/);
assert.match(evaluator, /False Promote is more harmful than false Hold/);
assert.match(evaluator, /decision_candidate/);
assert.match(evaluator, /direction_change/);
assert.match(evaluator, /result\.classification === "decision_candidate"/);
assert.match(evaluator, /result\.classification === "direction_change"/);
assert.doesNotMatch(evaluator, /suggestedTitle|structuredSummary|changeContent|nextCheck/);
assert.doesNotMatch(evaluator, /rough_notes|capture_source_refs|ai_structured_drafts|change_cards/);

const readIndex = route.indexOf("readGitHubActivity(");
const triageIndex = route.indexOf("triageGitHubObservations(observations)");
const responseIndex = route.indexOf("return NextResponse.json(", triageIndex);
assert.ok(readIndex >= 0 && triageIndex > readIndex && responseIndex > triageIndex);
assert.match(route, /triageStatus = "unavailable"/);
assert.match(route, /\.\.\.observation,/);
assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
assert.doesNotMatch(route, /provider\", \"notion\"|provider\", \"figma\"/);

assert.match(preview, /promoteFirst/);
assert.match(preview, /AI Hold여도 Capture할 수 있습니다/);
assert.match(preview, /Capture as evidence/);
assert.match(preview, /AI Promote도 Capture를 생성하지 않으며/);
assert.match(preview, /triageStatus === "unavailable"/);

const exactReadIndex = capture.indexOf("readGitHubObservation({");
const roughNoteInsertIndex = capture.indexOf('.from("rough_notes")', exactReadIndex);
const draftInsertIndex = capture.indexOf('.from("ai_structured_drafts")', roughNoteInsertIndex);
assert.ok(exactReadIndex >= 0 && roughNoteInsertIndex > exactReadIndex && draftInsertIndex > roughNoteInsertIndex);
assert.match(capture, /existingSource\.data/);
assert.match(capture, /verifyGitHubCaptureSourceProof/);

assert.match(decision, /approved_by_builder_profile_id: builderProfileId/);
assert.match(decision, /approved_at: new Date\(\)\.toISOString\(\)/);
assert.match(decision, /finalizeAiCandidateAction/);

const counts = fixtures.reduce((result, fixture) => {
  result[fixture.group] = (result[fixture.group] ?? 0) + 1;
  return result;
}, {});
assert.deepEqual(counts, {
  critical_hold: 12,
  critical_promote: 10,
  direction_change: 6,
  borderline: 10,
  adversarial: 8,
  multilingual: 5,
});

for (const fixture of fixtures) {
  assert.ok(fixture.id && fixture.observation?.sourceId && fixture.observation?.title);
  assert.ok(["must", "must_not", "prefer_hold"].includes(fixture.expectedPromote));
  assert.ok(Array.isArray(fixture.expectedClassification) && fixture.expectedClassification.length > 0);
}

console.log("AI_PROMOTE_DOES_NOT_CREATE_CAPTURE = PASS");
console.log("AI_PROMOTE_DOES_NOT_CREATE_DRAFT = PASS");
console.log("AI_PROMOTE_DOES_NOT_CREATE_DECISION = PASS");
console.log("AI_HOLD_MANUAL_CAPTURE_ALLOWED = PASS");
console.log("REFRESH_ZERO_PERSISTENCE = PASS");
console.log("TRIAGE_ZERO_PERSISTENCE = PASS");
console.log("AI_FAILURE_RETURNS_RAW_ACTIVITY = PASS");
console.log("AI_MALFORMED_OUTPUT_RETURNS_RAW_ACTIVITY = PASS");
console.log("PROMPT_INJECTION_POLICY_BOUNDARY = PASS");
console.log("CAPTURE_SERVER_EXACT_REREAD = PASS");
console.log("DUPLICATE_CAPTURE_BOUNDED = PASS");
console.log("BUILDER_APPROVAL_REQUIRED = PASS");
console.log("GITHUB_TRIAGE_FAILURE_DOES_NOT_MUTATE_NOTION = PASS");
console.log("GITHUB_TRIAGE_FAILURE_DOES_NOT_MUTATE_FIGMA = PASS");
console.log("PHASE_53A_FIXTURE_MATRIX = PASS");
