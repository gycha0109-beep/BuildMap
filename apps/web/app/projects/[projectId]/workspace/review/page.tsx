import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  cardTypeLabels,
  draftStatusLabels,
  workspaceErrors,
} from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import {
  approveChangeCardAction,
  convertAiDraftAction,
  generateAiDraftAction,
  updateAiDraftAction,
  updateChangeCardDraftAction,
} from "../../actions";

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
        .select("id, body, converted_to_change_card_at, created_at")
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
          "id, rough_note_id, suggested_type, suggested_title, structured_summary, evidence, decision, change_content, next_check, status, error_message, converted_change_card_id, created_at",
        )
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("change_cards")
        .select(
          "id, card_type, title, structured_summary, evidence, decision, change_content, next_check, work_status, visibility_status, importance, approved_at, created_at",
        )
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
    ]);

  const query = await searchParams;
  const error = typeof query.error === "string" ? workspaceErrors[query.error] : undefined;

  const generateDraft = generateAiDraftAction.bind(null, projectId);
  const saveDraft = updateAiDraftAction.bind(null, projectId);
  const convertDraft = convertAiDraftAction.bind(null, projectId);
  const saveChangeCard = updateChangeCardDraftAction.bind(null, projectId);
  const approveChangeCard = approveChangeCardAction.bind(null, projectId);

  const activeDraftNoteIds = new Set(
    (aiDrafts.data ?? [])
      .filter((draft) => ["generating", "generated", "editing"].includes(draft.status))
      .map((draft) => draft.rough_note_id)
      .filter((id): id is string => Boolean(id)),
  );
  const eligibleNotes = (roughNotes.data ?? []).filter(
    (note) => !note.converted_to_change_card_at && !activeDraftNoteIds.has(note.id),
  );
  const reviewDrafts = (aiDrafts.data ?? []).filter(
    (draft) => draft.status !== "converted_to_change_card",
  );
  const reviewCards = (changeCards.data ?? []).filter(
    (card) => card.work_status !== "approved",
  );
  const totalQueue = eligibleNotes.length + reviewDrafts.length + reviewCards.length;

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Workspace</p>
          <h2 style={{ marginBottom: 5 }}>Review Queue</h2>
          <p className="section-help">
            Rough Note를 구조화하고 Builder 판단으로 다듬은 뒤 공식 Decision으로 승인합니다.
          </p>
        </div>
        <nav className="workspace-mode-nav" aria-label="Workspace mode">
          <Link className="workspace-mode-link" href={`/projects/${projectId}/workspace`}>
            Write
          </Link>
          <Link
            className="workspace-mode-link active"
            href={`/projects/${projectId}/workspace/review`}
          >
            Review Queue · {totalQueue}
          </Link>
        </nav>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {roughNotes.error || aiDrafts.error || changeCards.error ? (
        <div className="alert error">검토 대기 항목 일부를 불러오지 못했습니다.</div>
      ) : null}

      {totalQueue === 0 ? (
        <div className="empty-state">
          <strong>검토할 항목이 없습니다.</strong>
          <span>새 Rough Note를 작성하거나 Decisions에서 승인된 기록을 확인하세요.</span>
          <Link className="button" href={`/projects/${projectId}/workspace`}>
            Rough Note 작성
          </Link>
        </div>
      ) : null}

      {eligibleNotes.length > 0 ? (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 1 · Source notes</p>
              <h2>AI 구조화 대기</h2>
              <p className="section-help">
                원문을 그대로 보존한 채 구조화 초안을 생성합니다. AI 결과는 공식 판단이 아닙니다.
              </p>
            </div>
            <Badge>{eligibleNotes.length}</Badge>
          </div>

          <div className="page-stack" style={{ gap: 12 }}>
            {eligibleNotes.map((note) => (
              <article className="record-card" key={note.id}>
                <div className="record-card-body">
                  <div className="row">
                    <Badge>Rough Note</Badge>
                    <span className="muted">원문</span>
                  </div>
                  <p className="note-body" style={{ marginTop: 14 }}>{note.body}</p>
                  <form action={generateDraft}>
                    <input type="hidden" name="roughNoteId" value={note.id} />
                    <SubmitButton label="AI로 구조화" pendingLabel="구조화 중…" />
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {reviewDrafts.length > 0 ? (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 2 · AI draft</p>
              <h2>AI Structured Draft</h2>
              <p className="section-help">
                AI가 정리한 제안입니다. Builder가 직접 검토·수정해야 Change Card가 됩니다.
              </p>
            </div>
            <Badge tone="ai">{reviewDrafts.length}</Badge>
          </div>

          <div className="page-stack" style={{ gap: 14 }}>
            {reviewDrafts.map((draft) => {
              if (draft.status === "failed") {
                return (
                  <article className="ai-card" key={draft.id}>
                    <div className="row">
                      <Badge tone="danger">{draftStatusLabels[draft.status]}</Badge>
                      <span className="muted">다시 구조화하면 이 실패 Draft를 재사용합니다.</span>
                    </div>
                    <div className="alert error" style={{ marginTop: 14 }}>
                      {draft.error_message || "AI 구조화에 실패했습니다."}
                    </div>
                  </article>
                );
              }

              if (draft.status === "generating") {
                return (
                  <article className="ai-card" key={draft.id}>
                    <Badge tone="ai">생성 중</Badge>
                    <h3 style={{ margin: "12px 0 6px" }}>Rough Note를 구조화하고 있습니다.</h3>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      완료 후 Builder 검토 가능한 Draft로 표시됩니다.
                    </p>
                  </article>
                );
              }

              if (draft.status === "held") {
                return (
                  <article className="ai-card" key={draft.id}>
                    <Badge tone="review">보류</Badge>
                    <h3 style={{ margin: "12px 0 0" }}>{draft.suggested_title || "AI Draft"}</h3>
                  </article>
                );
              }

              return (
                <article className="ai-card" key={draft.id}>
                  <div className="section-head">
                    <div>
                      <div className="row" style={{ justifyContent: "flex-start" }}>
                        <Badge tone="ai">AI Draft</Badge>
                        <Badge tone="review">Builder review required</Badge>
                      </div>
                      <h3 style={{ margin: "12px 0 5px" }}>
                        {draft.suggested_title || "제목 없는 AI Draft"}
                      </h3>
                      <p className="section-help">
                        AI 내용은 그대로 승인되지 않습니다. 비어 있는 필드는 억지로 채우지 않아도 됩니다.
                      </p>
                    </div>
                  </div>

                  <form className="stack" action={saveDraft}>
                    <input type="hidden" name="draftId" value={draft.id} />

                    <div className="form-grid-2">
                      <label className="field">
                        <span>변화 유형</span>
                        <select
                          name="suggestedType"
                          defaultValue={draft.suggested_type || "decision_changed"}
                        >
                          {Object.entries(cardTypeLabels).map(([value, label]) => (
                            <option value={value} key={value}>{label}</option>
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
                      <span>구조화 요약</span>
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
                        <textarea name="evidence" defaultValue={draft.evidence ?? ""} maxLength={10000} rows={4} />
                      </label>
                      <label className="field">
                        <span>판단</span>
                        <textarea name="decision" defaultValue={draft.decision ?? ""} maxLength={10000} rows={4} />
                      </label>
                      <label className="field">
                        <span>변경</span>
                        <textarea name="changeContent" defaultValue={draft.change_content ?? ""} maxLength={10000} rows={4} />
                      </label>
                      <label className="field">
                        <span>다음 확인</span>
                        <textarea name="nextCheck" defaultValue={draft.next_check ?? ""} maxLength={10000} rows={4} />
                      </label>
                    </div>

                    <div className="form-grid-3">
                      <label className="field">
                        <span>연결할 문제 정의</span>
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
                        <span>연결할 가설</span>
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
                      <button className="button secondary" type="submit">
                        AI 초안 저장
                      </button>
                      <button className="button" type="submit" formAction={convertDraft}>
                        Change Card로 전환
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {reviewCards.length > 0 ? (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Step 3 · Builder decision</p>
              <h2>Change Card Review</h2>
              <p className="section-help">
                이제 AI 제안이 아니라 Builder가 책임지는 판단입니다. 저장 후 별도 승인으로 공식 기록을 확정합니다.
              </p>
            </div>
            <Badge tone="review">{reviewCards.length}</Badge>
          </div>

          <div className="page-stack" style={{ gap: 14 }}>
            {reviewCards.map((card) => (
              <article className="review-card" key={card.id}>
                <div className="section-head">
                  <div>
                    <div className="row" style={{ justifyContent: "flex-start" }}>
                      <Badge tone="review">Builder 검토 중</Badge>
                      <Badge>{cardTypeLabels[card.card_type] || card.card_type}</Badge>
                    </div>
                    <h3 style={{ margin: "12px 0 5px" }}>{card.title}</h3>
                    <p className="section-help">승인 전까지 자유롭게 내용을 수정할 수 있습니다.</p>
                  </div>
                </div>

                <form className="stack" action={saveChangeCard}>
                  <input type="hidden" name="changeCardId" value={card.id} />
                  <div className="form-grid-2">
                    <label className="field">
                      <span>변화 유형</span>
                      <select name="cardType" defaultValue={card.card_type}>
                        {Object.entries(cardTypeLabels).map(([value, label]) => (
                          <option value={value} key={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>제목</span>
                      <input name="title" defaultValue={card.title} maxLength={500} required />
                    </label>
                  </div>

                  <label className="field">
                    <span>구조화 요약</span>
                    <textarea
                      name="structuredSummary"
                      defaultValue={card.structured_summary}
                      maxLength={10000}
                      rows={4}
                      required
                    />
                  </label>

                  <div className="form-grid-2">
                    <label className="field">
                      <span>근거</span>
                      <textarea name="evidence" defaultValue={card.evidence ?? ""} maxLength={10000} rows={4} />
                    </label>
                    <label className="field">
                      <span>판단</span>
                      <textarea name="decision" defaultValue={card.decision ?? ""} maxLength={10000} rows={4} />
                    </label>
                    <label className="field">
                      <span>변경</span>
                      <textarea name="changeContent" defaultValue={card.change_content ?? ""} maxLength={10000} rows={4} />
                    </label>
                    <label className="field">
                      <span>다음 확인</span>
                      <textarea name="nextCheck" defaultValue={card.next_check ?? ""} maxLength={10000} rows={4} />
                    </label>
                  </div>

                  <label className="field">
                    <span>중요도</span>
                    <select name="importance" defaultValue={card.importance}>
                      <option value="normal">일반</option>
                      <option value="major_turning_point">주요 전환점</option>
                    </select>
                  </label>

                  <div className="card-actions">
                    <SubmitButton
                      label="Change Card 저장"
                      pendingLabel="저장 중…"
                      className="button secondary"
                    />
                  </div>
                </form>

                <form className="card-actions" action={approveChangeCard}>
                  <input type="hidden" name="changeCardId" value={card.id} />
                  <SubmitButton label="현재 저장된 내용 승인" pendingLabel="승인 중…" />
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
