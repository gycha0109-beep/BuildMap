import "server-only";

import { ensureBuilderContext } from "@/lib/buildmap/account";
import { isGitHubAppConfigured, verifyGitHubBindingProof } from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { inspectGitHubExecutionInstallation } from "@/lib/execution/github-installation-diagnostic";
import { inspectExecutionSourceHealth } from "@/lib/execution/github-source-health";
import { extendedExecutionSourceReadsEnabled } from "@/lib/execution/github-extended-capability-broker";
import { checkApprovedExtendedRulesForVerifiedSource } from "@/lib/execution/trusted-extended-rule-adapter";
import {
  evaluateApprovedRoadmap,
  type FreshProviderRecheck,
  type TrustedExtendedRuleProof,
  type ProgressAssessment,
  type TrustedManualAcceptance,
  type Revision,
  type RuleType,
  type SourceAssociation,
} from "@/lib/execution/deterministic-evaluator";
import { createClient } from "@/lib/supabase/server";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPOSITORY_ID=/^[1-9][0-9]{0,15}$/;
const SHA=/^[0-9a-f]{40}$/;
const MAX_MILESTONES=50;
const MAX_CRITERIA=200;
const MAX_LINKS=200;
const MAX_EVIDENCE=100;
const MAX_RECHECKS=12;
const MAX_GITHUB_LINKS=25;
const CACHE_FRESH_MS=24*60*60*1000;

export type TrustedReadiness =
  | { state:"UNAVAILABLE"; reason:string; assessment:null; rechecksPerformed:0 }
  | { state:"VERIFIED_AT_REQUEST_TIME"; reason:null; assessment:ProgressAssessment; rechecksPerformed:number };

// Server-only source of truth. A client cannot submit provider rechecks,
// expected SHAs, evidence mappings or roadmap definitions to this function.
export async function computeTrustedExecutionReadiness(input: {
  projectId: string;
  revisionId: string;
}): Promise<TrustedReadiness> {
  const unavailable=(reason:string):TrustedReadiness=>({
    state:"UNAVAILABLE",reason,assessment:null,rechecksPerformed:0,
  });
  if(!UUID.test(input.projectId)||!UUID.test(input.revisionId))
    return unavailable("invalid_identifiers");

  const supabase=await createClient();
  const user=await supabase.auth.getUser();
  if(!user.data.user) return unavailable("unauthenticated");
  const builder=await ensureBuilderContext(supabase,user.data.user);
  const project=await supabase.from("projects").select("id")
    .eq("id",input.projectId).eq("owner_builder_profile_id",builder.builderProfileId)
    .is("archived_at",null).maybeSingle();
  if(project.error||!project.data) return unavailable("project_access_denied");

  const selected=await supabase.from("roadmap_revisions")
    .select("id,project_id,track_id,status,version")
    .eq("project_id",input.projectId).eq("id",input.revisionId)
    .eq("status","approved").maybeSingle();
  if(selected.error||!selected.data) return unavailable("approved_revision_unavailable");
  const revisionRow=selected.data;

  const [milestonesResult,criteriaResult,linksResult]=await Promise.all([
    supabase.from("execution_milestones")
      .select("id,project_id,track_id,roadmap_revision_id,weight,archived_at,position")
      .eq("project_id",input.projectId).eq("track_id",revisionRow.track_id)
      .eq("roadmap_revision_id",input.revisionId)
      .is("archived_at",null)
      .order("position",{ascending:true}).limit(MAX_MILESTONES+1),
    supabase.from("completion_criteria")
      .select("id,project_id,track_id,roadmap_revision_id,milestone_id,rule_type,rule_config,is_required,archived_at,position")
      .eq("project_id",input.projectId).eq("track_id",revisionRow.track_id)
      .eq("roadmap_revision_id",input.revisionId)
      .is("archived_at",null)
      .order("position",{ascending:true}).limit(MAX_CRITERIA+1),
    supabase.from("criterion_evidence_links")
      .select("id,project_id,criterion_id,evidence_id,review_status")
      .eq("project_id",input.projectId).limit(MAX_LINKS+1),
  ]);
  if(milestonesResult.error||criteriaResult.error||linksResult.error)
    return unavailable("roadmap_or_association_query_failed");
  const milestoneRows=milestonesResult.data??[];
  const criterionRows=criteriaResult.data??[];
  const linkRows=linksResult.data??[];
  if(milestoneRows.length>MAX_MILESTONES||criterionRows.length>MAX_CRITERIA||
     linkRows.length>MAX_LINKS)
    return unavailable("roadmap_or_link_snapshot_truncated");

  const milestoneIds=new Set(milestoneRows.map(row=>row.id));
  if(criterionRows.some(row=>!milestoneIds.has(row.milestone_id)))
    return unavailable("orphan_or_mismatched_criterion");

  const criterionIds=new Set(criterionRows.map(row=>row.id));
  const relevantLinks=linkRows.filter(row=>criterionIds.has(row.criterion_id));
  const evidenceIds=[...new Set(relevantLinks.map(row=>row.evidence_id))];
  if(evidenceIds.length>MAX_EVIDENCE) return unavailable("too_many_evidence_sources");
  const evidenceResult=evidenceIds.length
    ? await supabase.from("execution_evidence")
      .select("id,project_id,provider,repository_id,repository_name,source_type,source_id")
      .eq("project_id",input.projectId).in("id",evidenceIds)
      .limit(MAX_EVIDENCE+1)
    : { data:[],error:null };
  if(evidenceResult.error||!evidenceResult.data||
     evidenceResult.data.length!==evidenceIds.length)
    return unavailable("evidence_scope_or_read_incomplete");

  const evidenceById=new Map(evidenceResult.data.map(row=>[row.id,row]));
  const associations:SourceAssociation[]=relevantLinks.flatMap(link=>{
    const evidence=evidenceById.get(link.evidence_id);
    if(!evidence||evidence.provider!=="github"||
      !["merged_pull_request","release"].includes(evidence.source_type))
      return [];
    return [{
      criterionId:link.criterion_id,
      evidenceId:link.evidence_id,
      sourceId:evidence.source_id,
      repositoryId:String(evidence.repository_id),
      sourceType:evidence.source_type as "merged_pull_request" | "release",
      reviewStatus:link.review_status as SourceAssociation["reviewStatus"],
    }];
  });

  const manualCriterionIds=new Set(criterionRows
    .filter(criterion=>criterion.rule_type==="MANUAL_ACCEPTANCE")
    .map(criterion=>criterion.id));
  const manualAcceptances:TrustedManualAcceptance[]=[];
  if(manualCriterionIds.size){
    const latestEvents=await supabase.from("execution_manual_acceptance_events")
      .select("id,project_id,track_id,roadmap_revision_id,criterion_id,event_type,reason,actor_builder_profile_id,recorded_at")
      .eq("project_id",input.projectId)
      .eq("track_id",revisionRow.track_id)
      .eq("roadmap_revision_id",input.revisionId)
      .order("recorded_at",{ascending:false})
      .order("id",{ascending:false}).limit(501);
    if(latestEvents.error||!latestEvents.data||latestEvents.data.length>500)
      return unavailable("manual_audit_unavailable_or_truncated");

    // One most-recent event per approved criterion. Event identity, actor and
    // clock are assigned by the database trigger at insertion, not the browser.
    const seen=new Set<string>();
    for(const event of latestEvents.data){
      if(!manualCriterionIds.has(event.criterion_id)||seen.has(event.criterion_id))
        continue;
      seen.add(event.criterion_id);
      manualAcceptances.push({
        kind:"BUILDER_MANUAL_ACCEPTANCE",eventId:event.id,
        criterionId:event.criterion_id,revisionId:event.roadmap_revision_id,
        action:event.event_type as "accepted"|"revoked",
        actorBuilderProfileId:event.actor_builder_profile_id,
        reason:event.reason,recordedAt:event.recorded_at,
      });
    }
  }

  const revision:Revision={
    id:revisionRow.id,
    status:"approved",
    version:revisionRow.version,
    milestones:milestoneRows.map(milestone=>({
      id:milestone.id,weight:String(milestone.weight),
      criteria:criterionRows.filter(criterion=>criterion.milestone_id===milestone.id)
        .map(criterion=>({
          id:criterion.id,
          ruleType:criterion.rule_type as RuleType,
          isRequired:criterion.is_required,
          ruleConfig:criterion.rule_config??{},
        })),
    })),
  };

  // Never query arbitrary user-supplied GitHub URLs. Only re-read reviewed
  // source links of the immutable approved revision through active HMAC bindings.
  const extendedEnabled=extendedExecutionSourceReadsEnabled();
  const extendedTypes=["CHECK_PASSED","ARTIFACT_EXISTS","DEPLOY_VERIFIED"];
  const reviewed=associations.filter(link=>
    link.reviewStatus==="reviewed"&&link.sourceType==="merged_pull_request"&&
    criterionRows.some(criterion=>
      criterion.id===link.criterionId&&(
        criterion.rule_type==="PR_MERGED"||
        (extendedEnabled && extendedTypes.includes(criterion.rule_type))
      )
    )
  );
  const extendedCandidates=extendedEnabled
    ?reviewed.filter(link=>criterionRows.some(criterion=>
      criterion.id===link.criterionId&&
      extendedTypes.includes(criterion.rule_type)))
    :[];
  if(extendedCandidates.length>MAX_RECHECKS)
    return unavailable("extended_verification_budget_exceeded");
  const uniqueReviewed=[...new Map(reviewed.map(link=>[link.evidenceId,link])).values()];
  if(uniqueReviewed.length>MAX_RECHECKS)
    return unavailable("fresh_verification_budget_exceeded");

  const rechecks:FreshProviderRecheck[]=[];
  const extendedRuleProofs:TrustedExtendedRuleProof[]=[];
  const sourceVersionsUsed=new Map<string,{version:number;sha:string}>();
  let rechecksPerformed=0;

  if(uniqueReviewed.length&&isGitHubAppConfigured()){
    const links=await supabase.from("project_links")
      .select("id,url")
      .eq("project_id",input.projectId).eq("link_type","github")
      .is("archived_at",null)
      .limit(MAX_GITHUB_LINKS+1);
    if(links.error||!links.data||links.data.length>MAX_GITHUB_LINKS)
      return unavailable("github_link_inventory_unavailable_or_truncated");

    const trustedRepositories=new Map<string,{
      owner:string;repository:string;repositoryId:string;installationId:string;
    }>();
    const ambiguousRepositoryIds=new Set<string>();
    for(const link of links.data){
      const parsed=parseCanonicalGitHubRepositoryUrl(link.url);
      if(!parsed) continue;
      const binding=await supabase.from("integration_bindings")
        .select("project_link_id,external_connection_id,external_resource_id,external_resource_label,binding_proof")
        .eq("project_link_id",link.id).eq("provider","github")
        .eq("status","active").is("archived_at",null)
        .limit(2);
      if(binding.error||!binding.data||binding.data.length!==1) continue;
      const record=binding.data[0];
      if(!REPOSITORY_ID.test(record.external_resource_id)||
        !REPOSITORY_ID.test(record.external_connection_id)||
        record.external_resource_label.toLowerCase()!==parsed.fullName.toLowerCase()) continue;
      if(!verifyGitHubBindingProof({
        projectLinkId:link.id,
        installationId:record.external_connection_id,
        repositoryId:record.external_resource_id,
        fullName:parsed.fullName,
      },record.binding_proof)) continue;
      const id=record.external_resource_id;
      // Ambiguous multiple active bindings to one numeric repository fail closed.
      if(trustedRepositories.has(id)||ambiguousRepositoryIds.has(id)){
        trustedRepositories.delete(id);
        ambiguousRepositoryIds.add(id);
        continue;
      }
      trustedRepositories.set(id,{
        owner:parsed.owner,repository:parsed.repository,
        repositoryId:id,installationId:record.external_connection_id,
      });
    }

    const ready=new Map<string,boolean>();
    for(const link of uniqueReviewed){
      const evidence=evidenceById.get(link.evidenceId);
      if(!evidence) continue;
      const binding=trustedRepositories.get(link.repositoryId);
      if(!binding) continue;
      if(evidence.repository_name.toLowerCase()!==
        `${binding.owner}/${binding.repository}`.toLowerCase()) continue;
      if(!ready.has(link.repositoryId)){
        try {
          const check=await inspectGitHubExecutionInstallation(binding);
          ready.set(link.repositoryId,
            check.installationIdentity==="MATCH"&&check.repositoryIdentity==="MATCH");
        } catch {
          ready.set(link.repositoryId,false);
        }
      }
      if(!ready.get(link.repositoryId)) continue;
      const snapshot=await supabase.from("execution_evidence_observations")
        .select("source_sha,source_state,observed_at,version_sequence")
        .eq("project_id",input.projectId).eq("evidence_id",link.evidenceId)
        .order("version_sequence",{ascending:false}).limit(1).maybeSingle();
      if(snapshot.error||!snapshot.data||snapshot.data.source_state!=="SOURCE_CONFIRMED"||
        !snapshot.data.source_sha||!SHA.test(snapshot.data.source_sha)) continue;
      const observedAt=Date.parse(snapshot.data.observed_at);
      const checkedAt=Date.now();
      if(!Number.isFinite(observedAt)||observedAt>checkedAt||
        checkedAt-observedAt>CACHE_FRESH_MS) continue;

      rechecksPerformed++;
      try {
        const status=await inspectExecutionSourceHealth({
          ...binding,sourceType:"merged_pull_request",
          sourceId:link.sourceId,cachedSha:snapshot.data.source_sha,
        });
        if(status.sourceState==="CURRENT_SOURCE_MATCH" &&
          status.currentSha===snapshot.data.source_sha &&
          status.currentSha!==null) {
          // The owner can append an observation while the provider request is
          // in flight. Re-read latest sequence before constructing any proof.
          const latest=await supabase.from("execution_evidence_observations")
            .select("source_sha,source_state,version_sequence")
            .eq("project_id",input.projectId).eq("evidence_id",link.evidenceId)
            .order("version_sequence",{ascending:false}).limit(1).maybeSingle();
          if(latest.error||!latest.data||
            latest.data.version_sequence!==snapshot.data.version_sequence ||
            latest.data.source_sha!==snapshot.data.source_sha ||
            latest.data.source_state!=="SOURCE_CONFIRMED") continue;
          sourceVersionsUsed.set(link.evidenceId,{
            version:snapshot.data.version_sequence,
            sha:snapshot.data.source_sha,
          });
          rechecks.push({
            kind:"GITHUB_PR_MERGE_RECHECK",
            evidenceId:link.evidenceId,sourceId:link.sourceId,
            repositoryId:link.repositoryId,checkedAt:status.checkedAt,
            currentSha:status.currentSha,cachedSha:snapshot.data.source_sha,
            result:"CURRENT_SOURCE_MATCH",
          });
          if(extendedEnabled){
            const criteriaForSource=reviewed
              .filter(item=>item.evidenceId===link.evidenceId)
              .flatMap(item=>criterionRows
                .filter(criterion=>criterion.id===item.criterionId &&
                  extendedTypes.includes(criterion.rule_type))
                .map(criterion=>({
                  id:criterion.id,
                  ruleType:criterion.rule_type as
                    "CHECK_PASSED"|"ARTIFACT_EXISTS"|"DEPLOY_VERIFIED",
                  config:criterion.rule_config,
                })));
            try {
              extendedRuleProofs.push(...await checkApprovedExtendedRulesForVerifiedSource({
                binding,
                source:{
                  evidenceId:link.evidenceId,sourceId:link.sourceId,
                  repositoryId:link.repositoryId,
                  sha:status.currentSha,checkedAt:status.checkedAt,
                },
                criteria:criteriaForSource,
              }));
            } catch {
              // Any scope, token, provider or config error is UNKNOWN.
            }
          }
        }
      } catch {
        // Network, app suspension, permission or API errors remain UNKNOWN.
      }
    }
  }

  // Recheck every source snapshot AFTER all extended provider calls.
  // A user might append a new observation while an Actions/Deployment API
  // request was in flight; never count an older successful observation.
  for(const [evidenceId,used] of sourceVersionsUsed){
    const finalSnapshot=await supabase.from("execution_evidence_observations")
      .select("source_sha,source_state,version_sequence")
      .eq("project_id",input.projectId).eq("evidence_id",evidenceId)
      .order("version_sequence",{ascending:false}).limit(1).maybeSingle();
    if(finalSnapshot.error||!finalSnapshot.data ||
      finalSnapshot.data.version_sequence!==used.version ||
      finalSnapshot.data.source_sha!==used.sha ||
      finalSnapshot.data.source_state!=="SOURCE_CONFIRMED")
      return unavailable("source_changed_during_evaluation");
  }

  // Capture evaluation time AFTER all network calls. EM-3A performs the
  // 5-minute freshness and canonical SHA checks again before any PASS.
  const assessment=evaluateApprovedRoadmap({
    revision,associations,providerRechecks:rechecks,manualAcceptances,
    extendedRuleProofs,
    policyVersion:extendedEnabled?"EM3CB_V3":"EM3C_V2",
    nowIso:new Date().toISOString(),
  });
  return {state:"VERIFIED_AT_REQUEST_TIME",reason:null,assessment,rechecksPerformed};
}
