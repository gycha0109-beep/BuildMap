import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const migrations = resolve(here, "../../../supabase/migrations");
const filename = "20261029053000_buildmap_22_execution_roadmap_foundation.sql";
const sql = readFileSync(resolve(migrations, filename), "utf8");

const tables = [
  "execution_tracks",
  "roadmap_revisions",
  "execution_milestones",
  "completion_criteria",
];
const expect = (pattern, description) => assert.match(sql, pattern, description);

assert.ok(
  readdirSync(migrations).filter((name) => name.endsWith(".sql")).includes(filename),
  "EM-1A additive migration must remain present even after later EM phases",
);
expect(/^\s*begin;\s*$/im, "migration must begin atomically");
expect(/^\s*commit;\s*$/im, "migration must commit atomically");

for (const table of tables) {
  expect(new RegExp("create table public\\." + table + "\\s*\\(", "i"), table + " missing");
  expect(new RegExp("alter table public\\." + table + " enable row level security", "i"), table + " missing RLS");
  for (const operation of ["select", "insert", "update"]) {
    expect(
      new RegExp("create policy \\w+\\s+on public\\." + table + " for " + operation + " to authenticated", "i"),
      table + " missing owner-only " + operation,
    );
  }
}
assert.equal((sql.match(/public\.is_project_owner\(project_id\)/g) ?? []).length, 16, "4 tables each require SELECT/INSERT/UPDATE USING+WITH CHECK ownership");

for (const [label, pattern] of [
  ["track scoped FK", /foreign key \(project_id, track_id\)[\s\S]*?references public\.execution_tracks\(project_id, id\)/i],
  ["revision scoped FK", /foreign key \(project_id, track_id, roadmap_revision_id\)[\s\S]*?references public\.roadmap_revisions\(project_id, track_id, id\)/i],
  ["criterion scoped FK", /foreign key \(project_id, track_id, roadmap_revision_id, milestone_id\)[\s\S]*?references public\.execution_milestones\(project_id, track_id, roadmap_revision_id, id\)/i],
  ["draft guard on milestones", /create trigger execution_milestones_guard_draft[\s\S]*?public\.execution_guard_draft_child\(\)/i],
  ["draft guard on criteria", /create trigger completion_criteria_guard_draft[\s\S]*?public\.execution_guard_draft_child\(\)/i],
  ["immutable approved revisions", /if old\.status = 'approved' then[\s\S]*?raise exception 'Approved roadmap revisions are immutable/i],
  ["serialized approval and child modification", /from public\.roadmap_revisions r[\s\S]*?for update;/i],
  ["mandatory acceptance condition", /Each approved milestone requires at least one required criterion/i],
  ["version uniqueness", /unique \(track_id, version\)/i],
  ["draft uniqueness", /where status = 'draft'/i],
  ["restricted anonymous privileges", /revoke all privileges on table[\s\S]*?from public, anon, authenticated;/i],
  ["no authenticated delete", /grant select, insert, update on table[\s\S]*?to authenticated;/i],
  ["authenticated grant assertions", /has_table_privilege\('authenticated'/i],
  ["anonymous denial assertions", /has_table_privilege\('anon'/i],
]) {
  expect(pattern, label);
}

assert.doesNotMatch(sql, /(?:insert|update|alter table)\s+public\.(?:change_cards|project_links|capture_source_refs)\b/i);
assert.doesNotMatch(sql, /service_role|access_token|refresh_token|client_secret|private_key/i);

console.log("EM-1A static schema contracts passed: owner-scoped RLS, composite FKs, immutable revisions and least privilege.");
console.log("Static check only: Postgres execution, adversarial RLS cases and deployment remain UNVERIFIED.");
