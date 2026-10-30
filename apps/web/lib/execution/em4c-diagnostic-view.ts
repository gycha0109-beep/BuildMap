/**
 * Display-only boundary for the owner-authenticated EM-3B private readiness
 * endpoint. No returned verdict is an approved milestone/criterion PASS.
 */
export type DiagnosticRow = {
  criterionId: string;
  ruleType: string;
  state: "MATCHED_NOT_PUBLISHED" | "FAIL" | "PENDING" | "UNKNOWN";
  reason: string;
};
export type DiagnosticView = {
  kind: "AVAILABLE" | "NOT_CALCULABLE";
  policyVersion: string;
  rows: DiagnosticRow[];
  rechecks: number;
  unavailableReason: string | null;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rules=new Set(["PR_MERGED","CHECK_PASSED","ARTIFACT_EXISTS","DEPLOY_VERIFIED","MANUAL_ACCEPTANCE"]);
const states=new Set(["FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION","FAIL","PENDING","UNKNOWN"]);
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const safeReason=(v:unknown)=>typeof v==="string"&&v.length<=160&&/^[a-zA-Z0-9_.:-]*$/.test(v);
const validPolicy=(v:unknown)=>typeof v==="string"&&v.length>0&&v.length<=60&&/^[A-Za-z0-9_:-]+$/.test(v);

/** Parse a response only if a currently selected approved revision matches.
 * An accidental numeric progress, PASS verdict, unknown criterion or
 * malformed reply causes the entire preview to fail closed.
 */
export function parsePrivateDiagnostic(
  value:unknown,
  expectedRevisionId:string,
  allowedCriterionIds:readonly string[],
):DiagnosticView|null {
  if(!UUID.test(expectedRevisionId)||!record(value)||
     value.mode!=="EM3B_PRIVATE_SOURCE_DIAGNOSTIC"||
     value.revisionId!==expectedRevisionId||
     value.progress!=="NOT_PUBLISHED"||
     value.criterionEvaluation!=="NOT_PUBLISHED"||
     typeof value.verificationAvailable!=="boolean"||
     !validPolicy(value.policyVersion)||
     typeof value.sourceRechecksPerformed!=="number"||
     !Number.isSafeInteger(value.sourceRechecksPerformed)||
     value.sourceRechecksPerformed<0||value.sourceRechecksPerformed>12||
     !Array.isArray(value.rules)||value.rules.length>200||
     !(value.unavailableReason===null||safeReason(value.unavailableReason)))return null;

  const expected=new Set(allowedCriterionIds);
  if(expected.size!==allowedCriterionIds.length||
     allowedCriterionIds.length>200||
     allowedCriterionIds.some(id=>!UUID.test(id)))return null;
  const seen=new Set<string>();
  const rows:DiagnosticRow[]=[];
  for(const item of value.rules){
    if(!record(item)||!record(item)||
       typeof item.criterionId!=="string"||
       !expected.has(item.criterionId)||seen.has(item.criterionId)||
       typeof item.ruleType!=="string"||!rules.has(item.ruleType)||
       typeof item.providerCheckState!=="string"||
       !states.has(item.providerCheckState)||
       !safeReason(item.reason))return null;
    seen.add(item.criterionId);
    rows.push({
      criterionId:item.criterionId,
      ruleType:item.ruleType,
      state:item.providerCheckState==="FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION"?
        "MATCHED_NOT_PUBLISHED":item.providerCheckState as DiagnosticRow["state"],
      reason:item.reason,
    });
  }
  if(value.verificationAvailable===false && rows.length!==0)return null;
  if(value.verificationAvailable===true && value.unavailableReason!==null)return null;
  return {
    kind:value.verificationAvailable?"AVAILABLE":"NOT_CALCULABLE",
    policyVersion:value.policyVersion,
    rows,
    rechecks:value.sourceRechecksPerformed,
    unavailableReason:value.unavailableReason,
  };
}
