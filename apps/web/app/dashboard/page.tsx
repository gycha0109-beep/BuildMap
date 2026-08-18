import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, projectLifecycleLabel, visibilityLabel } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapAccountAction } from "./actions";

const dashboardErrors: Record<string, string> = {
  "invalid-project": "프로젝트 제목과 설명 길이를 확인해 주세요.",
  "project-create": "프로젝트를 생성하지 못했습니다.",
  "project-access": "프로젝트에 접근할 수 없습니다.",
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
            <h1>{builderName}</h1>
            <p className="page-description">
              진행 중인 판단을 이어가고 최근 공식 기록을 확인합니다.
            </p>
          </div>
          <div className="header-actions">
            <Link className="button" href="/projects">
              프로젝트 관리
            </Link>
          </div>
        </header>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span className="metric-label">Projects</span>
            <strong className="metric-value">{projectRows.length}</strong>
            <span className="metric-note">진행 중 프로젝트</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Review Queue</span>
            <strong className="metric-value">{reviewCount}</strong>
            <span className="metric-note">Builder 확인 필요</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Decisions</span>
            <strong className="metric-value">{approvedCount}</strong>
            <span className="metric-note">승인된 공식 기록</span>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="page-stack" style={{ gap: 18 }}>
            {latestProject ? (
              <section className="hero-card">
                <p className="eyebrow">Continue working</p>
                <h2>{latestProject.title}</h2>
                <p>{latestProject.one_line_description || "설명 없음"}</p>
                <div className="hero-meta">
                  <Badge tone="primary">
                    {projectLifecycleLabel(latestProject.lifecycle_status)}
                  </Badge>
                  <Badge>{visibilityLabel(latestProject.visibility_status)}</Badge>
                  <span className="muted">최근 변경 {formatDateTime(latestProject.updated_at)}</span>
                </div>
                <Link className="button" href={`/projects/${latestProject.id}/workspace`}>
                  Workspace 계속하기
                </Link>
              </section>
            ) : (
              <section className="hero-card">
                <p className="eyebrow">Start mapping</p>
                <h2>첫 프로젝트의 판단 흐름을 만드세요.</h2>
                <p>문제 정의에서 승인된 Decision까지 하나의 맥락으로 연결합니다.</p>
                <Link className="button" href="/projects">
                  프로젝트 만들기
                </Link>
              </section>
            )}

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
          </div>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Decision timeline</p>
                <h2>최근 승인</h2>
              </div>
            </div>

            {recentDecisions.length === 0 ? (
              <div className="empty-state">
                <strong>아직 승인된 판단이 없습니다.</strong>
                <span>Change Card를 승인하면 이곳에 기록됩니다.</span>
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
