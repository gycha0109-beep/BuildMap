import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { proposeCriterionEvidenceLinkAction, reviewCriterionEvidenceLinkAction } from "./actions";
import { GitHubEvidencePreviewPanel } from "@/components/execution/github-evidence-preview-panel";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

export default async function ExecutionEvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) redirect("/login");

  const actor = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase.from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", actor.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (!project.data || project.error) redirect("/dashboard?error=project-access");

  const links = await supabase.from("project_links")
    .select("id, label, url")
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(25);

  const cached = await supabase.from("execution_evidence")
    .select("id, repository_name, source_type, source_id, first_observed_at, last_observed_at")
    .eq("project_id", projectId)
    .order("last_observed_at", { ascending: false })
    .limit(50);
  const cachedIds = (cached.data ?? []).map((item) => item.id);
  const approvedRevisions = await supabase.from("roadmap_revisions")
    .select("id, title, version")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("version", { ascending: false })
    .limit(100);
  const approvedIds = (approvedRevisions.data ?? []).map((item) => item.id);
  const criteria = approvedIds.length
    ? await supabase.from("completion_criteria")
      .select("id,title,roadmap_revision_id")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .in("roadmap_revision_id", approvedIds)
      .limit(200)
    : null;
  const associations = await supabase.from("criterion_evidence_links")
    .select("id,criterion_id,evidence_id,review_status")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);
  const query = await searchParams;
  const noticeKey = typeof query.notice === "string" ? query.notice : null;
  const notices: Record<string,string> = {
    "invalid-link": "연결 항목을 확인해 주세요.",
    "invalid-criterion": "완료 조건을 확인해 주세요.",
    "approved-revision-required": "승인된 로드맵 버전의 완료 조건만 연결할 수 있습니다.",
    "invalid-evidence": "저장된 증거 식별자를 확인해 주세요.",
    "proposal-failed": "연결 후보를 등록하지 못했습니다. 중복 여부와 권한을 확인해 주세요.",
    "proposal-created": "검증 전 증거 연결 후보를 등록했습니다.",
    "review-failed": "연결 후보 검토에 실패했습니다.",
    "review-recorded": "연결 후보 검토 이력을 기록했습니다. 완료 판정은 별개입니다.",
  };
  const proposed = proposeCriterionEvidenceLinkAction.bind(null, projectId);
  const reviewed = reviewCriterionEvidenceLinkAction.bind(null, projectId);

  const snapshots = cachedIds.length
    ? await supabase.from("execution_evidence_observations")
      .select("evidence_id, version_sequence, source_state, source_sha, reason, title, source_url, observed_at")
      .eq("project_id", projectId)
      .in("evidence_id", cachedIds)
      .order("version_sequence", { ascending: false })
      .limit(200)
    : null;

  return (
    <div className="page-stack">
      <div className="row">
        <Link href={`/projects/${projectId}/execution`}>← 로드맵 정의</Link>
      </div>
      {noticeKey && notices[noticeKey] ? <div className="alert">{notices[noticeKey]}</div> : null}
      {links.error ? (
        <div className="alert error">GitHub 링크 목록을 읽지 못했습니다.</div>
      ) : (
        <GitHubEvidencePreviewPanel projectId={projectId} links={links.data ?? []} />
      )}
      <section className="surface-card stack">
        <p className="section-kicker">EM-2B · cached observations</p>
        <h2>저장된 GitHub 관측 기록</h2>
        <p className="section-help">
          이 기록은 현재 GitHub 상태의 보증이 아닌 과거 관측 캐시입니다.
          승인된 완료 조건의 PASS 판정이나 진행률 계산에 사용하지 않습니다.
          최대 50개 소스의 최신 스냅샷을 표시합니다.
        </p>
        {cached.error || snapshots?.error ? (
          <div className="alert error">증거 저장소를 읽지 못했습니다. 마이그레이션과 접근 권한을 확인해 주세요.</div>
        ) : cachedIds.length === 0 ? (
          <div className="empty-state"><span>저장된 증거 캐시가 없습니다. GitHub 연결을 확인하고 새로고침·저장을 실행해 주세요.</span></div>
        ) : (
          <ul className="compact-list">
            {(cached.data ?? []).map((entry) => {
              const latest = snapshots?.data?.find((item) => item.evidence_id === entry.id);
              return (
                <li className="compact-item stack" key={entry.id}>
                  <strong>{entry.repository_name} · {entry.source_id}</strong>
                  {latest ? (
                    <>
                      <a href={latest.source_url} target="_blank" rel="noopener noreferrer">
                        {latest.title}
                      </a>
                      <p className="section-help">
                        캐시 상태: {latest.source_state} ·
                        {latest.source_sha ? ` 관측 SHA: ${latest.source_sha} ·` : ""}
                        {latest.reason ? ` ${latest.reason} ·` : ""}
                        최종 관측: {entry.last_observed_at}
                      </p>
                    </>
                  ) : <p className="section-help">스냅샷 없음 · UNKNOWN</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="surface-card stack">
        <p className="section-kicker">EM-2B · source association</p>
        <h2>완료 조건과 증거 연결</h2>
        <p className="section-help">
          연결은 출처 후보를 정리하고 Builder가 검토한 기록입니다.
          검토 승인도 완료 조건 PASS가 아닙니다. EM-3에서 해당 GitHub 원본과 SHA를
          독립적으로 재확인하기 전까지 진행률 산정에 사용하지 않습니다.
        </p>
        {approvedRevisions.error || criteria?.error || associations.error ? (
          <div className="alert error">완료 조건 또는 연결 이력을 읽지 못했습니다.</div>
        ) : cachedIds.length === 0 || (criteria?.data ?? []).length === 0 ? (
          <div className="empty-state">
            <span>승인된 완료 조건과 저장된 GitHub 출처가 모두 있어야 연결 후보를 만들 수 있습니다.</span>
          </div>
        ) : (
          <form action={proposed} className="stack">
            <div className="form-grid-3">
              <label className="field">
                <span>승인된 완료 조건</span>
                <select name="criterionId" required>
                  {(criteria?.data ?? []).map((criterion) => (
                    <option key={criterion.id} value={criterion.id}>
                      {criterion.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>GitHub 관측 자료</span>
                <select name="evidenceId" required>
                  {(cached.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.repository_name} · {item.source_id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <SubmitButton label="증거 연결 후보 등록" pendingLabel="등록 중…" />
          </form>
        )}
        <h3>연결 및 검토 기록</h3>
        {(associations.data ?? []).length === 0 ? (
          <div className="empty-state"><span>아직 연결 후보가 없습니다.</span></div>
        ) : (
          <ul className="compact-list">
            {(associations.data ?? []).map((item) => {
              const criterion = (criteria?.data ?? []).find((entry) => entry.id === item.criterion_id);
              const source = (cached.data ?? []).find((entry) => entry.id === item.evidence_id);
              return (
                <li key={item.id} className="compact-item stack">
                  <strong>{criterion?.title ?? "완료 조건"} · {source?.source_id ?? "증거 식별자"}</strong>
                  <p className="section-help">
                    {item.review_status === "proposed" ? "검토 전" :
                      item.review_status === "reviewed" ? "연결 검토 완료" : "연결 거절"}
                    {" · 완료 상태: UNKNOWN"}
                  </p>
                  {item.review_status === "proposed" ? (
                    <div className="row">
                      <form action={reviewed}>
                        <input type="hidden" name="linkId" value={item.id} />
                        <input type="hidden" name="action" value="reviewed" />
                        <SubmitButton label="연결 검토 승인" pendingLabel="기록 중…" />
                      </form>
                      <form action={reviewed}>
                        <input type="hidden" name="linkId" value={item.id} />
                        <input type="hidden" name="action" value="rejected" />
                        <SubmitButton label="연결 거절" pendingLabel="기록 중…" />
                      </form>
                    </div>
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
