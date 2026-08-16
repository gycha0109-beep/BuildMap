import { createClient } from "@/lib/supabase/server";
import {
  approveChangeCardAction,
  convertAiDraftAction,
  generateAiDraftAction,
  updateAiDraftAction,
  updateChangeCardDraftAction,
} from "./actions";

const cardTypeLabels: Record<string, string> = {
  problem_found: "문제 발견",
  problem_definition_changed: "문제 정의 변경",
  hypothesis_created: "가설 생성",
  hypothesis_refuted: "가설 반박",
  experiment: "실험",
  user_feedback: "사용자 피드백",
  feature_added: "기능 추가",
  feature_removed: "기능 제거",
  decision_kept: "판단 유지",
  decision_changed: "판단 변경",
  pivot: "방향 전환",
  release: "릴리즈",
  handoff_note: "인수인계 메모",
};

const draftStatusLabels: Record<string, string> = {
  generating: "생성 중",
  generated: "AI 초안",
  editing: "Builder 수정 중",
  converted_to_change_card: "Change Card 전환됨",
  held: "보류",
  failed: "생성 실패",
};

export default async function AiWorkflow({ projectId }: { projectId: string }) {
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

  return (
    <>
      <section className="panel stack">
        <div>
          <h2>AI Structured Drafts</h2>
          <p className="muted">
            Rough Note를 보수적으로 구조화합니다. AI 결과는 공식 기록이 아니며 Builder가 직접 수정한 뒤 Change Card로 전환해야 합니다.
          </p>
        </div>

        {roughNotes.error ? (
          <p className="error">AI 구조화 가능한 Rough Note를 불러오지 못했습니다.</p>
        ) : (
          <div className="stack">
            {(roughNotes.data ?? [])
              .filter(
                (note) =>
                  !note.converted_to_change_card_at && !activeDraftNoteIds.has(note.id),
              )
              .map((note) => (
                <article className="subpanel stack" key={note.id}>
                  <p>{note.body}</p>
                  <form action={generateDraft}>
                    <input type="hidden" name="roughNoteId" value={note.id} />
                    <button className="button">AI로 구조화</button>
                  </form>
                </article>
              ))}
          </div>
        )}

        {aiDrafts.error ? (
          <p className="error">AI Draft 목록을 불러오지 못했습니다.</p>
        ) : aiDrafts.data.length === 0 ? (
          <p className="muted">아직 AI Draft가 없습니다.</p>
        ) : (
          <div className="stack">
            {aiDrafts.data.map((draft) => {
              if (draft.status === "failed") {
                return (
                  <article className="subpanel stack" key={draft.id}>
                    <strong>{draftStatusLabels[draft.status]}</strong>
                    <p className="error">
                      {draft.error_message || "AI 구조화에 실패했습니다."}
                    </p>
                  </article>
                );
              }

              if (draft.status === "generating") {
                return (
                  <article className="subpanel stack" key={draft.id}>
                    <strong>{draftStatusLabels[draft.status]}</strong>
                    <p className="muted">Rough Note를 구조화하고 있습니다.</p>
                  </article>
                );
              }

              if (draft.status === "converted_to_change_card") {
                return (
                  <article className="subpanel stack" key={draft.id}>
                    <strong>{draft.suggested_title || "AI Draft"}</strong>
                    <small>{draftStatusLabels[draft.status]}</small>
                  </article>
                );
              }

              return (
                <article className="subpanel stack" key={draft.id}>
                  <div>
                    <strong>{draftStatusLabels[draft.status] || draft.status}</strong>
                    <p className="muted">
                      AI 제안은 그대로 승인되지 않습니다. 필요한 내용을 직접 수정하세요.
                    </p>
                  </div>
                  <form className="stack" action={saveDraft}>
                    <input type="hidden" name="draftId" value={draft.id} />
                    <label className="field">
                      <span>변화 유형</span>
                      <select name="suggestedType" defaultValue={draft.suggested_type || "decision_changed"}>
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
                    <label className="field">
                      <span>근거</span>
                      <textarea name="evidence" defaultValue={draft.evidence ?? ""} maxLength={10000} rows={3} />
                    </label>
                    <label className="field">
                      <span>판단</span>
                      <textarea name="decision" defaultValue={draft.decision ?? ""} maxLength={10000} rows={3} />
                    </label>
                    <label className="field">
                      <span>변경</span>
                      <textarea
                        name="changeContent"
                        defaultValue={draft.change_content ?? ""}
                        maxLength={10000}
                        rows={3}
                      />
                    </label>
                    <label className="field">
                      <span>다음 확인</span>
                      <textarea name="nextCheck" defaultValue={draft.next_check ?? ""} maxLength={10000} rows={3} />
                    </label>
                    <label className="field">
                      <span>연결할 문제 정의</span>
                      <select name="problemDefinitionId" defaultValue="">
                        <option value="">연결 안 함</option>
                        {(problemDefinitions.data ?? []).map((problem) => (
                          <option value={problem.id} key={problem.id}>
                            {problem.current_text.slice(0, 100)}
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
                            {hypothesis.statement.slice(0, 100)}
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
                    <div className="row">
                      <button className="button secondary" type="submit">
                        AI 초안 저장
                      </button>
                      <button className="button" type="submit" formAction={convertDraft}>
                        Change Card 초안으로 전환
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel stack">
        <div>
          <h2>Change Cards</h2>
          <p className="muted">
            Builder가 최종 내용을 확정합니다. 승인된 카드만 공식 Decision Timeline의 판단 기록으로 취급합니다.
          </p>
        </div>

        {changeCards.error ? (
          <p className="error">Change Card 목록을 불러오지 못했습니다.</p>
        ) : changeCards.data.length === 0 ? (
          <p className="muted">아직 Change Card가 없습니다.</p>
        ) : (
          <div className="stack">
            {changeCards.data.map((card) =>
              card.work_status === "approved" ? (
                <article className="subpanel stack" key={card.id}>
                  <div>
                    <small>승인됨 · {cardTypeLabels[card.card_type] || card.card_type}</small>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.structured_summary}</p>
                  {card.evidence ? <p><strong>근거:</strong> {card.evidence}</p> : null}
                  {card.decision ? <p><strong>판단:</strong> {card.decision}</p> : null}
                  {card.change_content ? <p><strong>변경:</strong> {card.change_content}</p> : null}
                  {card.next_check ? <p><strong>다음 확인:</strong> {card.next_check}</p> : null}
                  <small>{card.visibility_status} · {card.importance}</small>
                </article>
              ) : (
                <article className="subpanel stack" key={card.id}>
                  <div>
                    <strong>Builder 검토 중</strong>
                    <p className="muted">
                      내용을 저장한 뒤 별도의 승인 버튼으로 공식 기록을 확정합니다.
                    </p>
                  </div>
                  <form className="stack" action={saveChangeCard}>
                    <input type="hidden" name="changeCardId" value={card.id} />
                    <label className="field">
                      <span>변화 유형</span>
                      <select name="cardType" defaultValue={card.card_type}>
                        {Object.entries(cardTypeLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>제목</span>
                      <input name="title" defaultValue={card.title} maxLength={500} required />
                    </label>
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
                    <label className="field">
                      <span>근거</span>
                      <textarea name="evidence" defaultValue={card.evidence ?? ""} maxLength={10000} rows={3} />
                    </label>
                    <label className="field">
                      <span>판단</span>
                      <textarea name="decision" defaultValue={card.decision ?? ""} maxLength={10000} rows={3} />
                    </label>
                    <label className="field">
                      <span>변경</span>
                      <textarea
                        name="changeContent"
                        defaultValue={card.change_content ?? ""}
                        maxLength={10000}
                        rows={3}
                      />
                    </label>
                    <label className="field">
                      <span>다음 확인</span>
                      <textarea name="nextCheck" defaultValue={card.next_check ?? ""} maxLength={10000} rows={3} />
                    </label>
                    <label className="field">
                      <span>중요도</span>
                      <select name="importance" defaultValue={card.importance}>
                        <option value="normal">일반</option>
                        <option value="major_turning_point">주요 전환점</option>
                      </select>
                    </label>
                    <div>
                      <button className="button secondary">Change Card 저장</button>
                    </div>
                  </form>
                  <form action={approveChangeCard}>
                    <input type="hidden" name="changeCardId" value={card.id} />
                    <button className="button">현재 저장된 내용 승인</button>
                  </form>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </>
  );
}
