import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeEvidenceLinkage } from "../lib/execution/em4b-evidence-coverage.ts";

const milestones = [
  { id: "m1", title: "Runtime", weight: "2.0000" },
  { id: "m2", title: "Release", weight: "1.0000" },
];
const criteria = [
  { id: "c1", milestone_id: "m1", title: "PR", rule_type: "PR_MERGED", is_required: true },
  { id: "c2", milestone_id: "m1", title: "Checks", rule_type: "CHECK_PASSED", is_required: true },
  { id: "c3", milestone_id: "m2", title: "Deploy", rule_type: "DEPLOY_VERIFIED", is_required: true },
];
const links = [
  { id: "l1", criterion_id: "c1", review_status: "reviewed" },
  { id: "l2", criterion_id: "c1", review_status: "proposed" },
  { id: "l3", criterion_id: "c2", review_status: "rejected" },
];
const base = { completeRead: true, milestones, criteria, links };
const a = summarizeEvidenceLinkage(base);
assert.deepEqual([a.completeness,a.criterionCount,a.unknownCount,a.reviewedLinkCriterionCount,a.unreviewedCriterionCount],
  ["COMPLETE",3,3,1,2]);
assert.deepEqual(a.rows.map(row=>row.linkage),["REVIEWED_LINK_ONLY","REJECTED_ONLY","NO_LINK"]);
assert.deepEqual(a.rows.map(row=>row.completion),["UNKNOWN","UNKNOWN","UNKNOWN"]);
assert.deepEqual(summarizeEvidenceLinkage(base),a,"same revision/link data must be deterministic");
const incomplete=(i)=> {
  const r=summarizeEvidenceLinkage(i);
  assert.equal(r.completeness,"INCOMPLETE");
  assert.equal(r.criterionCount,null);
  assert.equal(r.unknownCount,null);
  assert.equal(r.reviewedLinkCriterionCount,null);
  assert.equal(r.unreviewedCriterionCount,null);
  assert.deepEqual(r.rows,[]);
};
incomplete({ ...base, completeRead:false });
incomplete({ ...base, criteria:[] });
incomplete({ ...base, milestones:[] });
incomplete({ ...base, criteria:[...criteria,criteria[0]] });
incomplete({ ...base, milestones:[...milestones,milestones[0]] });
incomplete({ ...base, links:[...links,links[0]] });
incomplete({ ...base, links:[...links,{id:"l4",criterion_id:"different",review_status:"reviewed"}] });
incomplete({ ...base, links:[...links,{id:"l4",criterion_id:"c2",review_status:"VERIFIED"}] });
incomplete({ ...base, criteria:[{...criteria[0],milestone_id:"outside"}] });
incomplete({ ...base, criteria:[{...criteria[0],is_required:"false"}] });
incomplete({ ...base, milestones:[{...milestones[0],weight:"NaN"}] });
const awaiting=summarizeEvidenceLinkage({...base,links:[links[1]]});
assert.equal(awaiting.rows[0].linkage,"AWAITING_REVIEW");
assert.equal(awaiting.rows[0].completion,"UNKNOWN");

const route=readFileSync(new URL("../app/projects/[projectId]/execution/coverage/[revisionId]/page.tsx",import.meta.url),"utf8");
const overview=readFileSync(new URL("../app/projects/[projectId]/execution/page.tsx",import.meta.url),"utf8");
const expectedUuid = 'const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;';
assert.ok(route.includes(expectedUuid),"36-character UUID path guard must have exactly three 4-digit groups");
for(const gate of [
  "db.auth.getUser()","owner_builder_profile_id",
  'from("user_profiles")','from("builder_profiles")','from("projects")',
  'from("roadmap_revisions")','from("execution_tracks")',
  'from("execution_milestones")','from("completion_criteria")',
  'from("criterion_evidence_links")',
  '.eq("status", "approved")',
  '.eq("project_id", projectId)',
  'is("archived_at", null)',
  "MAX_MILESTONES + 1","MAX_CRITERIA + 1","MAX_LINKS + 1",
  "summarizeEvidenceLinkage({",
  'coverage.completeness !== "COMPLETE"',
  "완료 평가: UNKNOWN","공식 진행률: 미공개",
]) assert.ok(route.includes(gate),"Missing private read/UNKNOWN/limit gate: "+gate);
assert.match(overview,/execution\/coverage\/" \+ revision\.id/);
assert.doesNotMatch(route,/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(|service_role|SERVICE_ROLE/);
assert.doesNotMatch(route,/evaluateApprovedRoadmap\(|readAuthorizedExecutionPrRecheck\(|createInstallationAccessToken/);
assert.doesNotMatch(route,/공식 진행률: \d|완료 판정: PASS/);
console.log("EM4B_REVISION_LINKAGE_COUNTS_AND_UNKNOWN = PASS");
console.log("EM4B_INCOMPLETE_TRUNCATED_OR_INVALID_INPUT_NO_FALSE_COUNTS = PASS");
console.log("EM4B_OWNER_APPROVED_REVISION_READ_ONLY = PASS");
console.log("EM4B_NO_UNVERIFIED_COMPLETION_OR_PROVIDER_REQUEST = PASS");
