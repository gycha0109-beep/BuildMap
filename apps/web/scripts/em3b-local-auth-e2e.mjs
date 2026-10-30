import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { composeFreshPrRecheck } from "../lib/execution/em3b-proof-guard.ts";

const url = process.env.API_URL, key = process.env.ANON_KEY;
if (!url || !key || !/^http:\/\/127\.0\.0\.1:\d+/.test(url)) {
  throw Error("EM3B requires disposable local Supabase GoTrue + PostgREST");
}
const OWNER = "00000000-0000-4000-8000-000000000511";
const BUILDER = "00000000-0000-4000-8000-000000000411";
const OTHER = "00000000-0000-4000-8000-000000000522";
const PROOF = "em3b-test-fixture-binding-proof-not-credential";
const LOGIN_PASSWORD = "Em1-safe-test-password-2026!";
function client() {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function good(result, label) {
  if (result.error) throw Error(label + ": " + result.error.message);
  return result.data;
}
const owner = client(), other = client(), anon = client();
good(await owner.auth.signInWithPassword({ email: "em1-owner@example.invalid", password: LOGIN_PASSWORD }), "owner login");
good(await other.auth.signInWithPassword({ email: "em1-other@example.invalid", password: LOGIN_PASSWORD }), "other login");

const approved = good(await owner.from("roadmap_revisions")
  .select("id").eq("project_id", OWNER).eq("status", "approved").single(), "approved revision");
const criterion = good(await owner.from("completion_criteria")
  .select("id,rule_type").eq("project_id", OWNER).eq("roadmap_revision_id", approved.id)
  .eq("rule_type", "PR_MERGED").single(), "approved merged PR criterion");
assert.equal(criterion.rule_type, "PR_MERGED");
const evidence = good(await owner.from("execution_evidence")
  .select("id,source_id,repository_id").eq("project_id", OWNER)
  .eq("source_id", "pr:42").single(), "saved source");
assert.equal(evidence.repository_id, 12345);
const latest = good(await owner.from("execution_evidence_observations")
  .select("source_sha,source_state,version_sequence").eq("project_id", OWNER)
  .eq("evidence_id", evidence.id).order("version_sequence", { ascending: false })
  .limit(1).single(), "latest cached snapshot");
assert.equal(latest.source_state, "SOURCE_CONFIRMED");
assert.equal(latest.source_sha, "b".repeat(40), "EM2B A-to-B fixture expected");

let reviewed = good(await owner.from("criterion_evidence_links")
  .select("id,review_status,reviewed_by_builder_profile_id")
  .eq("project_id", OWNER).eq("criterion_id", criterion.id)
  .eq("evidence_id", evidence.id).maybeSingle(), "reviewed association lookup");
if (!reviewed) {
  const inserted = good(await owner.from("criterion_evidence_links")
    .insert({ project_id: OWNER, criterion_id: criterion.id, evidence_id: evidence.id })
    .select("id").single(), "propose local-only reviewed association");
  reviewed = good(await owner.from("criterion_evidence_links")
    .update({ review_status: "reviewed", reviewed_by_builder_profile_id: BUILDER })
    .eq("id", inserted.id).select("id,review_status,reviewed_by_builder_profile_id").single(),
  "approve local-only association");
}
assert.equal(reviewed.review_status, "reviewed");
assert.equal(reviewed.reviewed_by_builder_profile_id, BUILDER);

const link = good(await owner.from("project_links").insert({
  project_id: OWNER, created_by_builder_profile_id: BUILDER,
  label: "EM3B local-only repository", url: "https://github.com/Example/project",
  link_type: "github",
}).select("id").single(), "local-only GitHub project link");
const binding = good(await owner.from("integration_bindings").insert({
  project_link_id: link.id, created_by_builder_profile_id: BUILDER,
  provider: "github", external_connection_id: "222",
  external_resource_id: "12345", external_resource_label: "Example/project",
  binding_proof: PROOF, status: "active",
}).select("id").single(), "local-only GitHub integration binding");

const input = { projectId: OWNER, linkId: link.id, criterionId: criterion.id, evidenceId: evidence.id };
const src = readFileSync(new URL("../lib/execution/em3b-authorized-pr-recheck.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function createHarness(db, options = {}) {
  const calls = { installation: 0, pr: 0, signatures: 0 };
  const modules = {
    "server-only": {},
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/github/app": {
      isGitHubAppConfigured: () => options.configured !== false,
      verifyGitHubBindingProof: (identity, proof) => {
        calls.signatures++;
        assert.equal(identity.projectLinkId, link.id);
        assert.equal(identity.repositoryId, "12345");
        return options.proofValid !== false && proof === PROOF;
      },
    },
    "@/lib/github/repository": {
      parseCanonicalGitHubRepositoryUrl: (raw) =>
        raw === "https://github.com/Example/project" ?
          { owner: "Example", repository: "project", fullName: "Example/project" } : null,
    },
    "./github-installation-diagnostic": {
      inspectGitHubExecutionInstallation: async (args) => {
        calls.installation++;
        assert.equal(args.repositoryId, "12345");
        assert.equal(args.installationId, "222");
        if (options.providerUnavailable) throw Error("offline");
        return {
          installationIdentity: "MATCH",
          repositoryIdentity: options.repositoryMismatch ? "UNKNOWN" : "MATCH",
        };
      },
    },
    "./github-source-health": {
      inspectExecutionSourceHealth: async (args) => {
        calls.pr++;
        assert.equal(args.sourceId, "pr:42");
        assert.equal(args.cachedSha, latest.source_sha);
        if (options.providerUnavailable) throw Error("offline");
        return {
          sourceId: args.sourceId,
          sourceState: options.sourceUnknown ? "UNKNOWN" : "CURRENT_SOURCE_MATCH",
          checkedAt: new Date().toISOString(),
          cachedSha: args.cachedSha,
          currentSha: options.shaDrift ? "a".repeat(40) : args.cachedSha,
        };
      },
    },
    "./em3b-proof-guard": { composeFreshPrRecheck },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Date,
    require(name) {
      assert.ok(Object.hasOwn(modules, name), "Unknown module " + name);
      return modules[name];
    },
  });
  return { run: () => exports.readAuthorizedExecutionPrRecheck(input), calls };
}

async function expectDenied(label, db, options = {}, expected = { installation: 0, pr: 0 }) {
  const h = createHarness(db, options);
  assert.equal(await h.run(), null, label);
  assert.equal(h.calls.installation, expected.installation, label + ": installation call");
  assert.equal(h.calls.pr, expected.pr, label + ": unexpected PR call");
}

const allowed = createHarness(owner);
const valid = await allowed.run();
assert.ok(valid, "real owner JWT, RLS rows, and mock exact PR read should produce provisional proof");
assert.equal(valid.repositoryId, "12345");
assert.equal(valid.sourceId, "pr:42");
assert.equal(valid.currentSha, latest.source_sha);
assert.equal(allowed.calls.installation, 1);
assert.equal(allowed.calls.pr, 1);

await expectDenied("anonymous blocked before provider", anon);
await expectDenied("other Builder cross-project blocked before provider", other);
await expectDenied("unavailable installation", owner, { providerUnavailable: true }, { installation: 1, pr: 0 });
await expectDenied("repository identity mismatch", owner, { repositoryMismatch: true }, { installation: 1, pr: 0 });
await expectDenied("live PR SHA drift", owner, { shaDrift: true }, { installation: 1, pr: 1 });
await expectDenied("source detail unavailable", owner, { sourceUnknown: true }, { installation: 1, pr: 1 });
await expectDenied("HMAC verification rejected", owner, { proofValid: false });

good(await owner.from("integration_bindings").update({ status: "disconnected" })
  .eq("id", binding.id).select("id").single(), "disconnect only local binding");
await expectDenied("disconnected binding", owner);
good(await owner.from("integration_bindings").update({ status: "active" })
  .eq("id", binding.id).select("id").single(), "restore local binding");

good(await owner.from("project_links").update({ archived_at: new Date().toISOString() })
  .eq("id", link.id).select("id").single(), "archive local link");
await expectDenied("archived link", owner);

console.log("EM3B_LOCAL_GOTRUE_POSTGREST_ADAPTER_E2E_PASS");
console.log("Real local JWT/RLS authorization and approved revision/source review read; stubbed GitHub/HMAC only.");
console.log("Cross-owner/anon denied, revoked binding and link denied, provider outage/SHA drift UNKNOWN.");
console.log("HOSTED_SUPABASE_AND_LIVE_GITHUB_APP_NOT_TESTED");
