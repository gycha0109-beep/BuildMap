import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.APP_URL;
if (base !== "http://127.0.0.1:3000") {
  throw Error("Browser E2E may only target the disposable local BuildMap Next.js app");
}
const projectId = "00000000-0000-4000-8000-000000000511";
const password = "Em1-safe-test-password-2026!";
const browser = await chromium.launch({headless:true});
async function login(page,email) {
  await page.goto(base + "/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button",{name:"로그인",exact:true}).click();
  await page.waitForURL(/\/dashboard(?:\?|$)/,{timeout:30000});
}
try {
  const context=await browser.newContext();
  const page=await context.newPage();
  page.setDefaultTimeout(20000);
  await login(page,"em1-owner@example.invalid");
  await page.goto(base + "/projects/" + projectId + "/execution");
  await page.getByRole("heading",{name:"로드맵과 완료 조건"}).waitFor();
  await page.getByRole("heading",{name:"Runtime",exact:true}).waitFor();
  assert.ok((await page.locator("body").innerText()).includes("v2 runtime"));

  const coreTrack=page.locator("section.surface-card")
    .filter({has:page.getByRole("heading",{name:"Runtime",exact:true})});
  await coreTrack.getByRole("link",{name:/v1.*승인/}).click();
  await coreTrack.getByText("승인 완료",{exact:true}).waitFor();
  assert.equal(await coreTrack.getByRole("button",{name:"초안 정보 수정"}).count(),0,
    "Historical approved revision must be read-only");

  await coreTrack.getByRole("link",{name:/v2.*초안/}).click();
  await coreTrack.getByRole("button",{name:"초안 정보 수정"}).waitFor();
  const revise=coreTrack.locator("form")
    .filter({has:page.getByRole("button",{name:"초안 정보 수정"})});
  await revise.locator('input[name="title"]').fill("v2 browser edited");
  await revise.getByRole("button",{name:"초안 정보 수정"}).click();
  await page.getByText("로드맵 초안 정보를 수정했습니다.").waitFor();
  await coreTrack.getByRole("heading",{name:/v2.*browser edited/}).waitFor();

  const create=page.locator("form")
    .filter({has:page.getByRole("button",{name:"트랙 추가"})});
  await create.locator('input[name="name"]').fill("Browser Track");
  await create.getByRole("button",{name:"트랙 추가"}).click();
  await page.getByText("개발 트랙이 등록되었습니다.").waitFor();

  const importedTrack=page.locator("section.surface-card")
    .filter({has:page.getByRole("heading",{name:"Browser Track",exact:true})});
  await importedTrack.locator("summary").click();
  const importer=importedTrack.locator("form")
    .filter({has:page.getByRole("button",{name:"새 로드맵 가져오기"})});
  await importer.locator('input[name="title"]').fill("Browser imported");
  await importer.locator('textarea[name="roadmapJson"]').fill(JSON.stringify([
    {title:"Browser milestone",weight:1,criteria:[
      {title:"User-visible completion criterion",ruleType:"MANUAL_ACCEPTANCE",required:true}
    ]}
  ]));
  await importer.getByRole("button",{name:"새 로드맵 가져오기"}).click();
  await page.getByText("로드맵을 새 초안으로 가져왔습니다.").waitFor();
  await importedTrack.getByRole("heading",{name:/v1.*Browser imported/}).waitFor();
  await importedTrack.getByText("Browser milestone",{exact:true}).waitFor();

  await importedTrack.getByRole("button",{name:"이 로드맵 버전 승인"}).click();
  await page.getByText("로드맵 버전이 승인되었습니다. 정의는 변경할 수 없습니다.").waitFor();
  await importedTrack.getByText("승인 완료",{exact:true}).waitFor();
  assert.equal(await importedTrack.getByRole("button",{name:"초안 정보 수정"}).count(),0);

  await page.goto(base + "/projects/" + projectId + "/execution/evidence");
  await page.getByRole("heading",{name:"저장된 GitHub 관측 기록"}).waitFor();
  await page.getByRole("heading",{name:"완료 조건과 증거 연결"}).waitFor();
  const cacheSection=page.locator("section.surface-card")
    .filter({has:page.getByRole("heading",{name:"저장된 GitHub 관측 기록"})});
  await cacheSection.getByText("Example/project · pr:42",{exact:true}).waitFor();
  await page.getByText("연결 검토 완료",{exact:false}).first().waitFor();

  const associationForm=page.locator("form")
    .filter({has:page.getByRole("button",{name:"증거 연결 후보 등록"})});
  await associationForm.locator('select[name="criterionId"]')
    .selectOption({label:"User-visible completion criterion"});
  await associationForm.getByRole("button",{name:"증거 연결 후보 등록"}).click();
  await page.getByText("검증 전 증거 연결 후보를 등록했습니다.").waitFor();
  await page.getByRole("button",{name:"연결 검토 승인"}).first().click();
  await page.getByText("연결 후보 검토 이력을 기록했습니다. 완료 판정은 별개입니다.").waitFor();
  await page.getByText("완료 상태: UNKNOWN",{exact:false}).first().waitFor();

  const crossOrigin = await page.request.post(
    base + "/api/projects/" + projectId + "/execution/evidence-refresh",
    { headers: {"origin":"https://unrelated.example"},
      data: {linkId:"00000000-0000-4000-8000-000000000511"} },
  );
  assert.equal(crossOrigin.status(),403,"cross-origin evidence refresh must fail before provider access");

  await context.close();

  const otherContext=await browser.newContext();
  const other=await otherContext.newPage();
  await login(other,"em1-other@example.invalid");
  await other.goto(base + "/projects/" + projectId + "/execution");
  assert.equal(await other.getByRole("heading",{name:"로드맵과 완료 조건"}).count(),0,
    "Non-owner must not access another project's Execution Map");
  await otherContext.close();

  const anonymousContext=await browser.newContext();
  const anonymous=await anonymousContext.newPage();
  await anonymous.goto(base + "/projects/" + projectId + "/execution");
  await anonymous.waitForURL(/\/login/,{timeout:20000});
  await anonymousContext.close();

  console.log("EM1_LOCAL_SUPABASE_BROWSER_E2E_PASS");
  console.log("Verified: Builder login, historical revision, draft edit, track create, JSON import, explicit approval, other-user denial and anonymous redirect.");
} finally {
  await browser.close();
}
