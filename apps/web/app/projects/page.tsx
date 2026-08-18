import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, projectLifecycleLabel, visibilityLabel } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import { createProjectAction } from "@/app/dashboard/actions";

export default async function ProjectsPage({
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

  if (!userProfile.data) {
    redirect("/dashboard");
  }

  const builderProfile = await supabase
    .from("builder_profiles")
    .select("id, public_display_name")
    .eq("user_profile_id", userProfile.data.id)
    .maybeSingle();

  if (!builderProfile.data) {
    redirect("/dashboard");
  }

  const projects = await supabase
    .from("projects")
    .select("id, title, one_line_description, lifecycle_status, visibility_status, updated_at")
    .eq("owner_builder_profile_id", builderProfile.data.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  const params = await searchParams;
  const error =
    params.error === "invalid-project"
      ? "프로젝트 제목과 설명 길이를 확인해 주세요."
      : params.error === "project-create"
        ? "프로젝트를 생성하지 못했습니다."
        : null;
  const builderName =
    builderProfile.data.public_display_name || userProfile.data.display_name || "Builder";

  return (
    <AppShell builderName={builderName}>
      <div className="page-stack">
        <header className="page-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h1>프로젝트</h1>
            <p className="page-description">
              BuildMap의 판단 흐름은 프로젝트 단위로 축적됩니다.
            </p>
          </div>
          <Link className="button secondary" href="/dashboard">
            Dashboard
          </Link>
        </header>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="projects-layout">
          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Project index</p>
                <h2>내 프로젝트</h2>
                <p className="section-help">최근 변경 순으로 표시됩니다.</p>
              </div>
              <Badge tone="primary">{projects.data?.length ?? 0} projects</Badge>
            </div>

            {projects.error ? (
              <div className="alert error">프로젝트 목록을 불러오지 못했습니다.</div>
            ) : (projects.data ?? []).length === 0 ? (
              <div className="empty-state">
                <strong>아직 프로젝트가 없습니다.</strong>
                <span>오른쪽 폼에서 첫 프로젝트를 생성하세요.</span>
              </div>
            ) : (
              <ul className="project-list">
                {(projects.data ?? []).map((project) => (
                  <li className="project-row-link" key={project.id}>
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
                <p className="section-kicker">New project</p>
                <h2>새 판단 흐름 시작</h2>
                <p className="section-help">
                  먼저 프로젝트 컨텍스트를 만들고 Workspace에서 문제를 정의합니다.
                </p>
              </div>
            </div>

            <form className="stack" action={createProjectAction}>
              <label className="field">
                <span>프로젝트 이름</span>
                <input name="title" maxLength={120} placeholder="예: BuildMap MVP" required />
              </label>
              <label className="field">
                <span>한 줄 설명</span>
                <textarea
                  name="description"
                  maxLength={280}
                  rows={4}
                  placeholder="이 프로젝트가 무엇을 검증하는지 짧게 적어 주세요."
                />
              </label>
              <div>
                <button className="button" type="submit">
                  프로젝트 만들기
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
