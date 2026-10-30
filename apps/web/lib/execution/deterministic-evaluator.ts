/**
 * EM-3A deterministic, side-effect-free evaluator.
 *
 * IMPORTANT SECURITY BOUNDARY: Input provider rechecks must be constructed by a
 * trusted SERVER adapter after a fresh, repository-scoped GitHub API request.
 * Cached owner-writable evidence, reviewed links, and this pure helper are not
 * independently a proof of provider authenticity. Do not expose this function
 * as a client-supplied REST/RPC completion endpoint.
 */

export type RuleType =
  | "PR_MERGED"
  | "CHECK_PASSED"
  | "ARTIFACT_EXISTS"
  | "DEPLOY_VERIFIED"
  | "MANUAL_ACCEPTANCE";

export type CriterionVerdict = "PASS" | "FAIL" | "PENDING" | "UNKNOWN";
export type ProgressAvailability = "CALCULATED" | "NOT_CALCULABLE";
export type EvaluationPolicyVersion = "EM3A_V1" | "EM3C_V2";

export type Criterion = {
  id: string;
  ruleType: RuleType;
  isRequired: boolean;
  archived?: boolean;
  ruleConfig?: { expectedSha?: string | null };
};

export type Milestone = {
  id: string;
  weight: number | string;
  archived?: boolean;
  criteria: readonly Criterion[];
};

export type Revision = {
  id: string;
  status: "draft" | "approved";
  version: number;
  milestones: readonly Milestone[];
};

export type SourceAssociation = {
  criterionId: string;
  evidenceId: string;
  sourceId: string;
  repositoryId: string;
  sourceType: "merged_pull_request" | "release";
  reviewStatus: "proposed" | "reviewed" | "rejected";
};

export type FreshProviderRecheck = {
  kind: "GITHUB_PR_MERGE_RECHECK";
  evidenceId: string;
  sourceId: string;
  repositoryId: string;
  checkedAt: string;
  currentSha: string;
  cachedSha: string;
  result: "CURRENT_SOURCE_MATCH" | "UNKNOWN";
};

export type TrustedManualAcceptance = {
  kind: "BUILDER_MANUAL_ACCEPTANCE";
  eventId: string;
  criterionId: string;
  revisionId: string;
  action: "accepted" | "revoked";
  actorBuilderProfileId: string;
  reason: string;
  recordedAt: string;
};

export type RuleAssessment = {
  criterionId: string;
  ruleType: RuleType;
  required: boolean;
  verdict: CriterionVerdict;
  reason: string;
  supportingEvidenceId: string | null;
};

export type MilestoneAssessment = {
  milestoneId: string;
  weightUnits: number;
  verdict: CriterionVerdict;
  criteria: RuleAssessment[];
};

export type ValidProgress = {
  status: "CALCULATED";
  revisionId: string;
  version: number;
  basisPoints: number;
  percent: number;
  completedWeightUnits: number;
  totalWeightUnits: number;
  milestones: MilestoneAssessment[];
  coverage: {
    required: number;
    pass: number;
    fail: number;
    pending: number;
    unknown: number;
  };
  policyVersion: EvaluationPolicyVersion;
};

export type InvalidProgress = {
  status: "NOT_CALCULABLE";
  revisionId: string;
  reason: string;
  policyVersion: EvaluationPolicyVersion;
};
export type ProgressAssessment = ValidProgress | InvalidProgress;

const SHA_40=/^[0-9a-f]{40}$/;
const maxProofAgeMs=5*60*1000;

function parseWeightUnits(weight: number | string): number | null {
  const text=String(weight);
  if (!/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,4})?$/.test(text)) return null;
  const [whole,fraction=""]=text.split(".");
  const units=Number(whole)*10000+Number((fraction+"0000").slice(0,4));
  return Number.isSafeInteger(units) && units>=1 && units<=1000000000
    ? units : null;
}

function isFreshProof(proof: FreshProviderRecheck, nowIso: string) {
  const now=Date.parse(nowIso), checked=Date.parse(proof.checkedAt);
  return Number.isFinite(now) && Number.isFinite(checked) &&
    checked <= now && now-checked <= maxProofAgeMs;
}

function assessCriterion(
  criterion: Criterion,
  revisionId: string,
  associations: readonly SourceAssociation[],
  rechecks: readonly FreshProviderRecheck[],
  manualAcceptances: readonly TrustedManualAcceptance[],
  manualEnabled: boolean,
  nowIso: string,
): RuleAssessment {
  const response=(verdict: CriterionVerdict,reason: string,evidenceId: string | null=null): RuleAssessment=>({
    criterionId:criterion.id,ruleType:criterion.ruleType,
    required:criterion.isRequired,verdict,reason,supportingEvidenceId:evidenceId,
  });

  if (criterion.ruleType === "MANUAL_ACCEPTANCE") {
    if(!manualEnabled)
      return response("UNKNOWN","builder_manual_acceptance_record_not_implemented");
    // Only a trusted server adapter may populate these events from the
    // immutable owner-authorized SQL audit. The helper itself cannot attest
    // the authenticity of caller-supplied objects.
    const matching=manualAcceptances.filter((event)=>
      event.kind==="BUILDER_MANUAL_ACCEPTANCE" &&
      event.criterionId===criterion.id &&
      event.revisionId===revisionId
    );
    if(matching.length===0)
      return response("UNKNOWN","builder_manual_acceptance_record_not_implemented");
    if(matching.length!==1) return response("UNKNOWN","ambiguous_manual_event_snapshot");
    const event=matching[0];
    const eventTime=Date.parse(event.recordedAt);
    const now=Date.parse(nowIso);
    if(!event.eventId || !event.actorBuilderProfileId ||
       event.reason.trim().length<12 || event.reason.length>2000 ||
       !Number.isFinite(eventTime) || eventTime>now)
      return response("UNKNOWN","invalid_builder_manual_event");
    if(event.action==="revoked")
      return response("PENDING","builder_manual_acceptance_revoked");
    if(event.action==="accepted")
      return response("PASS","explicit_builder_manual_acceptance");
    return response("UNKNOWN","invalid_builder_manual_event_action");
  }
  if (criterion.ruleType !== "PR_MERGED")
    return response("UNKNOWN","rule_specific_provider_verifier_not_implemented");

  const linked=associations.filter((association)=>association.criterionId===criterion.id);
  if (!linked.length) return response("PENDING","source_association_missing");
  const reviewed=linked.filter((association)=>association.reviewStatus==="reviewed");
  if (!reviewed.length) return response("PENDING","builder_source_review_missing");

  const expectedSha=criterion.ruleConfig?.expectedSha;
  if (expectedSha !== undefined && expectedSha !== null && !SHA_40.test(expectedSha))
    return response("UNKNOWN","invalid_approved_sha_config");

  let sawUnverified=false;
  for (const link of reviewed) {
    if (link.sourceType !== "merged_pull_request") {
      sawUnverified=true;
      continue;
    }
    const proof=rechecks.find((item)=>
      item.kind==="GITHUB_PR_MERGE_RECHECK" &&
      item.evidenceId===link.evidenceId &&
      item.repositoryId===link.repositoryId &&
      item.sourceId===link.sourceId
    );
    if (!proof) { sawUnverified=true; continue; }
    if (proof.result!=="CURRENT_SOURCE_MATCH" ||
        !SHA_40.test(proof.currentSha) ||
        proof.currentSha!==proof.cachedSha ||
        (expectedSha && proof.currentSha!==expectedSha) ||
        !isFreshProof(proof,nowIso)) {
      sawUnverified=true;
      continue;
    }
    return response("PASS","fresh_exact_merged_pr_sha_with_reviewed_binding",link.evidenceId);
  }

  return response("UNKNOWN",sawUnverified
    ? "provider_recheck_missing_mismatched_or_stale"
    : "unverified_reviewed_association");
}

function milestoneVerdict(criteria: RuleAssessment[]): CriterionVerdict {
  const required=criteria.filter((criterion)=>criterion.required);
  if (required.some((criterion)=>criterion.verdict==="FAIL")) return "FAIL";
  if (required.every((criterion)=>criterion.verdict==="PASS")) return "PASS";
  if (required.some((criterion)=>criterion.verdict==="UNKNOWN")) return "UNKNOWN";
  return "PENDING";
}

export function evaluateApprovedRoadmap(input: {
  revision: Revision;
  associations: readonly SourceAssociation[];
  providerRechecks: readonly FreshProviderRecheck[];
  manualAcceptances?: readonly TrustedManualAcceptance[];
  policyVersion?: "EM3C_V2";
  nowIso: string;
}): ProgressAssessment {
  const { revision, associations, providerRechecks, nowIso }=input;
  const policyVersion:EvaluationPolicyVersion=input.policyVersion??"EM3A_V1";
  const manualAcceptances=policyVersion==="EM3C_V2"?input.manualAcceptances??[]:[];
  const invalid=(reason: string): InvalidProgress=>({
    status:"NOT_CALCULABLE",revisionId:revision.id,reason,policyVersion,
  });

  if (revision.status!=="approved" || !Number.isSafeInteger(revision.version) || revision.version<=0)
    return invalid("revision_not_approved_or_invalid_version");
  if (!Number.isFinite(Date.parse(nowIso))) return invalid("invalid_evaluation_clock");

  const active=revision.milestones.filter((item)=>!item.archived);
  if (!active.length) return invalid("approved_revision_has_no_active_milestones");
  if (new Set(active.map((item)=>item.id)).size!==active.length)
    return invalid("duplicate_milestone_identity");

  let totalWeightUnits=0,completedWeightUnits=0;
  const coverage={required:0,pass:0,fail:0,pending:0,unknown:0};
  const milestones: MilestoneAssessment[]=[];
  const seenCriteria=new Set<string>();
  for (const milestone of active) {
    const weightUnits=parseWeightUnits(milestone.weight);
    if (weightUnits===null) return invalid("missing_or_invalid_explicit_milestone_weight");
    const criteria=milestone.criteria.filter((item)=>!item.archived);
    if (!criteria.some((item)=>item.isRequired))
      return invalid("milestone_missing_required_criterion");
    for (const criterion of criteria) {
      if (seenCriteria.has(criterion.id)) return invalid("duplicate_criterion_identity");
      seenCriteria.add(criterion.id);
    }

    const checked=criteria.map((criterion)=>
      assessCriterion(criterion,revision.id,associations,providerRechecks,manualAcceptances,
        policyVersion==="EM3C_V2",nowIso)
    );
    const verdict=milestoneVerdict(checked);
    totalWeightUnits+=weightUnits;
    if (verdict==="PASS") completedWeightUnits+=weightUnits;
    for (const criterion of checked) {
      if (!criterion.required) continue;
      coverage.required++;
      if (criterion.verdict==="PASS") coverage.pass++;
      if (criterion.verdict==="FAIL") coverage.fail++;
      if (criterion.verdict==="PENDING") coverage.pending++;
      if (criterion.verdict==="UNKNOWN") coverage.unknown++;
    }
    milestones.push({milestoneId:milestone.id,weightUnits,verdict,criteria:checked});
  }

  if (!totalWeightUnits || !Number.isSafeInteger(totalWeightUnits))
    return invalid("invalid_total_weight");

  // Floor to hundredths so incomplete revisions never round up to 100.00%.
  const basisPoints=Math.floor(completedWeightUnits*10000/totalWeightUnits);
  return {
    status:"CALCULATED",revisionId:revision.id,version:revision.version,
    basisPoints,percent:basisPoints/100,
    completedWeightUnits,totalWeightUnits,milestones,coverage,
    policyVersion,
  };
}
