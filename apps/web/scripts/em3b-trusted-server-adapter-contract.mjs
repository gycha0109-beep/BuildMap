import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { evaluateApprovedRoadmap } from "../lib/execution/deterministic-evaluator.ts";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const serviceSource=readFileSync(resolve(root,"lib/execution/trusted-evaluation-server.ts"),"utf8");
const routeSource=readFileSync(resolve(root,"app/api/projects/[projectId]/execution/verification-readiness/route.ts"),"utf8");
const ids={
  project:"00000000-0000-4000-8000-000000000511",
  revision:"00000000-0000-4000-8000-000000000611",
  track:"00000000-0000-4000-8000-000000000603",
  milestone:"00000000-0000-4000-8000-000000000701",
  criterion:"00000000-0000-4000-8000-000000000901",
  evidence:"00000000-0000-4000-8000-000000000801",
  link:"00000000-0000-4000-8000-000000000401",
};
const SHA="a".repeat(40);
const now=()=>new Date().toISOString();
const fresh=()=>new Date(Date.now()-15_000).toISOString();

const defaultFixture=()=>({
  projects:[{id:ids.project,owner_builder_profile_id:"owner-builder",archived_at:null}],
  roadmap_revisions:[{id:ids.revision,project_id:ids.project,track_id:ids.track,status:"approved",version:1}],
  execution_milestones:[{
    id:ids.milestone,project_id:ids.project,track_id:ids.track,
    roadmap_revision_id:ids.revision,weight:"2.0000",position:0,archived_at:null,
  }],
  completion_criteria:[{
    id:ids.criterion,project_id:ids.project,track_id:ids.track,
    roadmap_revision_id:ids.revision,milestone_id:ids.milestone,
    rule_type:"PR_MERGED",rule_config:{},is_required:true,archived_at:null,position:0,
  }],
  criterion_evidence_links:[{
    id:ids.link,project_id:ids.project,criterion_id:ids.criterion,
    evidence_id:ids.evidence,review_status:"reviewed",
  }],
  execution_evidence:[{
    id:ids.evidence,project_id:ids.project,provider:"github",repository_id:123,
    repository_name:"Example/project",source_type:"merged_pull_request",source_id:"pr:42",
  }],
  execution_evidence_observations:[{
    project_id:ids.project,evidence_id:ids.evidence,source_sha:SHA,
    source_state:"SOURCE_CONFIRMED",observed_at:fresh(),version_sequence:1,
  }],
  project_links:[{
    id:ids.link,project_id:ids.project,link_type:"github",
    url:"https://github.com/Example/project",archived_at:null,
  }],
  integration_bindings:[{
    project_link_id:ids.link,provider:"github",status:"active",archived_at:null,
    external_connection_id:"456",external_resource_id:"123",
    external_resource_label:"Example/project",binding_proof:"valid-hmac",
  }],
});
let rows=defaultFixture();
let actor=true, appConfigured=true, installValid=true, sourceValid=true;
let installThrows=false, sourceThrows=false, appendDuringProviderRead=false;
let failingTable=null, installationCalls=0, sourceCalls=0, deniedProof=false;
let extendedEnabled=false,extendedCalls=0,extendedOutput="PASS";
let mutateDuringExtendedRead=false;

class Query {
  constructor(table){this.table=table;this.filters=[];this.sort=null;this.cap=Infinity;}
  select(){return this;}
  eq(key,value){this.filters.push(x=>String(x[key])===String(value));return this;}
  is(key,value){this.filters.push(x=>x[key]===value);return this;}
  in(key,values){this.filters.push(x=>values.includes(x[key]));return this;}
  order(key,{ascending=true}={}){this.sort={key,ascending};return this;}
  limit(amount){this.cap=amount;return this;}
  data(){
    if(this.table===failingTable)return {data:null,error:{message:"simulated DB failure"}};
    let data=[...(rows[this.table]??[])].filter(x=>this.filters.every(f=>f(x)));
    if(this.sort){
      const {key,ascending}=this.sort;
      data.sort((a,b)=>ascending? (a[key]>b[key]?1:a[key]<b[key]?-1:0):
        (a[key]>b[key]?-1:a[key]<b[key]?1:0));
    }
    return {data:data.slice(0,this.cap),error:null};
  }
  maybeSingle(){
    const result=this.data();
    return result.error?result:
      result.data.length>1?{data:null,error:{message:"ambiguous"}}
      :{data:result.data[0]??null,error:null};
  }
  then(done,bad){return Promise.resolve(this.data()).then(done,bad);}
}
const fakeSupabase={
  auth:{getUser:async()=>({data:{user:actor?{id:"owner-auth"}:null}})},
  from(table){return new Query(table);}
};

const dependencies={
  "server-only":{},
  "@/lib/buildmap/account":{
    ensureBuilderContext:async()=>({builderProfileId:"owner-builder"}),
  },
  "@/lib/github/app":{
    isGitHubAppConfigured:()=>appConfigured,
    verifyGitHubBindingProof:(identity,proof)=>
      !deniedProof&&proof==="valid-hmac"&&identity.repositoryId==="123"&&
      identity.installationId==="456"&&[ids.link,"00000000-0000-4000-8000-000000000402"].includes(identity.projectLinkId),
  },
  "@/lib/github/repository":{
    parseCanonicalGitHubRepositoryUrl:(url)=>{
      if(url!=="https://github.com/Example/project")return null;
      return {owner:"Example",repository:"project",fullName:"Example/project"};
    },
  },
  "@/lib/execution/github-installation-diagnostic":{
    inspectGitHubExecutionInstallation:async (binding)=>{
      installationCalls++;
      if(installThrows)throw Error("provider installation access denied");
      assert.equal(binding.repositoryId,"123");
      assert.equal(binding.installationId,"456");
      return {installationIdentity:installValid?"MATCH":"UNKNOWN",
        repositoryIdentity:installValid?"MATCH":"UNKNOWN"};
    },
  },
  "@/lib/execution/github-source-health":{
    inspectExecutionSourceHealth:async (arg)=>{
      sourceCalls++;
      if(sourceThrows)throw Error("GitHub PR read failed");
      if(appendDuringProviderRead) rows.execution_evidence_observations.push({
        ...rows.execution_evidence_observations[0],
        version_sequence:2,source_sha:"b".repeat(40),observed_at:now(),
      });
      assert.equal(arg.cachedSha,SHA);
      assert.equal(arg.sourceId,"pr:42");
      return {
        sourceState:sourceValid?"CURRENT_SOURCE_MATCH":"UNKNOWN",
        checkedAt:now(),
        currentSha:sourceValid?SHA:null,
        criterionEvaluation:"NOT_AVAILABLE",
      };
    },
  },
  "@/lib/execution/github-extended-capability-broker":{
    extendedExecutionSourceReadsEnabled:()=>extendedEnabled,
  },
  "@/lib/execution/trusted-extended-rule-adapter":{
    checkApprovedExtendedRulesForVerifiedSource:async ({binding,source,criteria})=>{
      extendedCalls++;
      assert.equal(binding.repositoryId,"123");
      assert.equal(source.sha,SHA);
      assert.equal(source.sourceId,"pr:42");
      assert.equal(criteria.length,1);
      if(mutateDuringExtendedRead){
        rows.execution_evidence_observations.push({
          ...rows.execution_evidence_observations[0],
          version_sequence:2,source_sha:"b".repeat(40),observed_at:now(),
        });
      }
      if(extendedOutput==="UNKNOWN")return [];
      return [{
        kind:"GITHUB_EXTENDED_RULE_RECHECK",
        criterionId:criteria[0].id,ruleType:criteria[0].ruleType,
        evidenceId:source.evidenceId,sourceId:source.sourceId,
        repositoryId:source.repositoryId,checkedAt:now(),
        expectedSha:SHA,providerObjectId:"91",verdict:extendedOutput,
        reason:"exact_sha_named_check_succeeded",
      }];
    },
  },
  "@/lib/execution/deterministic-evaluator":{evaluateApprovedRoadmap},
  "@/lib/supabase/server":{createClient:async()=>fakeSupabase},
};
const exports={};
vm.runInNewContext(ts.transpileModule(serviceSource,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText,{
  exports,require(name){
    if(!(name in dependencies))throw Error("Unexpected server dependency: "+name);
    return dependencies[name];
  },
  Date,Map,Set,Promise,Number,String,RegExp,console,
});
const run=exports.computeTrustedExecutionReadiness;
const query={projectId:ids.project,revisionId:ids.revision};
function reset(){
  rows=defaultFixture();
  actor=true;appConfigured=true;installValid=true;sourceValid=true;
  installThrows=false;sourceThrows=false;appendDuringProviderRead=false;
  failingTable=null;installationCalls=0;sourceCalls=0;deniedProof=false;
  extendedEnabled=false;extendedCalls=0;extendedOutput="PASS";
  mutateDuringExtendedRead=false;
}
async function checked(){
  const result=await run(query);
  assert.equal(result.state,"VERIFIED_AT_REQUEST_TIME");
  assert.equal(result.assessment.status,"CALCULATED");
  return result;
}
let valid=await checked();
assert.equal(valid.assessment.percent,100,"fresh, real-bound source is accepted in synthetic provider fixture");
assert.equal(valid.assessment.coverage.pass,1);
assert.equal(valid.rechecksPerformed,1);
assert.equal(sourceCalls,1);
assert.equal(installationCalls,1);
assert.equal(valid.assessment.milestones[0].criteria[0].supportingEvidenceId,ids.evidence);

reset();appendDuringProviderRead=true;
let changedWhileFetching=await checked();
assert.equal(changedWhileFetching.assessment.percent,0,
  "cached snapshot changed during GitHub read must invalidate proof");
assert.equal(changedWhileFetching.assessment.coverage.unknown,1);

reset();sourceValid=false;
let result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(result.assessment.coverage.unknown,1);
assert.equal(result.rechecksPerformed,1);

reset();installValid=false;
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(sourceCalls,0,"no source call after mismatched GitHub installation");
assert.equal(installationCalls,1);

reset();installThrows=true;
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(sourceCalls,0,"provider installation errors cannot grant proof");

reset();sourceThrows=true;
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(result.assessment.coverage.unknown,1,"GitHub PR read errors remain UNKNOWN");

reset();deniedProof=true;
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(installationCalls,0,"unsigned binding cannot reach GitHub API");

reset();appConfigured=false;
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(sourceCalls,0);

reset();rows.execution_evidence_observations[0].observed_at=
  new Date(Date.now()-26*60*60*1000).toISOString();
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(sourceCalls,0,"stale owner-controlled source cache cannot authorize completion");

reset();rows.execution_evidence_observations[0].source_sha="b".repeat(40);
result=await run(query);
assert.equal(result.state,"VERIFIED_AT_REQUEST_TIME");
assert.equal(result.assessment.percent,0);

reset();rows.execution_evidence[0].repository_name="Other/project";
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(installationCalls,0,"source repository name mismatch blocks remote reads");

reset();rows.integration_bindings[0].external_resource_id="999";
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(installationCalls,0,"numeric repository binding mismatch is rejected");

reset();rows.integration_bindings.push({...rows.integration_bindings[0],
  project_link_id:"00000000-0000-4000-8000-000000000402",
});
rows.project_links.push({...rows.project_links[0],id:"00000000-0000-4000-8000-000000000402"});
result=await checked();
assert.equal(result.assessment.percent,0,
  "ambiguous active links to same GitHub repo must fail closed");
assert.equal(installationCalls,0);

reset();rows.criterion_evidence_links[0].review_status="proposed";
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(result.assessment.coverage.pending,1);
assert.equal(sourceCalls,0);

reset();rows.completion_criteria[0].rule_type="DEPLOY_VERIFIED";
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(result.assessment.coverage.unknown,1);
assert.equal(installationCalls,0);

reset();rows.completion_criteria[0].rule_type="MANUAL_ACCEPTANCE";
rows.execution_manual_acceptance_events=[{
  id:"event-1",project_id:ids.project,track_id:ids.track,
  roadmap_revision_id:ids.revision,criterion_id:ids.criterion,
  event_type:"accepted",reason:"Explicitly inspected the completed deliverable",
  actor_builder_profile_id:"owner-builder",
  recorded_at:new Date(Date.now()-10_000).toISOString(),
}];
result=await checked();
assert.equal(result.assessment.percent,100,
  "server-only latest approved Builder event must pass manual criterion");
assert.equal(sourceCalls,0,"manual acceptance requires no GitHub PR token");

reset();rows.completion_criteria[0].rule_type="MANUAL_ACCEPTANCE";
rows.execution_manual_acceptance_events=[{
  id:"event-1",project_id:ids.project,track_id:ids.track,
  roadmap_revision_id:ids.revision,criterion_id:ids.criterion,
  event_type:"accepted",reason:"Explicitly inspected the completed deliverable",
  actor_builder_profile_id:"owner-builder",
  recorded_at:new Date(Date.now()-30_000).toISOString(),
},{
  id:"event-2",project_id:ids.project,track_id:ids.track,
  roadmap_revision_id:ids.revision,criterion_id:ids.criterion,
  event_type:"revoked",reason:"Original manual acceptance is no longer valid",
  actor_builder_profile_id:"owner-builder",
  recorded_at:new Date(Date.now()-10_000).toISOString(),
}];
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(result.assessment.coverage.pending,1,
  "latest revocation cancels earlier accepted event");

reset();rows.completion_criteria[0].rule_type="MANUAL_ACCEPTANCE";
failingTable="execution_manual_acceptance_events";
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"manual_audit_unavailable_or_truncated");

reset();
rows.completion_criteria[0].rule_type="CHECK_PASSED";
rows.completion_criteria[0].rule_config={
  expectedSha:SHA,checkName:"Web App CI",checkRunId:91,
};
result=await checked();
assert.equal(result.assessment.policyVersion,"EM3C_V2");
assert.equal(result.assessment.percent,0);
assert.equal(sourceCalls,0,"feature disabled must not even re-read source for extended rules");
assert.equal(extendedCalls,0,"feature disabled must never invoke extended token broker");

reset();
extendedEnabled=true;
rows.completion_criteria[0].rule_type="CHECK_PASSED";
rows.completion_criteria[0].rule_config={
  expectedSha:SHA,checkName:"Web App CI",checkRunId:91,
};
result=await checked();
assert.equal(result.assessment.policyVersion,"EM3CB_V3");
assert.equal(result.assessment.percent,100);
assert.equal(extendedCalls,1);
assert.equal(sourceCalls,1);

reset();
extendedEnabled=true;
mutateDuringExtendedRead=true;
rows.completion_criteria[0].rule_type="CHECK_PASSED";
rows.completion_criteria[0].rule_config={
  expectedSha:SHA,checkName:"Web App CI",checkRunId:91,
};
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"source_changed_during_evaluation");
assert.equal(extendedCalls,1,
  "mutating source after provider fetch must invalidate entire evaluation");

reset();
extendedEnabled=true;
extendedOutput="UNKNOWN";
rows.completion_criteria[0].rule_type="CHECK_PASSED";
rows.completion_criteria[0].rule_config={
  expectedSha:SHA,checkName:"Web App CI",checkRunId:91,
};
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(result.assessment.coverage.unknown,1);

reset();
extendedEnabled=true;
sourceValid=false;
rows.completion_criteria[0].rule_type="CHECK_PASSED";
rows.completion_criteria[0].rule_config={
  expectedSha:SHA,checkName:"Web App CI",checkRunId:91,
};
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(extendedCalls,0,"no extended token without current matching PR source");

reset();
extendedEnabled=true;
deniedProof=true;
rows.completion_criteria[0].rule_type="CHECK_PASSED";
rows.completion_criteria[0].rule_config={
  expectedSha:SHA,checkName:"Web App CI",checkRunId:91,
};
result=await checked();
assert.equal(result.assessment.percent,0);
assert.equal(extendedCalls,0,"HMAC invalid binding cannot request extended token");

reset();rows.roadmap_revisions[0].status="draft";
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"approved_revision_unavailable");

reset();actor=false;
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"unauthenticated");
assert.equal(sourceCalls,0);

reset();rows.projects[0].owner_builder_profile_id="foreign-builder";
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"project_access_denied");
assert.equal(sourceCalls,0);

reset();failingTable="completion_criteria";
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"roadmap_or_association_query_failed");

reset();rows.criterion_evidence_links=Array.from({length:201},(_,i)=>({
  ...rows.criterion_evidence_links[0],id:String(i),
}));
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"roadmap_or_link_snapshot_truncated");
assert.equal(sourceCalls,0);

reset();rows.execution_evidence=[];
result=await run(query);
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"evidence_scope_or_read_incomplete");

reset();result=await run({projectId:ids.project,revisionId:"malformed"});
assert.equal(result.state,"UNAVAILABLE");
assert.equal(result.reason,"invalid_identifiers");

assert.match(serviceSource,/import "server-only"/);
assert.match(serviceSource,/supabase\.auth\.getUser\(\)/);
assert.match(serviceSource,/owner_builder_profile_id/);
assert.match(serviceSource,/\.eq\("status","approved"\)/);
assert.match(serviceSource,/verifyGitHubBindingProof/);
assert.match(serviceSource,/inspectGitHubExecutionInstallation/);
assert.match(serviceSource,/inspectExecutionSourceHealth/);
assert.match(serviceSource,/snapshot\.data\.source_state!=="SOURCE_CONFIRMED"/);
assert.match(serviceSource,/CACHE_FRESH_MS/);
assert.match(serviceSource,/latest\.data\.version_sequence!==snapshot\.data\.version_sequence/);
assert.match(serviceSource,/MAX_RECHECKS/);
assert.match(serviceSource,/evaluateApprovedRoadmap/);
assert.doesNotMatch(serviceSource,/\.insert\(|\.update\(|\.upsert\(|service_role|SERVICE_ROLE/);
assert.doesNotMatch(serviceSource,/request\.json\(|clientProvidedProof|userSuppliedSha/);

assert.match(routeSource,/computeTrustedExecutionReadiness/);
assert.match(routeSource,/mode:"NOT_PUBLISHED"/);
assert.match(routeSource,/progress:"NOT_PUBLISHED"/);
assert.match(routeSource,/criterionEvaluation:"NOT_PUBLISHED"/);
assert.doesNotMatch(routeSource,/assessment\.percent|assessment\.basisPoints|basisPoints:|percent:/);
assert.doesNotMatch(routeSource,/\.insert\(|\.update\(|\.upsert\(|service_role|SERVICE_ROLE/);

console.log("EM3B_TRUSTED_SERVER_ADAPTER_CONTRACT_PASS");
console.log("Verified: owner-only DB scope, live installation identity/HMAC, 24h cache freshness, PR SHA recheck and fail-closed unknown.");
console.log("No client-controlled provider proof, official progress number, real GitHub App smoke or hosted release was used.");
