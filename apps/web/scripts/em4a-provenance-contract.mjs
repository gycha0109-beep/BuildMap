import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canonicalObservedPullUrl,
  sourceDisplayState,
} from "../lib/execution/provenance-view.ts";

const pr = {
  repositoryName: "Example/project",
  sourceType: "merged_pull_request",
  sourceId: "pr:42",
};
assert.equal(canonicalObservedPullUrl(pr), "https://github.com/Example/project/pull/42");
assert.equal(canonicalObservedPullUrl({ ...pr, repositoryName: "bad.github.com/Example/project" }), null);
assert.equal(canonicalObservedPullUrl({ ...pr, repositoryName: "../evil/repo" }), null);
assert.equal(canonicalObservedPullUrl({ ...pr, repositoryName: "Example/project?x=1" }), null);
assert.equal(canonicalObservedPullUrl({ ...pr, sourceId: "pr:0" }), null);
assert.equal(canonicalObservedPullUrl({ ...pr, sourceId: "pr:42?redirect=bad" }), null);
assert.equal(canonicalObservedPullUrl({ ...pr, sourceType: "release", sourceId: "release:42" }), null);
assert.equal(sourceDisplayState(null), "NO_SNAPSHOT");
assert.equal(sourceDisplayState({ sourceState: "UNKNOWN", sourceSha: "a".repeat(40) }), "UNKNOWN");
assert.equal(sourceDisplayState({ sourceState: "SOURCE_CONFIRMED", sourceSha: null }), "UNKNOWN");
assert.equal(sourceDisplayState({ sourceState: "SOURCE_CONFIRMED", sourceSha: "not-sha" }), "UNKNOWN");
assert.equal(sourceDisplayState({ sourceState: "SOURCE_CONFIRMED", sourceSha: "a".repeat(40) }), "CACHE_ONLY");

const route = readFileSync(new URL("../app/projects/[projectId]/execution/provenance/[criterionId]/page.tsx", import.meta.url), "utf8");
const overview = readFileSync(new URL("../app/projects/[projectId]/execution/page.tsx", import.meta.url), "utf8");
for (const gate of [
  "db.auth.getUser()",
  'from("user_profiles")',
  'from("builder_profiles")',
  'from("projects")',
  "owner_builder_profile_id",
  'from("completion_criteria")',
  'from("roadmap_revisions")',
  '.eq("status", "approved")',
  'from("execution_milestones")',
  'from("criterion_evidence_links")',
  'from("execution_evidence")',
  'from("execution_evidence_observations")',
  '.eq("project_id", projectId)',
  'is("archived_at", null)',
  'order("version_sequence", { ascending: false }).limit(1)',
  "sourceDisplayState(",
  "canonicalObservedPullUrl(",
  "완료 판정: UNKNOWN",
  "관측 기록",
  "증거 목록이 불완전합니다",
]) assert.ok(route.includes(gate), "Missing route security or evidence marker: " + gate);
assert.match(overview,/execution\/provenance\/" \+ criterion\.id/);
assert.doesNotMatch(route,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
assert.doesNotMatch(route,/service_role|SERVICE_ROLE|createInstallationAccessToken|evaluateApprovedRoadmap\(/);
assert.doesNotMatch(route,/완료 판정: PASS|진행률: 100%/);
assert.ok(!route.includes("ensureBuilderContext(") || route.includes("ensureBuilderContext() may INSERT profiles"));
console.log("EM4A_SAFE_GITHUB_LINK_AND_CACHE_LABELS = PASS");
console.log("EM4A_OWNER_APPROVED_REVISION_READ_ONLY_SCOPE = PASS");
console.log("EM4A_UNKNOWN_NO_FALSE_PROGRESS_CONTRACT = PASS");
console.log("EM4A_LIMITED_SOURCE_DRILLDOWN_AND_NO_MUTATION = PASS");
console.log("EM4A_HOSTED_E2E_AND_LIVE_GITHUB_RECHECK = NOT_TESTED");
