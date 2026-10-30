import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { composeFreshPrRecheck } from "../lib/execution/em3b-proof-guard.ts";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const LINK = "22222222-2222-4222-8222-222222222222";
const CRITERION = "33333333-3333-4333-8333-333333333333";
const EVIDENCE = "44444444-4444-4444-8444-444444444444";
const REVISION = "55555555-5555-4555-8555-555555555555";
const USER = "66666666-6666-4666-8666-666666666666";
const PROFILE = "77777777-7777-4777-8777-777777777777";
const BUILDER = "88888888-8888-4888-8888-888888888888";
const SHA = "a".repeat(40);
const input = { projectId: PROJECT, linkId: LINK, criterionId: CRITERION, evidenceId: EVIDENCE };
const source = readFileSync(new URL("../lib/execution/em3b-authorized-pr-recheck.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  return {
    user_profiles: [{ id: PROFILE, auth_user_id: USER }],
    builder_profiles: [{ id: BUILDER, user_profile_id: PROFILE }],
    projects: [{ id: PROJECT, owner_builder_profile_id: BUILDER, archived_at: null }],
    completion_criteria: [{ id: CRITERION, project_id: PROJECT, roadmap_revision_id: REVISION, rule_type: "PR_MERGED", archived_at: null }],
    roadmap_revisions: [{ id: REVISION, project_id: PROJECT, status: "approved", approved_at: "2026-10-30T01:00:00Z", approved_by_builder_profile_id: BUILDER }],
    criterion_evidence_links: [{ project_id: PROJECT, criterion_id: CRITERION, evidence_id: EVIDENCE, review_status: "reviewed", reviewed_by_builder_profile_id: BUILDER, reviewed_at: "2026-10-30T02:00:00Z" }],
    project_links: [{ id: LINK, project_id: PROJECT, link_type: "github", archived_at: null, url: "https://github.com/Example/project" }],
    integration_bindings: [{ project_link_id: LINK, provider: "github", status: "active", archived_at: null, external_connection_id: "222", external_resource_id: "333", external_resource_label: "Example/project", binding_proof: "server-sealed" }],
    execution_evidence: [{ id: EVIDENCE, project_id: PROJECT, provider: "github", repository_id: 333, repository_name: "Example/project", source_type: "merged_pull_request", source_id: "pr:42" }],
    execution_evidence_observations: [{ project_id: PROJECT, evidence_id: EVIDENCE, source_state: "SOURCE_CONFIRMED", source_sha: SHA, version_sequence: 3 }],
  };
}

function makeHarness({
  rows = fixture(),
  signedIn = true,
  configured = true,
  proofValid = true,
  installationMatch = true,
  repositoryMatch = true,
  sourceState = "CURRENT_SOURCE_MATCH",
  liveSha = SHA,
  providerError = false,
  databaseErrorTable = null,
} = {}) {
  const counters = { queries: [], diagnostic: 0, sourceRead: 0, configChecks: 0, proofChecks: 0, writes: 0 };
  class Query {
    constructor(table) { this.table = table; this.predicates = []; }
    select() { return this; }
    eq(field, value) { this.predicates.push((r) => r[field] === value); return this; }
    is(field, value) { this.predicates.push((r) => r[field] === value); return this; }
    order() { return this; }
    limit() { return this; }
    insert() { counters.writes++; throw Error("unexpected mutation"); }
    update() { counters.writes++; throw Error("unexpected mutation"); }
    upsert() { counters.writes++; throw Error("unexpected mutation"); }
    delete() { counters.writes++; throw Error("unexpected mutation"); }
    async maybeSingle() {
      counters.queries.push(this.table);
      if (databaseErrorTable === this.table) return { data: null, error: { code: "db_error" } };
      const found = (rows[this.table] || []).filter((r) => this.predicates.every((test) => test(r)));
      if (found.length > 1) return { data: null, error: { code: "multiple_rows" } };
      return { data: found[0] || null, error: null };
    }
  }
  const db = {
    auth: { async getUser() { return { data: { user: signedIn ? { id: USER } : null }, error: null }; } },
    from(table) { if (!Object.hasOwn(rows, table)) throw Error("unexpected table " + table); return new Query(table); },
    rpc() { counters.writes++; throw Error("unexpected RPC"); },
  };
  const deps = {
    "server-only": {},
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/github/app": {
      isGitHubAppConfigured: () => { counters.configChecks++; return configured; },
      verifyGitHubBindingProof: (identity, proof) => {
        counters.proofChecks++;
        assert.deepEqual(JSON.parse(JSON.stringify(identity)), {
          projectLinkId: LINK,
          installationId: "222",
          repositoryId: "333",
          fullName: "Example/project",
        });
        return proofValid && proof === "server-sealed";
      },
    },
    "@/lib/github/repository": {
      parseCanonicalGitHubRepositoryUrl: (url) => url === "https://github.com/Example/project" ?
        { owner: "Example", repository: "project", fullName: "Example/project" } : null,
    },
    "./github-installation-diagnostic": {
      inspectGitHubExecutionInstallation: async (bound) => {
        counters.diagnostic++;
        assert.deepEqual(JSON.parse(JSON.stringify(bound)), {
          installationId: "222", repositoryId: "333", owner: "Example", repository: "project",
        });
        if (providerError) throw Error("provider unavailable");
        return {
          installationIdentity: installationMatch ? "MATCH" : "UNKNOWN",
          repositoryIdentity: repositoryMatch ? "MATCH" : "UNKNOWN",
        };
      },
    },
    "./github-source-health": {
      inspectExecutionSourceHealth: async (bound) => {
        counters.sourceRead++;
        assert.deepEqual(JSON.parse(JSON.stringify(bound)), {
          installationId: "222", repositoryId: "333", owner: "Example", repository: "project",
          sourceType: "merged_pull_request", sourceId: "pr:42", cachedSha: SHA,
        });
        if (providerError) throw Error("pull detail unavailable");
        return {
          sourceId: "pr:42",
          sourceState,
          checkedAt: new Date().toISOString(),
          currentSha: liveSha,
          cachedSha: SHA,
        };
      },
    },
    "./em3b-proof-guard": { composeFreshPrRecheck },
  };
  const exports = {};
  vm.runInNewContext(transpiled, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(deps, name), "unknown dependency " + name);
      return deps[name];
    },
    Date,
  }, { timeout: 3000 });
  return { run: (value = input) => exports.readAuthorizedExecutionPrRecheck(value), counters };
}

let count = 0;
async function denied(name, options, { diagnostic = 0, sourceRead = 0 } = {}) {
  const h = makeHarness(options);
  assert.equal(await h.run(), null, name + ": must return UNKNOWN/null");
  assert.equal(h.counters.diagnostic, diagnostic, name + ": unexpected installation read");
  assert.equal(h.counters.sourceRead, sourceRead, name + ": unexpected exact PR read");
  assert.equal(h.counters.writes, 0, name + ": unexpected database write");
  count++;
}

const happy = makeHarness();
const proof = await happy.run();
assert.ok(proof);
assert.equal(proof.kind, "GITHUB_PR_MERGE_RECHECK");
assert.equal(proof.result, "CURRENT_SOURCE_MATCH");
assert.equal(proof.repositoryId, "333");
assert.equal(proof.currentSha, SHA);
assert.equal(happy.counters.diagnostic, 1);
assert.equal(happy.counters.sourceRead, 1);
assert.equal(happy.counters.writes, 0);
count++;

const invalidId = makeHarness();
assert.equal(await invalidId.run({ ...input, projectId: "not-a-uuid" }), null);
assert.equal(invalidId.counters.queries.length, 0);
assert.equal(invalidId.counters.diagnostic, 0);
count++;

await denied("missing user", { signedIn: false });
await denied("missing provider config", { configured: false });
await denied("no user profile", { rows: { ...fixture(), user_profiles: [] } });
await denied("wrong owner", { rows: { ...fixture(), projects: [{ ...fixture().projects[0], owner_builder_profile_id: PROFILE }] } });
await denied("archived project", { rows: { ...fixture(), projects: [{ ...fixture().projects[0], archived_at: "2026-10-29T00:00:00Z" }] } });
await denied("draft revision", { rows: { ...fixture(), roadmap_revisions: [{ ...fixture().roadmap_revisions[0], status: "draft" }] } });
await denied("wrong criterion type", { rows: { ...fixture(), completion_criteria: [{ ...fixture().completion_criteria[0], rule_type: "CHECK_PASSED" }] } });
await denied("cross-project criterion", { rows: { ...fixture(), completion_criteria: [{ ...fixture().completion_criteria[0], project_id: LINK }] } });
await denied("no reviewer", { rows: { ...fixture(), criterion_evidence_links: [{ ...fixture().criterion_evidence_links[0], review_status: "proposed" }] } });
await denied("different reviewer", { rows: { ...fixture(), criterion_evidence_links: [{ ...fixture().criterion_evidence_links[0], reviewed_by_builder_profile_id: PROFILE }] } });
await denied("cross-project link", { rows: { ...fixture(), criterion_evidence_links: [{ ...fixture().criterion_evidence_links[0], project_id: LINK }] } });
await denied("disconnected binding", { rows: { ...fixture(), integration_bindings: [{ ...fixture().integration_bindings[0], status: "inactive" }] } });
await denied("forged binding", { proofValid: false });
await denied("wrong repository number", { rows: { ...fixture(), execution_evidence: [{ ...fixture().execution_evidence[0], repository_id: 999 }] } });
await denied("cross-repo source", { rows: { ...fixture(), execution_evidence: [{ ...fixture().execution_evidence[0], repository_name: "Other/project" }] } });
await denied("release not PR", { rows: { ...fixture(), execution_evidence: [{ ...fixture().execution_evidence[0], source_type: "release" }] } });
await denied("cache UNKNOWN", { rows: { ...fixture(), execution_evidence_observations: [{ ...fixture().execution_evidence_observations[0], source_state: "UNKNOWN" }] } });
await denied("no cached source", { rows: { ...fixture(), execution_evidence_observations: [] } });
await denied("missing RLS table", { databaseErrorTable: "execution_evidence_observations" });
await denied("invalid installation", { installationMatch: false }, { diagnostic: 1 });
await denied("wrong live repository", { repositoryMatch: false }, { diagnostic: 1 });
await denied("provider error", { providerError: true }, { diagnostic: 1 });
await denied("live SHA drift", { liveSha: "b".repeat(40) }, { diagnostic: 1, sourceRead: 1 });
await denied("source detail UNKNOWN", { sourceState: "UNKNOWN" }, { diagnostic: 1, sourceRead: 1 });

console.log("EM3B_SERVER_AUTHORITY_RUNTIME_MATRIX = PASS (" + count + " cases)");
console.log("EM3B_BUILDER_RLS_REVISION_REVIEW_HMAC_BOUNDARIES = PASS");
console.log("EM3B_FRESH_PR_SOURCE_DRIFT_AND_OUTAGE = UNKNOWN");
console.log("EM3B_DATABASE_WRITE_COUNT = 0");
console.log("EM3B_REAL_GITHUB_APP_AND_HOSTED_AUTH_E2E = NOT_TESTED");
