import { NextRequest, NextResponse } from "next/server";
import { computeTrustedExecutionReadiness } from "@/lib/execution/trusted-evaluation-server";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function noStore(payload:unknown,status=200){
  return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store"}});
}

export async function GET(
  request:NextRequest,
  {params}:{params:Promise<{projectId:string}>},
){
  const {projectId}=await params;
  const revisionId=request.nextUrl.searchParams.get("revisionId");
  if(!UUID.test(projectId)||!revisionId||!UUID.test(revisionId))
    return noStore({error:{code:"invalid_identifiers"},mode:"NOT_PUBLISHED"},400);

  const result=await computeTrustedExecutionReadiness({projectId,revisionId});
  if(result.state==="UNAVAILABLE"){
    const status=result.reason==="unauthenticated"?401:
      ["project_access_denied","approved_revision_unavailable"].includes(result.reason)?404:503;
    return noStore({
      error:{code:result.reason},
      mode:"NOT_PUBLISHED",
      progress:"NOT_PUBLISHED",
      criterionEvaluation:"NOT_PUBLISHED",
    },status);
  }

  const assessment=result.assessment;
  const rules=assessment.status==="CALCULATED"
    ?assessment.milestones.flatMap(m=>m.criteria.map(c=>({
      criterionId:c.criterionId,
      ruleType:c.ruleType,
      providerCheckState:c.verdict==="PASS"?"FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION":
        c.verdict,
      reason:c.reason,
      sourceId:c.supportingEvidenceId,
    })))
    :[];

  // The verified evaluator runs server-only. Until live GitHub App acceptance
  // and EM-4 release gate, do NOT publish numeric progress or milestone PASS.
  return noStore({
    mode:"EM3B_PRIVATE_SOURCE_DIAGNOSTIC",
    revisionId,
    policyVersion:assessment.policyVersion,
    verificationAvailable:assessment.status==="CALCULATED",
    unavailableReason:assessment.status==="NOT_CALCULABLE"?assessment.reason:null,
    sourceRechecksPerformed:result.rechecksPerformed,
    rules,
    progress:"NOT_PUBLISHED",
    criterionEvaluation:"NOT_PUBLISHED",
  });
}
