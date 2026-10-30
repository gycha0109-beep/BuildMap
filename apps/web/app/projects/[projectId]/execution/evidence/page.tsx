import Link from "next/link";
import { redirect } from "next/navigation";
import { GitHubEvidencePreviewPanel } from "@/components/execution/github-evidence-preview-panel";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

export default async function ExecutionEvidencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
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
    </div>
  );
}
