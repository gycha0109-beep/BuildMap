import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import {
  verifyGitHubCheckRun, verifyGitHubArtifact, verifyGitHubDeployment,
} from "../lib/execution/github-extended-rule-verifiers.ts";
import {evaluateApprovedRoadmap} from "../lib/execution/deterministic-evaluator.ts";

const base=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=readFileSync(resolve(base,"lib/execution/github-extended-rule-reads.ts"),"utf8");
const SHA="a".repeat(40), BAD="b".repeat(40);
const DIGEST="sha256:"+"c".repeat(64);
const nowIso=new Date(Date.now()+1500).toISOString();
const checkedAt=new Date().toISOString();

const checkConfig={expectedSha:SHA,checkName:"Web App CI",checkRunId:91,checkAppId:4};
const check={id:91,name:"Web App CI",head_sha:SHA,app:{id:4},
  status:"completed",conclusion:"success"};
const checkPayload={total_count:1,check_runs:[check]};
const checkResult=(config=checkConfig,payload=checkPayload,at=checkedAt)=>
  verifyGitHubCheckRun({config,payload,checkedAt:at,nowIso});
assert.equal(checkResult().verdict,"PASS");
assert.equal(checkResult({...checkConfig,expectedSha:BAD}).verdict,"UNKNOWN");
assert.equal(checkResult({...checkConfig,checkRunId:92}).verdict,"UNKNOWN");
assert.equal(checkResult({...checkConfig,checkAppId:8}).verdict,"UNKNOWN");
assert.equal(checkResult({...checkConfig,checkName:"Another"}).verdict,"UNKNOWN");
assert.equal(checkResult({...checkConfig,checkRunId:undefined,checkAppId:undefined}).verdict,"UNKNOWN");
assert.equal(checkResult(checkConfig,{total_count:2,check_runs:[check]}).verdict,"UNKNOWN",
  "pagination cannot produce a false PASS");
assert.equal(checkResult(checkConfig,{total_count:2,check_runs:[check,check]}).verdict,"UNKNOWN",
  "ambiguous same-name check must not PASS");
assert.equal(checkResult(checkConfig,{total_count:1,check_runs:[{...check,status:"in_progress"}]}).verdict,"PENDING");
assert.equal(checkResult(checkConfig,{total_count:1,check_runs:[{...check,conclusion:"failure"}]}).verdict,"FAIL");
assert.equal(checkResult(checkConfig,{total_count:1,check_runs:[{...check,conclusion:"cancelled"}]}).verdict,"FAIL");
assert.equal(checkResult(checkConfig,{total_count:1,check_runs:[{...check,conclusion:"neutral"}]}).verdict,"UNKNOWN");
assert.equal(checkResult(checkConfig,checkPayload,new Date(Date.now()-400000).toISOString()).verdict,"UNKNOWN");
assert.equal(checkResult(checkConfig,checkPayload,new Date(Date.now()+400000).toISOString()).verdict,"UNKNOWN");

const artifactConfig={
  expectedSha:SHA,workflowRunId:10,artifactId:20,
  artifactName:"dist-prod",artifactDigest:DIGEST,
};
const workflowRun={id:10,head_sha:SHA,status:"completed",conclusion:"success"};
const artifact={id:20,name:"dist-prod",digest:DIGEST,expired:false,
  expires_at:new Date(Date.now()+86400000).toISOString(),
  workflow_run:{id:10,head_sha:SHA}};
const artifactPayload={total_count:1,artifacts:[artifact]};
const artifactResult=(config=artifactConfig,run=workflowRun,payload=artifactPayload)=>
  verifyGitHubArtifact({config,workflowRun:run,payload,checkedAt,nowIso});
assert.equal(artifactResult().verdict,"PASS");
assert.equal(artifactResult({...artifactConfig,artifactDigest:"sha256:"+"d".repeat(64)}).verdict,"UNKNOWN");
assert.equal(artifactResult({...artifactConfig,artifactId:21}).verdict,"UNKNOWN");
assert.equal(artifactResult(artifactConfig,{...workflowRun,head_sha:BAD}).verdict,"UNKNOWN");
assert.equal(artifactResult(artifactConfig,{...workflowRun,conclusion:"failure"}).verdict,"UNKNOWN");
assert.equal(artifactResult(artifactConfig,{...workflowRun,status:"in_progress"}).verdict,"PENDING");
assert.equal(artifactResult(artifactConfig,workflowRun,{total_count:1,artifacts:[{...artifact,expired:true}]}).verdict,"UNKNOWN");
assert.equal(artifactResult(artifactConfig,workflowRun,{total_count:1,artifacts:[{...artifact,digest:null}]}).verdict,"UNKNOWN");
assert.equal(artifactResult(artifactConfig,workflowRun,{total_count:1,artifacts:[{...artifact,
  workflow_run:{id:11,head_sha:SHA}}]}).verdict,"UNKNOWN");
assert.equal(artifactResult(artifactConfig,workflowRun,{total_count:2,artifacts:[artifact]}).verdict,"UNKNOWN");

const deploymentConfig={expectedSha:SHA,environment:"production",deploymentId:30};
const deployments=[{id:30,sha:SHA,environment:"production",created_at:checkedAt}];
const statuses=[{id:40,deployment_id:30,state:"success",created_at:checkedAt}];
const deploymentResult=(config=deploymentConfig,ds=deployments,ss=statuses)=>
  verifyGitHubDeployment({config,deployments:ds,statuses:ss,checkedAt,nowIso});
assert.equal(deploymentResult().verdict,"PASS");
assert.equal(deploymentResult({...deploymentConfig,environment:"staging"}).verdict,"UNKNOWN");
assert.equal(deploymentResult({...deploymentConfig,expectedSha:BAD}).verdict,"UNKNOWN");
assert.equal(deploymentResult(deploymentConfig,[{id:31,sha:BAD,environment:"production"},...deployments]).verdict,"UNKNOWN",
  "later environment deployment invalidates earlier successful deployment");
assert.equal(deploymentResult(deploymentConfig,deployments,[{...statuses[0],state:"in_progress"}]).verdict,"PENDING");
assert.equal(deploymentResult(deploymentConfig,deployments,[{...statuses[0],state:"failure"}]).verdict,"FAIL");
assert.equal(deploymentResult(deploymentConfig,deployments,[{...statuses[0],state:"inactive"}]).verdict,"UNKNOWN");
assert.equal(deploymentResult(deploymentConfig,deployments,[{...statuses[0],deployment_id:31}]).verdict,"UNKNOWN");
assert.equal(deploymentResult(deploymentConfig,deployments,[]).verdict,"UNKNOWN");
assert.equal(deploymentResult(deploymentConfig,Array.from({length:100},()=>deployments[0])).verdict,"UNKNOWN");

const requests=[];
let suppliedRepoId=123;
let providerStatus=200;
const fetchMock=async (url,init)=>{
  requests.push({url,init});
  if(providerStatus!==200)return new Response("Access denied",{status:providerStatus});
  if(url==="https://api.github.com/repos/Example/repo")
    return new Response(JSON.stringify({id:suppliedRepoId,full_name:"Example/repo"}),{status:200});
  if(url.includes("/check-runs?"))
    return new Response(JSON.stringify(checkPayload),{status:200});
  if(url.endsWith("/actions/runs/10"))
    return new Response(JSON.stringify(workflowRun),{status:200});
  if(url.includes("/actions/runs/10/artifacts?"))
    return new Response(JSON.stringify(artifactPayload),{status:200});
  if(url.includes("/deployments?"))
    return new Response(JSON.stringify(deployments),{status:200});
  if(url.includes("/deployments/30/statuses?"))
    return new Response(JSON.stringify(statuses),{status:200});
  return new Response("Not found",{status:404});
};
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText,{
  exports,require(name){
    if(name==="server-only")return {};
    if(name==="@/lib/github/app")return {githubRequestHeaders:{
      Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2026-03-10",
    }};
    if(name==="./github-extended-rule-verifiers")
      return {verifyGitHubCheckRun,verifyGitHubArtifact,verifyGitHubDeployment};
    throw Error("Unexpected import "+name);
  },
  fetch:fetchMock,Date,Response,AbortSignal,Buffer,Number,URLSearchParams,
});
const read=exports.readAndVerifyExtendedGitHubRule;
const lease={token:"synthetic-not-live-github-token",capability:"checks",
  repositoryId:"123",owner:"Example",repository:"repo"};
let response=await read({ruleType:"CHECK_PASSED",config:checkConfig,authorization:lease,nowIso});
assert.equal(response.verdict,"PASS");
assert.equal(requests.length,2);
assert.ok(requests[1].url.includes("/commits/"+SHA+"/check-runs?"));
assert.equal(requests[1].init.headers.Authorization,"Bearer synthetic-not-live-github-token");
assert.ok(!JSON.stringify(response).includes("synthetic-not-live-github-token"));
const oldCalls=requests.length;
response=await read({ruleType:"DEPLOY_VERIFIED",config:deploymentConfig,authorization:lease,nowIso});
assert.equal(response.verdict,"UNKNOWN");
assert.equal(response.reason,"capability_lease_rule_mismatch");
assert.equal(requests.length,oldCalls);
suppliedRepoId=124;
response=await read({ruleType:"CHECK_PASSED",config:checkConfig,authorization:lease,nowIso});
assert.equal(response.verdict,"UNKNOWN");
assert.equal(response.reason,"provider_repository_identity_mismatch");
assert.equal(requests.length,oldCalls+1);
suppliedRepoId=123;
providerStatus=403;
response=await read({ruleType:"CHECK_PASSED",config:checkConfig,authorization:lease,nowIso});
assert.equal(response.verdict,"UNKNOWN");
assert.equal(response.reason,"github_extended_provider_unavailable_or_permission_denied");
providerStatus=200;
response=await read({ruleType:"ARTIFACT_EXISTS",config:artifactConfig,authorization:{...lease,capability:"actions"},nowIso});
assert.equal(response.verdict,"PASS");
response=await read({ruleType:"DEPLOY_VERIFIED",config:deploymentConfig,authorization:{...lease,capability:"deployments"},nowIso});
assert.equal(response.verdict,"PASS");
assert.equal(requests.filter(x=>x.url.includes("/deployments?")).length,1);
assert.equal(requests.filter(x=>x.url.includes("/statuses?")).length,1);
assert.doesNotMatch(source,/createInstallationAccessToken|permissions:\s*\{|request\.json\(|service_role/);
const broker=readFileSync(resolve(base,"lib/github/api.ts"),"utf8");
const currentServer=readFileSync(resolve(base,"lib/execution/trusted-evaluation-server.ts"),"utf8");
const currentRoute=readFileSync(resolve(base,
  "app/api/projects/[projectId]/execution/verification-readiness/route.ts"),"utf8");
const narrow=broker.match(/permissions:\s*\{\s*contents:\s*"read",\s*pull_requests:\s*"read",?\s*\}/);
assert.ok(narrow,
  "existing runtime token MUST remain contents:read + pull_requests:read only");
assert.doesNotMatch(narrow[0],/checks|actions|deployments/);
assert.match(currentServer,/policyVersion:"EM3C_V2"/,
  "new extended rules must not be promoted to runtime without live scope approval");
assert.doesNotMatch(currentServer,/readAndVerifyExtendedGitHubRule|EM3CB_V3/);
assert.match(currentRoute,/progress:"NOT_PUBLISHED"/);
assert.doesNotMatch(currentRoute,/assessment\.percent|assessment\.basisPoints/);

const revision={id:"rev-check",status:"approved",version:1,milestones:[
  {id:"ms-check",weight:"2.0000",criteria:[{
    id:"c-check",ruleType:"CHECK_PASSED",isRequired:true,ruleConfig:checkConfig,
  }]},
]};
const link={criterionId:"c-check",evidenceId:"e-pr",sourceId:"pr:7",
  repositoryId:"123",sourceType:"merged_pull_request",reviewStatus:"reviewed"};
const anchor={kind:"GITHUB_PR_MERGE_RECHECK",evidenceId:"e-pr",sourceId:"pr:7",
  repositoryId:"123",checkedAt,currentSha:SHA,cachedSha:SHA,result:"CURRENT_SOURCE_MATCH"};
const proof={kind:"GITHUB_EXTENDED_RULE_RECHECK",criterionId:"c-check",ruleType:"CHECK_PASSED",
  evidenceId:"e-pr",sourceId:"pr:7",repositoryId:"123",checkedAt,
  expectedSha:SHA,providerObjectId:"91",verdict:"PASS",
  reason:"exact_sha_named_check_succeeded"};
const evaluate=(options={})=>evaluateApprovedRoadmap({
  revision,associations:[link],providerRechecks:[anchor],
  extendedRuleProofs:[proof],policyVersion:"EM3CB_V3",nowIso,...options,
});
assert.equal(evaluate().percent,100);
assert.equal(evaluate().policyVersion,"EM3CB_V3");
assert.equal(evaluate({policyVersion:"EM3C_V2"}).percent,0,"EM3C_V2 history never reinterpreted");
assert.equal(evaluate({providerRechecks:[]}).percent,0,"source PR SHA anchor mandatory");
assert.equal(evaluate({extendedRuleProofs:[]}).percent,0);
assert.equal(evaluate({extendedRuleProofs:[{...proof,sourceId:"pr:900"}]}).percent,0);
assert.equal(evaluate({extendedRuleProofs:[{...proof,repositoryId:"777"}]}).percent,0);
assert.equal(evaluate({extendedRuleProofs:[{...proof,expectedSha:BAD}]}).percent,0);
assert.equal(evaluate({extendedRuleProofs:[{...proof,providerObjectId:"99"}]}).percent,0);
assert.equal(evaluate({extendedRuleProofs:[{...proof,checkedAt:new Date(Date.now()-360000).toISOString()}]}).percent,0);
assert.equal(evaluate({associations:[{...link,reviewStatus:"proposed"}]}).percent,0);
assert.equal(evaluate({extendedRuleProofs:[{...proof,verdict:"FAIL"}]}).coverage.fail,1);
assert.equal(evaluate({extendedRuleProofs:[{...proof,verdict:"PENDING"}]}).coverage.pending,1);

console.log("EM3CB_GITHUB_EXTENDED_RULE_VERIFIERS_PASS");
console.log("Confirmed exact check SHA/name/ID, workflow artifact digest, current environment deployment, 403 UNKNOWN, V3 source correlation and V1/V2 invariance.");
console.log("Provider fixture uses synthetic token only; NO live GitHub App capability grant or product progress was published.");
