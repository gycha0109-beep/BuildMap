import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import {
  canonicalObservedPullUrl,
  sourceDisplayState,
} from "@/lib/execution/provenance-view";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINKS = 20;

export default async function ExecutionCriterionProvenancePage({
  params,
}: {
  params: Promise<{ projectId: string; criterionId: string }>;
}) {
  const { projectId, criterionId } = await params;
  if (!UUID.test(projectId) || !UUID.test(criterionId)) notFound();

  const db = await createClient();
  const user = await db.auth.getUser();
  if (user.error || !user.data.user) redirect("/login");

  // Read-only identity lookup: ensureBuilderContext() may INSERT profiles.
  const profile = await db.from("user_profiles").select("id")
    .eq("auth_user_id", user.data.user.id).maybeSingle();
  if (profile.error || !profile.data) notFound();
  const builder = await db.from("builder_profiles").select("id")
    .eq("user_profile_id", profile.data.id).maybeSingle();
  if (builder.error || !builder.data) notFound();
  const project = await db.from("projects").select("id")
    .eq("id", projectId).eq("owner_builder_profile_id", builder.data.id)
    .is("archived_at", null).maybeSingle();
  if (project.error || !project.data) notFound();

  const criterion = await db.from("completion_criteria")
    .select("id,title,rule_type,is_required,roadmap_revision_id,milestone_id")
    .eq("project_id", projectId).eq("id", criterionId)
    .is("archived_at", null).maybeSingle();
  if (criterion.error || !criterion.data) notFound();

  const [revision, milestone] = await Promise.all([
    db.from("roadmap_revisions")
      .select("id,title,version,status,approved_at")
      .eq("project_id", projectId).eq("id", criterion.data.roadmap_revision_id)
      .eq("status", "approved").maybeSingle(),
    db.from("execution_milestones")
      .select("id,title,weight,roadmap_revision_id")
      .eq("project_id", projectId).eq("id", criterion.data.milestone_id)
      .eq("roadmap_revision_id", criterion.data.roadmap_revision_id)
      .is("archived_at", null).maybeSingle(),
  ]);
  if (revision.error || !revision.data || milestone.error || !milestone.data) notFound();

  const links = await db.from("criterion_evidence_links")
    .select("id,evidence_id,review_status,reviewed_at,created_at")
    .eq("project_id", projectId).eq("criterion_id", criterionId)
    .order("created_at", { ascending: false }).limit(MAX_LINKS + 1);

  const displayedLinks = (links.data ?? []).slice(0, MAX_LINKS);
  const evidenceIds = [...new Set(displayedLinks.map((link) => link.evidence_id))];
  const evidence = evidenceIds.length
    ? await db.from("execution_evidence")
      .select("id,repository_name,repository_id,source_type,source_id,last_observed_at")
      .eq("project_id", projectId).in("id", evidenceIds).limit(MAX_LINKS)
    : null;

  const sources = new Map((evidence?.data ?? []).map((source) => [source.id, source]));
  const snapshots = await Promise.all(evidenceIds.map(async (evidenceId) => {
    const snapshot = await db.from("execution_evidence_observations")
      .select("source_state,source_sha,reason,observed_at,version_sequence")
      .eq("project_id", projectId).eq("evidence_id", evidenceId)
      .order("version_sequence", { ascending: false }).limit(1).maybeSingle();
    return { evidenceId, snapshot: snapshot.error ? null : snapshot.data, error: Boolean(snapshot.error) };
  }));
  const snapshotMap = new Map(snapshots.map((entry) => [entry.evidenceId, entry]));

  const loadError = Boolean(links.error || evidence?.error || snapshots.some((entry) => entry.error));
  const truncated = (links.data ?? []).length > MAX_LINKS;

  return (
    <div className="page-stack">
      <nav className="row">
        <Link href={"/projects/" + projectId + "/execution"}>← 로드맵</Link>
        <Link href={"/projects/" + projectId + "/execution/evidence"}>GitHub 증거 관리</Link>
      </nav>

      <section className="hero-card stack">
        <p className="section-kicker">Execution Map · EM-4A · criterion provenance</p>
        <h2>{criterion.data.title}</h2>
        <div className="row">
          <Badge tone="review">완료 판정: UNKNOWN</Badge>
          <Badge>{criterion.data.is_required ? "필수 조건" : "선택 조건"}</Badge>
          <Badge>{criterion.data.rule_type}</Badge>
        </div>
        <p className="section-help">
          여기 표시된 자료는 검토된 연결과 저장된 GitHub 관측 기록입니다.
          현재 제공자 원본을 이 화면에서 재검증하지 않으므로 PASS·FAIL 판정이나
          진행률을 계산하지 않습니다. 공식 완료 상태는 EM-3 평가 경로가 연결되기 전까지 UNKNOWN입니다.
        </p>
      </section>

      <section className="surface-card stack">
        <p className="section-kicker">Approved revision · immutable definition</p>
        <h2>이 조건의 로드맵 근거</h2>
        <p>
          승인된 로드맵: <strong>v{revision.data.version} · {revision.data.title}</strong>
          {" · "}마일스톤: <strong>{milestone.data.title}</strong>
        </p>
        <p className="section-help">
          마일스톤의 승인 가중치: {milestone.data.weight}
          {" · "}승인 시각: {revision.data.approved_at ?? "미확인"}
        </p>
        <p className="section-help">
          가중치는 정의된 값을 그대로 표시하며 완료율로 환산하지 않습니다.
          이전 승인 버전의 조건은 이후 버전의 증거로 자동 승계되지 않습니다.
        </p>
      </section>

      <section className="surface-card stack">
        <p className="section-kicker">Evidence lineage · cached only</p>
        <h2>증거 연결·검토·관측 이력</h2>
        {truncated ? (
          <div className="alert">
            연결 목록이 {MAX_LINKS}개를 초과합니다. 여기서는 최근 {MAX_LINKS}개만 표시하므로 증거 목록이 불완전합니다.
          </div>
        ) : null}
        {loadError ? (
          <div className="alert error">
            증거 또는 관측 기록 일부를 조회하지 못했습니다. 누락된 기록은 UNKNOWN으로 취급합니다.
          </div>
        ) : null}
        {displayedLinks.length === 0 ? (
          <div className="empty-state">
            <strong>이 완료 조건에 연결된 증거가 없습니다.</strong>
            <span>증거 관리에서 연결 후보를 만들고 검토할 수 있습니다. 현재 완료 상태는 UNKNOWN입니다.</span>
          </div>
        ) : (
          <ul className="compact-list">
            {displayedLinks.map((link) => {
              const source = sources.get(link.evidence_id);
              const latest = snapshotMap.get(link.evidence_id)?.snapshot ?? null;
              const viewState = sourceDisplayState(latest);
              const url = source ? canonicalObservedPullUrl({
                repositoryName: source.repository_name,
                sourceType: source.source_type,
                sourceId: source.source_id,
              }) : null;
              return (
                <li key={link.id} className="compact-item stack">
                  <div className="row">
                    <strong>{source ? source.repository_name + " · " + source.source_id : "출처 확인 불가"}</strong>
                    <Badge tone="review">UNKNOWN</Badge>
                  </div>
                  <p className="section-help">
                    연결 검토: {link.review_status === "reviewed" ? "Builder 검토 완료" :
                      link.review_status === "rejected" ? "거절" : "검토 대기"}
                    {" · "}검토 시각: {link.reviewed_at ?? "없음"}
                  </p>
                  <p className="section-help">
                    원본 증명: {viewState === "CACHE_ONLY" ? "이전 관측 캐시만 존재" :
                      viewState === "UNKNOWN" ? "관측 출처 확인 불가" : "스냅샷 없음"}
                    {latest?.source_sha ? " · 캐시 SHA: " + latest.source_sha : ""}
                    {latest?.reason ? " · 사유: " + latest.reason : ""}
                    {latest?.observed_at ? " · 관측 시각: " + latest.observed_at : ""}
                  </p>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      GitHub PR 원본 보기 (이 링크는 완료 검증이 아닙니다)
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
