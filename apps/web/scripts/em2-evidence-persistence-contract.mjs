import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../../..");
function read(path){return readFileSync(resolve(root,path),"utf8");}
const migration=read("supabase/migrations/20261030100000_buildmap_23_execution_evidence_registry.sql");
const route=read("apps/web/app/api/projects/[projectId]/execution/evidence-refresh/route.ts");
const page=read("apps/web/app/projects/[projectId]/execution/evidence/page.tsx");
const panel=read("apps/web/components/execution/github-evidence-preview-panel.tsx");
const scenarios=read("scripts/execution-contract/em2-evidence-scenarios.sql");

for(const name of ["execution_evidence","execution_evidence_observations","criterion_evidence_links"]){
  assert.match(migration,new RegExp("create table public\\."+name+"\\s*\\(","i"));
  assert.match(migration,new RegExp("alter table public\\."+name+" enable row level security","i"));
  assert.match(migration,new RegExp("create policy "+name+".*? on public\\."+name+"[\\s\\S]*?public\\.is_project_owner\\(project_id\\)","i"));
}
assert.match(migration,/unique \(project_id, provider, repository_id, source_type, source_id\)/);
assert.match(migration,/unique \(evidence_id, version_sequence\)/);
assert.match(migration,/v_previous_fingerprint is distinct from v_fingerprint/);
assert.match(migration,/order by version_sequence desc limit 1/);
assert.match(migration,/foreign key \(project_id, criterion_id\)[\s\S]*?public\.completion_criteria\(project_id, id\)/);
assert.match(migration,/foreign key \(project_id, evidence_id\)[\s\S]*?public\.execution_evidence\(project_id, id\)/);
assert.match(migration,/create trigger execution_evidence_snapshot_guard[\s\S]*?before update or delete/);
assert.match(migration,/security invoker[\s\S]*?auth\.uid\(\) is null or not public\.is_project_owner\(p_project_id\)/);
assert.match(migration,/on conflict on constraint execution_evidence_identity_unique/);
assert.match(migration,/on conflict on constraint execution_evidence_observations_dedup_unique/);
assert.match(migration,/CACHED_UNTRUSTED/);
assert.match(migration,/criterionEvaluation','NOT_AVAILABLE'/);
assert.match(migration,/grant select, insert on table public\.execution_evidence_observations to authenticated/);
assert.doesNotMatch(migration,/create (?:table|function) public\.criterion_evaluations/i);
assert.doesNotMatch(migration,/\bservice_role\b|client_secret|access_token/i);
assert.doesNotMatch(migration,/(?:insert|update|alter table)\s+public\.(?:change_cards|capture_source_refs)\b/i);
assert.match(route,/request\.headers\.get\("origin"\) !== request\.nextUrl\.origin/);
assert.match(route,/supabase\.auth\.getUser\(\)/);
assert.match(route,/owner_builder_profile_id/);
assert.match(route,/verifyGitHubBindingProof/);
assert.match(route,/parseCanonicalGitHubRepositoryUrl/);
assert.match(route,/readGitHubExecutionEvidencePreview/);
assert.match(route,/supabase\.rpc\("execution_record_evidence_batch"/);
assert.ok(route.indexOf("verifyGitHubBindingProof")<route.indexOf("readGitHubExecutionEvidencePreview"));
assert.ok(route.indexOf("readGitHubExecutionEvidencePreview")<route.indexOf('supabase.rpc("execution_record_evidence_batch"'));
assert.match(route,/storageStatus: "CACHED_UNTRUSTED"/);
assert.match(route,/criterionEvaluation: "NOT_AVAILABLE"/);
assert.match(route,/progress: "NOT_CALCULABLE"/);
assert.doesNotMatch(route,/service_role|SERVICE_ROLE|createServiceClient|\.from\("criterion_evaluations"\)/);
assert.match(panel,/evidence-refresh/);
assert.match(panel,/router\.refresh\(\)/);
assert.match(panel,/완료 판정에는 반영되지 않습니다/);
assert.match(page,/execution_evidence_observations/);
assert.match(page,/과거 관측 캐시/);
assert.match(scenarios,/SHA changed but source revision snapshot missing/);
assert.match(scenarios,/partially persisted source batch/);
assert.match(scenarios,/cross-project write through RPC/);
assert.match(scenarios,/anon can invoke batch recording/);

console.log("EM2B_STATIC_CONTRACT_PASS");
console.log("Evidence identity/version dedup, RLS, binding-first refresh and NOT_AVAILABLE completion boundaries checked.");
console.log("This static test does not replace PostgreSQL or real Supabase/Auth tests.");
