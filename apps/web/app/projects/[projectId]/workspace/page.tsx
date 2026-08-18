import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  formatDateTime,
  hypothesisStatusLabels,
  hypothesisTone,
  workspaceErrors,
} from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import {
  createHypothesisAction,
  createRoughNoteAction,
  saveProblemDefinitionAction,
  updateHypothesisStatusAction,
} from "../actions";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
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
      .select("id, statement, status, created_at, updated_at")
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
  const error = typeof query.error === "string" ? workspaceErrors[query.error] : undefined;

  const saveProblem = saveProblemDefinitionAction.bind(null, projectId);
  const createHypothesis = createHypothesisAction.bind(null, projectId);
  const updateHypothesisStatus = updateHypothesisStatusAction.bind(null, projectId);
  const createRoughNote = createRoughNoteAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Workspace</p>
          <h2 style={{ marginBottom: 5 }}>작성과 관찰</h2>
          <p className="section-help">
            문제를 정의하고 가설과 Rough Note를 축적합니다. 검토 단계는 별도 Queue에서 진행합니다.
          </p>
        </div>
        <nav className="workspace-mode-nav" aria-label="Workspace mode">
          <Link className="workspace-mode-link active" href={`/projects/${projectId}/workspace`}>
            Write
          </Link>
          <Link className="workspace-mode-link" href={`/projects/${projectId}/workspace/review`}>
            Review Queue
          </Link>
        </nav>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="workspace-grid">
        <div className="workspace-column">
          <section className="editor-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">01 · Problem definition</p>
                <h2>현재 문제 정의</h2>
                <p className="section-help">
                  프로젝트가 지금 해결하려는 문제를 최신 문장으로 유지합니다.
                </p>
              </div>
              {problem.data ? <Badge tone="primary">작성 중</Badge> : <Badge>미작성</Badge>}
            </div>

            {problem.error ? (
              <div className="alert error">현재 문제 정의를 불러오지 못했습니다.</div>
            ) : (
              <form className="stack" action={saveProblem}>
                <label className="field">
                  <span>문제 정의</span>
                  <textarea
                    name="currentText"
                    defaultValue={problem.data?.current_text ?? ""}
                    maxLength={4000}
                    rows={6}
                    placeholder="누가, 어떤 상황에서, 무엇 때문에 어려움을 겪는지 적어 주세요."
                    required
                  />
                </label>
                <div className="row save-row">
                  <SubmitButton label="문제 정의 저장" pendingLabel="저장 중…" />
                  {problem.data ? (
                    <span className="save-status" aria-live="polite">
                      저장됨 · {formatDateTime(problem.data.updated_at)}
                    </span>
                  ) : (
                    <span className="muted">아직 저장된 문제 정의가 없습니다.</span>
                  )}
                </div>
              </form>
            )}
          </section>

          <section className="editor-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">02 · Hypotheses</p>
                <h2>가설</h2>
                <p className="section-help">문제를 둘러싼 가정을 기록하고 검증 상태를 갱신합니다.</p>
              </div>
              <Badge tone="primary">{hypotheses.data?.length ?? 0}</Badge>
            </div>

            <form className="stack" action={createHypothesis}>
              <label className="field">
                <span>새 가설</span>
                <textarea
                  name="statement"
                  maxLength={2000}
                  rows={3}
                  placeholder="예: 저장 성공 여부를 명시하면 사용자의 불확실성이 줄어들 것이다."
                  required
                />
              </label>
              <div>
                <SubmitButton label="가설 추가" pendingLabel="추가 중…" />
              </div>
            </form>

            <div style={{ height: 18 }} />

            {hypotheses.error ? (
              <div className="alert error">가설 목록을 불러오지 못했습니다.</div>
            ) : (hypotheses.data ?? []).length === 0 ? (
              <div className="empty-state">
                <strong>아직 가설이 없습니다.</strong>
                <span>검증하고 싶은 가정을 하나 추가하세요.</span>
              </div>
            ) : (
              <ul className="compact-list">
                {(hypotheses.data ?? []).map((hypothesis) => (
                  <li className="compact-item" key={hypothesis.id}>
                    <div className="row">
                      <p>{hypothesis.statement}</p>
                      <Badge tone={hypothesisTone(hypothesis.status)}>
                        {hypothesisStatusLabels[hypothesis.status] ?? hypothesis.status}
                      </Badge>
                    </div>
                    <form className="row" action={updateHypothesisStatus}>
                      <input type="hidden" name="hypothesisId" value={hypothesis.id} />
                      <select name="status" defaultValue={hypothesis.status}>
                        {Object.entries(hypothesisStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        label="상태 저장"
                        pendingLabel="저장 중…"
                        className="button secondary"
                      />
                    </form>
                    <div className="metadata-row" style={{ marginTop: 9 }}>
                      <span>마지막 변경 {formatDateTime(hypothesis.updated_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="workspace-column">
          <section className="editor-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">03 · Rough note</p>
                <h2>거친 메모 남기기</h2>
                <p className="section-help">
                  정리하지 않아도 됩니다. 관찰, 피드백, 구현 중 발견을 먼저 남기세요.
                </p>
              </div>
            </div>

            <form className="stack" action={createRoughNote}>
              <label className="field">
                <span>새 메모</span>
                <textarea
                  name="body"
                  maxLength={10000}
                  rows={7}
                  placeholder="예: 저장은 성공하지만 같은 화면으로 돌아와 성공 여부를 알기 어렵다."
                  required
                />
              </label>
              <div>
                <SubmitButton label="Rough Note 저장" pendingLabel="저장 중…" />
              </div>
            </form>
          </section>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Recent notes</p>
                <h2>최근 Rough Notes</h2>
              </div>
              <Link className="button secondary" href={`/projects/${projectId}/workspace/review`}>
                Review Queue
              </Link>
            </div>

            {roughNotes.error ? (
              <div className="alert error">Rough Note 목록을 불러오지 못했습니다.</div>
            ) : (roughNotes.data ?? []).length === 0 ? (
              <div className="empty-state">
                <strong>아직 Rough Note가 없습니다.</strong>
                <span>거친 관찰을 남기면 AI 구조화 대상으로 사용할 수 있습니다.</span>
              </div>
            ) : (
              <ul className="compact-list">
                {(roughNotes.data ?? []).slice(0, 8).map((note) => (
                  <li className="compact-item" key={note.id}>
                    <p className="note-body">{note.body}</p>
                    <div className="row">
                      <span className="metadata-row">{formatDateTime(note.created_at)}</span>
                      {note.converted_to_change_card_at ? (
                        <Badge tone="success">Change Card 변환됨</Badge>
                      ) : (
                        <Badge>검토 대기</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
