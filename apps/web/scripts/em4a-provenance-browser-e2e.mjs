import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const base = process.env.APP_URL;
const api = process.env.API_URL;
const key = process.env.ANON_KEY;
if (base !== "http://127.0.0.1:3000" || !api?.startsWith("http://127.0.0.1:") || !key) {
  throw Error("EM-4A browser E2E must target disposable local Next and Supabase only");
}
const projectId = "00000000-0000-4000-8000-000000000511";
const builderId = "00000000-0000-4000-8000-000000000411";
const password = "Em1-safe-test-password-2026!";
const db = createClient(api, key, { auth: { autoRefreshToken: false, persistSession: false } });
function good(result, label) {
  if (result.error) throw Error(label + ": " + result.error.message);
  return result.data;
}
good(await db.auth.signInWithPassword({
  email: "em1-owner@example.invalid",
  password,
}), "owner local JWT");

const approved = good(await db.from("roadmap_revisions").select("id")
  .eq("project_id", projectId).eq("status", "approved").single(), "approved revision");
const criterion = good(await db.from("completion_criteria")
  .select("id,title").eq("project_id", projectId)
  .eq("roadmap_revision_id", approved.id)
  .eq("rule_type", "PR_MERGED").single(), "approved PR criterion");
const evidence = good(await db.from("execution_evidence")
  .select("id").eq("project_id", projectId).eq("source_id", "pr:42")
  .single(), "cached PR evidence");

const link = good(await db.from("criterion_evidence_links")
  .select("id,review_status").eq("project_id", projectId)
  .eq("criterion_id", criterion.id).eq("evidence_id", evidence.id)
  .maybeSingle(), "approved criterion evidence association");
if (!link) {
  const added = good(await db.from("criterion_evidence_links")
    .insert({ project_id: projectId, criterion_id: criterion.id, evidence_id: evidence.id })
    .select("id").single(), "local review proposal");
  good(await db.from("criterion_evidence_links")
    .update({ review_status: "reviewed", reviewed_by_builder_profile_id: builderId })
    .eq("id", added.id).select("id").single(), "local Builder review");
} else {
  assert.equal(link.review_status, "reviewed", "EM-2B fixture link must be reviewed");
}

const route = base + "/projects/" + projectId + "/execution/provenance/" + criterion.id;
const browser = await chromium.launch({ headless: true });
async function login(page, email) {
  await page.goto(base + "/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 30000 });
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await login(page, "em1-owner@example.invalid");
  const result = await page.goto(route);
  assert.equal(result?.status(), 200, "Owner approved criterion must open");
  await page.getByRole("heading", { name: criterion.title }).waitFor();
  await page.getByRole("heading", { name: "이 조건의 로드맵 근거" }).waitFor();
  await page.getByRole("heading", { name: "증거 연결·검토·관측 이력" }).waitFor();
  await page.getByText("완료 판정: UNKNOWN").waitFor();
  const body = await page.locator("body").innerText();
  assert.ok(body.includes("Builder 검토 완료"), "Reviewed source must be labeled");
  assert.ok(body.includes("캐시 SHA: " + "b".repeat(40)), "Historical SHA must be identified as cache");
  assert.ok(body.includes("원본 재검증") || body.includes("재검증하지 않으므로"));
  assert.ok(!body.includes("진행률: 100%"), "Never fabricate progress");
  const sourceLink = page.getByRole("link", { name: /GitHub PR 원본 보기/ });
  assert.equal(await sourceLink.getAttribute("href"), "https://github.com/Example/project/pull/42");
  assert.equal(await sourceLink.getAttribute("rel"), "noopener noreferrer");
  const missing = await page.goto(base + "/projects/" + projectId +
    "/execution/provenance/00000000-0000-4000-8000-000000000099");
  assert.equal(missing?.status(), 404);
  await context.close();

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await login(other, "em1-other@example.invalid");
  const denied = await other.goto(route);
  assert.equal(denied?.status(), 404, "Non-owner must not read private criterion provenance");
  assert.equal(await other.getByRole("heading", { name: criterion.title }).count(), 0);
  await otherContext.close();

  const anonContext = await browser.newContext();
  const anon = await anonContext.newPage();
  await anon.goto(route);
  await anon.waitForURL(/\/login/, { timeout: 20000 });
  assert.equal(await anon.getByRole("heading", { name: criterion.title }).count(), 0);
  await anonContext.close();

  console.log("EM4A_OWNER_AUTHENTICATED_PROVENANCE_BROWSER_E2E = PASS");
  console.log("EM4A_CROSS_OWNER_404_ANON_REDIRECT = PASS");
  console.log("EM4A_CACHED_SHA_UNKNOWN_AND_SAFE_GITHUB_LINK = PASS");
  console.log("EM4A_PRODUCTION_AND_LIVE_GITHUB_VERIFICATION = NOT_TESTED");
} finally {
  await browser.close();
}
