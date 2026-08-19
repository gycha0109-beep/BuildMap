import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { cardTypeLabels, workspaceErrors } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import { assessExistingCaptureAction } from "../../capture-actions";
import {
  finalizeAiCandidateAction,
  finalizePendingDecisionAction,
} from "../../decision-actions";

export default async function ReviewQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const [roughNotes, problemDefinitions, hypotheses, aiDrafts, changeCards] =
    await Promise.all([
      supabase
        .from("rough_notes")
        .select("id, body, source_feedback_id, converted_to_change_card_at, created_at")
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("problem_definitions")
        .select("id, current_text, updated_at")
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("hypotheses")
        .select("id, statement, status")
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("ai_structured_drafts")
        .select(
          "id, rough_note_id, suggested_type, suggested_title, structured_summary, evidence, decision, change_content, next_check, status, converted_change_card_id, created_at",
        )
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("change_cards")
        .select("id, card_type, title, work_status, importance, created_at")
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
    ]);

  const query = await searchParams;
  const error = typeof query.error === "string" ? workspaceErrors[query.error] : undefined;

  const assessCapture = assessExistingCaptureAction.bind(null, projectId);
  const finalizeCandidate = finalizeAiCandidateAction.bind(null, projectId);
  const finalizePending = finalizePendingDecisionAction.bind(null, projectId);
  const roughNoteById = new Map((roughNotes.data ?? []).map((note) => [note.id, note]));

  const activeDraftNoteIds = new Set(
    (aiDrafts.data ?? [])
      .filter((draft) =>
        ["generating", "generated", "editing", "held", "converted_to_change_card"].includes(
          draft.status,
        ),
      )
      .map((draft) => draft.rough_note_id)
      .filter((id): id is string => Boolean(id)),
  );

  const eligibleNotes = (roughNotes.data ?? []).filter(
    (note) => !note.converted_to_change_card_at && !activeDraftNoteIds.has(note.id),
  );
  const reviewDrafts = (aiDrafts.data ?? []).filter((draft) =>
    ["generating", "generated", "editing"].includes(draft.status),
  );
  const pendingDecisions = (changeCards.data ?? []).filter((card) =>
    ["draft", "editing"].includes(card.work_status),
  );
  const totalQueue = eligibleNotes.length + reviewDrafts.length + pendingDecisions.length;

  return (
    <div className="page-stack">
      <div>
        <p className="section-kicker">Review</p>
        <h2 style={{ marginBottom: 5 }}>판단 후보를 확인하세요</h2>
        <p className="section-help">
          AI가 구조화한 판단 후보를 확인하고 한 번의 승인으로 공식 Decision에 기록합니다. External Feedback evidence도 같은 승인 경계를 거칩니다.
        </p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {roughNotes.error || problemDefinitions.error || hypotheses.error || aiDrafts.error || changeCards.error ? (
        <div className="alert error">검토 대기 항목 일부를 불러오지 못했습니다.</div>
      ) : null}

      {totalQueue === 0 ? (
        <div className="empty-state">
          <strong>검토할 항목이 없습니다.</strong>
          <span>새 Capture를 남기거나 External Feedback에서 근거를 가져오세요.</span>
          <div className="header-actions">
            <Link className="button" href={`/projects/${projectId}/workspace`}>
              Capture 작성
            </Link>
            <Link className="button secondary" href={`/projects/${projectId}/feedback`}>
              External Feedback
            </Link>
          </div>
        </div>
      ) : null}

      {eligibleNotes.length > 0 ? (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Retry</p>
              <h2>AI 처리 다시 시도</h2>
              <p className="section-help">
                Capture 원문은 이미 저장되어 있습니다. External Feedback evidence는 다시 triage하지 않고 판단 후보로 구조화합니다.
              </p>
            </div>
            <Badge>{eligibleNotes.length}</Badge>
          </div>

          <div className="page-stack" style={{ gap: 12 }}>
            {eligibleNotes.map((note) => {
              const feedbackEvidence = Boolean(note.source_feedback_id);
              return (
                <article className="record-card" key={note.id}>
                  <div className="record-card-body">
                    <div className="row">
                      <div className="header-actions">
                        <Badge>Capture</Badge>
                        {feedbackEvidence ? <Badge tone="review">External feedback evidence</Badge> : null}
                      </div>
                      <span className="muted">원문 보존됨</span>
                    </div>
                    <p className="note-body" style={{ marginTop: 14 }}>
                      {note.body}
                    </p>
                    <form action={assessCapture}>
                      <input type="hidden" name="roughNoteId" value={note.id} />
                      <SubmitButton
                        label={feedbackEvidence ? "AI 구조화 다시 시도" : "AI 판단 다시 시도"}
                        pendingLabel="처리 중…"
                      />
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {reviewDrafts.length > 0 ? (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Decision candidates</p>
              <h2>검토할 판단 후보</h2>
              <p className="section-help">
                필요한 부분만 고친 뒤 Decision으로 기록하세요. 후보의 출처가 Feedback이어도 자동 승인되지 않습니다.
              </p>
            </div>
            <Badge tone="ai">{reviewDrafts.length}</Badge>
          </div>

          <div className="page-stack" style={{ gap: 14 }}>
            {reviewDrafts.map((draft) => {
              const sourceNote = draft.rough_note_id ? roughNoteById.get(draft.rough_note_id) : undefined;
              const feedbackEvidence = Boolean(sourceNote?.source_feedback_id);

              if (draft.status === "generating") {
                return (
                  <article className="ai-card" key={draft.id}>
                    <div className="header-actions">
                      <Badge tone="ai">구조화 중</Badge>
                      {feedbackEvidence ? <Badge tone="review">External feedback evidence</Badge> : null}
                    </div>
                    <h3 style={{ margin: "12px 0 6px" }}>
                      {feedbackEvidence ? "Feedback evidence를 구조화하고 있습니다." : "Capture를 분석하고 있습니다."}
                    </h3>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      {feedbackEvidence
                        ? "Builder가 근거로 선택한 Feedback이므로 구조화 후 반드시 Review 후보로 남습니다."
                        : "중요한 판단 후보로 분류된 경우에만 검토 항목으로 남습니다."}
                    </p>
                  </article>
                );
              }

              return (
                <article className="ai-card" key={draft.id}>
                  <div className="section-head">
                    <div>
                      <div className="row" style={{ justifyContent: "flex-start" }}>
                        <Badge tone="ai">AI Candidate</Badge>
                        <Badge tone="review">Builder 확인 필요</Badge>
                        {feedbackEvidence ? <Badge tone="primary">External feedback evidence</Badge> : null}
                      </div>
                      <h3 style={{ margin: "12px 0 5px" }}>
                        {draft.suggested_title || "제목 없는 판단 후보"}
                      </h3>
                      <p className="section-help">
                        AI는 후보만 제안합니다. 아래 내용은 Builder가 확인한 뒤에만 공식 Decision이 됩니다.
                      </p>
                    </div>
                  </div>

                  <form className="stack" action={finalizeCandidate}>
                    <input type="hidden" name="draftId" value={draft.id} />

                    <div className="form-grid-2">
                      <label className="field">
                        <span>변화 유형</span>
                        <select
                          name="suggestedType"
                          defaultValue={draft.suggested_type || "decision_changed"}
                        >
                          {Object.entries(cardTypeLabels).map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>제목</span>
                        <input
                          name="suggestedTitle"
                          defaultValue={draft.suggested_title ?? ""}
                          maxLength={500}
                          required
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>무슨 일이 있었나</span>
                      <textarea
                        name="structuredSummary"
                        defaultValue={draft.structured_summary ?? ""}
                        maxLength={10000}
                        rows={4}
                        required
                      />
                    </label>

                    <div className="form-grid-2">
                      <label className="field">
                        <span>근거</span>
                        <textarea
                          name="evidence"
                          defaultValue={draft.evidence ?? ""}
                          maxLength={10000}
                          rows={4}
                        />
                      </label>
                      <label className="field">
                        <span>판단</span>
                        <textarea
                          name="decision"
                          defaultValue={draft.decision ?? ""}
                          maxLength={10000}
                          rows={4}
                        />
                      </label>
                      <label className="field">
                        <span>무엇을 바꿨나</span>
                        <textarea
                          name="changeContent"
                          defaultValue={draft.change_content ?? ""}
                          maxLength={10000}
                          rows={4}
                        />
                      </label>
                      <label className="field">
                        <span>다음 확인</span>
                        <textarea
                          name="nextCheck"
                          defaultValue={draft.next_check ?? ""}
                          maxLength={10000}
                          rows={4}
                        />
                      </label>
                    </div>

                    <div className="form-grid-3">
                      <label className="field">
                        <span>문제 연결 · 선택</span>
                        <select name="problemDefinitionId" defaultValue="">
                          <option value="">연결 안 함</option>
                          {(problemDefinitions.data ?? []).map((problem) => (
                            <option value={problem.id} key={problem.id}>
                              {problem.current_text.slice(0, 80)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>가설 연결 · 선택</span>
                        <select name="hypothesisId" defaultValue="">
                          <option value="">연결 안 함</option>
                          {(hypotheses.data ?? []).map((hypothesis) => (
                            <option value={hypothesis.id} key={hypothesis.id}>
                              {hypothesis.statement.slice(0, 80)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>중요도</span>
                        <select name="importance" defaultValue="normal">
                          <option value="normal">일반</option>
                          <option value="major_turning_point">주요 전환점</option>
                        </select>
                      </label>
                    </div>

                    <div className="card-actions">
                      <SubmitButton label="Decision으로 기록" pendingLabel="기록 중…" />
                    </div>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      기록하면 현재 검토 내용이 Builder의 공식 Decision으로 확정됩니다.
                    </p>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {pendingDecisions.length > 0 ? (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Recovery</p>
              <h2>기록 마무리 필요</h2>
              <p className="section-help">
                Decision 기록은 만들어졌지만 최종 확정이 완료되지 않았습니다. 저장된 내용을 그대로 확정합니다.
              </p>
            </div>
            <Badge tone="review">{pendingDecisions.length}</Badge>
          </div>

          <div className="page-stack" style={{ gap: 12 }}>
            {pendingDecisions.map((card) => (
              <article className="review-card" key={card.id}>
                <div className="row">
                  <div>
                    <div className="row" style={{ justifyContent: "flex-start" }}>
                      <Badge tone="review">확정 대기</Badge>
                      <Badge>{cardTypeLabels[card.card_type] || card.card_type}</Badge>
                    </div>
                    <h3 style={{ margin: "12px 0 0" }}>{card.title}</h3>
                  </div>
                  <form action={finalizePending}>
                    <input type="hidden" name="changeCardId" value={card.id} />
                    <SubmitButton label="Decision으로 확정" pendingLabel="확정 중…" />
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
