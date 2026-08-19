import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { submitExternalFeedbackAction } from "./actions";
import styles from "../page.module.css";

const errorMessages: Record<string, string> = {
  "invalid-feedback": "피드백 내용을 확인해 주세요.",
  profile: "피드백 작성자 프로필을 준비하지 못했습니다.",
  "project-unavailable": "현재 이 Project에는 피드백을 남길 수 없습니다.",
  "request-unavailable": "이 Feedback Request는 더 이상 응답을 받지 않습니다.",
  submit: "피드백을 제출하지 못했습니다. 다시 시도해 주세요.",
};

type PublicFeedbackRequest = {
  feedback_request_id: string;
  project_id: string;
  change_card_id: string | null;
  title: string;
  question: string;
  context: string | null;
  status: string;
  created_at: string;
};

type PublicFeedback = {
  feedback_id: string;
  feedback_request_id: string;
  feedback_type: string | null;
  tester_interest: boolean;
  author_display: string;
  body: string;
  created_at: string;
};

export default async function PublicFeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicSlug: string }>;
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { publicSlug } = await params;
  const query = await searchParams;
  const publicClient = createPublicClient();
  const sessionClient = await createClient();

  const [project, currentUser] = await Promise.all([
    publicClient
      .from("public_project_pages")
      .select("project_id, public_slug, title, one_line_description, builder_display_name")
      .eq("public_slug", publicSlug)
      .maybeSingle(),
    sessionClient.auth.getUser(),
  ]);

  if (project.error) {
    throw new Error("Failed to load public project.");
  }
  if (!project.data) {
    notFound();
  }

  const [requests, decisions] = await Promise.all([
    publicClient
      .from("public_feedback_requests")
      .select(
        "feedback_request_id, project_id, change_card_id, title, question, context, status, created_at",
      )
      .eq("project_id", project.data.project_id)
      .order("created_at", { ascending: false }),
    publicClient
      .from("public_decision_timeline")
      .select("change_card_id, title")
      .eq("project_id", project.data.project_id),
  ]);

  if (requests.error || decisions.error) {
    throw new Error("Failed to load public feedback requests.");
  }

  const requestRows = (requests.data ?? []) as PublicFeedbackRequest[];
  const requestIds = requestRows.map((request) => request.feedback_request_id);
  const selectedFeedbacks =
    requestIds.length > 0
      ? await publicClient
          .from("public_feedbacks")
          .select(
            "feedback_id, feedback_request_id, feedback_type, tester_interest, author_display, body, created_at",
          )
          .in("feedback_request_id", requestIds)
          .order("created_at", { ascending: false })
      : { data: [] as PublicFeedback[], error: null };

  if (selectedFeedbacks.error) {
    throw new Error("Failed to load public feedback.");
  }

  const decisionTitles = new Map(
    (decisions.data ?? []).map((decision) => [decision.change_card_id, decision.title]),
  );
  const feedbackByRequest = new Map<string, PublicFeedback[]>();
  for (const feedback of (selectedFeedbacks.data ?? []) as PublicFeedback[]) {
    const rows = feedbackByRequest.get(feedback.feedback_request_id) ?? [];
    rows.push(feedback);
    feedbackByRequest.set(feedback.feedback_request_id, rows);
  }

  const signedIn = Boolean(currentUser.data.user);
  const submitFeedback = submitExternalFeedbackAction.bind(null, publicSlug);
  const returnPath = `/p/${publicSlug}/feedback`;
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;

  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href={`/p/${publicSlug}`}>
            <span className="brand-mark">BM</span>
            {project.data.title}
          </Link>
          <span className={styles.scoutLabel}>External Feedback · Scout view</span>
        </header>

        <section className={styles.projectHeader}>
          <div className={styles.projectMeta}>
            <Badge tone="primary">Feedback Request</Badge>
            <span>Builder · {project.data.builder_display_name}</span>
            <span>{requestRows.length} open requests</span>
          </div>
          <h1>Builder가 외부 관점을 요청한 질문</h1>
          <p className={styles.projectLead}>
            일반 댓글창이 아닙니다. 공개된 질문에만 응답할 수 있고, 제출한 내용은 먼저 Builder 내부 검토로 들어갑니다.
          </p>
        </section>

        {query.error && errorMessages[query.error] ? (
          <div className="alert error" style={{ marginBottom: 18 }}>
            {errorMessages[query.error]}
          </div>
        ) : null}
        {query.submitted ? (
          <div className="alert success" style={{ marginBottom: 18 }}>
            피드백을 제출했습니다. Builder가 검토하기 전까지 공개되지 않습니다.
          </div>
        ) : null}

        {requestRows.length === 0 ? (
          <section className={styles.mapCard}>
            <div className={styles.empty}>현재 열려 있는 Feedback Request가 없습니다.</div>
          </section>
        ) : (
          <div className={styles.sideStack}>
            {requestRows.map((request) => {
              const publicFeedback = feedbackByRequest.get(request.feedback_request_id) ?? [];
              const targetTitle = request.change_card_id
                ? decisionTitles.get(request.change_card_id) ?? "Public Decision"
                : "Project 전체";

              return (
                <section className={styles.mapCard} key={request.feedback_request_id}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.projectMeta} style={{ marginBottom: 7 }}>
                        <Badge tone="success">Open</Badge>
                        <span>{targetTitle}</span>
                        <span>{formatDateTime(request.created_at)}</span>
                      </div>
                      <h2>{request.title}</h2>
                      <p style={{ color: "var(--text-strong)", fontSize: 17, marginBottom: 8 }}>
                        {request.question}
                      </p>
                      {request.context ? <p className="section-help">{request.context}</p> : null}
                    </div>
                    {request.change_card_id ? (
                      <a className="button secondary" href={`/p/${publicSlug}#decision-${request.change_card_id}`}>
                        Decision 보기
                      </a>
                    ) : null}
                  </div>

                  <div className={styles.whyGrid}>
                    <div className={styles.detail}>
                      <span>Your feedback</span>
                      {signedIn ? (
                        <form action={submitFeedback} className="stack">
                          <input
                            name="feedbackRequestId"
                            type="hidden"
                            value={request.feedback_request_id}
                          />
                          <label className="field">
                            <span>관찰 · 반대 근거 · 유사 경험 · 질문</span>
                            <textarea
                              name="body"
                              maxLength={4000}
                              placeholder="Builder의 판단에 도움이 될 구체적인 맥락을 남겨주세요."
                              required
                            />
                          </label>
                          <label className="row" style={{ justifyContent: "flex-start" }}>
                            <input name="testerInterest" type="checkbox" style={{ width: "auto" }} />
                            <span>이 프로젝트의 테스트/검증에 참여할 의향이 있습니다.</span>
                          </label>
                          <div className="save-row row">
                            <button className="button" type="submit">내부 검토로 보내기</button>
                            <span className="muted">작성자 이메일·인증 ID는 공개 화면에 노출되지 않습니다.</span>
                          </div>
                        </form>
                      ) : (
                        <div className={styles.empty}>
                          <p>Feedback은 1차 정책상 로그인 사용자만 작성할 수 있습니다.</p>
                          <Link className="button" href={loginHref}>
                            로그인 후 피드백 남기기
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className={styles.detail}>
                      <span>Builder-selected feedback</span>
                      {publicFeedback.length === 0 ? (
                        <div className={styles.empty}>아직 Builder가 공개 선택한 응답이 없습니다.</div>
                      ) : (
                        <ul className={styles.compactList}>
                          {publicFeedback.map((feedback) => (
                            <li className={styles.compactItem} key={feedback.feedback_id}>
                              <p style={{ whiteSpace: "pre-wrap" }}>{feedback.body}</p>
                              <small>
                                {feedback.author_display} · {formatDateTime(feedback.created_at)}
                                {feedback.tester_interest ? " · Tester interest" : ""}
                              </small>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <footer className={styles.footer}>
          <Link href={`/p/${publicSlug}`}>← Project Map으로 돌아가기</Link>
          <span>Feedback은 Builder의 공식 Decision이 아니라 외부 관찰·근거 후보입니다.</span>
        </footer>
      </div>
    </main>
  );
}
