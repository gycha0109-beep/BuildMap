import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { composeFreshPrRecheck } from "../lib/execution/em3b-proof-guard.ts";
import { evaluateApprovedRoadmap } from "../lib/execution/deterministic-evaluator.ts";

const evidenceId = "11111111-1111-4111-8111-111111111111";
const sha = "a".repeat(40), other = "b".repeat(40);
const context = {
  evidenceId, repositoryId:"123", sourceId:"pr:42",
  cachedSha:sha, nowIso:"2026-10-30T12:00:00.000Z",
};
const health = {
  sourceId:"pr:42", sourceState:"CURRENT_SOURCE_MATCH",
  checkedAt:"2026-10-30T11:59:01.000Z",
  currentSha:sha, cachedSha:sha,
};
const valid = composeFreshPrRecheck(context,health);
assert.ok(valid);
assert.equal(valid.result,"CURRENT_SOURCE_MATCH");
assert.equal(valid.currentSha,sha);
assert.equal(valid.kind,"GITHUB_PR_MERGE_RECHECK");
assert.deepEqual(composeFreshPrRecheck(context,health),valid);
function denied(c,h) {assert.equal(composeFreshPrRecheck(c,h),null);}
denied(context,{...health,sourceState:"UNKNOWN"});
denied(context,{...health,sourceId:"pr:43"});
denied(context,{...health,currentSha:other});
denied(context,{...health,cachedSha:other});
denied(context,{...health,currentSha:"not-a-sha"});
denied({...context,cachedSha:other},health);
denied({...context,repositoryId:"0"},health);
denied({...context,repositoryId:"wrong"},health);
denied({...context,sourceId:"release:42"},health);
denied({...context,evidenceId:"wrong"},health);
denied(context,{...health,checkedAt:"2026-10-30T11:54:59.000Z"});
denied(context,{...health,checkedAt:"2026-10-30T12:00:01.000Z"});
denied(context,{...health,checkedAt:"not-a-date"});
denied({...context,nowIso:"invalid"},health);

const criterion = {id:"c1",ruleType:"PR_MERGED",isRequired:true};
const revision = {id:"r1",status:"approved",version:1,
  milestones:[{id:"m1",weight:"1.0000",criteria:[criterion]}]};
const association = {criterionId:"c1",evidenceId,
  sourceId:"pr:42",repositoryId:"123",sourceType:"merged_pull_request",
  reviewStatus:"reviewed"};
const evaluate = (proofs)=>evaluateApprovedRoadmap({
  revision,associations:[association],providerRechecks:proofs,nowIso:context.nowIso,
});
assert.equal(evaluate([valid]).status,"CALCULATED");
assert.equal(evaluate([valid]).percent,100);
assert.equal(evaluate([]).percent,0);
assert.equal(evaluate([]).coverage.unknown,1);

const server = readFileSync(new URL("../lib/execution/em3b-authorized-pr-recheck.ts",import.meta.url),"utf8");
for (const gate of [
  'import "server-only";',
  'db.auth.getUser()', 'from("user_profiles")', 'from("builder_profiles")',
  'from("projects")', 'from("completion_criteria")', 'from("roadmap_revisions")',
  'from("criterion_evidence_links")', 'from("project_links")',
  'from("integration_bindings")', 'from("execution_evidence")',
  'from("execution_evidence_observations")',
  'verifyGitHubBindingProof(', 'inspectGitHubExecutionInstallation(',
  'inspectExecutionSourceHealth(', 'composeFreshPrRecheck(',
  'review_status !== "reviewed"', 'status !== "approved"',
  'repositoryIdentity !== "MATCH"', 'source_state !== "SOURCE_CONFIRMED"',
]) assert.ok(server.includes(gate),"missing authority gate: "+gate);
assert.doesNotMatch(server,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
assert.doesNotMatch(server,/NextResponse|export async function (GET|POST)|service_role|console\./);
console.log("EM3B_PROOF_SHAPE_AND_EXACT_SHA = PASS");
console.log("EM3B_STALE_AND_CONFLICTING_SOURCE_UNKNOWN = PASS");
console.log("EM3B_DETERMINISTIC_EVALUATOR_COMPATIBILITY = PASS (synthetic only)");
console.log("EM3B_SERVER_AUTH_AND_BINDING_STATIC_CONTRACT = PASS");
console.log("EM3B_ZERO_MUTATION_NO_SCOPE_EXPANSION = PASS");
