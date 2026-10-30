import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  normalizeMergedPullRequestEvidence,
  normalizeReleaseReference,
} from "../lib/execution/github-evidence-normalize.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const observedAt = "2026-10-30T00:00:00.000Z";
const sha = "f".repeat(40);

const verified = normalizeMergedPullRequestEvidence({
  number: 42,
  merged: true,
  merged_at: "2026-10-29T22:30:00Z",
  merge_commit_sha: sha.toUpperCase(),
  title: "Safe merge",
  html_url: "https://attacker.example/leak",
}, "Example/project", observedAt);
assert.ok(verified);
assert.equal(verified.sourceState, "SOURCE_CONFIRMED");
assert.equal(verified.sourceSha, sha);
assert.equal(verified.sourceUrl, "https://github.com/Example/project/pull/42");
assert.equal(verified.occurredAt, "2026-10-29T22:30:00.000Z");
assert.equal(verified.reason, null);
assert.equal(verified.sourceId, "pr:42");

const incomplete = normalizeMergedPullRequestEvidence({
  number: 7,
  merged: true,
  merged_at: "2026-10-29T22:30:00Z",
  merge_commit_sha: "not-a-sha",
  title: "Missing exact merge commit",
}, "Example/project", observedAt);
assert.equal(incomplete?.sourceState, "UNKNOWN");
assert.equal(incomplete?.sourceSha, null);
assert.equal(incomplete?.reason, "missing_valid_merge_sha_or_timestamp");

assert.equal(normalizeMergedPullRequestEvidence({
  number: 42,
  merged: false,
  merged_at: "2026-10-29T22:30:00Z",
  merge_commit_sha: sha,
}, "Example/project", observedAt), null, "never promote unmerged PR");
assert.equal(normalizeMergedPullRequestEvidence({
  number: 0, merged: true, merged_at: "2026-10-29T22:30:00Z", merge_commit_sha: sha,
}, "Example/project", observedAt), null);
assert.throws(() => normalizeMergedPullRequestEvidence({
  number: 1, merged: true, merge_commit_sha: sha,
}, "evil@example.com/hijack", observedAt), /Untrusted/);

const release = normalizeReleaseReference({
  id: 18,
  name: "v1",
  tag_name: "v1.0",
  draft: false,
  published_at: "2026-10-29T22:30:00Z",
}, "Example/project", observedAt);
assert.equal(release?.sourceState, "UNKNOWN");
assert.equal(release?.sourceSha, null);
assert.equal(release?.reason, "release_tag_revision_and_deployment_not_verified");
assert.equal(normalizeReleaseReference({
  id: 18, tag_name: "v1.0", draft: true,
}, "Example/project", observedAt), null);

const provider = readFileSync(resolve(root, "lib/execution/github-evidence.ts"), "utf8");
const route = readFileSync(resolve(root, "app/api/projects/[projectId]/execution/evidence-preview/route.ts"), "utf8");
const gitHubApi = readFileSync(resolve(root, "lib/github/api.ts"), "utf8");
const page = readFileSync(resolve(root, "app/projects/[projectId]/execution/evidence/page.tsx"), "utf8");
const panel = readFileSync(resolve(root, "components/execution/github-evidence-preview-panel.tsx"), "utf8");

assert.match(provider, /createInstallationAccessToken/);
assert.match(provider, /getGitHub<GitHubPullDetail>/);
assert.match(provider, /detail\.number !== number/);
assert.match(provider, /commitChecks: UNKNOWN_PERMISSION/);
assert.match(provider, /workflowRuns: UNKNOWN_PERMISSION/);
assert.match(provider, /deployment: UNKNOWN_PERMISSION/);
assert.match(provider, /issue: UNKNOWN_PERMISSION/);
assert.match(provider, /source_identity_mismatch/);
assert.match(gitHubApi, /contents: "read"/);
assert.match(gitHubApi, /pull_requests: "read"/);
assert.doesNotMatch(gitHubApi, /checks: "write"|deployments: "write"|actions: "write"/);

assert.match(route, /ensureBuilderContext/);
assert.match(route, /owner_builder_profile_id/);
assert.match(route, /parseCanonicalGitHubRepositoryUrl/);
assert.match(route, /verifyGitHubBindingProof/);
assert.match(route, /cache-Control|Cache-Control/);
assert.match(route, /storageStatus: "NOT_PERSISTED"/);
assert.match(route, /criterionEvaluation: "NOT_AVAILABLE"/);
assert.doesNotMatch(route, /\.insert\(|\.update\(|\.upsert\(|service_role/i);
assert.match(page, /owner_builder_profile_id/);
assert.match(panel, /UNKNOWN/);
assert.match(panel, /이 자료만으로 마일스톤이 완료되었다고 판정하지 않습니다/);

console.log("EM-2A PASS: exact SHA source normalization, unmerged/invalid fail-closed, release unknown, authenticated bound read-only route.");
console.log("No GitHub App permission expansion, persisted evidence, or criterion progress is claimed.");
