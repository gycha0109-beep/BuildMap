import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import { setFeedbackOutcomeStatusAction } from "../../feedback-actions";

type FeedbackRow = {
  id: string;
  feedback_request_id: string;
  body: string;
  feedback_type: string | null;
  tester_interest: boolean;
  review_status: string;
  visibility_status: string;
  created_at: string;
};

type RequestRow = {
  id: string;
  title: string;
  question: string;
  change_card_id: string | null;
  status: string;
  created_at: string;
};

type CaptureRow = {
  id: string;
  source_feedback_id: string | null;
  converted_to_change_card_at: string | null;
  created_at: string;
};

type DraftRow = {
  id: string;
  rough_note_id: string | null;
  status: string;
  converted_change_card_id: string | null;
  created_at: string;
};

type ChangeCardRow = {
  id: string;
  title: string;
  work_status: string;
  rough_note_id: string | null;
  linked_feedback_id: string | null;
  approved_at: string | null;
  created_at: string;
};

function outcomeMeta(status: string) {
  if (status === "reflected") {
    return { label: "Reflected", tone: "success" as const, resolved: true };
  }
  if (status === "not_reflected") {
    return { label: "Not reflected", tone: "neutral" as const, resolved: true };
  }
  return {
    label: status === "reviewing" ? "Reviewing · unresolved" : "Unresolved",
    tone: "review" as const,
    resolved: false,
  };
}

function pathMeta({
  capture,
  draft,
  cards,
}: {
  capture: CaptureRow | null;
  draft: DraftRow | null;
  cards: ChangeCardRow[];
}) {
  const approved = cards.find((card) => card.work_status === "approved") ?? null;
  if (approved) {
    return { label: "Approved Decision", tone: "success" as const, approved };
  }

  const pending = cards.find((card) => ["draft", "editing"].includes(card.work_status)) ?? null;
  if (pending) {
    return { label: "Decision pending", tone: "review" as const, approved: null };
  }

  if (draft?.status === "generated" || draft?.status === "editing") {
    return { label: "Review candidate", tone: "ai" as const, approved: null };
  }
  if (draft?.status === "generating") {
    return { label: "AI structuring", tone: "ai" as const, approved: null };
  }
  if (draft?.status === "failed") {
    return { label: "AI retry needed", tone: "danger" as const, approved: null };
  }
  if (draft?.status === "converted_to_change_card") {
    return { label: "Converted · card unavailable", tone: "review" as const, approved: null };
  }
  if (capture) {
    return { label: "Captured", tone: "primary" as const, approved: null };
  }

  return { label: "Not captured", tone: "neutral" as const, approved: null };
}

export default async function FeedbackOutcomesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const [requests, captures, drafts, changeCards] = await Promise.all([
    supabase
      .from("feedback_requests")
      .select("id, title, question, change_card_id, status, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("rough_notes")
      .select("id, source_feedback_id, converted_to_change_card_at, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null),
    supabase
      .from("ai_structured_drafts")
      .select("id, rough_note_id, status, converted_change_card_id, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("change_cards")
      .select("id, title, work_status, rough_note_id, linked_feedback_id, approved_at, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const requestRows = (requests.data ?? []) as RequestRow[];
  const requestIds = requestRows.map((request) => request.id);
  const feedbacks =
    requestIds.length > 0
      ? await supabase
          .from("feedbacks")
          .select(
            "id, feedback_request_id, body, feedback_type, tester_interest, review_status, visibility_status, created_at",
          )
          .in("feedback_request_id", requestIds)
          .is("archived_at", null)
          .order("created_at", { ascending: false })
      : { data: [] as FeedbackRow[], error: null };

  const feedbackRows = (feedbacks.data ?? []) as FeedbackRow[];
  const captureRows = (captures.data ?? []) as CaptureRow[];
  const draftRows = (drafts.data ?? []) as DraftRow[];
  const cardRows = (changeCards.data ?? []) as ChangeCardRow[];
  const requestById = new Map(requestRows.map((request) => [request.id, request]));
  const captureByFeedbackId = new Map<string, CaptureRow>();

  for (const capture of captureRows) {
    if (capture.source_feedback_id && !captureByFeedbackId.has(capture.source_feedback_id)) {
      captureByFeedbackId.set(capture.source_feedback_id, capture);
    }
  }

  const draftsByCaptureId = new Map<string, DraftRow[]>();
  for (const draft of draftRows) {
    if (!draft.rough_note_id) continue;
    const rows = draftsByCaptureId.get(draft.rough_note_id) ?? [];
    rows.push(draft);
    draftsByCaptureId.set(draft.rough_note_id, rows);
  }

  const cardsByFeedbackId = new Map<string, ChangeCardRow[]>();
  for (const card of cardRows) {
    if (card.linked_feedback_id) {
      const rows = cardsByFeedbackId.get(card.linked_feedback_id) ?? [];
      rows.push(card);
      cardsByFeedbackId.set(card.linked_feedback_id, rows);
    }
  }

  for (const [feedbackId, capture] of captureByFeedbackId) {
    const captureCards = cardRows.filter((card) => card.rough_note_id === capture.id);
    if (captureCards.length === 0) continue;
    const existing = cardsByFeedbackId.get(feedbackId) ?? [];
    const knownIds = new Set(existing.map((card) => card.id));
    for (const card of captureCards) {
      if (!knownIds.has(card.id)) existing.push(card);
    }
    cardsByFeedbackId.set(feedbackId, existing);
  }

  const unresolved = feedbackRows.filter((feedback) =>
    ["new", "reviewing"].includes(feedback.review_status),
  ).length;
  const reflected = feedbackRows.filter((feedback) => feedback.review_status === "reflected").length;
  const notReflected = feedbackRows.filter(
    (feedback) => feedback.review_status === "not_reflected",
  ).length;
  const linkedDecisions = feedbackRows.filter((feedback) =>
    (cardsByFeedbackId.get(feedback.id) ?? []).some((card) => card.work_status === "approved"),
  ).length;
  const readError = Boolean(
    requests.error || captures.error || drafts.error || changeCards.error || feedbacks.error,
  );
  const setOutcome = setFeedbackOutcomeStatusAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Feedback outcomes</p>
          <h2 style={{ marginBottom: 5 }}>이 Feedback은 실제로 어떻게 끝났는가</h2>
          <p className="section-help">
            Feedback의 evidence 경로와 Builder의 최종 반영 판정을 분리해서 봅니다. Decision 생성 여부가 Outcome을 자동 결정하지 않습니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone={unresolved > 0 ? "review" : "neutral"}>{unresolved} unresolved</Badge>
          <Badge tone="success">{reflected} reflected</Badge>
          <Badge>{notReflected} not reflected</Badge>
          <Badge tone="primary">{linkedDecisions} linked decisions</Badge>
        </div>
      </div>

      {query.updated === "feedback-outcome" ? (
        <div className="alert success">Feedback Outcome을 저장했습니다.</div>
      ) : null}
      {query.error === "feedback-outcome" ? (
        <div className="alert error">Feedback Outcome을 저장하지 못했습니다.</div>
      ) : null}

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Closure rule</p>
            <h2>경로와 판정은 서로 다른 사실입니다.</h2>
            <p className="section-help">
              Capture 또는 Decision이 존재해도 자동으로 반영됨이 되지 않습니다. Builder가 `Reflected` 또는 `Not reflected`를 선택해야 Outcome이 닫힙니다.
            </p>
          </div>
          <Link className="button secondary" href={`/projects/${projectId}/feedback`}>
            Feedback intake
          </Link>
        </div>
      </section>

      {readError ? (
        <div className="alert error">
          일부 Feedback outcome source를 읽지 못했습니다. 누락된 경로를 추정하지 않고 확인 가능한 연결만 표시합니다.
        </div>
      ) : null}

      {feedbackRows.length === 0 ? (
        <div className="empty-state">
          <strong>닫을 Feedback Outcome이 없습니다.</strong>
          <span>Scout Feedback이 들어오면 Capture와 Decision 진행 여부를 여기서 추적할 수 있습니다.</span>
          <Link className="button" href={`/projects/${projectId}/feedback`}>
            Feedback 열기
          </Link>
        </div>
      ) : (
        <div className="page-stack" style={{ gap: 16 }}>
          {feedbackRows.map((feedback) => {
            const request = requestById.get(feedback.feedback_request_id) ?? null;
            const capture = captureByFeedbackId.get(feedback.id) ?? null;
            const draft = capture ? (draftsByCaptureId.get(capture.id) ?? [])[0] ?? null : null;
            const cards = cardsByFeedbackId.get(feedback.id) ?? [];
            const path = pathMeta({ capture, draft, cards });
            const outcome = outcomeMeta(feedback.review_status);
            const approvedDecisions = cards.filter((card) => card.work_status === "approved");
            const pendingDecision = cards.find((card) =>
              ["draft", "editing"].includes(card.work_status),
            );

            return (
              <section className="surface-card" key={feedback.id}>
                <div className="section-head">
                  <div style={{ minWidth: 0 }}>
                    <div className="metadata-row" style={{ marginBottom: 8 }}>
                      <Badge tone={outcome.tone}>{outcome.label}</Badge>
                      <Badge tone={path.tone}>{path.label}</Badge>
                      {feedback.visibility_status === "public_selected" ? (
                        <Badge tone="success">Public selected</Badge>
                      ) : (
                        <Badge>Internal review</Badge>
                      )}
                      {feedback.tester_interest ? <Badge tone="primary">Tester interest</Badge> : null}
                      <span>{formatDateTime(feedback.created_at)}</span>
                    </div>
                    <h2>{request?.title ?? "Feedback Request"}</h2>
                    {request ? <p className="section-help">{request.question}</p> : null}
                  </div>
                  <form action={setOutcome} className="row" style={{ justifyContent: "flex-end" }}>
                    <input name="feedbackId" type="hidden" value={feedback.id} />
                    <select
                      name="outcomeStatus"
                      defaultValue={
                        feedback.review_status === "new" ? "reviewing" : feedback.review_status
                      }
                    >
                      <option value="reviewing">Reviewing · unresolved</option>
                      <option value="reflected">Reflected</option>
                      <option value="not_reflected">Not reflected</option>
                    </select>
                    <button className="button" type="submit">
                      Outcome 저장
                    </button>
                  </form>
                </div>

                <div className="subpanel" style={{ marginBottom: 14 }}>
                  <p className="section-kicker">Scout feedback</p>
                  <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{feedback.body}</p>
                </div>

                <div className="detail-grid">
                  <div className="detail-block">
                    <span className="detail-label">Evidence path</span>
                    <div className="metadata-row" style={{ marginBottom: 7 }}>
                      <Badge tone={path.tone}>{path.label}</Badge>
                    </div>
                    <p className="detail-value">
                      {capture
                        ? `Capture ${formatDateTime(capture.created_at)}에서 evidence로 보존되었습니다.`
                        : "이 Feedback에서 시작한 Capture는 없습니다."}
                    </p>
                    {draft ? (
                      <p className="muted" style={{ marginBottom: 0 }}>
                        AI Draft status: {draft.status}
                      </p>
                    ) : null}
                  </div>

                  <div className="detail-block">
                    <span className="detail-label">Builder outcome</span>
                    <div className="metadata-row" style={{ marginBottom: 7 }}>
                      <Badge tone={outcome.tone}>{outcome.label}</Badge>
                    </div>
                    <p className="detail-value">
                      {outcome.resolved
                        ? "Builder가 이 Feedback의 처리 결과를 명시적으로 닫았습니다."
                        : "아직 최종 반영/미반영 판정이 없습니다."}
                    </p>
                  </div>
                </div>

                {approvedDecisions.length > 0 ? (
                  <div className="subpanel" style={{ marginTop: 14 }}>
                    <p className="section-kicker">Linked decision</p>
                    <div className="stack" style={{ gap: 8 }}>
                      {approvedDecisions.map((decision) => (
                        <div className="row" key={decision.id}>
                          <div>
                            <strong style={{ display: "block", color: "var(--text-strong)" }}>
                              {decision.title}
                            </strong>
                            {decision.approved_at ? (
                              <span className="muted">Approved {formatDateTime(decision.approved_at)}</span>
                            ) : null}
                          </div>
                          <div className="header-actions">
                            <Link
                              className="button secondary"
                              href={`/projects/${projectId}/decisions#decision-${decision.id}`}
                            >
                              Decision 보기
                            </Link>
                            <Link className="button secondary" href={`/projects/${projectId}/evidence`}>
                              Evidence trace
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : pendingDecision ? (
                  <div className="subpanel" style={{ marginTop: 14 }}>
                    <p className="section-kicker">Decision pending</p>
                    <div className="row">
                      <div>
                        <strong style={{ display: "block", color: "var(--text-strong)" }}>
                          {pendingDecision.title}
                        </strong>
                        <span className="muted">Builder 승인 전 Change Card입니다.</span>
                      </div>
                      <Link className="button secondary" href={`/projects/${projectId}/workspace/review`}>
                        Review 열기
                      </Link>
                    </div>
                  </div>
                ) : capture ? (
                  <div className="row" style={{ marginTop: 14 }}>
                    <span className="muted">아직 승인된 Decision 연결은 없습니다.</span>
                    <Link className="button secondary" href={`/projects/${projectId}/workspace/review`}>
                      Review 상태 확인
                    </Link>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
