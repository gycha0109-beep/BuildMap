import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url=process.env.API_URL;
const anonKey=process.env.ANON_KEY;
if (!url || !anonKey || !url.startsWith("http://127.0.0.1:")) {
  throw Error("EM2B tests require disposable local Supabase");
}
function client() {
  return createClient(url,anonKey,{auth:{autoRefreshToken:false,persistSession:false}});
}
const owner=client(),other=client(),anon=client();
const password="Em1-safe-test-password-2026!";
const ownerProject="00000000-0000-4000-8000-000000000511";
const otherProject="00000000-0000-4000-8000-000000000522";
const ownerBuilder="00000000-0000-4000-8000-000000000411";
function check(result,label){
  if(result.error)throw Error(label+": "+result.error.message);
  return result.data;
}
check(await owner.auth.signInWithPassword({email:"em1-owner@example.invalid",password}),"owner login");
check(await other.auth.signInWithPassword({email:"em1-other@example.invalid",password}),"other login");
const criterion=check(await owner.from("completion_criteria").select("id")
  .eq("project_id",ownerProject).limit(1).single(),"existing EM1 criterion");
const base={
  sourceType:"merged_pull_request",sourceId:"pr:42",
  sourceState:"SOURCE_CONFIRMED",sourceSha:"a".repeat(40),
  sourceUrl:"https://github.com/Example/project/pull/42",
  title:"Merged PR",reason:null,occurredAt:"2026-10-29T22:30:00Z"
};
const args={
  p_project_id:ownerProject,p_repository_id:12345,
  p_repository_name:"Example/project",p_items:[base]
};
const first=check(await owner.rpc("execution_record_evidence_batch",args),"initial save");
assert.equal(first.objectsObserved,1);
assert.equal(first.newSnapshots,1);
assert.equal(first.criterionEvaluation,"NOT_AVAILABLE");
const twice=check(await owner.rpc("execution_record_evidence_batch",args),"repeat save");
assert.equal(twice.objectsObserved,1);
assert.equal(twice.newSnapshots,0);
const next=check(await owner.rpc("execution_record_evidence_batch",{
  ...args,p_items:[{...base,sourceSha:"b".repeat(40)}]
}),"source SHA changed");
assert.equal(next.newSnapshots,1);
const evidence=check(await owner.from("execution_evidence")
  .select("id,project_id,source_id,repository_id")
  .eq("project_id",ownerProject).eq("source_id","pr:42").single(),"identity");
assert.equal(evidence.repository_id,12345);
const versions=check(await owner.from("execution_evidence_observations")
  .select("id,source_sha,source_state")
  .eq("evidence_id",evidence.id),"snapshots");
assert.equal(versions.length,2);
assert.deepEqual(new Set(versions.map(x=>x.source_sha)),new Set(["a".repeat(40),"b".repeat(40)]));
const invalid=await owner.rpc("execution_record_evidence_batch",{
  ...args,p_items:[
    {...base,sourceId:"pr:99",sourceUrl:"https://github.com/Example/project/pull/99"},
    {...base,sourceId:"pr:100",sourceUrl:"https://github.com/mismatched/repo/pull/100"}
  ]
});
assert.ok(invalid.error,"invalid second item must abort the entire batch");
assert.equal(check(await owner.from("execution_evidence")
  .select("id").eq("source_id","pr:99"),"rollback check").length,0);

const ownLink=check(await owner.from("criterion_evidence_links")
  .insert({project_id:ownerProject,criterion_id:criterion.id,evidence_id:evidence.id})
  .select("id,review_status").single(),"propose link");
assert.equal(ownLink.review_status,"proposed");
const forbiddenReview=await owner.from("criterion_evidence_links")
  .update({review_status:"reviewed",reviewed_by_builder_profile_id:
    "00000000-0000-4000-8000-000000000422"})
  .eq("id",ownLink.id).select("id");
assert.ok(forbiddenReview.error,"review actor spoofing must fail");
const accepted=check(await owner.from("criterion_evidence_links")
  .update({review_status:"reviewed",reviewed_by_builder_profile_id:ownerBuilder})
  .eq("id",ownLink.id).select("review_status,reviewed_at").single(),"owner review link");
assert.equal(accepted.review_status,"reviewed");
assert.ok(accepted.reviewed_at);
const rewrite=await owner.from("criterion_evidence_links")
  .update({review_status:"rejected"}).eq("id",ownLink.id).select("id");
assert.ok(rewrite.error,"reviewed links immutable");

const otherVisible=check(await other.from("execution_evidence")
  .select("id").eq("project_id",ownerProject),"other read");
assert.equal(otherVisible.length,0);
assert.equal(check(await other.from("criterion_evidence_links")
  .select("id").eq("project_id",ownerProject),"other link read").length,0);
const otherSave=await other.rpc("execution_record_evidence_batch",args);
assert.ok(otherSave.error,"other user cannot persist evidence for owner's project");
const anonymous=await anon.from("execution_evidence").select("id");
assert.ok(anonymous.error,"anon cannot read private evidence cache");
const anonRpc=await anon.rpc("execution_record_evidence_batch",args);
assert.ok(anonRpc.error,"anon cannot invoke batch RPC");
const tamper=await owner.from("execution_evidence_observations")
  .update({title:"tampered"}).eq("evidence_id",evidence.id);
assert.ok(tamper.error,"snapshots cannot be updated");
const parentSwap=await owner.from("execution_evidence")
  .update({project_id:otherProject}).eq("id",evidence.id).select("id");
assert.ok(parentSwap.error,"source identity cannot change projects");
const noEvaluation=await owner.from("criterion_evaluations").select("id").limit(1);
assert.ok(noEvaluation.error,"EM2B cannot create criterion PASS authority");

console.log("EM2B_LOCAL_SUPABASE_RLS_HISTORY_IDEMPOTENCY_PASS");
console.log("Verified: real owner JWT, cross-owner isolation, duplicate refresh, SHA history, abort, append-only snapshots, reviewed links without PASS.");
