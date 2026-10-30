import "server-only";

import { githubRequestHeaders } from "@/lib/github/app";
import {
  type ExtendedRuleConfig,
  type ExtendedRuleResult,
  type ExtendedRuleType,
  verifyGitHubArtifact,
  verifyGitHubCheckRun,
  verifyGitHubDeployment,
} from "./github-extended-rule-verifiers";

/**
 * EM-3C-B1: read-only transport for a future capability-broker-approved
 * repository-scoped GitHub token. DO NOT CALL from public routes or the
 * current EM-3B evaluator: the current installation token only requests
 * contents:read and pull_requests:read.
 *
 * There is deliberately NO token minting, scope escalation, token storage,
 * automatic approval switch, or evaluation persistence in this module.
 */
export type ScopedReadCapability = "checks" | "actions" | "deployments";
export type AuthorizedExtendedRead = {
  readonly token: string;
  readonly capability: ScopedReadCapability;
  readonly repositoryId: string;
  readonly owner: string;
  readonly repository: string;
};

const SHA=/^[0-9a-f]{40}$/;
const ID=/^[1-9][0-9]{0,15}$/;
const REPO=/^[A-Za-z0-9._-]{1,100}$/;
const OWNER=/^[A-Za-z0-9-]{1,100}$/;
const MAX_BODY_BYTES=512_000;
const required:Record<ExtendedRuleType,ScopedReadCapability>={
  CHECK_PASSED:"checks",
  ARTIFACT_EXISTS:"actions",
  DEPLOY_VERIFIED:"deployments",
};
function invalid(reason:string):ExtendedRuleResult {
  return {verdict:"UNKNOWN",reason,verifiedSha:null,sourceId:null};
}
function id(value:unknown):string|null {
  const raw=typeof value==="number"&&Number.isSafeInteger(value)?String(value):
    typeof value==="string"?value:"";
  return ID.test(raw)?raw:null;
}
function validIdentity(read:AuthorizedExtendedRead) {
  return Boolean(
    read.token && read.token.length<=4096 &&
    id(read.repositoryId) &&
    OWNER.test(read.owner) &&
    REPO.test(read.repository),
  );
}

async function boundedGet(read:AuthorizedExtendedRead,path:string):Promise<unknown> {
  const response=await fetch(
    `https://api.github.com/repos/${encodeURIComponent(read.owner)}/${encodeURIComponent(read.repository)}${path}`,
    {
      method:"GET",cache:"no-store",
      headers:{...githubRequestHeaders,Authorization:`Bearer ${read.token}`},
      signal:AbortSignal.timeout(8_000),
    },
  );
  if(!response.ok) throw Error("provider_denied_or_unavailable");
  const length=Number(response.headers.get("content-length")??0);
  if(Number.isFinite(length)&&length>MAX_BODY_BYTES)
    throw Error("provider_response_too_large");
  const body=await response.text();
  if(Buffer.byteLength(body,"utf8")>MAX_BODY_BYTES)
    throw Error("provider_response_too_large");
  return JSON.parse(body) as unknown;
}

export async function readAndVerifyExtendedGitHubRule(input:{
  ruleType:ExtendedRuleType;
  config:ExtendedRuleConfig;
  authorization:AuthorizedExtendedRead;
  nowIso:string; // retained for fixture compatibility; verification uses post-read clock
}):Promise<ExtendedRuleResult> {
  const {authorization,ruleType,config}=input;
  if(authorization.capability!==required[ruleType])
    return invalid("capability_lease_rule_mismatch");
  if(!validIdentity(authorization) ||
    typeof config.expectedSha!=="string" || !SHA.test(config.expectedSha))
    return invalid("invalid_repo_or_approved_sha");

  // A repository-scoped token cannot substitute for an exact repository-ID
  // match; validate numeric identity on every invocation before rule reads.
  try {
    const metadata=await boundedGet(authorization,"");
    const repo=metadata!==null&&typeof metadata==="object" &&
      !Array.isArray(metadata)?metadata as Record<string,unknown>:null;
    if(!repo||id(repo.id)!==authorization.repositoryId ||
      typeof repo.full_name!=="string" ||
      repo.full_name.toLowerCase()!==`${authorization.owner}/${authorization.repository}`.toLowerCase())
      return invalid("provider_repository_identity_mismatch");

    const checkedAt=new Date().toISOString();
    if(ruleType==="CHECK_PASSED"){
      const checkName=config.checkName;
      if(typeof checkName!=="string"||checkName.length>180||
        !id(config.checkRunId) && !id(config.checkAppId))
        return invalid("unbound_check_identity_or_app");
      const args=new URLSearchParams({
        check_name:checkName,filter:"all",per_page:"100",page:"1",
      });
      const payload=await boundedGet(authorization,
        `/commits/${config.expectedSha}/check-runs?${args}`);
      return verifyGitHubCheckRun({config,payload,checkedAt,nowIso:new Date().toISOString()});
    }

    if(ruleType==="ARTIFACT_EXISTS"){
      const runId=id(config.workflowRunId);
      if(!runId||!id(config.artifactId))
        return invalid("artifact_id_and_workflow_run_required");
      const workflowRun=await boundedGet(authorization,`/actions/runs/${runId}`);
      const payload=await boundedGet(authorization,
        `/actions/runs/${runId}/artifacts?per_page=100&page=1`);
      return verifyGitHubArtifact({config,workflowRun,payload,checkedAt,nowIso:new Date().toISOString()});
    }

    const deploymentId=id(config.deploymentId);
    if(!deploymentId||typeof config.environment!=="string"||
      !config.environment||config.environment.length>180)
      return invalid("deployment_id_environment_required");
    const params=new URLSearchParams({
      environment:config.environment,per_page:"100",page:"1",
    });
    const deployments=await boundedGet(authorization,`/deployments?${params}`);
    const statuses=await boundedGet(authorization,
      `/deployments/${deploymentId}/statuses?per_page=100&page=1`);
    return verifyGitHubDeployment({config,deployments,statuses,checkedAt,nowIso:new Date().toISOString()});
  } catch {
    // Permission denial, rate limit, malformed API or timeout must never PASS.
    return invalid("github_extended_provider_unavailable_or_permission_denied");
  }
}
