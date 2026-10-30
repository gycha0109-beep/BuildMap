import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import {
  validApprovedExtendedRuleConfig,
} from "../lib/execution/approved-extended-rule-config.ts";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const brokerSource=read("lib/execution/github-extended-capability-broker.ts");
const adapterSource=read("lib/execution/trusted-extended-rule-adapter.ts");
const server=read("lib/execution/trusted-evaluation-server.ts");
const route=read("app/api/projects/[projectId]/execution/verification-readiness/route.ts");
const SHA="a".repeat(40);
const DIGEST="sha256:"+"c".repeat(64);
const binding={installationId:"456",repositoryId:"123",owner:"Example",repository:"project"};
const config={expectedSha:SHA,checkName:"Web App CI",checkRunId:91};
const input={...binding,capability:"checks"};

for(const [type,value] of [
  ["CHECK_PASSED",config],
  ["CHECK_PASSED",{expectedSha:SHA,checkName:"Web App CI",checkAppId:99}],
  ["ARTIFACT_EXISTS",{expectedSha:SHA,workflowRunId:11,artifactId:42,
    artifactName:"dist",artifactDigest:DIGEST}],
  ["DEPLOY_VERIFIED",{expectedSha:SHA,deploymentId:42,environment:"production"}],
]){
  assert.equal(validApprovedExtendedRuleConfig(type,value),true);
}
for(const [type,value] of [
  ["CHECK_PASSED",{expectedSha:SHA,checkName:"Web App CI"}],
  ["CHECK_PASSED",{...config,expectedSha:"not-a-sha"}],
  ["CHECK_PASSED",{...config,checkRunId:"0"}],
  ["CHECK_PASSED",{...config,checkName:"\nWeb App CI"}],
  ["CHECK_PASSED",{...config,secretToken:"unexpected"}],
  ["ARTIFACT_EXISTS",{expectedSha:SHA,workflowRunId:11,artifactId:42,
    artifactName:"dist",artifactDigest:"sha256:bad"}],
  ["DEPLOY_VERIFIED",{expectedSha:SHA,deploymentId:42,environment:"  "}],
  ["DEPLOY_VERIFIED",{expectedSha:SHA,deploymentId:42,environment:"prod",extra:true}],
  ["DEPLOY_VERIFIED",null],
]){
  assert.equal(validApprovedExtendedRuleConfig(type,value),false,
    "invalid approved rule_config must not start a provider request: "+type);
}
let enabled=false;
let approvedApp="101";
let installedScope="READ_GRANTED_BUT_TOKEN_NOT_REQUESTED";
let repositoryMatch=true;
let installationMatch=true;
let tokenPermissions={checks:"read",metadata:"read"};
let returnedRepos=[{id:123,full_name:"Example/project"}];
let expiry=new Date(Date.now()+3600000).toISOString();
let providerCode=201;
let inspectionCalls=0;
let requestCalls=[];
const env={};
const app={
  createGitHubAppJwt:()=> "mock-app-jwt",
  getGitHubAppConfig:()=> ({appId:"101"}),
  githubRequestHeaders:{Accept:"application/vnd.github+json"},
};
const mockFetch=async (url,options)=>{
  requestCalls.push({url,options});
  return new Response(JSON.stringify({
    token:"mock-synthetic-extended-token",
    permissions:tokenPermissions,
    repositories:returnedRepos,
    expires_at:expiry,
  }),{status:providerCode});
};
const dependencies={
  "server-only":{},
  "@/lib/github/app":app,
  "@/lib/execution/github-installation-diagnostic":{
    inspectGitHubExecutionInstallation:async args=>{
      inspectionCalls++;
      assert.equal(args.repositoryId,"123");
      assert.equal(args.installationId,"456");
      return {
        installationIdentity:installationMatch?"MATCH":"UNKNOWN",
        repositoryIdentity:repositoryMatch?"MATCH":"UNKNOWN",
        scopes:{
          checks:installedScope,
          actions:installedScope,
          deployments:installedScope,
          issues:"NOT_GRANTED",
        },
      };
    },
  },
};
const brokerModule={};
vm.runInNewContext(ts.transpileModule(brokerSource,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText,{
  exports:brokerModule,
  require(name){
    if(!(name in dependencies)) throw Error("Unexpected broker import "+name);
    return dependencies[name];
  },
  process:{env},fetch:mockFetch,Response,Date,Number,Array,Object,String,
  JSON,AbortSignal,
});
const broker=brokerModule;
const isEnabled=()=>broker.extendedExecutionSourceReadsEnabled();
const mint=args=>broker.acquireExtendedExecutionRead(args);
assert.equal(isEnabled(),false);
assert.equal(await mint(input),null);
assert.equal(inspectionCalls,0);
assert.equal(requestCalls.length,0);
env.EXECUTION_EXTENDED_GITHUB_VERIFICATION_ENABLED="true";
env.EXECUTION_EXTENDED_GITHUB_APPROVED_APP_ID="999";
assert.equal(isEnabled(),false,"operator approval must match exact app ID");
assert.equal(await mint(input),null);
env.EXECUTION_EXTENDED_GITHUB_APPROVED_APP_ID=approvedApp;
assert.equal(isEnabled(),true);
assert.equal(await mint({...input,capability:"issues"}),null,
  "unknown enum capability cannot be minted");
assert.equal(inspectionCalls,0);

let lease=await mint(input);
assert.equal(lease.capability,"checks");
assert.equal(lease.repositoryId,"123");
assert.equal(inspectionCalls,1);
assert.equal(requestCalls.length,1);
const tokenBody=JSON.parse(requestCalls[0].options.body);
assert.deepEqual(JSON.parse(JSON.stringify(tokenBody)),{
  repository_ids:[123],permissions:{checks:"read"},
});
assert.equal(requestCalls[0].options.method,"POST");
assert.ok(requestCalls[0].url.endsWith("/app/installations/456/access_tokens"));
assert.ok(!JSON.stringify(tokenBody).includes("write"));
assert.ok(!JSON.stringify(lease).includes("mock-app-jwt"));
lease=null;
installedScope="NOT_GRANTED";
assert.equal(await mint(input),null);
assert.equal(requestCalls.length,1,"permission missing => no token POST");
installedScope="UNKNOWN";
assert.equal(await mint(input),null);
installedScope="READ_GRANTED_BUT_TOKEN_NOT_REQUESTED";
installationMatch=false;
assert.equal(await mint(input),null);
installationMatch=true;
repositoryMatch=false;
assert.equal(await mint(input),null);
repositoryMatch=true;
tokenPermissions={checks:"write",metadata:"read"};
assert.equal(await mint(input),null,"write token echo must be rejected");
tokenPermissions={checks:"read",actions:"read",metadata:"read"};
assert.equal(await mint(input),null,"unexpected additional token grant must be rejected");
tokenPermissions={checks:"read",metadata:"read"};
returnedRepos=[{id:456,full_name:"Example/project"}];
assert.equal(await mint(input),null,"wrong repository ID must reject token");
returnedRepos=[{id:123,full_name:"Different/project"}];
assert.equal(await mint(input),null,"wrong repository full name must reject token");
returnedRepos=[{id:123,full_name:"Example/project"}];
expiry=new Date(Date.now()-1000).toISOString();
assert.equal(await mint(input),null,"expired token rejected");
expiry=new Date(Date.now()+3600000).toISOString();
providerCode=403;
assert.equal(await mint(input),null,"GitHub permission denial returns null");
providerCode=201;
assert.equal((await mint(input)).capability,"checks");
env.EXECUTION_EXTENDED_GITHUB_VERIFICATION_ENABLED="false";
assert.equal(await mint(input),null);
env.EXECUTION_EXTENDED_GITHUB_VERIFICATION_ENABLED="true";

let checkedRules=0;
let runtimeVerdict="PASS";
const adapterDeps={
  "server-only":{},
  "@/lib/execution/github-extended-capability-broker":{
    extendedExecutionSourceReadsEnabled:()=>enabled,
    acquireExtendedExecutionRead:async args=>{
      checkedRules++;
      if(installedScope!=="READ_GRANTED_BUT_TOKEN_NOT_REQUESTED")return null;
      return {...args,token:"broker-held-test-token"};
    },
  },
  "@/lib/execution/github-extended-rule-reads":{
    readAndVerifyExtendedGitHubRule:async args=>({
      verdict:runtimeVerdict,
      reason:"exact_sha_named_check_succeeded",
      verifiedSha:args.config.expectedSha,sourceId:"91",
    }),
  },
  "@/lib/execution/approved-extended-rule-config":{
    validApprovedExtendedRuleConfig,
  },
};
const adapterModule={};
vm.runInNewContext(ts.transpileModule(adapterSource,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText,{
  exports:adapterModule,
  require(name){
    if(!(name in adapterDeps))throw Error("Unexpected adapter import "+name);
    return adapterDeps[name];
  },
  Date,Array,Number,String,
});
const adapter=adapterModule.checkApprovedExtendedRulesForVerifiedSource;
const sourceInput={
  binding,source:{
    evidenceId:"e1",sourceId:"pr:42",
    repositoryId:"123",sha:SHA,checkedAt:new Date().toISOString(),
  },
  criteria:[{id:"criterion-check",ruleType:"CHECK_PASSED",config}],
};
assert.equal((await adapter(sourceInput)).length,0);
assert.equal(checkedRules,0,"disabled feature must not request broker");
enabled=true;
let proofs=await adapter(sourceInput);
assert.equal(proofs.length,1);
assert.equal(proofs[0].providerObjectId,"91");
assert.equal(proofs[0].criterionId,"criterion-check");
assert.equal(checkedRules,1);
assert.equal(proofs[0].kind,"GITHUB_EXTENDED_RULE_RECHECK");
assert.ok(!JSON.stringify(proofs).includes("broker-held-test-token"));
assert.equal((await adapter({...sourceInput,source:{...sourceInput.source,sha:"b".repeat(40)}})).length,0);
assert.equal((await adapter({...sourceInput,source:{...sourceInput.source,repositoryId:"999"}})).length,0);
assert.equal((await adapter({...sourceInput,source:{...sourceInput.source,
  checkedAt:new Date(Date.now()-360000).toISOString()}})).length,0);
assert.equal((await adapter({...sourceInput,criteria:[{
  id:"bad",ruleType:"CHECK_PASSED",config:{expectedSha:SHA},
}]})).length,0);
installedScope="NOT_GRANTED";
assert.equal((await adapter(sourceInput)).length,0);
installedScope="READ_GRANTED_BUT_TOKEN_NOT_REQUESTED";
runtimeVerdict="UNKNOWN";
assert.equal((await adapter(sourceInput)).length,0);

assert.match(server,/checkApprovedExtendedRulesForVerifiedSource/);
assert.match(server,/extendedExecutionSourceReadsEnabled/);
assert.match(server,/policyVersion:extendedEnabled\?"EM3CB_V3":"EM3C_V2"/);
assert.match(server,/latest\.data\.version_sequence!==snapshot\.data\.version_sequence/);
assert.match(server,/verifyGitHubBindingProof/);
assert.match(route,/progress:"NOT_PUBLISHED"/);
assert.match(route,/criterionEvaluation:"NOT_PUBLISHED"/);
assert.doesNotMatch(route,/assessment\.percent|basisPoints:/);
assert.doesNotMatch(brokerSource,/service_role|request\.json\(/);
assert.doesNotMatch(adapterSource,/createInstallationAccessToken|request\.json\(/);

console.log("EM3CB2_SCOPED_PROVIDER_BROKER_INTEGRATION_PASS");
console.log("Default OFF, explicit approved app ID, installation grant, one-repository single read token, ID/permission echo, SHA binding, current source and no public progress.");
console.log("Synthetic GitHub REST only; live App permission approval and hosted smoke remain outstanding.");
