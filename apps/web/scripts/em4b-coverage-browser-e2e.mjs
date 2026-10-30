import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const base = process.env.APP_URL, api = process.env.API_URL, key = process.env.ANON_KEY;
if (base !== "http://127.0.0.1:3000" || !api?.startsWith("http://127.0.0.1:") || !key) {
  throw Error("EM4B E2E requires disposable local Next and Supabase");
}
const project = "00000000-0000-4000-8000-000000000511";
const otherProject = "00000000-0000-4000-8000-000000000522";
const builder = "00000000-0000-4000-8000-000000000411";
const password = "Em1-safe-test-password-2026!";
const db = createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false}});
const good=(r,name)=>{if(r.error)throw Error(name+": "+r.error.message);return r.data;};
good(await db.auth.signInWithPassword({email:"em1-owner@example.invalid",password}),"owner login");

const approved = good(await db.from("roadmap_revisions").select("id,version")
  .eq("project_id",project).eq("status","approved").single(),"approved revision");
const draft = good(await db.from("roadmap_revisions").select("id")
  .eq("project_id",project).eq("status","draft").single(),"unapproved revision");
const criterion = good(await db.from("completion_criteria").select("id")
  .eq("project_id",project).eq("roadmap_revision_id",approved.id)
  .eq("rule_type","PR_MERGED").single(),"approved PR criterion");
const evidence = good(await db.from("execution_evidence").select("id")
  .eq("project_id",project).eq("source_id","pr:42").single(),"cached PR evidence");
const existing=good(await db.from("criterion_evidence_links").select("id,review_status")
  .eq("project_id",project).eq("criterion_id",criterion.id)
  .eq("evidence_id",evidence.id).maybeSingle(),"approved link");
if (!existing) {
  const proposed=good(await db.from("criterion_evidence_links")
    .insert({project_id:project,criterion_id:criterion.id,evidence_id:evidence.id})
    .select("id").single(),"proposed link");
  good(await db.from("criterion_evidence_links")
    .update({review_status:"reviewed",reviewed_by_builder_profile_id:builder})
    .eq("id",proposed.id).select("id").single(),"review accepted");
} else assert.equal(existing.review_status,"reviewed");

const path="/projects/"+project+"/execution/coverage/"+approved.id;
const browser=await chromium.launch({headless:true});
async function login(page,email){
  await page.goto(base+"/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button",{name:"로그인",exact:true}).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/,{timeout:30000});
}
try{
  const ownerContext=await browser.newContext();
  const page=await ownerContext.newPage();
  page.setDefaultTimeout(20000);
  await login(page,"em1-owner@example.invalid");
  let diagnosticCalls=0;
  let diagnosticMode="success";
  const mockDiagnostic={
    mode:"EM3B_PRIVATE_SOURCE_DIAGNOSTIC",
    revisionId:approved.id,
    policyVersion:"EM3C_V2",
    verificationAvailable:true,
    unavailableReason:null,
    sourceRechecksPerformed:1,
    rules:[{
      criterionId:criterion.id,ruleType:"PR_MERGED",
      providerCheckState:"FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION",
      reason:"fresh_exact_merged_pr_sha_with_reviewed_binding",
      sourceId:evidence.id,
    }],
    progress:"NOT_PUBLISHED",
    criterionEvaluation:"NOT_PUBLISHED",
  };
  await page.route(/\/api\/projects\/.*\/execution\/verification-readiness\?revisionId=/,async route=>{
    diagnosticCalls++;
    if(diagnosticMode==="unavailable"){
      await route.fulfill({status:503,contentType:"application/json",
        body:JSON.stringify({mode:"NOT_PUBLISHED",error:{code:"github_permission_unavailable"}})});
      return;
    }
    await route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({...mockDiagnostic,progress:diagnosticMode==="numeric"?100:"NOT_PUBLISHED"})});
  });
  await page.goto(base+"/projects/"+project+"/execution");
  const navigation=page.getByRole("link",{name:new RegExp("승인 v"+approved.version+" 증거 연결")});
  await navigation.waitFor();
  const href = await navigation.getAttribute("href");
  assert.equal(href, path, "Approved revision must link to its own coverage route");
  const coverageResponse = await page.goto(base + path);
  assert.equal(coverageResponse?.status(), 200, "Owner approved revision must render successfully");
  await page.getByRole("heading",{name:/근거 현황/}).waitFor();
  await page.getByRole("heading",{name:"완료 조건별 연결 현황"}).waitFor();
  const text=await page.locator("body").innerText();
  assert.ok(text.includes("공식 진행률: 미공개"));
  assert.ok(text.includes("완료 평가: UNKNOWN"));
  assert.ok(text.includes("완료 판정 UNKNOWN 3개"));
  assert.ok(text.includes("검토된 연결이 있는 조건 1개"));
  assert.ok(text.includes("검토된 연결이 없는 조건 2개"));
  assert.ok(text.includes("Builder 연결 검토 완료 · 원본 미검증"));
  assert.ok(!/공식 진행률: ?\d/.test(text),"Never show invented progress percentage");
  assert.ok(!text.includes("완료 판정: PASS"));
  assert.equal(diagnosticCalls,0,"No automatic provider recheck on read-only page load");
  const diagnosticButton=page.getByRole("button",{name:"원본 검증 진단 실행"});
  await diagnosticButton.click();
  await page.getByText(/원본 일치 관측 · 공식 완료 아님/).waitFor();
  assert.equal(diagnosticCalls,1);
  assert.ok((await page.locator("body").innerText()).includes("공식 진행률: 미공개"));
  diagnosticMode="numeric";
  await diagnosticButton.click();
  await page.getByText(/검증 응답의 버전·출처·비공개 경계가 일치하지 않습니다/).waitFor();
  diagnosticMode="unavailable";
  await diagnosticButton.click();
  await page.getByText(/원본 검증 진단 불가/).waitFor();
  assert.equal(diagnosticCalls,3);
  assert.ok(!(await page.locator("body").innerText()).includes("공식 진행률: 100%"));
  await page.getByRole("link",{name:"출처·검토·관측 SHA 상세 보기"}).first().click();
  await page.waitForURL(/\/execution\/provenance\//);
  await page.getByText("완료 판정: UNKNOWN").waitFor();

  const draftResponse=await page.goto(base+"/projects/"+project+"/execution/coverage/"+draft.id);
  assert.equal(draftResponse?.status(),404,"Draft revision coverage forbidden");
  const missing=await page.goto(base+"/projects/"+project+"/execution/coverage/00000000-0000-4000-8000-000000000099");
  assert.equal(missing?.status(),404,"Unknown revision forbidden");
  await ownerContext.close();

  const otherContext=await browser.newContext();
  const other=await otherContext.newPage();
  await login(other,"em1-other@example.invalid");
  const denied=await other.goto(base+path);
  assert.equal(denied?.status(),404,"Non-owner cannot view private coverage");
  assert.equal(await other.getByRole("heading",{name:"완료 조건별 연결 현황"}).count(),0);
  const crossProject=await other.goto(base+"/projects/"+otherProject+"/execution/coverage/"+approved.id);
  assert.equal(crossProject?.status(),404,"Revision belongs to a different project");
  await otherContext.close();

  const anonymousContext=await browser.newContext();
  const anonymous=await anonymousContext.newPage();
  await anonymous.goto(base+path);
  await anonymous.waitForURL(/\/login/,{timeout:20000});
  await anonymousContext.close();

  console.log("EM4C_ON_DEMAND_MATCHED_NOT_PUBLISHED_AND_HTTP_FAIL_CLOSED = PASS");
  console.log("EM4B_LOCAL_OWNER_APPROVED_COVERAGE_BROWSER_PASS");
  console.log("EM4B_LOCAL_DRAFT_CROSS_OWNER_ANON_DENIAL_PASS");
  console.log("EM4B_LOCAL_UNKNOWN_AND_LINKAGE_COUNTS_NOT_PROGRESS_PASS");
  console.log("EM4B_LIVE_GITHUB_AND_HOSTED_PRODUCTION_NOT_TESTED");
}finally{await browser.close();}
