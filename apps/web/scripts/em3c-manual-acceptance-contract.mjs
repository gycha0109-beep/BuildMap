import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateApprovedRoadmap } from "../lib/execution/deterministic-evaluator.ts";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(resolve(root,p),"utf8");
const sql=read("../../supabase/migrations/20261030130000_buildmap_24_execution_manual_acceptance.sql");
const service=read("lib/execution/trusted-evaluation-server.ts");
const actions=read("app/projects/[projectId]/execution/evidence/actions.ts");
const page=read("app/projects/[projectId]/execution/evidence/page.tsx");
const panel=read("components/execution/manual-acceptance-panel.tsx");
const now="2026-10-30T06:00:00Z";
const revision={id:"rev-1",version:1,status:"approved",milestones:[
  {id:"m1",weight:"2.0000",criteria:[
    {id:"manual",ruleType:"MANUAL_ACCEPTANCE",isRequired:true},
  ]},
  {id:"m2",weight:"3.0000",criteria:[
    {id:"check",ruleType:"CHECK_PASSED",isRequired:true},
  ]},
]};
const event={
  kind:"BUILDER_MANUAL_ACCEPTANCE",eventId:"manual-event-1",
  criterionId:"manual",revisionId:"rev-1",action:"accepted",
  actorBuilderProfileId:"builder-1",reason:"Builder inspected all required results",
  recordedAt:"2026-10-30T05:59:00Z",
};
const evalRun=(manualAcceptances=[])=>evaluateApprovedRoadmap({
  revision,associations:[],providerRechecks:[],manualAcceptances,
  policyVersion:"EM3C_V2",nowIso:now,
});
let e=evalRun();
assert.equal(e.status,"CALCULATED");
assert.equal(e.percent,0);
assert.equal(e.coverage.unknown,2);
e=evalRun([event]);
assert.equal(e.status,"CALCULATED");
assert.equal(e.policyVersion,"EM3C_V2");
const historic=evaluateApprovedRoadmap({
  revision,associations:[],providerRechecks:[],
  manualAcceptances:[event],nowIso:now,
});
assert.equal(historic.policyVersion,"EM3A_V1");
assert.equal(historic.percent,0,
  "historical EM3A_V1 must not reinterpret stored manual acceptance as PASS");
assert.equal(e.percent,40,"only accepted manual milestone counts, unsupported check stays UNKNOWN");
assert.equal(e.milestones[0].criteria[0].verdict,"PASS");
assert.equal(e.milestones[0].criteria[0].reason,"explicit_builder_manual_acceptance");
assert.equal(e.milestones[1].criteria[0].verdict,"UNKNOWN");
assert.equal(evalRun([event]).percent,e.percent);
const revoked=evalRun([{...event,action:"revoked"}]);
assert.equal(revoked.percent,0);
assert.equal(revoked.milestones[0].criteria[0].verdict,"PENDING");
assert.equal(revoked.milestones[0].criteria[0].reason,"builder_manual_acceptance_revoked");
for(const invalid of [
  {...event,criterionId:"wrong"},
  {...event,revisionId:"wrong"},
  {...event,recordedAt:"2026-10-30T06:01:00Z"},
  {...event,recordedAt:"invalid"},
  {...event,actorBuilderProfileId:""},
  {...event,eventId:""},
  {...event,reason:"too short"},
]){
  const v=evalRun([invalid]);
  assert.equal(v.percent,0,"invalid/future/foreign manual event must not grant progress");
}
const duplicates=evalRun([event,{...event,eventId:"manual-event-2"}]);
assert.equal(duplicates.percent,0);
assert.equal(duplicates.milestones[0].criteria[0].verdict,"UNKNOWN");
assert.equal(duplicates.milestones[0].criteria[0].reason,"ambiguous_manual_event_snapshot");

assert.match(sql,/create table public\.execution_manual_acceptance_events/);
assert.match(sql,/foreign key \(project_id, criterion_id\)/);
assert.match(sql,/public\.is_project_owner\(new\.project_id\)/);
assert.match(sql,/up\.auth_user_id = auth\.uid\(\)/);
assert.match(sql,/new\.actor_builder_profile_id := v_actor/);
assert.match(sql,/new\.recorded_at := clock_timestamp\(\)/);
assert.match(sql,/new\.id := gen_random_uuid\(\)/);
assert.match(sql,/v_revision_status is distinct from 'approved'/);
assert.match(sql,/v_rule_type is distinct from 'MANUAL_ACCEPTANCE'/);
assert.match(sql,/for update/);
assert.match(sql,/manual_criterion_already_accepted/);
assert.match(sql,/no_active_acceptance_to_revoke/);
assert.match(sql,/before update or delete/);
assert.match(sql,/enable row level security/);
assert.match(sql,/grant select, insert on table public\.execution_manual_acceptance_events/);
assert.doesNotMatch(sql,/security definer|grant.*delete.*to authenticated|service_role/i);
assert.match(service,/execution_manual_acceptance_events/);
assert.match(service,/manual_audit_unavailable_or_truncated/);
assert.match(service,/seen\.has\(event\.criterion_id\)/);
assert.match(service,/manualAcceptances/);
assert.match(actions,/ensureBuilderContext/);
assert.match(actions,/\.eq\("rule_type", "MANUAL_ACCEPTANCE"\)/);
assert.match(actions,/\.eq\("status", "approved"\)/);
assert.match(actions,/execution_manual_acceptance_events/);
assert.doesNotMatch(actions,/actor_builder_profile_id: builder|recorded_at:.*Date|service_role/i);
assert.match(page,/ManualAcceptancePanel/);
assert.match(panel,/수동 완료 조건 승인·철회/);
assert.match(panel,/textarea name="reason" required minLength=\{12\}/);

console.log("EM3C_MANUAL_ACCEPTANCE_POLICY_CONTRACT_PASS");
console.log("Verified: explicit latest Builder acceptance, revocation, invalid/future event fail-closed, SQL append-only actor-owned RLS.");
console.log("No GitHub Checks/Actions/Deployment scope has been expanded or verified.");
