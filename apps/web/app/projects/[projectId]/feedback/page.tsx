import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import {
  createFeedbackRequestAction,
  setFeedbackRequestStatusAction,
  setFeedbackReviewStatusAction,
  setFeedbackVisibilityAction,
} from "../feedback-actions";

const updateMessages: Record<string, string> = {
  "request-created": "Public Feedback Request를 열었습니다.",
  "request-opened": "Feedback Request를 다시 열었습니다.",
  "request-closed": "Feedback Request를 닫았습니다.",
  "feedback-reviewed": "Feedback 검토 상태를 업데이트했습니다.",
  "feedback-published": "Feedback을 공개 선택했습니다.",
  "feedback-hidden": "Feedback을 다시 내부 검토로 돌렸습니다.",
};

const errorMessages: Record<string, string> = {
  "invalid-request": "Feedback Request 입력을 확인해 주세요.",
  "project-private": "External Feedback을 받으려면 먼저 Project Map을 공개해야 합니다.",
  "invalid-target": "공개된 정상 Decision만 Feedback Request 대상으로 선택할 수 있습니다.",
  "target-not-public": "대상 Decision이 더 이상 공개 상태가 아니어서 Request를 열 수 없습니다.",
  "request-create": "Feedback Request를 만들지 못했습니다.",
  "request-status": "Feedback Request 상태를 변경하지 못했습니다.",
  "invalid-feedback": "대상 Feedback을 확인할 수 없습니다.",
  "feedback-review": "Feedback 검토 상태를 변경하지 못했습니다.",
  "feedback-public": "Feedback 공개 상태를 변경하지 못했습니다.",
};

const reviewLabels: Record<string, string> = {
  new: "새 피드백",
  reviewing: "검토 중",
  reflected: "반영됨",
  not_reflected: "반영하지 않음",
};

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

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const [project, decisions, requests] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, visibility_status, public_slug")
      .eq("id", projectId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("change_cards")
      .select("id, title, visibility_status, sensitivity_status, work_status, approved_at")
      .eq("project_id", projectId)
      .eq("work_status", "approved")
      .is("archived_at", null)
      .order("approved_at", { ascending: false }),
    supabase
      .from("feedback_requests")
      .select(
        "id, project_id, change_card_id, title, question, context, visibility_status, status, created_at",
      )
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const requestRows = requests.data ?? [];
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

  const decisionRows = decisions.data ?? [];
  const publicDecisions = decisionRows.filter(
    (decision) =>
      decision.visibility_status === "published" && decision.sensitivity_status === "normal",
  );
  const decisionTitles = new Map(decisionRows.map((decision) => [decision.id, decision.title]));
  const feedbackRows = (feedbacks.data ?? []) as FeedbackRow[];
  const feedbackByRequest = new Map<string, FeedbackRow[]>();

  for (const feedback of feedbackRows) {
    const rows = feedbackByRequest.get(feedback.feedback_request_id) ?? [];
    rows.push(feedback);
    feedbackByRequest.set(feedback.feedback_request_id, rows);
  }

  const isPublic = project.data?.visibility_status === "public";
  const publicFeedbackHref = project.data?.public_slug
    ? `/p/${project.data.public_slug}/feedback`
    : null;
  const openRequests = requestRows.filter((request) => request.status === "open").length;
  const newFeedback = feedbackRows.filter((feedback) => feedback.review_status === "new").length;

  const createRequest = createFeedbackRequestAction.bind(null, projectId);
  const setRequestStatus = setFeedbackRequestStatusAction.bind(null, projectId);
  const setReviewStatus = setFeedbackReviewStatusAction.bind(null, projectId);
  const setVisibility = setFeedbackVisibilityAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">External feedback</p>
          <h2 style={{ marginBottom: 5 }}>Scout의 관찰을 판단 근거로 받기</h2>
          <p className="section-help">
            일반 댓글창이 아니라 Builder가 질문을 열고, 로그인 Scout의 응답을 내부 검토한 뒤 필요한 것만 공개합니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone="primary">{openRequests} open requests</Badge>
          <Badge tone={newFeedback > 0 ? "review" : "neutral"}>{newFeedback} new feedback</Badge>
          {isPublic && publicFeedbackHref ? (
            <Link className="button secondary" href={publicFeedbackHref} target="_blank" rel="noreferrer">
              Scout 화면 열기 ↗
            </Link>
          ) : null}
        </div>
      </div>

      {query.updated && updateMessages[query.updated] ? (
        <div className="alert success">{updateMessages[query.updated]}</div>
      ) : null}
      {query.error && errorMessages[query.error] ? (
        <div className="alert error">{errorMessages[query.error]}</div>
      ) : null}

      {project.error || !project.data ? (
        <div className="alert error">프로젝트 상태를 불러오지 못했습니다.</div>
      ) : !isPublic ? (
        <section className="surface-card">
          <p className="section-kicker">Public boundary</p>
          <h2>먼저 Project Map을 공개해야 합니다.</h2>
          <p className="section-help">
            External Feedback Request는 공개 Project Map에서만 노출됩니다. Decision 공개 선택과 Project 공개 상태는 Decisions에서 관리합니다.
          </p>
          <Link className="button" href={`/projects/${projectId}/decisions`}>
            Publication 설정 열기
          </Link>
        </section>
      ) : (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Ask Scouts</p>
              <h2>새 Feedback Request</h2>
              <p className="section-help">
                Project 전체 또는 현재 공개된 특정 Decision에 질문을 연결합니다. Request 자체는 Public Map에서 공개됩니다.
              </p>
            </div>
          </div>

          <form action={createRequest} className="stack">
            <label className="field">
              <span>제목</span>
              <input name="title" maxLength={160} placeholder="예: 추천 기준에 대한 외부 관점이 필요합니다" required />
            </label>
            <label className="field">
              <span>질문</span>
              <textarea
                name="question"
                maxLength={1600}
                placeholder="Scout에게 구체적으로 무엇을 확인하고 싶은지 적어주세요."
                required
              />
            </label>
            <label className="field">
              <span>맥락 · 선택</span>
              <textarea
                name="context"
                maxLength={2500}
                placeholder="답변에 필요한 배경만 짧게 설명합니다. 내부 정보는 넣지 마세요."
              />
            </label>
            <label className="field">
              <span>대상</span>
              <select name="target" defaultValue="project">
                <option value="project">Project 전체</option>
                {publicDecisions.map((decision) => (
                  <option key={decision.id} value={`decision:${decision.id}`}>
                    Decision · {decision.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="save-row row">
              <button className="button" type="submit">
                Public Feedback Request 열기
              </button>
              <span className="muted">응답은 제출 즉시 공개되지 않고 내부 검토로 들어갑니다.</span>
            </div>
          </form>
        </section>
      )}

      {requests.error || feedbacks.error ? (
        <div className="alert error">External Feedback 기록을 불러오지 못했습니다.</div>
      ) : requestRows.length === 0 ? (
        <div className="empty-state">
          <strong>아직 Feedback Request가 없습니다.</strong>
          <span>외부 관점이 필요한 질문이 생겼을 때만 Request를 여세요.</span>
        </div>
      ) : (
        <div className="page-stack">
          {requestRows.map((request) => {
            const responses = feedbackByRequest.get(request.id) ?? [];
            const requestOpen = request.status === "open";
            const targetTitle = request.change_card_id
              ? decisionTitles.get(request.change_card_id) ?? "Decision"
              : "Project 전체";

            return (
              <section className="surface-card" key={request.id}>
                <div className="section-head">
                  <div>
                    <div className="metadata-row" style={{ marginBottom: 7 }}>
                      <Badge tone={requestOpen ? "success" : "neutral"}>
                        {requestOpen ? "Open" : "Closed"}
                      </Badge>
                      <span>{targetTitle}</span>
                      <span>{formatDateTime(request.created_at)}</span>
                    </div>
                    <h2>{request.title}</h2>
                    <p style={{ color: "var(--text-strong)", marginBottom: 8 }}>{request.question}</p>
                    {request.context ? <p className="section-help">{request.context}</p> : null}
                  </div>
                  <div className="header-actions">
                    <Badge tone="primary">{responses.length} responses</Badge>
                    <form action={setRequestStatus}>
                      <input name="requestId" type="hidden" value={request.id} />
                      <input name="status" type="hidden" value={requestOpen ? "closed" : "open"} />
                      <button className="button secondary" type="submit">
                        {requestOpen ? "Request 닫기" : "Request 다시 열기"}
                      </button>
                    </form>
                  </div>
                </div>

                {responses.length === 0 ? (
                  <div className="empty-state">
                    <strong>아직 응답이 없습니다.</strong>
                    <span>Scout가 로그인 후 응답하면 먼저 이 내부 검토 영역에 나타납니다.</span>
                  </div>
                ) : (
                  <div className="stack">
                    {responses.map((feedback) => {
                      const publicSelected = feedback.visibility_status === "public_selected";
                      return (
                        <article className="subpanel" key={feedback.id}>
                          <div className="row" style={{ alignItems: "flex-start" }}>
                            <div style={{ minWidth: 0, flex: "1 1 360px" }}>
                              <div className="metadata-row" style={{ marginBottom: 8 }}>
                                <Badge tone={feedback.review_status === "new" ? "review" : "neutral"}>
                                  {reviewLabels[feedback.review_status] ?? feedback.review_status}
                                </Badge>
                                {publicSelected ? <Badge tone="success">Public selected</Badge> : <Badge>Internal review</Badge>}
                                {feedback.tester_interest ? <Badge tone="primary">Tester interest</Badge> : null}
                                <span>{formatDateTime(feedback.created_at)}</span>
                              </div>
                              <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{feedback.body}</p>
                            </div>
                            <div className="stack" style={{ minWidth: 210, gap: 8 }}>
                              <form action={setReviewStatus} className="row" style={{ justifyContent: "flex-end" }}>
                                <input name="feedbackId" type="hidden" value={feedback.id} />
                                <select name="reviewStatus" defaultValue={feedback.review_status}>
                                  <option value="new">새 피드백</option>
                                  <option value="reviewing">검토 중</option>
                                  <option value="reflected">반영됨</option>
                                  <option value="not_reflected">반영하지 않음</option>
                                </select>
                                <button className="button secondary" type="submit">저장</button>
                              </form>
                              <form action={setVisibility} className="row" style={{ justifyContent: "flex-end" }}>
                                <input name="feedbackId" type="hidden" value={feedback.id} />
                                <input
                                  name="visibility"
                                  type="hidden"
                                  value={publicSelected ? "internal_review" : "public_selected"}
                                />
                                <button className={publicSelected ? "button secondary" : "button"} type="submit">
                                  {publicSelected ? "공개에서 내리기" : "선택 공개"}
                                </button>
                              </form>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
