import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url=process.env.API_URL,anonKey=process.env.ANON_KEY;
if(!url||!anonKey||!url.startsWith("http://127.0.0.1:"))
  throw Error("EM3C E2E must run against disposable local Supabase only");

function client(){
  return createClient(url,anonKey,{auth:{autoRefreshToken:false,persistSession:false}});
}
function okay(value,label){
  if(value.error)throw Error(label+": "+value.error.message);
  return value.data;
}
const owner=client(),other=client(),anon=client();
const password="Em1-safe-test-password-2026!";
okay(await owner.auth.signInWithPassword({email:"em1-owner@example.invalid",password}),"owner login");
okay(await other.auth.signInWithPassword({email:"em1-other@example.invalid",password}),"other login");
const projectId="00000000-0000-4000-8000-000000000511";
const ownerBuilder="00000000-0000-4000-8000-000000000411";
const foreignBuilder="00000000-0000-4000-8000-000000000422";

const track=okay(await owner.from("execution_tracks")
  .insert({project_id:projectId,name:"EM3C manual JWT acceptance"})
  .select("id").single(),"create track");
const revision=okay(await owner.from("roadmap_revisions")
  .insert({project_id:projectId,track_id:track.id,version:1,title:"Manual JWT revision"})
  .select("id").single(),"create revision");
const milestone=okay(await owner.from("execution_milestones")
  .insert({project_id:projectId,track_id:track.id,roadmap_revision_id:revision.id,
    title:"Manual gate",position:0,weight:1})
  .select("id").single(),"create milestone");
const criterion=okay(await owner.from("completion_criteria")
  .insert({project_id:projectId,track_id:track.id,roadmap_revision_id:revision.id,
    milestone_id:milestone.id,title:"Builder reviewed acceptance",
    rule_type:"MANUAL_ACCEPTANCE",position:0,is_required:true})
  .select("id").single(),"create manual criterion");
const base={
  project_id:projectId,track_id:track.id,roadmap_revision_id:revision.id,
  criterion_id:criterion.id,
};
const draftAttempt=await owner.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"accepted",reason:"Cannot accept a draft revision"});
assert.ok(draftAttempt.error,"draft manual criteria must reject acceptance");

okay(await owner.from("roadmap_revisions")
  .update({status:"approved",approved_by_builder_profile_id:ownerBuilder})
  .eq("id",revision.id).select("id").single(),"approve revision");

const revocationFirst=await owner.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"revoked",reason:"No earlier approval exists"});
assert.ok(revocationFirst.error);

const accepted=okay(await owner.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"accepted",
    actor_builder_profile_id:foreignBuilder,
    recorded_at:"2000-01-01T00:00:00Z",
    reason:"Builder inspected the result manually"})
  .select("id,actor_builder_profile_id,recorded_at,event_type,reason").single(),
  "owner accepted");
assert.equal(accepted.actor_builder_profile_id,ownerBuilder,
  "database must override spoofed actor");
assert.ok(new Date(accepted.recorded_at).getUTCFullYear()>=2026,
  "database must override spoofed event timestamp");
assert.equal(accepted.event_type,"accepted");
const dupe=await owner.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"accepted",reason:"Duplicate submission must fail"});
assert.ok(dupe.error);

const deniedOther=okay(await other.from("execution_manual_acceptance_events")
  .select("id").eq("project_id",projectId),"other read");
assert.equal(deniedOther.length,0);
const foreignWrite=await other.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"revoked",reason:"Other user cannot revoke acceptance"});
assert.ok(foreignWrite.error);
assert.ok((await anon.from("execution_manual_acceptance_events").select("id")).error);
assert.ok((await anon.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"revoked",reason:"Anonymous cannot modify this record"})).error);
assert.ok((await owner.from("execution_manual_acceptance_events")
  .update({reason:"Altered"}).eq("id",accepted.id)).error);
assert.ok((await owner.from("execution_manual_acceptance_events")
  .delete().eq("id",accepted.id)).error);

const revoked=okay(await owner.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"revoked",reason:"Manual acceptance withdrawn after inspection"})
  .select("id,recorded_at").single(),"owner revoked");
assert.ok(revoked.id);
const reaccepted=okay(await owner.from("execution_manual_acceptance_events")
  .insert({...base,event_type:"accepted",reason:"Manual validation repeated successfully"})
  .select("id,recorded_at").single(),"owner reaccepted");
assert.ok(reaccepted.id);
const timeline=okay(await owner.from("execution_manual_acceptance_events")
  .select("id,event_type,recorded_at,actor_builder_profile_id")
  .eq("criterion_id",criterion.id)
  .order("recorded_at",{ascending:false}).order("id",{ascending:false}),
  "read immutable timeline");
assert.equal(timeline.length,3);
assert.deepEqual(new Set(timeline.map(x=>x.event_type)),new Set(["accepted","revoked"]));
assert.equal(timeline[0].event_type,"accepted");
assert.ok(timeline.every(x=>x.actor_builder_profile_id===ownerBuilder));
const noEvaluation=await owner.from("criterion_evaluations").select("id").limit(1);
assert.ok(noEvaluation.error,"manual recording must not create official criteria evaluation table");

console.log("EM3C_LOCAL_SUPABASE_MANUAL_AUTH_E2E_PASS");
console.log("Real JWT Owner/other/anon RLS, draft denial, actor/time override, approval→revoke→approval history and no mutation all verified.");
