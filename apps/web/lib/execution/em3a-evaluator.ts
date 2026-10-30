/**
 * EM-3A: deterministic, side-effect-free evaluation kernel.
 *
 * Source observations, cached execution_evidence rows and SOURCE_CONFIRMED flags
 * must NEVER be translated into VERIFIED attestations by a browser or database
 * client. Only a later server-only exact-source re-read / authorized Builder
 * approval verification adapter may construct the inputs accepted here.
 * This module does not implement that adapter or persist any evaluation.
 */

export const EM3A_RULE_VERSION = "em3a-criterion-v1" as const;

export type CriterionState = "PASS" | "FAIL" | "PENDING" | "UNKNOWN";
export type RuleType =
  | "PR_MERGED"
  | "CHECK_PASSED"
  | "ARTIFACT_EXISTS"
  | "DEPLOY_VERIFIED"
  | "MANUAL_ACCEPTANCE";

type BaseCriterion = {
  id: string;
  projectId: string;
  revisionId: string;
  required: boolean;
};

type GitHubCriterion = BaseCriterion & { repositoryId: string };

export type CompletionCriterion =
  | (GitHubCriterion & {
      rule: "PR_MERGED";
      prNumber: number;
      expectedMergeSha?: string;
    })
  | (GitHubCriterion & {
      rule: "CHECK_PASSED";
      relevantSha: string;
      requiredChecks: string[];
    })
  | (GitHubCriterion & {
      rule: "ARTIFACT_EXISTS";
      artifactName: string;
      artifactVersion: string;
    })
  | (GitHubCriterion & {
      rule: "DEPLOY_VERIFIED";
      environment: string;
      deployedSha: string;
    })
  | (BaseCriterion & {
      rule: "MANUAL_ACCEPTANCE";
      authorizedBuilderProfileId: string;
    });

export type VerifiedFact =
  | {
      rule: "PR_MERGED";
      prNumber: number;
      closed: boolean;
      merged: boolean;
      mergeSha: string | null;
    }
  | {
      rule: "CHECK_PASSED";
      relevantSha: string;
      checks: Array<{ name: string; sha: string; conclusion: "success" | "failure" | "pending" | "unknown" }>;
    }
  | {
      rule: "ARTIFACT_EXISTS";
      artifactName: string;
      version: string;
      exists: boolean;
    }
  | {
      rule: "DEPLOY_VERIFIED";
      environment: string;
      deployedSha: string;
      state: "READY" | "ERROR" | "BUILDING" | "QUEUED";
    }
  | {
      rule: "MANUAL_ACCEPTANCE";
      builderProfileId: string;
      approvedAt: string | null;
      reason: string | null;
      accepted: boolean | null;
    };

/** Server-only attestation contract; this is NOT a browser/API input schema. */
export type ExactSourceAttestation = {
  projectId: string;
  revisionId: string;
  criterionId: string;
  origin: "PROVIDER_EXACT_REREAD" | "BUILDER_APPROVAL_READ";
  status: "VERIFIED" | "PENDING" | "UNKNOWN";
  verifiedAt: string | null;
  expiresAt: string | null;
  repositoryId?: string;
  /** Source SHA observed during a provider re-read, not a cached preview SHA. */
  sourceSha?: string | null;
  fact: VerifiedFact | null;
};

export type CriterionEvaluation = {
  ruleVersion: typeof EM3A_RULE_VERSION;
  projectId: string;
  revisionId: string;
  criterionId: string;
  rule: RuleType;
  state: CriterionState;
  reason: string;
  verifiedAt: string | null;
};

export type ApprovedRoadmapRevision = {
  id: string;
  projectId: string;
  state: "APPROVED" | "DRAFT";
  milestones: Array<{
    id: string;
    weight: number;
    criteria: CompletionCriterion[];
  }>;
};

export type RoadmapProgress = {
  status: "CALCULABLE" | "NOT_CALCULABLE";
  reason: string | null;
  percentage: number | null;
  totalWeight: number | null;
  completeWeight: number;
  completedMilestones: number;
  totalMilestones: number;
  requiredCriteria: number;
  passedCriteria: number;
  unknownCriteria: number;
  pendingCriteria: number;
  failedCriteria: number;
  evaluations: CriterionEvaluation[];
};

const SHA40 = /^[0-9a-f]{40}$/i;
const validId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 200;
const validSha = (value: unknown): value is string =>
  typeof value === "string" && SHA40.test(value);
const sameSha = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

function instant(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19)
    ? parsed
    : null;
}

function result(criterion: CompletionCriterion, state: CriterionState, reason: string, verifiedAt: string | null = null): CriterionEvaluation {
  return {
    ruleVersion: EM3A_RULE_VERSION,
    projectId: criterion.projectId,
    revisionId: criterion.revisionId,
    criterionId: criterion.id,
    rule: criterion.rule,
    state,
    reason,
    verifiedAt,
  };
}

/** No implicit Date.now(), network, database or model call: now is an explicit input. */
export function evaluateCriterion(
  criterion: CompletionCriterion,
  attestation: ExactSourceAttestation | null,
  now: string,
): CriterionEvaluation {
  const nowMs = instant(now);
  if (nowMs === null) return result(criterion, "UNKNOWN", "invalid_evaluation_clock");
  if (!attestation) return result(criterion, "UNKNOWN", "no_verified_evidence");
  if (
    attestation.projectId !== criterion.projectId ||
    attestation.revisionId !== criterion.revisionId ||
    attestation.criterionId !== criterion.id
  ) return result(criterion, "UNKNOWN", "attestation_identity_mismatch");
  if (attestation.status === "UNKNOWN") return result(criterion, "UNKNOWN", "source_unavailable_or_unverifiable");
  if (attestation.status === "PENDING") return result(criterion, "PENDING", "verification_pending");
  if (attestation.status !== "VERIFIED") return result(criterion, "UNKNOWN", "unsupported_verification_status");

  const verifiedMs = instant(attestation.verifiedAt);
  const expiresMs = instant(attestation.expiresAt);
  if (verifiedMs === null || expiresMs === null || verifiedMs > nowMs || expiresMs < nowMs || expiresMs < verifiedMs) {
    return result(criterion, "UNKNOWN", "verification_missing_stale_or_future_dated");
  }
  const checkedAt = attestation.verifiedAt;
  const isManual = criterion.rule === "MANUAL_ACCEPTANCE";
  if (attestation.origin !== (isManual ? "BUILDER_APPROVAL_READ" : "PROVIDER_EXACT_REREAD")) {
    return result(criterion, "UNKNOWN", "untrusted_verification_origin");
  }
  if (!isManual && (attestation.repositoryId !== criterion.repositoryId || !validId(criterion.repositoryId))) {
    return result(criterion, "UNKNOWN", "repository_binding_mismatch");
  }
  const fact = attestation.fact;
  if (!fact || fact.rule !== criterion.rule) return result(criterion, "UNKNOWN", "missing_or_mismatched_verified_fact");

  switch (criterion.rule) {
    case "PR_MERGED": {
      const pr = fact as Extract<VerifiedFact, { rule: "PR_MERGED" }>;
      if (!Number.isSafeInteger(criterion.prNumber) || criterion.prNumber <= 0 || pr.prNumber !== criterion.prNumber) {
        return result(criterion, "UNKNOWN", "pull_request_identity_mismatch");
      }
      if (!pr.merged) return result(criterion, pr.closed ? "FAIL" : "PENDING", pr.closed ? "closed_without_merge" : "pull_request_not_yet_merged", checkedAt);
      if (!validSha(pr.mergeSha) || !validSha(attestation.sourceSha)) return result(criterion, "UNKNOWN", "missing_verified_merge_sha");
      if (!sameSha(pr.mergeSha, attestation.sourceSha)) return result(criterion, "UNKNOWN", "source_sha_conflict");
      if (criterion.expectedMergeSha && (!validSha(criterion.expectedMergeSha) || !sameSha(pr.mergeSha, criterion.expectedMergeSha))) {
        return result(criterion, "FAIL", "expected_merge_sha_mismatch", checkedAt);
      }
      return result(criterion, "PASS", "exact_pull_request_merge_verified", checkedAt);
    }
    case "CHECK_PASSED": {
      const check = fact as Extract<VerifiedFact, { rule: "CHECK_PASSED" }>;
      if (!validSha(criterion.relevantSha) || !validSha(check.relevantSha) || !validSha(attestation.sourceSha)) {
        return result(criterion, "UNKNOWN", "missing_relevant_sha");
      }
      if (!sameSha(criterion.relevantSha, check.relevantSha) || !sameSha(criterion.relevantSha, attestation.sourceSha)) {
        return result(criterion, "UNKNOWN", "relevant_sha_mismatch");
      }
      if (criterion.requiredChecks.length === 0 || new Set(criterion.requiredChecks).size !== criterion.requiredChecks.length || criterion.requiredChecks.some((name) => !validId(name))) {
        return result(criterion, "UNKNOWN", "invalid_required_check_policy");
      }
      let pending = false;
      for (const name of criterion.requiredChecks) {
        const matches = check.checks.filter((item) => item.name === name);
        if (matches.length !== 1 || !validSha(matches[0].sha) || !sameSha(matches[0].sha, criterion.relevantSha)) {
          return result(criterion, "UNKNOWN", "check_missing_duplicated_or_wrong_sha");
        }
        if (matches[0].conclusion === "failure") return result(criterion, "FAIL", "required_check_failed", checkedAt);
        if (matches[0].conclusion === "unknown") return result(criterion, "UNKNOWN", "check_result_unverifiable");
        if (matches[0].conclusion === "pending") pending = true;
        if (matches[0].conclusion !== "success" && matches[0].conclusion !== "pending") return result(criterion, "UNKNOWN", "unrecognized_check_result");
      }
      return result(criterion, pending ? "PENDING" : "PASS", pending ? "required_check_in_progress" : "all_required_checks_passed_at_exact_sha", checkedAt);
    }
    case "ARTIFACT_EXISTS": {
      const artifact = fact as Extract<VerifiedFact, { rule: "ARTIFACT_EXISTS" }>;
      if (!validId(criterion.artifactName) || !validId(criterion.artifactVersion) || !validId(artifact.version)) {
        return result(criterion, "UNKNOWN", "missing_artifact_version_or_name");
      }
      if (artifact.artifactName !== criterion.artifactName) return result(criterion, "UNKNOWN", "artifact_identity_mismatch");
      if (!artifact.exists) return result(criterion, "FAIL", "verified_artifact_absent", checkedAt);
      return result(criterion, artifact.version === criterion.artifactVersion ? "PASS" : "FAIL", artifact.version === criterion.artifactVersion ? "exact_artifact_revision_verified" : "artifact_revision_mismatch", checkedAt);
    }
    case "DEPLOY_VERIFIED": {
      const deploy = fact as Extract<VerifiedFact, { rule: "DEPLOY_VERIFIED" }>;
      if (!validSha(criterion.deployedSha) || !validSha(deploy.deployedSha) || !validSha(attestation.sourceSha) || !validId(criterion.environment)) {
        return result(criterion, "UNKNOWN", "deployment_revision_or_environment_unverifiable");
      }
      if (!sameSha(attestation.sourceSha, deploy.deployedSha)) return result(criterion, "UNKNOWN", "source_sha_conflict");
      if (deploy.environment !== criterion.environment || !sameSha(deploy.deployedSha, criterion.deployedSha)) {
        return result(criterion, "FAIL", "verified_deployment_target_or_revision_mismatch", checkedAt);
      }
      if (deploy.state === "ERROR") return result(criterion, "FAIL", "verified_deployment_failed", checkedAt);
      if (deploy.state === "BUILDING" || deploy.state === "QUEUED") return result(criterion, "PENDING", "deployment_in_progress", checkedAt);
      if (deploy.state !== "READY") return result(criterion, "UNKNOWN", "deployment_state_unverifiable");
      return result(criterion, "PASS", "deployment_ready_at_exact_environment_and_sha", checkedAt);
    }
    case "MANUAL_ACCEPTANCE": {
      const manual = fact as Extract<VerifiedFact, { rule: "MANUAL_ACCEPTANCE" }>;
      if (!validId(criterion.authorizedBuilderProfileId) || manual.builderProfileId !== criterion.authorizedBuilderProfileId) {
        return result(criterion, "UNKNOWN", "builder_approval_actor_not_verified");
      }
      if (manual.accepted === null) return result(criterion, "PENDING", "builder_acceptance_pending", checkedAt);
      if (manual.accepted === false) return result(criterion, "FAIL", "builder_explicitly_rejected", checkedAt);
      const approvedMs = instant(manual.approvedAt);
      if (approvedMs === null || approvedMs > nowMs || approvedMs > verifiedMs || !validId(manual.reason)) {
        return result(criterion, "UNKNOWN", "builder_approval_time_or_reason_missing");
      }
      return result(criterion, "PASS", "authorized_builder_acceptance_verified", checkedAt);
    }
  }
}

/**
 * Evaluate an approved, revision-frozen roadmap. Never take supplied PASS flags:
 * the function derives ALL criterion states from the supplied attestations.
 */
export function evaluateRoadmapProgress(
  revision: ApprovedRoadmapRevision,
  attestations: readonly ExactSourceAttestation[],
  now: string,
): RoadmapProgress {
  const resultBase: RoadmapProgress = {
    status: "NOT_CALCULABLE",
    reason: "invalid_or_unapproved_revision",
    percentage: null,
    totalWeight: null,
    completeWeight: 0,
    completedMilestones: 0,
    totalMilestones: revision.milestones.length,
    requiredCriteria: 0,
    passedCriteria: 0,
    unknownCriteria: 0,
    pendingCriteria: 0,
    failedCriteria: 0,
    evaluations: [],
  };
  if (revision.state !== "APPROVED" || !validId(revision.id) || !validId(revision.projectId) || revision.milestones.length === 0 || instant(now) === null) {
    return resultBase;
  }
  const ids = new Set<string>();
  const criteriaIds = new Set<string>();
  let totalWeight = 0;
  for (const milestone of revision.milestones) {
    if (!validId(milestone.id) || ids.has(milestone.id) || !Number.isSafeInteger(milestone.weight) || milestone.weight <= 0 || milestone.criteria.length === 0) {
      return { ...resultBase, reason: "invalid_milestone_policy" };
    }
    ids.add(milestone.id);
    totalWeight += milestone.weight;
    if (!Number.isSafeInteger(totalWeight)) return { ...resultBase, reason: "invalid_weight_denominator" };
    let requiredCount = 0;
    for (const criterion of milestone.criteria) {
      if (!validId(criterion.id) || criteriaIds.has(criterion.id) || criterion.projectId !== revision.projectId || criterion.revisionId !== revision.id) {
        return { ...resultBase, reason: "invalid_or_cross_scope_criterion" };
      }
      criteriaIds.add(criterion.id);
      if (criterion.required) requiredCount += 1;
    }
    if (requiredCount === 0) return { ...resultBase, reason: "required_criterion_not_defined" };
  }

  const matches = new Map<string, ExactSourceAttestation[]>();
  for (const attestation of attestations) {
    const arr = matches.get(attestation.criterionId) ?? [];
    arr.push(attestation);
    matches.set(attestation.criterionId, arr);
  }
  const output: RoadmapProgress = { ...resultBase, status: "CALCULABLE", reason: null, percentage: 0, totalWeight, evaluations: [] };
  for (const milestone of revision.milestones) {
    const requiredStates: CriterionState[] = [];
    for (const criterion of milestone.criteria) {
      const sourceMatches = matches.get(criterion.id) ?? [];
      const evaluation = sourceMatches.length > 1
        ? result(criterion, "UNKNOWN", "conflicting_duplicate_attestations")
        : evaluateCriterion(criterion, sourceMatches[0] ?? null, now);
      output.evaluations.push(evaluation);
      if (!criterion.required) continue;
      output.requiredCriteria += 1;
      requiredStates.push(evaluation.state);
      if (evaluation.state === "PASS") output.passedCriteria += 1;
      if (evaluation.state === "UNKNOWN") output.unknownCriteria += 1;
      if (evaluation.state === "PENDING") output.pendingCriteria += 1;
      if (evaluation.state === "FAIL") output.failedCriteria += 1;
    }
    if (requiredStates.every((state) => state === "PASS")) {
      output.completeWeight += milestone.weight;
      output.completedMilestones += 1;
    }
  }
  output.percentage = Math.round((10000 * output.completeWeight) / totalWeight) / 100;
  return output;
}
