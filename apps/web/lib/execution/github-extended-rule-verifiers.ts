/**
 * EM-3C-B1: deterministic interpretation of authenticated GitHub API payloads.
 * These functions DO NOT authenticate payloads. They must only be used with
 * bounded, live reads from a repository-scoped, capability-authorized server
 * adapter. The currently deployed GitHub App token has NO extended scopes.
 *
 * Never use cached, user-supplied, or raw client-posted JSON as proof.
 */
export type ExtendedRuleType = "CHECK_PASSED" | "ARTIFACT_EXISTS" | "DEPLOY_VERIFIED";
export type ExtendedRuleVerdict = "PASS" | "FAIL" | "PENDING" | "UNKNOWN";
export type ExtendedRuleResult = {
  verdict: ExtendedRuleVerdict;
  reason: string;
  verifiedSha: string | null;
  sourceId: string | null;
};

export type ExtendedRuleConfig = {
  expectedSha?: unknown;
  checkName?: unknown;
  checkRunId?: unknown;
  checkAppId?: unknown;
  workflowRunId?: unknown;
  artifactId?: unknown;
  artifactName?: unknown;
  artifactDigest?: unknown;
  environment?: unknown;
  deploymentId?: unknown;
};

const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^sha256:[0-9a-f]{64}$/;
const NAME=/^[^\x00-\x1f\x7f]{1,180}$/;
const ID=/^[1-9][0-9]{0,15}$/;
const MAX_PROOF_AGE_MS=5*60*1000;

type JsonObject=Record<string,unknown>;
function object(value:unknown):JsonObject|null {
  return value!==null && typeof value==="object" && !Array.isArray(value)
    ? value as JsonObject : null;
}
function text(value:unknown):string|null {
  return typeof value==="string" && value.trim()===value && NAME.test(value)
    ? value : null;
}
function identifier(value:unknown):string|null {
  const s=typeof value==="number"&&Number.isSafeInteger(value)?String(value):
    typeof value==="string"?value:"";
  return ID.test(s)?s:null;
}
function clockValid(checkedAt:string,nowIso:string):boolean{
  const at=Date.parse(checkedAt),now=Date.parse(nowIso);
  return Number.isFinite(at) && Number.isFinite(now) && at<=now &&
    now-at<=MAX_PROOF_AGE_MS;
}
function output(verdict:ExtendedRuleVerdict,reason:string,sha:string|null=null,sourceId:string|null=null):ExtendedRuleResult{
  return {verdict,reason,verifiedSha:sha,sourceId};
}
function base(expectedSha:unknown,checkedAt:string,nowIso:string):string|null{
  if(typeof expectedSha!=="string"||!SHA.test(expectedSha))
    return "invalid_or_missing_approved_sha";
  if(!clockValid(checkedAt,nowIso))return "provider_recheck_stale_or_future";
  return null;
}
function entries(payload:unknown,key:string,totalKey:string):JsonObject[]|null {
  const data=object(payload);
  if(!data||!Array.isArray(data[key]) ||
    typeof data[totalKey]!=="number" ||
    !Number.isSafeInteger(data[totalKey]) ||
    data[totalKey]<0 || data[totalKey]>(data[key] as unknown[]).length ||
    (data[key] as unknown[]).length>100) return null;
  const all=(data[key] as unknown[]).map(object);
  return all.every(Boolean)?all as JsonObject[]:null;
}

export function verifyGitHubCheckRun(input:{
  config:ExtendedRuleConfig;
  checkedAt:string;
  nowIso:string;
  payload:unknown;
}):ExtendedRuleResult {
  const {config,checkedAt,nowIso}=input;
  const invalid=base(config.expectedSha,checkedAt,nowIso);
  if(invalid)return output("UNKNOWN",invalid);
  const name=text(config.checkName);
  const runId=identifier(config.checkRunId);
  const appId=identifier(config.checkAppId);
  if(!name||(!runId&&!appId))
    return output("UNKNOWN","unbound_check_identity_or_app");
  const checks=entries(input.payload,"check_runs","total_count");
  if(!checks)return output("UNKNOWN","check_results_unavailable_truncated_or_invalid");
  const sameNamedSha=checks.filter(check=>check.name===name &&
    check.head_sha===config.expectedSha &&
    (!appId||identifier(object(check.app)?.id)===appId));
  // A pinned older successful check must not prevail over a newer rerun
  // of the same required name and SHA; ambiguous current checks are UNKNOWN.
  if(sameNamedSha.length>1)
    return output("UNKNOWN","ambiguous_or_rerun_required_checks");
  const matching=sameNamedSha.filter(check=>
    !runId||identifier(check.id)===runId);
  if(matching.length!==1)
    return output("UNKNOWN",matching.length===0
      ?"exact_check_run_not_found":"ambiguous_matching_check_runs");
  const check=matching[0];
  const sourceId=identifier(check.id);
  if(!sourceId)return output("UNKNOWN","invalid_check_run_id");
  if(check.status!=="completed")
    return output("PENDING","required_check_not_completed",config.expectedSha as string,sourceId);
  if(check.conclusion==="success")
    return output("PASS","exact_sha_named_check_succeeded",config.expectedSha as string,sourceId);
  if(["failure","timed_out","action_required","cancelled"].includes(String(check.conclusion)))
    return output("FAIL","exact_sha_required_check_failed",config.expectedSha as string,sourceId);
  return output("UNKNOWN","check_conclusion_not_positive",config.expectedSha as string,sourceId);
}

export function verifyGitHubArtifact(input:{
  config:ExtendedRuleConfig;
  checkedAt:string;
  nowIso:string;
  workflowRun:unknown;
  payload:unknown;
}):ExtendedRuleResult {
  const {config,checkedAt,nowIso}=input;
  const invalid=base(config.expectedSha,checkedAt,nowIso);
  if(invalid)return output("UNKNOWN",invalid);
  const runId=identifier(config.workflowRunId);
  const artifactId=identifier(config.artifactId);
  const name=text(config.artifactName);
  const digest=config.artifactDigest;
  if(!runId||!artifactId||!name ||
    typeof digest!=="string"||!DIGEST.test(digest))
    return output("UNKNOWN","artifact_id_name_digest_and_run_required");
  const workflow=object(input.workflowRun);
  if(!workflow||identifier(workflow.id)!==runId ||
    workflow.head_sha!==config.expectedSha)
    return output("UNKNOWN","artifact_workflow_run_sha_mismatch");
  if(workflow.status!=="completed")
    return output("PENDING","artifact_workflow_not_completed");
  if(workflow.conclusion!=="success")
    return output("UNKNOWN","artifact_workflow_not_successful");
  const artifacts=entries(input.payload,"artifacts","total_count");
  if(!artifacts)return output("UNKNOWN","artifact_results_unavailable_truncated_or_invalid");
  const matching=artifacts.filter(artifact=>
    identifier(artifact.id)===artifactId && artifact.name===name);
  if(matching.length!==1)return output("UNKNOWN","exact_artifact_not_found_or_ambiguous");
  const artifact=matching[0];
  const parent=object(artifact.workflow_run);
  if(!parent||identifier(parent.id)!==runId ||
    parent.head_sha!==config.expectedSha)
    return output("UNKNOWN","artifact_repository_revision_unverified");
  if(artifact.expired!==false)
    return output("UNKNOWN","artifact_expired_or_expiry_unknown");
  const expiry=Date.parse(String(artifact.expires_at??""));
  const now=Date.parse(nowIso);
  if(!Number.isFinite(expiry)||expiry<=now)
    return output("UNKNOWN","artifact_expired_or_expiry_unknown");
  if(artifact.digest!==digest)
    return output("UNKNOWN","artifact_content_digest_mismatch");
  return output("PASS","exact_successful_run_artifact_digest_verified",config.expectedSha as string,artifactId);
}

export function verifyGitHubDeployment(input:{
  config:ExtendedRuleConfig;
  checkedAt:string;
  nowIso:string;
  deployments:unknown;
  statuses:unknown;
}):ExtendedRuleResult {
  const {config,checkedAt,nowIso}=input;
  const invalid=base(config.expectedSha,checkedAt,nowIso);
  if(invalid)return output("UNKNOWN",invalid);
  const deploymentId=identifier(config.deploymentId);
  const environment=text(config.environment);
  if(!deploymentId||!environment)
    return output("UNKNOWN","deployment_id_environment_required");
  if(!Array.isArray(input.deployments) ||
    input.deployments.length===0 || input.deployments.length>=100 ||
    input.deployments.some(d=>!object(d)))
    return output("UNKNOWN","deployment_inventory_missing_or_truncated");
  const deploymentRows=input.deployments as JsonObject[];
  // The deployment API must be requested with the EXACT approved environment,
  // sorted newest first. If a newer deployment targets the same environment,
  // an older successful deployment cannot count as current success.
  const latest=deploymentRows[0];
  if(identifier(latest.id)!==deploymentId)
    return output("UNKNOWN","deployment_superseded_or_missing");
  if(latest.sha!==config.expectedSha || latest.environment!==environment)
    return output("UNKNOWN","deployment_revision_or_environment_mismatch");
  if(!Array.isArray(input.statuses)||input.statuses.length===0 ||
    input.statuses.length>100 ||input.statuses.some(status=>!object(status)))
    return output("UNKNOWN","deployment_status_unavailable");
  const statuses=input.statuses as JsonObject[];
  const current=statuses[0];
  if(identifier(current.deployment_id)!==deploymentId)
    return output("UNKNOWN","deployment_status_identity_mismatch");
  const statusTime=Date.parse(String(current.created_at??""));
  if(!Number.isFinite(statusTime)||statusTime>Date.parse(nowIso))
    return output("UNKNOWN","deployment_status_time_invalid");
  const sourceId=deploymentId;
  if(current.state==="success")
    return output("PASS","current_environment_deployment_sha_succeeded",config.expectedSha as string,sourceId);
  if(["queued","pending","in_progress"].includes(String(current.state)))
    return output("PENDING","deployment_not_completed",config.expectedSha as string,sourceId);
  if(["error","failure"].includes(String(current.state)))
    return output("FAIL","deployment_current_status_failed",config.expectedSha as string,sourceId);
  return output("UNKNOWN","deployment_inactive_or_unverifiable",config.expectedSha as string,sourceId);
}
