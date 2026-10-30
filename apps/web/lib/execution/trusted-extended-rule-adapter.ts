import "server-only";

import {
  acquireExtendedExecutionRead,
  extendedExecutionSourceReadsEnabled,
} from "@/lib/execution/github-extended-capability-broker";
import {
  readAndVerifyExtendedGitHubRule,
  type ScopedReadCapability,
} from "@/lib/execution/github-extended-rule-reads";
import {
  validApprovedExtendedRuleConfig,
} from "@/lib/execution/approved-extended-rule-config";
import type {
  ExtendedRuleConfig,
  ExtendedRuleType,
} from "@/lib/execution/github-extended-rule-verifiers";
import type {
  TrustedExtendedRuleProof,
} from "@/lib/execution/deterministic-evaluator";

type Binding = {
  installationId:string;
  repositoryId:string;
  owner:string;
  repository:string;
};
type VerifiedSource = {
  evidenceId:string;
  sourceId:string;
  repositoryId:string;
  sha:string;
  checkedAt:string;
};
export type ExtendedCriterionCandidate = {
  id:string;
  ruleType:ExtendedRuleType;
  config:unknown;
};
const CAPS:Record<ExtendedRuleType,ScopedReadCapability>={
  CHECK_PASSED:"checks",
  ARTIFACT_EXISTS:"actions",
  DEPLOY_VERIFIED:"deployments",
};
const SHA=/^[0-9a-f]{40}$/;
const MAX_AGE_MS=5*60*1000;

/**
 * Call only after the existing EM-3B server verified:
 * - the current Builder owns the project and approved revision,
 * - the source has an explicit Builder-reviewed same-project association,
 * - active HMAC binding, exact GitHub installation and numeric repo identity,
 * - the latest observation matches a freshly re-read merged PR SHA,
 * - latest source version remains unchanged after the provider request.
 */
export async function checkApprovedExtendedRulesForVerifiedSource(input:{
  binding:Binding;
  source:VerifiedSource;
  criteria:readonly ExtendedCriterionCandidate[];
}):Promise<TrustedExtendedRuleProof[]> {
  if(!extendedExecutionSourceReadsEnabled())return [];
  if(input.criteria.length>12 || !SHA.test(input.source.sha) ||
    input.source.repositoryId!==input.binding.repositoryId ||
    !/^pr:[1-9][0-9]{0,14}$/.test(input.source.sourceId))
    return [];

  const checked=Date.parse(input.source.checkedAt);
  const current=Date.now();
  if(!Number.isFinite(checked)||checked>current||
    current-checked>MAX_AGE_MS)return [];

  const proofs:TrustedExtendedRuleProof[]=[];
  for(const criterion of input.criteria){
    if(!validApprovedExtendedRuleConfig(criterion.ruleType,criterion.config))
      continue;
    const config=criterion.config as ExtendedRuleConfig;
    if(config.expectedSha!==input.source.sha)continue;

    const lease=await acquireExtendedExecutionRead({
      ...input.binding,
      capability:CAPS[criterion.ruleType],
    });
    if(!lease)continue;
    const result=await readAndVerifyExtendedGitHubRule({
      ruleType:criterion.ruleType,
      config,authorization:lease,
      nowIso:new Date().toISOString(),
    });
    if(result.verdict==="UNKNOWN"||
      result.verifiedSha!==input.source.sha || !result.sourceId)
      continue;
    // Only checked provider states can become a versioned rule-specific proof.
    proofs.push({
      kind:"GITHUB_EXTENDED_RULE_RECHECK",
      criterionId:criterion.id,ruleType:criterion.ruleType,
      evidenceId:input.source.evidenceId,
      sourceId:input.source.sourceId,
      repositoryId:input.source.repositoryId,
      checkedAt:new Date().toISOString(),
      expectedSha:input.source.sha,
      providerObjectId:result.sourceId,
      verdict:result.verdict,
      reason:result.reason,
    });
  }
  return proofs;
}
