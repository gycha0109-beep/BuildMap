import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";
import {
  createHypothesisAction,
  createRoughNoteAction,
  saveProblemDefinitionAction,
  updateHypothesisStatusAction,
} from "./actions";
import { WorkspaceSubmitButton } from "./submit-button";

const workspaceErrors: Record<string, string> = {
  "invalid-problem": "문제 정의는 1자 이상 4,000자 이하로 입력해 주세요.",
  "problem-save": "문제 정의를 저장하지 못했습니다.",
  "invalid-hypothesis": "가설은 1자 이상 2,000자 이하로 입력해 주세요.",
  "hypothesis-create": "가설을 추가하지 못했습니다.",
  "invalid-hypothesis-status": "가설 상태 값이 올바르지 않습니다.",
  "hypothesis-update": "가설 상태를 변경하지 못했습니다.",
  "invalid-note": "Rough Note는 1자 이상 10,000자 이하로 입력해 주세요.",
  "note-create": "Rough Note를 저장하지 못했습니다.",
  "invalid-ai-source": "AI 구조화에 사용할 Rough Note 상태를 확인해 주세요.",
  "ai-draft-create": "AI Draft 생성 상태를 저장하지 못했습니다.",
  "ai-draft-exists": "이 Rough Note에는 이미 검토 중인 AI Draft가 있습니다.",
  "ai-generation": "AI 구조화에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  "ai-draft-save": "AI Draft를 저장하지 못했습니다.",
  "invalid-ai-draft": "AI Draft의 유형, 제목, 요약 또는 입력 길이를 확인해 주세요.",
  "ai-draft-convert": "AI Draft를 Change Card 초안으로 전환하지 못했습니다.",
  "invalid-change-card": "Change Card의 필수 항목을 확인해 주세요.",
  "change-card-save": "Change Card를 저장하지 못했습니다.",
  "change-card-approve": "Change Card를 승인하지 못했습니다.",
};

const hypothesisStatusLabels: Record<string, string> = {
  assumed: "가정",
  validating: "검증 중",
  partially_validated: "부분 검증",
  validated: "검증됨",
  refuted: "반박됨",
  held: "보류",
};

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const currentUser = await supabase.auth.getUser();

  if (!currentUser.data.user) {
    redirect("/login");
  }

  const context = await ensureBuilderContext(supabase, currentUser.data.user);
  const project = await supabase
    .from("projects")
    .select("id, title, one_line_description, lifecycle_status, visibility_status")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", context.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();

  if (project.error || !project.data) {
    notFound();
  }

  const [problem, hypotheses, roughNotes] = await Promise.all([
    supabase
      .from("problem_definitions")
      .select("id, current_text, updated_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("hypotheses")
      .select("id, statement, status, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("rough_notes")
      .select("id, body, converted_to_change_card_at, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const query = await searchParams;
  const error =
    typeof query.error === "string" ? workspaceErrors[query.error] : undefined;

  const saveProblem = saveProblemDefinitionAction.bind(null, projectId);
  const createHypothesis = createHypothesisAction.bind(null, projectId);
  const updateHypothesisStatus = updateHypothesisStatusAction.bind(null, projectId);
  const createRoughNote = createRoughNoteAction.bind(null, projectId);

  return (
    <main className="shell stack">
      <header className="stack">
        <div className="row">
          <Link href="/dashboard">← Dashboard</Link>
        </div>
        <div>
          <p className="muted">Project workspace</p>
          <h1>{project.data.title}</h1>
          <p className="muted">
            {project.data.one_line_description || "설명 없음"}
          </p>
          <small>
            {project.data.lifecycle_status} · {project.data.visibility_status}
          </small>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <div>
          <h2>Problem Definition</h2>
          <p className="muted">지금 해결하려는 문제를 한 문장 흐름으로 유지합니다.</p>
        </div>
        {problem.error ? (
          <p className="error">현재 문제 정의를 불러오지 못했습니다.</p>
        ) : (
          <form className="stack" action={saveProblem}>
            <label className="field">
              <span>현재 문제 정의</span>
              <textarea
                name="currentText"
                defaultValue={problem.data?.current_text ?? ""}
                maxLength={4000}
                rows={6}
                required
              />
            </label>
            <div className="row save-row">
              <WorkspaceSubmitButton
                label="문제 정의 저장"
                pendingLabel="저장 중…"
              />
              {problem.data ? (
                <span className="success" aria-live="polite">
                  저장됨 · 마지막 저장 {formatSavedAt(problem.data.updated_at)}
                </span>
              ) : (
                <span className="muted">아직 저장된 문제 정의가 없습니다.</span>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="panel stack">
        <div>
          <h2>Hypotheses</h2>
          <p className="muted">문제를 둘러싼 가정을 기록하고 검증 상태를 바꿉니다.</p>
        </div>
        <form className="stack" action={createHypothesis}>
          <label className="field">
            <span>새 가설</span>
            <textarea name="statement" maxLength={2000} rows={4} required />
          </label>
          <div>
            <WorkspaceSubmitButton label="가설 추가" pendingLabel="추가 중…" />
          </div>
        </form>

        {hypotheses.error ? (
          <p className="error">가설 목록을 불러오지 못했습니다.</p>
        ) : hypotheses.data.length === 0 ? (
          <p className="muted">아직 가설이 없습니다.</p>
        ) : (
          <ul className="project-list">
            {hypotheses.data.map((hypothesis) => (
              <li key={hypothesis.id} className="stack">
                <strong>{hypothesis.statement}</strong>
                <form className="row" action={updateHypothesisStatus}>
                  <input type="hidden" name="hypothesisId" value={hypothesis.id} />
                  <select name="status" defaultValue={hypothesis.status}>
                    {Object.entries(hypothesisStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <WorkspaceSubmitButton
                    label="상태 저장"
                    pendingLabel="저장 중…"
                    className="button secondary"
                  />
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel stack">
        <div>
          <h2>Rough Notes</h2>
          <p className="muted">
            판단 과정에서 나온 거친 메모를 먼저 남깁니다. 아래 AI Structured Draft 영역에서 선택한 메모를 구조화할 수 있습니다.
          </p>
        </div>
        <form className="stack" action={createRoughNote}>
          <label className="field">
            <span>새 메모</span>
            <textarea name="body" maxLength={10000} rows={6} required />
          </label>
          <div>
            <WorkspaceSubmitButton
              label="Rough Note 저장"
              pendingLabel="저장 중…"
            />
          </div>
        </form>

        {roughNotes.error ? (
          <p className="error">Rough Note 목록을 불러오지 못했습니다.</p>
        ) : roughNotes.data.length === 0 ? (
          <p className="muted">아직 Rough Note가 없습니다.</p>
        ) : (
          <ul className="project-list">
            {roughNotes.data.map((note) => (
              <li key={note.id}>
                <p>{note.body}</p>
                <small>
                  {note.converted_to_change_card_at ? "Change Card 변환됨" : "미변환"}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
