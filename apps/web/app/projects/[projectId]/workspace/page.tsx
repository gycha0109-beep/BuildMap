import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  formatDateTime,
  hypothesisStatusLabels,
  hypothesisTone,
  workspaceErrors,
  workspaceNotices,
} from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import {
  createHypothesisAction,
  saveProblemDefinitionAction,
  updateHypothesisStatusAction,
} from "../actions";
import { captureAndAssessAction } from "../capture-actions";

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
  const notice = typeof query.notice === "string" ? workspaceNotices[query.notice] : undefined;

  const captureAndAssess = captureAndAssessAction.bind(null, projectId);
  const saveProblem = saveProblemDefinitionAction.bind(null, projectId);
  const createHypothesis = createHypothesisAction.bind(null, projectId);
  const updateHypothesisStatus = updateHypothesisStatusAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div>
        <p className="section-kicker">Capture</p>
        <h2 style={{ marginBottom: 5 }}>중요한 변화가 생기면 먼저 남기세요</h2>
        <p className="section-help">
          정리하지 말고 먼저 적으세요. BuildMap이 중요한 판단 후보인지 보수적으로 분류합니다.
        </p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {notice ? <div className="alert">{notice}</div> : null}

      <section className="editor-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Quick capture</p>
            <h2>오늘 프로젝트에서 무슨 일이 있었나요?</h2>
            <p className="section-help">
              구현 중 발견, 사용자 반응, 방향 변경, 고민을 자유롭게 적어 주세요. 원문은 AI 처리 전에 먼저 저장됩니다.
            </p>
          </div>
          <Badge tone="ai">AI triage</Badge>
        </div>

        <form className="stack" action={captureAndAssess}>
          <label className="field">
            <span>Capture</span>
            <textarea
              name="body"
              maxLength={10000}
              rows={7}
              placeholder="예: 거리 기반 추천으로 가려 했는데 사용자들은 여행 스타일 차이를 더 중요하게 봐서 두 신호를 같이 쓰기로 했다."
              required
            />
          </label>
          <div className="row save-row">
            <SubmitButton label="정리하기" pendingLabel="저장하고 판단 중…" />
            <span className="muted">단순 작업은 보관하고, 의미 있는 판단만 Review로 올립니다.</span>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Recent captures</p>
            <h2>최근 기록</h2>
          </div>
          <Link className="button secondary" href={`/projects/${projectId}/workspace/review`}>
            Review 열기
          </Link>
        </div>

        {roughNotes.error ? (
          <div className="alert error">Capture 목록을 불러오지 못했습니다.</div>
        ) : (roughNotes.data ?? []).length === 0 ? (
          <div className="empty-state">
            <strong>아직 Capture가 없습니다.</strong>
            <span>정리되지 않은 생각 그대로 첫 기록을 남겨보세요.</span>
          </div>
        ) : (
          <ul className="compact-list">
            {(roughNotes.data ?? []).slice(0, 8).map((note) => (
              <li className="compact-item" key={note.id}>
                <p className="note-body">{note.body}</p>
                <div className="row">
                  <span className="metadata-row">{formatDateTime(note.created_at)}</span>
                  {note.converted_to_change_card_at ? (
                    <Badge tone="success">Decision 연결됨</Badge>
                  ) : (
                    <Badge>Capture 보존됨</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="row">
        <div>
          <p className="section-kicker">Project context · optional</p>
          <h2 style={{ marginBottom: 5 }}>필요할 때만 맥락을 정리하세요</h2>
          <p className="section-help">
            문제 정의와 가설은 Capture의 선행 조건이 아닙니다. 프로젝트 맥락이 필요할 때만 유지합니다.
          </p>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="workspace-column">
          <section className="editor-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Current problem</p>
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
        </div>

        <div className="workspace-column">
          <section className="editor-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Hypotheses</p>
                <h2>가설</h2>
                <p className="section-help">필요한 경우에만 가정을 기록하고 검증 상태를 갱신합니다.</p>
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
                <span>필요할 때 검증하고 싶은 가정을 추가하세요.</span>
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
      </div>
    </div>
  );
}
