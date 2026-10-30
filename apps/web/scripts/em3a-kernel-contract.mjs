import assert from "node:assert/strict";
import { EM3A_RULE_VERSION, evaluateCriterion, evaluateRoadmapProgress } from "../lib/execution/em3a-evaluator.ts";

const NOW = "2026-10-30T02:00:00.000Z";
const VERIFIED_AT = "2026-10-30T01:00:00.000Z";
const EXPIRY = "2026-10-30T03:00:00.000Z";
const SHA = "a".repeat(40);
const WRONG_SHA = "b".repeat(40);
const PROJECT = "builder-project";
const REVISION = "approved-r1";

const pr = { id: "c-pr", projectId: PROJECT, revisionId: REVISION, required: true, rule: "PR_MERGED", repositoryId: "123", prNumber: 81, expectedMergeSha: SHA };
const check = { id: "c-check", projectId: PROJECT, revisionId: REVISION, required: true, rule: "CHECK_PASSED", repositoryId: "123", relevantSha: SHA, requiredChecks: ["Lint", "Security"] };
const artifact = { id: "c-artifact", projectId: PROJECT, revisionId: REVISION, required: true, rule: "ARTIFACT_EXISTS", repositoryId: "123", artifactName: "build.tgz", artifactVersion: "v2" };
const deploy = { id: "c-deploy", projectId: PROJECT, revisionId: REVISION, required: true, rule: "DEPLOY_VERIFIED", repositoryId: "123", environment: "production", deployedSha: SHA };
const manual = { id: "c-manual", projectId: PROJECT, revisionId: REVISION, required: true, rule: "MANUAL_ACCEPTANCE", authorizedBuilderProfileId: "builder-1" };

function evidence(criterion, fact, overrides = {}) {
  return {
    projectId: criterion.projectId,
    revisionId: criterion.revisionId,
    criterionId: criterion.id,
    origin: criterion.rule === "MANUAL_ACCEPTANCE" ? "BUILDER_APPROVAL_READ" : "PROVIDER_EXACT_REREAD",
    status: "VERIFIED", verifiedAt: VERIFIED_AT, expiresAt: EXPIRY,
    repositoryId: "123", sourceSha: SHA, fact, ...overrides,
  };
}
const prFact = { rule: "PR_MERGED", prNumber: 81, merged: true, closed: true, mergeSha: SHA };
const checksFact = { rule: "CHECK_PASSED", relevantSha: SHA, checks: [{ name: "Lint", sha: SHA, conclusion: "success" }, { name: "Security", sha: SHA, conclusion: "success" }] };
const artifactFact = { rule: "ARTIFACT_EXISTS", artifactName: "build.tgz", version: "v2", exists: true };
const deployFact = { rule: "DEPLOY_VERIFIED", environment: "production", deployedSha: SHA, state: "READY" };
const manualFact = { rule: "MANUAL_ACCEPTANCE", builderProfileId: "builder-1", accepted: true, approvedAt: VERIFIED_AT, reason: "Accepted verified user journey" };
const all = [[pr, prFact], [check, checksFact], [artifact, artifactFact], [deploy, deployFact], [manual, manualFact]];
const expected = (criterion, fact, state, overrides = {}) => {
  assert.equal(evaluateCriterion(criterion, evidence(criterion, fact, overrides), NOW).state, state, `${criterion.id}: expected ${state}`);
};

for (const [criterion, fact] of all) {
  expected(criterion, fact, "PASS");
  assert.equal(evaluateCriterion(criterion, evidence(criterion, fact), NOW).ruleVersion, EM3A_RULE_VERSION);
  assert.equal(evaluateCriterion(criterion, null, NOW).state, "UNKNOWN");
  expected(criterion, fact, "UNKNOWN", { status: "UNKNOWN" });
  expected(criterion, fact, "PENDING", { status: "PENDING" });
  expected(criterion, fact, "UNKNOWN", { projectId: "other-project" });
  expected(criterion, fact, "UNKNOWN", { revisionId: "other-revision" });
  expected(criterion, fact, "UNKNOWN", { criterionId: "other-criterion" });
  expected(criterion, fact, "UNKNOWN", { verifiedAt: "2026-10-31T01:00:00.000Z" });
  expected(criterion, fact, "UNKNOWN", { expiresAt: "2026-10-29T01:00:00.000Z" });
  expected(criterion, fact, "UNKNOWN", { verifiedAt: null });
  expected(criterion, fact, "UNKNOWN", { fact: null });
  expected(criterion, fact, "UNKNOWN", { origin: criterion.rule === "MANUAL_ACCEPTANCE" ? "PROVIDER_EXACT_REREAD" : "BUILDER_APPROVAL_READ" });
  expected(criterion, fact, "UNKNOWN", { fact: { ...fact, rule: "WRONG_RULE" } });
  if (criterion.rule !== "MANUAL_ACCEPTANCE") expected(criterion, fact, "UNKNOWN", { repositoryId: "wrong-repository" });
}

expected(pr, { ...prFact, merged: "true" }, "UNKNOWN");
expected(pr, { ...prFact, closed: "false" }, "UNKNOWN");
expected(pr, { ...prFact, merged: true, closed: false }, "UNKNOWN");
expected(pr, { ...prFact, merged: false, closed: false, mergeSha: null }, "PENDING");
expected(pr, { ...prFact, merged: false, closed: true, mergeSha: null }, "FAIL");
expected(pr, { ...prFact, mergeSha: WRONG_SHA }, "UNKNOWN");
expected(pr, { ...prFact, mergeSha: null }, "UNKNOWN");
assert.equal(evaluateCriterion({ ...pr, expectedMergeSha: WRONG_SHA }, evidence(pr, prFact), NOW).state, "FAIL");
expected(pr, { ...prFact, prNumber: 82 }, "UNKNOWN");

expected(check, { ...checksFact, checks: null }, "UNKNOWN");
assert.equal(evaluateCriterion({ ...check, requiredChecks: null }, evidence(check, checksFact), NOW).state, "UNKNOWN");
expected(check, { ...checksFact, relevantSha: WRONG_SHA }, "UNKNOWN");
expected(check, { ...checksFact, checks: [checksFact.checks[0]] }, "UNKNOWN");
expected(check, { ...checksFact, checks: [checksFact.checks[0], checksFact.checks[0]] }, "UNKNOWN");
expected(check, { ...checksFact, checks: [{ ...checksFact.checks[0], sha: WRONG_SHA }, checksFact.checks[1]] }, "UNKNOWN");
expected(check, { ...checksFact, checks: [{ ...checksFact.checks[0], conclusion: "failure" }, checksFact.checks[1]] }, "FAIL");
expected(check, { ...checksFact, checks: [{ ...checksFact.checks[0], conclusion: "pending" }, checksFact.checks[1]] }, "PENDING");
expected(check, { ...checksFact, checks: [{ ...checksFact.checks[0], conclusion: "unknown" }, checksFact.checks[1]] }, "UNKNOWN");
assert.equal(evaluateCriterion({ ...check, requiredChecks: [] }, evidence(check, checksFact), NOW).state, "UNKNOWN");

expected(artifact, { ...artifactFact, exists: "false" }, "UNKNOWN");
expected(artifact, { ...artifactFact, exists: 0 }, "UNKNOWN");
expected(artifact, { ...artifactFact, exists: false }, "FAIL");
expected(artifact, { ...artifactFact, version: "v1" }, "FAIL");
expected(artifact, { ...artifactFact, artifactName: "other.tgz" }, "UNKNOWN");
expected(deploy, { ...deployFact, deployedSha: WRONG_SHA }, "UNKNOWN");
expected(deploy, { ...deployFact, environment: "staging" }, "FAIL");
expected(deploy, { ...deployFact, state: "ERROR" }, "FAIL");
expected(deploy, { ...deployFact, state: "BUILDING" }, "PENDING");
expected(deploy, { ...deployFact, state: "QUEUED" }, "PENDING");
expected(manual, { ...manualFact, builderProfileId: "other" }, "UNKNOWN");
expected(manual, { ...manualFact, approvedAt: null }, "UNKNOWN");
expected(manual, { ...manualFact, reason: null }, "UNKNOWN");
expected(manual, { ...manualFact, accepted: "true" }, "UNKNOWN");
expected(manual, { ...manualFact, accepted: "false" }, "UNKNOWN");
expected(manual, { ...manualFact, accepted: false, approvedAt: null }, "UNKNOWN");
expected(manual, { ...manualFact, accepted: false, reason: null }, "UNKNOWN");
expected(manual, { ...manualFact, accepted: null }, "PENDING");
expected(manual, { ...manualFact, accepted: false }, "FAIL");

const revision = {
  id: REVISION, projectId: PROJECT, state: "APPROVED", milestones: [
    { id: "milestone-1", weight: 1, criteria: [pr, check] },
    { id: "milestone-2", weight: 3, criteria: [artifact, { ...manual, required: false }] },
    { id: "milestone-3", weight: 4, criteria: [deploy] },
  ],
};
const attestations = all.map(([criterion, fact]) => evidence(criterion, fact));
const before = JSON.stringify({ revision, attestations });
let out = evaluateRoadmapProgress(revision, attestations, NOW);
assert.equal(out.status, "CALCULABLE");
assert.equal(out.percentage, 100);
assert.equal(out.totalWeight, 8);
assert.equal(out.passedCriteria, 4);
assert.equal(out.requiredCriteria, 4);
assert.equal(out.completedMilestones, 3);
assert.equal(out.evaluations.length, 5);
assert.deepEqual(evaluateRoadmapProgress(revision, attestations, NOW), out);
assert.equal(JSON.stringify({ revision, attestations }), before, "Evaluator must not mutate source input");

const partial = attestations.filter((x) => x.criterionId !== check.id);
out = evaluateRoadmapProgress(revision, partial, NOW);
assert.equal(out.percentage, 87.5, "Unknown evidence cannot remove milestone weight from denominator");
assert.equal(out.unknownCriteria, 1);
assert.equal(out.completedMilestones, 2);
const failed = attestations.map((item) => item.criterionId === check.id ? { ...item, fact: { ...checksFact, checks: [{ ...checksFact.checks[0], conclusion: "failure" }, checksFact.checks[1]] } } : item);
assert.equal(evaluateRoadmapProgress(revision, failed, NOW).percentage, 87.5);
const pending = attestations.map((item) => item.criterionId === check.id ? { ...item, status: "PENDING" } : item);
assert.equal(evaluateRoadmapProgress(revision, pending, NOW).pendingCriteria, 1);
const stale = attestations.map((item) => item.criterionId === check.id ? { ...item, expiresAt: "2026-10-29T01:00:00.000Z" } : item);
assert.equal(evaluateRoadmapProgress(revision, stale, NOW).unknownCriteria, 1);
const duplicated = [...attestations, attestations[0]];
assert.equal(evaluateRoadmapProgress(revision, duplicated, NOW).unknownCriteria, 1);
assert.equal(evaluateRoadmapProgress(revision, duplicated, NOW).percentage, 87.5);

const revision2 = { ...revision, id: "approved-r2", milestones: revision.milestones.map((m) => ({ ...m, criteria: m.criteria.map((c) => ({ ...c, revisionId: "approved-r2" })) })) };
const historical = evaluateRoadmapProgress(revision, attestations, NOW);
assert.equal(historical.percentage, 100);
assert.equal(evaluateRoadmapProgress(revision2, attestations, NOW).percentage, 0, "Old revision attestations must not satisfy new revision");
assert.equal(evaluateRoadmapProgress(revision2, attestations, NOW).unknownCriteria, 4);
assert.equal(evaluateRoadmapProgress({ ...revision, state: "DRAFT" }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [] }, attestations, NOW).percentage, null);
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: null }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], criteria: null }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], criteria: [{ ...pr, required: "false" }] }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], weight: 0 }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], weight: NaN }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], criteria: [{ ...manual, required: false }] }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [...revision.milestones, revision.milestones[0]] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], criteria: [pr, pr] }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress({ ...revision, milestones: [{ ...revision.milestones[0], criteria: [{ ...pr, projectId: "other" }] }] }, attestations, NOW).status, "NOT_CALCULABLE");
assert.equal(evaluateRoadmapProgress(revision, attestations, "invalid-date").status, "NOT_CALCULABLE");

// Provider observation/cache shape MUST NOT impersonate an exact-source attestation.
const browserOnlyObservation = { projectId: PROJECT, revisionId: REVISION, criterionId: pr.id, sourceState: "SOURCE_CONFIRMED", sourceSha: SHA, fact: prFact };
assert.equal(evaluateCriterion(pr, browserOnlyObservation, NOW).state, "UNKNOWN");
assert.equal(evaluateRoadmapProgress(revision, [browserOnlyObservation], NOW).percentage, 0);
assert.equal(evaluateRoadmapProgress(revision, [browserOnlyObservation], NOW).unknownCriteria, 4);

console.log("EM3A_DETERMINISTIC_CRITERION_RULES = PASS");
console.log("EM3A_EXACT_SHA_AND_REPOSITORY_BINDING = PASS");
console.log("EM3A_STALE_UNKNOWN_AND_SOURCE_PREVIEW_ISOLATION = PASS");
console.log("EM3A_BUILDER_MANUAL_AUTHORITY = PASS");
console.log("EM3A_REVISION_FROZEN_DENOMINATOR = PASS");
console.log("EM3A_REPEATED_EVALUATION_STABLE = PASS");
console.log("EM3A_NO_DB_OR_PROVIDER_MUTATION = PASS");
console.log("EM3A_UNTYPED_PROVIDER_INPUTS_FAIL_CLOSED = PASS");
