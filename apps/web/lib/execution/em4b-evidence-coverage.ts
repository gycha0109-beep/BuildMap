/**
 * EM-4B read-only *linkage coverage*, not completion/progress evaluation.
 * Reviewed association != fresh GitHub source != verified criterion PASS.
 */
export type CoverageMilestone = {
  id: string;
  title: string;
  weight: number | string;
};
export type CoverageCriterion = {
  id: string;
  milestone_id: string;
  title: string;
  rule_type: string;
  is_required: boolean;
};
export type CoverageLink = {
  id: string;
  criterion_id: string;
  review_status: string;
};

export type CoverageRow = {
  id: string;
  milestoneId: string;
  title: string;
  ruleType: string;
  required: boolean;
  /** This UI deliberately does not receive verified provider attestations. */
  completion: "UNKNOWN";
  linkage: "NO_LINK" | "AWAITING_REVIEW" | "REJECTED_ONLY" | "REVIEWED_LINK_ONLY";
  reviewedLinks: number;
  proposedLinks: number;
  rejectedLinks: number;
};

export type CoverageSummary = {
  completeness: "COMPLETE" | "INCOMPLETE";
  criterionCount: number | null;
  unknownCount: number | null;
  reviewedLinkCriterionCount: number | null;
  unreviewedCriterionCount: number | null;
  rows: CoverageRow[];
};

const incomplete = (): CoverageSummary => ({
  completeness: "INCOMPLETE",
  criterionCount: null,
  unknownCount: null,
  reviewedLinkCriterionCount: null,
  unreviewedCriterionCount: null,
  rows: [],
});

export function summarizeEvidenceLinkage(input: {
  completeRead: boolean;
  milestones: CoverageMilestone[];
  criteria: CoverageCriterion[];
  links: CoverageLink[];
}): CoverageSummary {
  const { milestones, criteria, links } = input;
  if (!input.completeRead || !Array.isArray(milestones) || !Array.isArray(criteria) ||
      !Array.isArray(links) || milestones.length === 0 || criteria.length === 0) return incomplete();

  const milestoneIds = new Set<string>();
  for (const item of milestones) {
    if (!item || typeof item.id !== "string" || !item.id ||
        milestoneIds.has(item.id) || typeof item.title !== "string" ||
        !Number.isFinite(Number(item.weight)) || Number(item.weight) <= 0) return incomplete();
    milestoneIds.add(item.id);
  }

  const criterionIds = new Set<string>();
  for (const item of criteria) {
    if (!item || typeof item.id !== "string" || !item.id || criterionIds.has(item.id) ||
        !milestoneIds.has(item.milestone_id) || typeof item.title !== "string" ||
        typeof item.rule_type !== "string" || typeof item.is_required !== "boolean") return incomplete();
    criterionIds.add(item.id);
  }
  const linkIds = new Set<string>();
  const grouped = new Map<string, { reviewed: number; proposed: number; rejected: number }>();
  for (const link of links) {
    if (!link || typeof link.id !== "string" || !link.id || linkIds.has(link.id) ||
        !criterionIds.has(link.criterion_id) ||
        !["reviewed", "proposed", "rejected"].includes(link.review_status)) return incomplete();
    linkIds.add(link.id);
    const entry = grouped.get(link.criterion_id) ?? { reviewed: 0, proposed: 0, rejected: 0 };
    if (link.review_status === "reviewed") entry.reviewed++;
    if (link.review_status === "proposed") entry.proposed++;
    if (link.review_status === "rejected") entry.rejected++;
    grouped.set(link.criterion_id, entry);
  }
  const rows: CoverageRow[] = criteria.map((criterion) => {
    const counts = grouped.get(criterion.id) ?? { reviewed: 0, proposed: 0, rejected: 0 };
    const linkage: CoverageRow["linkage"] = counts.reviewed > 0 ? "REVIEWED_LINK_ONLY" :
      counts.proposed > 0 ? "AWAITING_REVIEW" :
      counts.rejected > 0 ? "REJECTED_ONLY" : "NO_LINK";
    return {
      id: criterion.id,
      milestoneId: criterion.milestone_id,
      title: criterion.title,
      ruleType: criterion.rule_type,
      required: criterion.is_required,
      completion: "UNKNOWN",
      linkage,
      reviewedLinks: counts.reviewed,
      proposedLinks: counts.proposed,
      rejectedLinks: counts.rejected,
    };
  });
  const reviewedCount = rows.filter((row) => row.reviewedLinks > 0).length;
  return {
    completeness: "COMPLETE",
    criterionCount: rows.length,
    unknownCount: rows.length,
    reviewedLinkCriterionCount: reviewedCount,
    unreviewedCriterionCount: rows.length - reviewedCount,
    rows,
  };
}
