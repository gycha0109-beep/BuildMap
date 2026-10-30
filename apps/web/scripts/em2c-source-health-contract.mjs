import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import { normalizeMergedPullRequestEvidence } from "../lib/execution/github-evidence-normalize.ts";

const base=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=(path)=>readFileSync(resolve(base,path),"utf8");
const app=load("lib/execution/github-installation-diagnostic.ts");
const source=load("lib/execution/github-source-health.ts");
const route=load("app/api/projects/[projectId]/execution/evidence-health/route.ts");
const panel=load("components/execution/github-health-panel.tsx");
const page=load("app/projects/[projectId]/execution/evidence/page.tsx");

const SHA_A="a".repeat(40);
const SHA_B="b".repeat(40);
const GitHubProviderError=class extends Error {
  constructor(message,status){super(message);this.status=status;}
};
const requests=[];
let appInfo={
  id:222,app_id:101,suspended_at:null,
  permissions:{contents:"read",pull_requests:"read",checks:"read",actions:"write",issues:"read"},
};
let repoInfo={id:333,full_name:"Example/project"};
let pullInfo={
  number:42,merged:true,merged_at:"2026-10-29T22:30:00Z",
  merge_commit_sha:SHA_A,title:"Known merged PR",
};
let pullStatus=200;
let appStatus=200;
let scopedTokens=0;

const fetchMock=async (url,init)=>{
  requests.push({url,init});
  if(url==="https://api.github.com/app/installations/222"){
    return new Response(JSON.stringify(appInfo),{status:appStatus});
  }
  if(url==="https://api.github.com/repos/Example/project"){
    return new Response(JSON.stringify(repoInfo),{status:200});
  }
  if(url==="https://api.github.com/repos/Example/project/pulls/42"){
    return new Response(JSON.stringify(pullInfo),{status:pullStatus});
  }
  return new Response("Not found",{status:404});
};

const api={
  createInstallationAccessToken:async args=>{
    assert.deepEqual(JSON.parse(JSON.stringify(args)),{
      installationId:"222",repositoryId:"333",
    });
    scopedTokens++;
    return "narrow-installation-token";
  },
  GitHubProviderError,
};
const shared={
  require(name){
    if(name==="@/lib/github/api") return api;
    if(name==="@/lib/github/app") return {
      createGitHubAppJwt:()=> "app-jwt",
      getGitHubAppConfig:()=>({appId:"101"}),
      githubRequestHeaders:{Accept:"application/vnd.github+json"},
    };
    if(name==="./github-evidence-normalize") return {normalizeMergedPullRequestEvidence};
    throw Error("Unexpected import: "+name);
  },
  fetch:fetchMock,
  Date,
  AbortSignal,
  Response,
};
function instantiate(source){
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  }}).outputText,{...shared,exports});
  return exports;
}
const diag=instantiate(app);
const probe=instantiate(source);
const identity={installationId:"222",repositoryId:"333",owner:"Example",repository:"project"};

const result=await diag.inspectGitHubExecutionInstallation(identity);
assert.equal(result.installationIdentity,"MATCH");
assert.equal(result.repositoryIdentity,"MATCH");
assert.equal(result.scopes.checks,"READ_GRANTED_BUT_TOKEN_NOT_REQUESTED");
assert.equal(result.scopes.actions,"READ_GRANTED_BUT_TOKEN_NOT_REQUESTED");
assert.equal(result.scopes.deployments,"NOT_GRANTED");
assert.equal(result.scopes.issues,"READ_GRANTED_BUT_TOKEN_NOT_REQUESTED");
assert.deepEqual([...result.activeTokenScopes],["contents:read","pull_requests:read"]);
assert.equal(result.scopeReadProbe,"NOT_RUN");
assert.equal(result.evidenceEvaluation,"NOT_AVAILABLE");
assert.equal(scopedTokens,1);
assert.equal(requests.length,2);
assert.equal(requests[0].init.headers.Authorization,"Bearer app-jwt");
assert.equal(requests[1].init.headers.Authorization,"Bearer narrow-installation-token");
assert.ok(!JSON.stringify(result).includes("narrow-installation-token"));

repoInfo={id:444,full_name:"Example/project"};
const mistaken=await diag.inspectGitHubExecutionInstallation(identity);
assert.equal(mistaken.repositoryIdentity,"UNKNOWN");
assert.equal(mistaken.repositoryReason,"repository_identity_mismatch");
repoInfo={id:333,full_name:"Example/project"};
const preservedPermissions=appInfo.permissions;
appInfo={...appInfo,permissions:undefined};
const missingGrants=await diag.inspectGitHubExecutionInstallation(identity);
assert.equal(missingGrants.scopes.checks,"UNKNOWN");
assert.equal(missingGrants.scopes.deployments,"UNKNOWN");
appInfo={...appInfo,permissions:preservedPermissions};
appInfo={...appInfo,suspended_at:"2026-10-30T00:00:00Z"};
const suspended=await diag.inspectGitHubExecutionInstallation(identity);
assert.equal(suspended.installationIdentity,"UNKNOWN");
assert.equal(suspended.repositoryIdentity,"UNKNOWN");
assert.equal(suspended.scopes.checks,"UNKNOWN");
appInfo={...appInfo,suspended_at:null};
appStatus=403;
await assert.rejects(diag.inspectGitHubExecutionInstallation(identity));
appStatus=200;

const req={...identity,sourceType:"merged_pull_request",sourceId:"pr:42",cachedSha:SHA_A};
const before=requests.length;
const match=await probe.inspectExecutionSourceHealth(req);
assert.equal(match.sourceState,"CURRENT_SOURCE_MATCH");
assert.equal(match.currentSha,SHA_A);
assert.equal(match.criterionEvaluation,"NOT_AVAILABLE");
assert.equal(requests.length,before+1);
pullInfo={...pullInfo,merge_commit_sha:SHA_B};
const stale=await probe.inspectExecutionSourceHealth(req);
assert.equal(stale.sourceState,"UNKNOWN");
assert.equal(stale.reason,"source_sha_changed");
assert.equal(stale.currentSha,SHA_B);
pullStatus=404;
const removed=await probe.inspectExecutionSourceHealth(req);
assert.equal(removed.sourceState,"UNKNOWN");
assert.equal(removed.reason,"github_source_access_or_freshness_unknown");
pullStatus=200;
pullInfo={...pullInfo,merged:false};
const unmerged=await probe.inspectExecutionSourceHealth(req);
assert.equal(unmerged.sourceState,"UNKNOWN");
assert.equal(unmerged.reason,"source_unmerged_or_invalid");
pullInfo={...pullInfo,merged:true,merge_commit_sha:SHA_A};
const noSha=await probe.inspectExecutionSourceHealth({...req,cachedSha:null});
assert.equal(noSha.reason,"missing_cached_merge_sha");
const preRelease=requests.length;
const release=await probe.inspectExecutionSourceHealth({
  ...req,sourceType:"release",sourceId:"release:18",cachedSha:null,
});
assert.equal(release.sourceState,"UNKNOWN");
assert.equal(release.reason,"release_not_deployment_proof");
assert.equal(requests.length,preRelease,"No token or provider request for release without deployment proof");
assert.equal(requests.filter(x=>x.url.includes("/check-runs")||
  x.url.includes("/actions/")||x.url.includes("/deployments")).length,0);

assert.match(route,/ensureBuilderContext/);
assert.match(route,/owner_builder_profile_id/);
assert.match(route,/verifyGitHubBindingProof/);
assert.match(route,/parseCanonicalGitHubRepositoryUrl/);
assert.match(route,/inspectGitHubExecutionInstallation/);
assert.match(route,/inspectExecutionSourceHealth/);
assert.match(route,/source_repository_identity_mismatch/);
assert.match(route,/version_sequence.*descending|version_sequence/);
assert.match(route,/Cache-Control": "private, no-store"/);
assert.doesNotMatch(route,/\.insert\(|\.update\(|\.upsert\(|service_role|SERVICE_ROLE/);
assert.match(panel,/READ_GRANTED_BUT_TOKEN_NOT_REQUESTED/);
assert.match(panel,/설치에 읽기 권한 존재 · 현재 토큰에는 미요청/);
assert.match(panel,/진단은 완료 조건 PASS나 배포 성공 판정이 아닙니다/);
assert.match(page,/ExecutionGitHubHealthPanel/);

console.log("EM2C_SCOPE_SOURCE_HEALTH_CONTRACT_PASS");
console.log("Proof: read-only installed grant introspection, narrow token, repository ID, stale/removed PR UNKNOWN, no PASS.");
console.log("Actual live BuildMap GitHub App installation smoke is NOT verified by this deterministic fixture.");
