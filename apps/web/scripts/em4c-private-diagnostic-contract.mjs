import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePrivateDiagnostic } from "../lib/execution/em4c-diagnostic-view.ts";

const project = "00000000-0000-4000-8000-000000000511";
const revision = "11111111-1111-4111-8111-111111111111";
const criterion = "22222222-2222-4222-8222-222222222222";
const second = "33333333-3333-4333-8333-333333333333";
const response = {
  mode: "EM3B_PRIVATE_SOURCE_DIAGNOSTIC",
  revisionId: revision,
  policyVersion: "EM3C_V2",
  verificationAvailable: true,
  unavailableReason: null,
  sourceRechecksPerformed: 1,
  rules: [{
    criterionId: criterion,
    ruleType: "PR_MERGED",
    providerCheckState: "FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION",
    reason: "fresh_exact_merged_pr_sha_with_reviewed_binding",
    sourceId: "44444444-4444-4444-8444-444444444444",
  }],
  progress: "NOT_PUBLISHED",
  criterionEvaluation: "NOT_PUBLISHED",
};
const parse = (data,expected=revision,allowed=[criterion,second]) =>
  parsePrivateDiagnostic(data,expected,allowed);
const valid = parse(response);
assert.ok(valid);
assert.equal(valid.kind,"AVAILABLE");
assert.equal(valid.rows.length,1);
assert.equal(valid.rows[0].state,"MATCHED_NOT_PUBLISHED");
assert.equal(valid.rows[0].reason,"fresh_exact_merged_pr_sha_with_reviewed_binding");
assert.equal(valid.rechecks,1);
assert.equal("percent" in valid,false);
assert.equal("progress" in valid,false);
assert.equal("verdict" in valid.rows[0],false);
assert.deepEqual(parse(response),valid);

function denied(name,payload,selected=revision,allowed=[criterion,second]) {
  assert.equal(parse(payload,selected,allowed),null,name+" must not render an accepted preview");
}
denied("wrong mode",{...response,mode:"PUBLIC_PROGRESS"});
denied("numeric progress",{...response,progress:75});
denied("numeric nested progress",{...response,criterionEvaluation:{percent:100}});
denied("published criterion result",{...response,criterionEvaluation:"PASS"});
denied("foreign revision",{...response,revisionId:second});
denied("missing revision",response,project);
denied("unknown criterion",{...response,rules:[{...response.rules[0],criterionId:"99999999-9999-4999-8999-999999999999"}]});
denied("duplicate criterion",{...response,rules:[response.rules[0],response.rules[0]]});
denied("unsupported verdict",{...response,rules:[{...response.rules[0],providerCheckState:"PASS"}]});
denied("incorrect type",{...response,rules:[{...response.rules[0],ruleType:"MADE_UP"}]});
denied("invalid reason",{...response,rules:[{...response.rules[0],reason:"SECRET\nDUMP"}]});
denied("unbounded reason",{...response,rules:[{...response.rules[0],reason:"x".repeat(1000)}]});
denied("fake policy",{...response,policyVersion:"EM3C_V2<script>"});
denied("ambiguous version",{...response,policyVersion:""});
denied("invalid check count",{...response,sourceRechecksPerformed:100000});
denied("negative check count",{...response,sourceRechecksPerformed:-1});
denied("fractional check count",{...response,sourceRechecksPerformed:1.5});
denied("invalid outcome",{...response,verificationAvailable:"true"});
denied("inconsistent availability",{...response,verificationAvailable:false});
denied("inconsistent reason",{...response,unavailableReason:"missing_sources"});
denied("duplicate scoped IDs",response,revision,[criterion,criterion]);
denied("invalid scoped ID",response,revision,["not-a-uuid"]);
denied("invalid result",null);
denied("truncated results",{...response,rules:Array.from({length:201},(_,i)=>({...response.rules[0],criterionId:criterion+i}))});
const unknown = parse({
  ...response,verificationAvailable:false,unavailableReason:"missing_source",
  sourceRechecksPerformed:0,rules:[],
});
assert.equal(unknown?.kind,"NOT_CALCULABLE");
assert.equal(unknown?.unavailableReason,"missing_source");
assert.deepEqual(unknown?.rows,[]);
const client=readFileSync(new URL("../components/execution/private-verification-diagnostic.tsx",import.meta.url),"utf8");
const view=readFileSync(new URL("../app/projects/[projectId]/execution/coverage/[revisionId]/page.tsx",import.meta.url),"utf8");
const endpoint=readFileSync(new URL("../app/api/projects/[projectId]/execution/verification-readiness/route.ts",import.meta.url),"utf8");
for (const expected of [
  '"use client"','fetch(url,','credentials: "same-origin"','cache: "no-store"',
  'AbortSignal.timeout(20000)','parsePrivateDiagnostic(data, revisionId,','원본 검증 진단 실행',
  '공식 완료 상태: UNKNOWN','공식 진행률: 미공개',
]) assert.ok(client.includes(expected),"Missing diagnostic UI boundary: "+expected);
assert.ok(view.includes('coverage.completeness === "COMPLETE" ? ('));
assert.ok(view.includes("<PrivateVerificationDiagnostic"));
assert.ok(endpoint.includes('mode:"EM3B_PRIVATE_SOURCE_DIAGNOSTIC"'));
assert.ok(endpoint.includes('progress:"NOT_PUBLISHED"'));
assert.doesNotMatch(client,/localStorage|service_role|createInstallationAccessToken|eval\(/);
assert.doesNotMatch(view,/computeTrustedExecutionReadiness\(/);
console.log("EM4C_PRIVATE_DIAGNOSTIC_PARSER_FAIL_CLOSED = PASS");
console.log("EM4C_MATCHED_SOURCE_NEVER_OFFICIAL_PASS = PASS");
console.log("EM4C_USER_TRIGGERED_PRIVATE_NO_STORE_FETCH = PASS");
console.log("EM4C_UNAUTHORIZED_RESPONSE_AND_NUMERIC_PROGRESS_BLOCKED = PASS");
console.log("EM4C_REAL_GITHUB_APP_LIVE_PROOF = NOT_TESTED");
