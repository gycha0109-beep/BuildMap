import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceKey = process.env.SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey || !url.startsWith("http://127.0.0.1:")) {
  throw Error("Local Supabase-only test: API_URL / ANON_KEY / SERVICE_ROLE_KEY missing or remote URL");
}
const ownerEmail = "em1-owner@example.invalid";
const otherEmail = "em1-other@example.invalid";
const password = "Em1-safe-test-password-2026!";
const ids = {
  ownerUserProfile: "00000000-0000-4000-8000-000000000311",
  otherUserProfile: "00000000-0000-4000-8000-000000000322",
  ownerBuilder: "00000000-0000-4000-8000-000000000411",
  otherBuilder: "00000000-0000-4000-8000-000000000422",
  ownerProject: "00000000-0000-4000-8000-000000000511",
  otherProject: "00000000-0000-4000-8000-000000000522",
};
function good(result, label) {
  if (result.error) throw Error(label + ": " + result.error.message);
  return result.data;
}
function client(key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
const admin = client(serviceKey);
const anon = client(anonKey);
const users = [];
for (const email of [ownerEmail, otherEmail]) {
  const created = good(await admin.auth.admin.createUser({
    email, password, email_confirm: true
  }), "auth.createUser " + email);
  assert.ok(created.user?.id);
  users.push(created.user.id);
}
good(await admin.from("user_profiles").insert([
  {id:ids.ownerUserProfile,auth_user_id:users[0],display_name:"EM1 Owner"},
  {id:ids.otherUserProfile,auth_user_id:users[1],display_name:"EM1 Other"},
]), "fixture profiles");
good(await admin.from("builder_profiles").insert([
  {id:ids.ownerBuilder,user_profile_id:ids.ownerUserProfile,public_display_name:"EM1 Owner"},
  {id:ids.otherBuilder,user_profile_id:ids.otherUserProfile,public_display_name:"EM1 Other"},
]), "fixture builders");
good(await admin.from("projects").insert([
  {id:ids.ownerProject,owner_builder_profile_id:ids.ownerBuilder,title:"EM1 Owner Test"},
  {id:ids.otherProject,owner_builder_profile_id:ids.otherBuilder,title:"EM1 Other Test"},
]), "fixture projects");
const owner = client(anonKey);
const other = client(anonKey);
good(await owner.auth.signInWithPassword({email:ownerEmail,password}), "owner login");
good(await other.auth.signInWithPassword({email:otherEmail,password}), "other login");
assert.ok((await owner.auth.getSession()).data.session?.access_token);
assert.ok((await other.auth.getSession()).data.session?.access_token);

const track=good(await owner.from("execution_tracks")
  .insert({project_id:ids.ownerProject,name:"Runtime",position:0})
  .select("id").single(), "owner track");
assert.ok(track.id);
const invisible=good(await other.from("execution_tracks")
  .select("id").eq("id",track.id), "other track read");
assert.equal(invisible.length,0,"other must not read owner track");
const illicit=await other.from("execution_tracks").insert({
  project_id:ids.ownerProject,name:"Forbidden by RLS"
});
assert.ok(illicit.error,"other must not insert into owner project");
const anonymous=await anon.from("execution_tracks").select("id");
assert.ok(anonymous.error,"anon must not read private tracks");

const milestones=[
  {title:"Runtime integration",weight:2,criteria:[
    {title:"PR merged",ruleType:"PR_MERGED",required:true},
    {title:"CI verified",ruleType:"CHECK_PASSED",required:true},
  ]},
  {title:"Production release",weight:1,criteria:[
    {title:"Deployment verified",ruleType:"DEPLOY_VERIFIED",required:true},
  ]},
];
const imported=good(await owner.rpc("execution_import_draft",{
  p_project_id:ids.ownerProject,p_track_id:track.id,
  p_title:"v1 runtime",p_change_reason:"Real Auth E2E",p_milestones:milestones
}),"owner atomic import");
assert.ok(imported,"import must return UUID");
const rev=good(await owner.from("roadmap_revisions")
  .select("id,status,version").eq("id",imported).single(),"imported revision");
assert.equal(rev.status,"draft");
assert.equal(rev.version,1);
const ms=good(await owner.from("execution_milestones")
  .select("id,title,weight").eq("roadmap_revision_id",imported),"milestones read");
assert.equal(ms.length,2);
const cs=good(await owner.from("completion_criteria")
  .select("id,title").eq("roadmap_revision_id",imported),"criteria read");
assert.equal(cs.length,3);

const crossRead=good(await other.from("completion_criteria")
  .select("id").eq("roadmap_revision_id",imported),"non-owner criteria read");
assert.equal(crossRead.length,0);
const crossUpdate=good(await other.from("completion_criteria")
  .update({title:"Unauthorized"}).eq("id",cs[0].id).select("id"),"non-owner update");
assert.equal(crossUpdate.length,0);
const crossApproval=good(await other.from("roadmap_revisions")
  .update({status:"approved",approved_by_builder_profile_id:ids.otherBuilder})
  .eq("id",imported).select("id"),"non-owner approval");
assert.equal(crossApproval.length,0);

const duplicate=await owner.rpc("execution_import_draft",{
  p_project_id:ids.ownerProject,p_track_id:track.id,
  p_title:"Conflict",p_change_reason:null,p_milestones:milestones
});
assert.ok(duplicate.error,"second draft must fail");
const edited=good(await owner.from("execution_milestones")
  .update({title:"Updated before approval"})
  .eq("id",ms[0].id).select("id,title").single(),"draft edit");
assert.equal(edited.title,"Updated before approval");
const approved=good(await owner.from("roadmap_revisions")
  .update({status:"approved",approved_by_builder_profile_id:ids.ownerBuilder})
  .eq("id",imported).select("id,status,approved_at").single(),"owner approval");
assert.equal(approved.status,"approved");
assert.ok(approved.approved_at);
const lateEdit=await owner.from("completion_criteria")
  .update({title:"Tampered after approval"}).eq("id",cs[0].id).select("id");
assert.ok(lateEdit.error,"approved criterion must remain immutable");

const second=good(await owner.rpc("execution_import_draft",{
  p_project_id:ids.ownerProject,p_track_id:track.id,
  p_title:"v2 runtime",p_change_reason:"Expand scope",p_milestones:milestones
}),"new revision import");
assert.ok(second!==imported);
const old=good(await owner.from("roadmap_revisions")
  .select("id,status,title,version").eq("id",imported).single(),"historic revision");
assert.deepEqual([old.status,old.title,old.version],["approved","v1 runtime",1]);
const newRevision=good(await owner.from("roadmap_revisions")
  .select("id,status,version").eq("id",second).single(),"new revision");
assert.deepEqual([newRevision.status,newRevision.version],["draft",2]);

const invalidTrack=good(await owner.from("execution_tracks")
  .insert({project_id:ids.ownerProject,name:"Rollback test",position:1})
  .select("id").single(),"rollback track");
const rollback=await owner.rpc("execution_import_draft",{
  p_project_id:ids.ownerProject,p_track_id:invalidTrack.id,
  p_title:"Invalid",p_change_reason:null,p_milestones:[
    milestones[0],{title:"Broken",weight:1,criteria:[
      {title:"Invalid",ruleType:"NONEXISTENT",required:true}
    ]}
  ]
});
assert.ok(rollback.error,"invalid nested criterion must roll back");
const remnants=good(await owner.from("roadmap_revisions")
  .select("id").eq("track_id",invalidTrack.id),"rollback verification");
assert.equal(remnants.length,0);
console.log("EM1_LOCAL_SUPABASE_AUTH_POSTGREST_E2E_PASS");
console.log("Verified: GoTrue sessions, project RLS, anon denied, atomic import, approved immutability, historic revisions and rollback");
