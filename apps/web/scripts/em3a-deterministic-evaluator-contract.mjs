import assert from "node:assert/strict";
import { evaluateApprovedRoadmap } from "../lib/execution/deterministic-evaluator.ts";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const clock="2026-10-30T03:00:00.000Z", sha="a".repeat(40), wrong="b".repeat(40);
const p1={id:"c1",ruleType:"PR_MERGED",isRequired:true};
const p2={id:"c2",ruleType:"PR_MERGED",isRequired:true};
const optional={id:"c-optional",ruleType:"CHECK_PASSED",isRequired:false};
const revision={
  id:"rev-1",version:1,status:"approved",
  milestones:[
    {id:"m1",weight:"1.0000",criteria:[p1,optional]},
    {id:"m2",weight:"3.0000",criteria:[p2]},
  ],
};
const link1={criterionId:"c1",evidenceId:"e1",sourceId:"pr:42",
  sourceType:"merged_pull_request",repositoryId:"100",reviewStatus:"reviewed"};
const link2={criterionId:"c2",evidenceId:"e2",sourceId:"pr:43",
  sourceType:"merged_pull_request",repositoryId:"100",reviewStatus:"reviewed"};
const proof1={kind:"GITHUB_PR_MERGE_RECHECK",evidenceId:"e1",sourceId:"pr:42",
  repositoryId:"100",checkedAt:"2026-10-30T02:59:00.000Z",
  currentSha:sha,cachedSha:sha,result:"CURRENT_SOURCE_MATCH"};
const proof2={...proof1,evidenceId:"e2",sourceId:"pr:43"};

function run(patch={}){
  return evaluateApprovedRoadmap({
    revision,associations:[link1,link2],
    providerRechecks:[proof1],nowIso:clock,...patch,
  });
}
let result=run();
assert.equal(result.status,"CALCULATED");
assert.equal(result.percent,25);
assert.equal(result.basisPoints,2500);
assert.equal(result.totalWeightUnits,40000);
assert.equal(result.completedWeightUnits,10000);
assert.equal(result.milestones[0].verdict,"PASS");
assert.equal(result.milestones[1].verdict,"UNKNOWN");
assert.equal(result.milestones[0].criteria[0].verdict,"PASS");
assert.equal(result.milestones[0].criteria[0].supportingEvidenceId,"e1");
assert.equal(result.milestones[0].criteria[1].verdict,"UNKNOWN");
assert.equal(result.coverage.required,2);
assert.equal(result.coverage.pass,1);
assert.equal(result.coverage.unknown,1);
assert.deepEqual(run(),run(),"same approved revision+time+proofs must be deterministic");
assert.equal(result.policyVersion,"EM3A_V1");

result=run({providerRechecks:[proof1,proof2]});
assert.equal(result.percent,100);
assert.equal(result.completedWeightUnits,result.totalWeightUnits);
assert.equal(result.coverage.pass,2);
assert.equal(run({providerRechecks:[]}).percent,0,
  "unverified owner-writable cache must never create progress");
assert.equal(run({providerRechecks:[]}).coverage.unknown,2);

const stale=run({providerRechecks:[{...proof1,checkedAt:"2026-10-30T02:53:00Z"}]});
assert.equal(stale.milestones[0].criteria[0].verdict,"UNKNOWN");
assert.equal(stale.percent,0);
const future=run({providerRechecks:[{...proof1,checkedAt:"2026-10-30T03:00:01Z"}]});
assert.equal(future.percent,0);
for(const update of [
  {currentSha:wrong}, {cachedSha:wrong}, {result:"UNKNOWN"},
  {repositoryId:"200"}, {sourceId:"pr:999"}, {evidenceId:"other"},
  {checkedAt:"garbage"}, {currentSha:"not-a-sha"},
]){
  const v=run({providerRechecks:[{...proof1,...update}]});
  assert.equal(v.percent,0,"wrong/stale/forged source must not pass: "+JSON.stringify(update));
}
const unreviewed=run({associations:[{...link1,reviewStatus:"proposed"},link2]});
assert.equal(unreviewed.milestones[0].criteria[0].verdict,"PENDING");
assert.equal(unreviewed.coverage.pending,1);
const missingLink=run({associations:[link2]});
assert.equal(missingLink.milestones[0].criteria[0].reason,"source_association_missing");
assert.equal(missingLink.coverage.pending,1);
const releaseLink=run({associations:[{...link1,sourceType:"release"},link2]});
assert.equal(releaseLink.milestones[0].criteria[0].verdict,"UNKNOWN");

const pinned={...revision,milestones:[
  {...revision.milestones[0],criteria:[{...p1,ruleConfig:{expectedSha:sha}}]},
  revision.milestones[1]
]};
assert.equal(run({revision:pinned}).percent,25);
const badPin={...pinned,milestones:[
  {...pinned.milestones[0],criteria:[{...p1,ruleConfig:{expectedSha:wrong}}]},
  pinned.milestones[1],
]};
assert.equal(run({revision:badPin}).percent,0);
const invalidPin={...pinned,milestones:[
  {...pinned.milestones[0],criteria:[{...p1,ruleConfig:{expectedSha:"bad"}}]},
  pinned.milestones[1],
]};
assert.equal(run({revision:invalidPin}).percent,0);

for(const unsupported of ["CHECK_PASSED","ARTIFACT_EXISTS","DEPLOY_VERIFIED","MANUAL_ACCEPTANCE"]){
  const unsupportedRevision={...revision,milestones:[
    {id:"unsupported",weight:1,criteria:[{id:"unsupported-criterion",ruleType:unsupported,isRequired:true}]}
  ]};
  const v=run({revision:unsupportedRevision,associations:[{
    ...link1,criterionId:"unsupported-criterion"
  }]});
  assert.equal(v.status,"CALCULATED");
  assert.equal(v.percent,0);
  assert.equal(v.coverage.unknown,1);
  assert.equal(v.milestones[0].criteria[0].verdict,"UNKNOWN");
}

const invalid=(rev,expected)=>{
  const v=run({revision:rev});
  assert.equal(v.status,"NOT_CALCULABLE");
  assert.equal(v.reason,expected);
};
invalid({...revision,status:"draft"},"revision_not_approved_or_invalid_version");
invalid({...revision,version:0},"revision_not_approved_or_invalid_version");
invalid({...revision,milestones:[]},"approved_revision_has_no_active_milestones");
invalid({...revision,milestones:[{...revision.milestones[0],archived:true}].filter(x=>x.archived)},
  "approved_revision_has_no_active_milestones");
invalid({...revision,milestones:[{...revision.milestones[0],id:"x"},{...revision.milestones[0],id:"x"}]},
  "duplicate_milestone_identity");
for(const weight of ["",0,-1,1.00001,100000.0001,Number.NaN]){
  invalid({...revision,milestones:[{...revision.milestones[0],weight}]},
    "missing_or_invalid_explicit_milestone_weight");
}
invalid({...revision,milestones:[{id:"x",weight:1,criteria:[
  {id:"optional",ruleType:"PR_MERGED",isRequired:false}
]}]},"milestone_missing_required_criterion");
invalid({...revision,milestones:[{...revision.milestones[0],criteria:[
  {...p1}, {...p1}
]}]},"duplicate_criterion_identity");

const mostlyComplete={...revision,milestones:[
  {id:"huge",weight:"9999.9999",criteria:[p1]},
  {id:"tiny",weight:"0.0001",criteria:[p2]}
]};
const notRoundedUp=run({revision:mostlyComplete});
assert.equal(notRoundedUp.percent,99.99,"incomplete revision must never round to 100%");
assert.equal(run({nowIso:"not-a-clock"}).status,"NOT_CALCULABLE");

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const core=readFileSync(resolve(root,"lib/execution/deterministic-evaluator.ts"),"utf8");
const api=readFileSync(resolve(root,"app/api/projects/[projectId]/execution/evidence-health/route.ts"),"utf8");
assert.match(core,/policyVersion\?\?"EM3A_V1"/);
assert.match(core,/source_association_missing/);
assert.match(core,/builder_manual_acceptance_record_not_implemented/);
assert.match(core,/rule_specific_provider_verifier_not_implemented/);
assert.match(core,/verified|PROVIDER_RECHECK|GITHUB_PR_MERGE_RECHECK/i);
assert.match(core,/Math\.floor\(completedWeightUnits\*10000\/totalWeightUnits\)/);
assert.doesNotMatch(api,/evaluateApprovedRoadmap|criterion_evaluations|progressPercent/);

console.log("EM3A_DETERMINISTIC_CALCULATOR_PASS");
console.log("Verified: explicit frozen weights, required criteria, stale/unknown denominator, no false rounding, versioned policy.");
console.log("No live rule adapter, persisted verdict or public progress surface has been approved.");
