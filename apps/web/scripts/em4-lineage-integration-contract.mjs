import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");

const overview = file("../app/projects/[projectId]/execution/page.tsx");
const provenance = file("../app/projects/[projectId]/execution/provenance/[criterionId]/page.tsx");
const coverage = file("../app/projects/[projectId]/execution/coverage/[revisionId]/page.tsx");
const evidence = file("../app/projects/[projectId]/execution/evidence/page.tsx");
const trusted = file("../lib/execution/trusted-evaluation-server.ts");
const readiness = file("../app/api/projects/[projectId]/execution/verification-readiness/route.ts");
const migration = file("../../../supabase/migrations/20261030130000_buildmap_24_execution_manual_acceptance.sql");

for (const path of ["execution/provenance/", "execution/coverage/"]) {
  assert.ok(overview.includes(path), "Approved roadmap must link to " + path);
}
assert.ok(provenance.includes("완료 판정: UNKNOWN"));
assert.ok(coverage.includes("완료 평가: UNKNOWN"));
assert.ok(coverage.includes("공식 진행률: 미공개"));
assert.ok(coverage.includes("coverage.completeness"));
assert.ok(!/진행률: [0-9]/.test(coverage), "Never invent official progress");
assert.ok(coverage.includes("const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;"));

for (const fragment of [
  "ManualAcceptancePanel", "recordManualAcceptanceAction",
  "execution_manual_acceptance_events",
]) assert.ok(evidence.includes(fragment), "Preserve EM-3C manual acceptance: " + fragment);
assert.ok(migration.includes("execution_manual_acceptance_events"));

assert.ok(trusted.includes('import "server-only"'));
assert.ok(trusted.includes("verifyGitHubBindingProof"));
assert.ok(trusted.includes("inspectExecutionSourceHealth"));
assert.ok(readiness.includes("NOT_PUBLISHED"), "No public numerical readiness");
for(const page of [provenance, coverage]) {
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  assert.doesNotMatch(page, /createInstallationAccessToken|service_role|SERVICE_ROLE/);
  assert.doesNotMatch(page, /evaluateApprovedRoadmap\(|computeTrustedExecutionReadiness\(/);
}
console.log("EM4_CANONICAL_LINEAGE_UI_4A_4B = PASS");
console.log("EM4_CANONICAL_LINEAGE_EM3B_TRUSTED_AND_EM3C_MANUAL_PRESERVED = PASS");
console.log("EM4_CANONICAL_LINEAGE_READ_ONLY_AND_NO_FALSE_PROGRESS = PASS");
console.log("EM4_CANONICAL_LINEAGE_HOSTED_GITHUB_APP_ACCEPTANCE = NOT_TESTED");
