import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, projectLifecycleLabel, visibilityLabel } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapAccountAction, captureFromDashboardAction } from "./actions";

const dashboardErrors: Record<string, string> = {
  "invalid-project": "프로젝트 제목과 설명 길이를 확인해 주세요.",
  "project-create": "프로젝트를 생성하지 못했습니다.",
  "project-access": "프로젝트에 접근할 수 없습니다.",
  "invalid-capture-project": "Capture를 남길 프로젝트를 선택해 주세요.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data.user) {
    redirect("/login");
  }

  const userProfile = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("auth_user_id", currentUser.data.user.id)
    .maybeSingle();

  let builderProfile: { id: string; public_display_name: string | null } | null = null;

  if (userProfile.data) {
    const builderResult = await supabase
      .from("builder_profiles")
      .select("id, public_display_name")
      .eq("user_profile_id", userProfile.data.id)
      .maybeSingle();

    if (!builderResult.error) {
      builderProfile = builderResult.data;
    }
  }

  const params = await searchParams;
  const error =
    typeof params.error === "string" ? dashboardErrors[params.error] : undefined;

  if (!userProfile.data || !builderProfile) {
    return (
      <main className="public-shell">
        <section className="public-card narrow stack">
          <div>
            <p className="eyebrow">Builder setup</p>
            <h1>Builder 설정이 필요합니다.</h1>
            <p className="muted">
              로그인 계정을 BuildMap의 User Profile과 Builder Profile에 연결합니다.
            </p>
          </div>
          <form action={bootstrapAccountAction}>
            <button className="button">Builder 프로필 만들기</button>
          </form>
        </section>
      </main>
    );
  }

  const projects = await supabase
    .from("projects")
    .select("id, title, one_line_description, lifecycle_status, visibility_status, updated_at")
    .eq("owner_builder_profile_id", builderProfile.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const projectRows = projects.data ?? [];
  const projectIds = projectRows.map((project) => project.id);
  let reviewCount = 0;
  let approvedCount = 0;
  let recentDecisions: Array<{
    id: string;
    project_id: string;
    title: string;
    approved_at: string | null;
  }> = [];

  if (projectIds.length > 0) {
    const [drafts, cards, decisions] = await Promise.all([
      supabase
        .from("ai_structured_drafts")
        .select("id")
        .in("project_id", projectIds)
        .in("status", ["generating", "generated", "editing"])
        .is("archived_at", null),
      supabase
        .from("change_cards")
        .select("id, work_status")
        .in("project_id", projectIds)
        .is("archived_at", null),
      supabase
        .from("change_cards")
        .select("id, project_id, title, approved_at")
        .in("project_id", projectIds)
        .eq("work_status", "approved")
        .is("archived_at", null)
        .order("approved_at", { ascending: false })
        .limit(5),
    ]);

    reviewCount =
      (drafts.data?.length ?? 0) +
      (cards.data?.filter((card) => ["draft", "editing"].includes(card.work_status)).length ?? 0);
    approvedCount = cards.data?.filter((card) => card.work_status === "approved").length ?? 0;
    recentDecisions = decisions.data ?? [];
  }

  const builderName =
    builderProfile.public_display_name || userProfile.data.display_name || "Builder";
  const latestProject = projectRows[0];
  const titleByProject = new Map(projectRows.map((project) => [project.id, project.title]));

  return (
    <AppShell builderName={builderName}>
      <div className="page-stack">
        <header className="page-header">
          <div>
            <p className="eyebrow">Builder dashboard</p>
            <h1>중요한 판단을 놓치지 마세요.</h1>
            <p className="page-description">
              정리하지 말고 먼저 남기세요. BuildMap이 의미 있는 판단 후보만 Review로 올립니다.
            </p>
          </div>
          <div className="header-actions">
            <Link className="button secondary" href="/projects">
              프로젝트 관리
            </Link>
          </div>
        </header>

        {error ? <div className="alert error">{error}</div> : null}

        {latestProject ? (
          <section className="editor-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Quick capture</p>
                <h2>지금 프로젝트에서 무슨 일이 있었나요?</h2>
                <p className="section-help">
                  구현 중 발견, 사용자 반응, 고민, 방향 변경을 그대로 적으세요. 원문은 AI 처리 전에 먼저 보존됩니다.
                </p>
              </div>
              <Badge tone="ai">AI triage</Badge>
            </div>

            <form className="stack" action={captureFromDashboardAction}>
              <label className="field">
                <span>Project</span>
                <select name="projectId" defaultValue={latestProject.id} required>
                  {projectRows.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Capture</span>
                <textarea
                  name="body"
                  maxLength={10000}
                  rows={6}
                  placeholder="예: 추천을 거리 기준으로만 만들려 했는데 사용자 반응을 보니 여행 스타일 차이가 더 중요해서 두 신호를 같이 쓰기로 했다."
                  required
                />
              </label>
              <div className="row save-row">
                <SubmitButton label="정리하기" pendingLabel="저장하고 판단 중…" />
                <span className="muted">단순 작업은 보관하고, 중요한 판단만 Review로 보냅니다.</span>
              </div>
            </form>
          </section>
        ) : (
          <section className="hero-card">
            <p className="eyebrow">Start capturing</p>
            <h2>첫 프로젝트를 만들고 바로 Capture를 시작하세요.</h2>
            <p>Problem이나 Hypothesis를 먼저 정리할 필요 없이, 만드는 과정에서 생긴 일을 그대로 남기면 됩니다.</p>
            <Link className="button" href="/projects">
              프로젝트 만들기
            </Link>
          </section>
        )}

        <div className="metric-grid">
          <div className="metric-card">
            <span className="metric-label">Projects</span>
            <strong className="metric-value">{projectRows.length}</strong>
            <span className="metric-note">진행 중 프로젝트</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Open Review</span>
            <strong className="metric-value">{reviewCount}</strong>
            <span className="metric-note">Builder 확인 필요</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Decisions</span>
            <strong className="metric-value">{approvedCount}</strong>
            <span className="metric-note">공식 판단 기록</span>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Projects</p>
                <h2>최근 프로젝트</h2>
              </div>
              <Link className="button secondary" href="/projects">
                전체 보기
              </Link>
            </div>

            {projects.error ? (
              <div className="alert error">프로젝트 목록을 불러오지 못했습니다.</div>
            ) : projectRows.length === 0 ? (
              <div className="empty-state">
                <strong>아직 프로젝트가 없습니다.</strong>
                <span>Projects에서 첫 프로젝트를 생성하세요.</span>
              </div>
            ) : (
              <ul className="project-list">
                {projectRows.slice(0, 4).map((project) => (
                  <li key={project.id} className="project-row-link">
                    <Link href={`/projects/${project.id}`}>
                      <div className="project-row-title">
                        <strong>{project.title}</strong>
                        <span className="muted">→</span>
                      </div>
                      <p className="project-row-description">
                        {project.one_line_description || "설명 없음"}
                      </p>
                      <div className="metadata-row">
                        <span>{projectLifecycleLabel(project.lifecycle_status)}</span>
                        <span>·</span>
                        <span>{visibilityLabel(project.visibility_status)}</span>
                        <span>·</span>
                        <span>{formatDateTime(project.updated_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Decision timeline</p>
                <h2>최근 공식 판단</h2>
              </div>
            </div>

            {recentDecisions.length === 0 ? (
              <div className="empty-state">
                <strong>아직 Decision이 없습니다.</strong>
                <span>Capture에서 중요한 판단이 생기면 Review를 거쳐 이곳에 쌓입니다.</span>
              </div>
            ) : (
              <div className="timeline">
                {recentDecisions.map((decision) => (
                  <div className="timeline-item" key={decision.id}>
                    {decision.approved_at ? <time>{formatDateTime(decision.approved_at)}</time> : null}
                    <strong>{decision.title}</strong>
                    <p>{titleByProject.get(decision.project_id) || "Project"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
