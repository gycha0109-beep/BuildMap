import type {
  ExtendedRuleConfig,
  ExtendedRuleType,
} from "@/lib/execution/github-extended-rule-verifiers";

const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^sha256:[0-9a-f]{64}$/;
const ID=/^[1-9][0-9]{0,15}$/;
const NAME=/^[^\x00-\x1f\x7f]{1,180}$/;

function id(value:unknown):boolean {
  const raw=typeof value==="number"&&Number.isSafeInteger(value)?String(value):
    typeof value==="string"?value:"";
  return ID.test(raw) && Number.isSafeInteger(Number(raw));
}

function name(value:unknown):boolean {
  return typeof value==="string" && value.trim()===value &&
    NAME.test(value);
}

const requiredFields:Record<ExtendedRuleType,readonly string[]>={
  CHECK_PASSED:["expectedSha","checkName"],
  ARTIFACT_EXISTS:["expectedSha","workflowRunId","artifactId","artifactName","artifactDigest"],
  DEPLOY_VERIFIED:["expectedSha","deploymentId","environment"],
};
const permittedFields:Record<ExtendedRuleType,readonly string[]>={
  CHECK_PASSED:["expectedSha","checkName","checkRunId","checkAppId"],
  ARTIFACT_EXISTS:requiredFields.ARTIFACT_EXISTS,
  DEPLOY_VERIFIED:requiredFields.DEPLOY_VERIFIED,
};

/**
 * Frozen criterion rule_config must identify exact GitHub source objects and
 * a full 40-hex SHA. No wildcard or title-only provider matching allowed.
 */
export function validApprovedExtendedRuleConfig(
  type:ExtendedRuleType,
  value:unknown,
):value is ExtendedRuleConfig {
  if(value===null||typeof value!=="object"||Array.isArray(value))
    return false;
  const c=value as Record<string,unknown>;
  if(!requiredFields[type].every(key=>Object.hasOwn(c,key)) ||
    Object.keys(c).some(key=>!permittedFields[type].includes(key)) ||
    typeof c.expectedSha!=="string" || !SHA.test(c.expectedSha))
    return false;
  if(type==="CHECK_PASSED")
    return name(c.checkName) &&
      (id(c.checkRunId)||id(c.checkAppId)) &&
      (c.checkRunId===undefined||id(c.checkRunId)) &&
      (c.checkAppId===undefined||id(c.checkAppId));
  if(type==="ARTIFACT_EXISTS")
    return id(c.workflowRunId)&&id(c.artifactId)&&
      name(c.artifactName)&&
      typeof c.artifactDigest==="string"&&DIGEST.test(c.artifactDigest);
  return id(c.deploymentId)&&name(c.environment);
}
