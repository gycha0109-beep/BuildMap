import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  bootstrapAccountAction,
  createProjectAction,
  signOutAction,
} from "./actions";

const dashboardErrors: Record<string, string> = {
  "invalid-project": "프로젝트 제목과 설명 길이를 확인해 주세요.",
  "project-create": "프로젝트를 생성하지 못했습니다.",
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
      <main className="shell stack">
        <section className="panel stack">
          <h1>Builder 설정이 필요합니다.</h1>
          <p className="muted">
            로그인 계정을 BuildMap의 User Profile과 Builder Profile에 연결합니다.
          </p>
          <form action={bootstrapAccountAction}>
            <button className="button">Builder 프로필 만들기</button>
          </form>
          <form action={signOutAction}>
            <button className="button secondary">로그아웃</button>
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

  return (
    <main className="shell stack">
      <header className="row">
        <div>
          <p className="muted">Builder dashboard</p>
          <h1>{builderProfile.public_display_name || userProfile.data.display_name || "Builder"}</h1>
        </div>
        <form action={signOutAction}>
          <button className="button secondary">로그아웃</button>
        </form>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <div>
          <h2>새 프로젝트</h2>
          <p className="muted">첫 판단 흐름을 담을 프로젝트 컨테이너를 만듭니다.</p>
        </div>
        <form className="stack" action={createProjectAction}>
          <label className="field">
            <span>프로젝트 이름</span>
            <input name="title" maxLength={120} required />
          </label>
          <label className="field">
            <span>한 줄 설명</span>
            <textarea name="description" maxLength={280} />
          </label>
          <div>
            <button className="button">프로젝트 만들기</button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <div>
          <h2>내 프로젝트</h2>
          <p className="muted">현재는 생성과 목록까지 연결합니다.</p>
        </div>

        {projects.error ? (
          <p className="error">프로젝트 목록을 불러오지 못했습니다.</p>
        ) : projects.data.length === 0 ? (
          <p className="muted">아직 프로젝트가 없습니다.</p>
        ) : (
          <ul className="project-list">
            {projects.data.map((project) => (
              <li key={project.id}>
                <strong>{project.title}</strong>
                <p className="muted">{project.one_line_description || "설명 없음"}</p>
                <small>
                  {project.lifecycle_status} · {project.visibility_status}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
