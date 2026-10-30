import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { summarizeEvidenceLinkage } from "@/lib/execution/em4b-evidence-coverage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MILESTONES = 50;
const MAX_CRITERIA = 200;
const MAX_LINKS = 500;

function denyCoverage(reason: string): never {
  if (process.env.NODE_ENV === "development") console.info("EM4B_LOCAL_ROUTE_DENIAL", reason);
  notFound();
}

const linkageText = {
  NO_LINK: "연결 없음",
  AWAITING_REVIEW: "연결 검토 대기",
  REJECTED_ONLY: "연결 거절 이력만 있음",
  REVIEWED_LINK_ONLY: "Builder 연결 검토 완료 · 원본 미검증",
} as const;

export default async function ExecutionRevisionCoveragePage({
  params,
}: {
  params: Promise<{ projectId: string; revisionId: string }>;
}) {
  const { projectId, revisionId } = await params;
  if (!UUID.test(projectId) || !UUID.test(revisionId)) denyCoverage("route-id");

  const db = await createClient();
  const authenticated = await db.auth.getUser();
  if (authenticated.error || !authenticated.data.user) redirect("/login");

  // No auto-creation of profiles on this read-only inspection path.
  const profile = await db.from("user_profiles").select("id")
    .eq("auth_user_id", authenticated.data.user.id).maybeSingle();
  if (profile.error || !profile.data) denyCoverage("profile");
  const builder = await db.from("builder_profiles").select("id")
    .eq("user_profile_id", profile.data.id).maybeSingle();
  if (builder.error || !builder.data) denyCoverage("builder");
  const project = await db.from("projects").select("id")
    .eq("id", projectId).eq("owner_builder_profile_id", builder.data.id)
    .is("archived_at", null).maybeSingle();
  if (project.error || !project.data) denyCoverage("project");

  const revision = await db.from("roadmap_revisions")
    .select("id,track_id,title,version,status,approved_at")
    .eq("project_id", projectId).eq("id", revisionId)
    .eq("status", "approved").maybeSingle();
  if (revision.error || !revision.data) denyCoverage("approved-revision");
  const track = await db.from("execution_tracks").select("id,name")
    .eq("project_id", projectId).eq("id", revision.data.track_id)
    .is("archived_at", null).maybeSingle();
  if (track.error || !track.data) denyCoverage("active-track");

  const [milestones, criteria] = await Promise.all([
    db.from("execution_milestones").select("id,title,weight")
      .eq("project_id", projectId).eq("roadmap_revision_id", revisionId)
      .is("archived_at", null).order("position").limit(MAX_MILESTONES + 1),
    db.from("completion_criteria")
      .select("id,milestone_id,title,rule_type,is_required")
      .eq("project_id", projectId).eq("roadmap_revision_id", revisionId)
      .is("archived_at", null).order("position").limit(MAX_CRITERIA + 1),
  ]);
  const selectedIds = (criteria.data ?? []).slice(0, MAX_CRITERIA).map((row) => row.id);
  const links = selectedIds.length > 0
    ? await db.from("criterion_evidence_links")
      .select("id,criterion_id,review_status")
      .eq("project_id", projectId)
      .in("criterion_id", selectedIds).limit(MAX_LINKS + 1)
    : null;

  // No partial count is treated as a complete evidence coverage assessment.
  const completeRead = !milestones.error && !criteria.error && !links?.error &&
    (milestones.data?.length ?? 0) <= MAX_MILESTONES &&
    (criteria.data?.length ?? 0) <= MAX_CRITERIA &&
    (links?.data?.length ?? 0) <= MAX_LINKS;
  const coverage = summarizeEvidenceLinkage({
    completeRead,
    milestones: (milestones.data ?? []).slice(0, MAX_MILESTONES),
    criteria: (criteria.data ?? []).slice(0, MAX_CRITERIA),
    links: (links?.data ?? []).slice(0, MAX_LINKS),
  });

  return (
    <div className="page-stack">
      <div className="row">
        <Link href={"/projects/" + projectId + "/execution"}>← 로드맵</Link>
        <Link href={"/projects/" + projectId + "/execution/evidence"}>증거 관리</Link>
      </div>
      <section className="hero-card stack">
        <p className="section-kicker">Execution Map · EM-4B · approved revision evidence linkage</p>
        <h2>{track.data.name} · v{revision.data.version} 근거 현황</h2>
        <p className="section-help">
          승인된 버전: {revision.data.title} · 승인 시각: {revision.data.approved_at ?? "미확인"}
        </p>
        <div className="row">
          <Badge tone="review">공식 진행률: 미공개</Badge>
          <Badge>완료 평가: UNKNOWN</Badge>
          <Badge>{coverage.completeness === "COMPLETE" ? "연결 현황 조회 완료" : "연결 현황 조회 불완전"}</Badge>
        </div>
        <p className="section-help">
          이 화면의 숫자는 로드맵 완료율이 아닌 증거 연결·검토 현황입니다.
          검토된 연결도 실제 GitHub 재조회와 서버 검증을 대신하지 않습니다.
          인증된 EM-3 판정 결과가 연결될 때까지 모든 완료 조건은 UNKNOWN입니다.
        </p>
      </section>

      {coverage.completeness !== "COMPLETE" ? (
        <section className="surface-card stack">
          <div className="alert error">
            권한/조회 오류 또는 페이지당 조회 상한으로 목록이 불완전합니다.
            부분적인 조건 수·검토 수·UNKNOWN 수를 전체 집계처럼 표시하지 않습니다.
          </div>
          <p className="section-help">
            마일스톤 최대 {MAX_MILESTONES}개, 완료 조건 최대 {MAX_CRITERIA}개,
            연결 최대 {MAX_LINKS}개까지 정확한 집계가 가능합니다.
          </p>
        </section>
      ) : (
        <>
          <section className="surface-card stack">
            <p className="section-kicker">Evidence association coverage · not verified progress</p>
            <h2>완료 조건별 연결 현황</h2>
            <div className="row">
              <Badge>조건 {coverage.criterionCount}개</Badge>
              <Badge tone="review">완료 판정 UNKNOWN {coverage.unknownCount}개</Badge>
              <Badge>검토된 연결이 있는 조건 {coverage.reviewedLinkCriterionCount}개</Badge>
              <Badge>검토된 연결이 없는 조건 {coverage.unreviewedCriterionCount}개</Badge>
            </div>
          </section>
          {(milestones.data ?? []).map((milestone) => (
            <section className="surface-card stack" key={milestone.id}>
              <div className="section-head">
                <div>
                  <p className="section-kicker">Approved milestone · weight {milestone.weight}</p>
                  <h2>{milestone.title}</h2>
                </div>
                <Badge tone="review">완료 검증 UNKNOWN</Badge>
              </div>
              <ul className="compact-list">
                {coverage.rows.filter((row) => row.milestoneId === milestone.id).map((row) => (
                  <li key={row.id} className="compact-item stack">
                    <div className="row">
                      <strong>{row.title}</strong>
                      <Badge tone="review">UNKNOWN</Badge>
                    </div>
                    <p className="section-help">
                      {row.ruleType} · {row.required ? "필수" : "선택"} · {linkageText[row.linkage]}
                    </p>
                    <p className="section-help">
                      검토된 연결 {row.reviewedLinks}건 · 검토 대기 {row.proposedLinks}건 ·
                      거절 {row.rejectedLinks}건
                    </p>
                    <Link href={"/projects/" + projectId + "/execution/provenance/" + row.id}>
                      출처·검토·관측 SHA 상세 보기
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
