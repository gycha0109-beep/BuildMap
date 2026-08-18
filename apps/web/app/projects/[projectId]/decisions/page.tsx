import Link from "next/link";
import { DecisionCard } from "@/components/buildmap/decision-card";
import { Badge } from "@/components/ui/badge";
import { cardTypeLabels, formatDateTime } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
import {
  hideDecisionAction,
  markDecisionNormalAction,
  markDecisionSensitiveAction,
  publishDecisionAction,
  publishProjectAction,
  unpublishProjectAction,
} from "../publication-actions";

const updateMessages: Record<string, string> = {
  "project-published": "Public Project Map을 공개했습니다.",
  "project-private": "프로젝트를 비공개로 전환했습니다. 기존 Decision 공개 선택은 보존됩니다.",
  "decision-published": "Decision을 Public Map에 공개했습니다.",
  "decision-hidden": "Decision을 Public Map에서 내렸습니다.",
  "decision-sensitive": "Decision을 민감 정보로 표시하고 공개에서 내렸습니다.",
  "decision-normal": "Decision의 민감 표시를 해제했습니다. 공개 여부는 별도로 선택할 수 있습니다.",
};

const errorMessages: Record<string, string> = {
  "project-publish": "프로젝트 공개 상태를 변경하지 못했습니다.",
  "project-unpublish": "프로젝트를 비공개로 전환하지 못했습니다.",
  "invalid-decision": "대상 Decision을 확인할 수 없습니다.",
  "decision-publish": "Decision을 공개하지 못했습니다. 승인 상태와 민감 정보 여부를 확인하세요.",
  "decision-hide": "Decision 공개 상태를 변경하지 못했습니다.",
  "decision-sensitive": "Decision의 민감 정보 상태를 변경하지 못했습니다.",
  "decision-normal": "Decision의 민감 정보 상태를 변경하지 못했습니다.",
};

export default async function DecisionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [project, decisions] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, visibility_status, public_slug")
      .eq("id", projectId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("change_cards")
      .select(
        "id, card_type, title, structured_summary, evidence, decision, change_content, next_check, work_status, visibility_status, sensitivity_status, importance, approved_at",
      )
      .eq("project_id", projectId)
      .eq("work_status", "approved")
      .is("archived_at", null)
      .order("approved_at", { ascending: true }),
  ]);

  const rows = decisions.data ?? [];
  const latestDecision = rows.length > 0 ? rows[rows.length - 1] : null;
  const currentDirection = latestDecision
    ? latestDecision.change_content || latestDecision.decision || latestDecision.structured_summary
    : null;
  const majorTurningPoints = rows.filter(
    (card) => card.importance === "major_turning_point",
  );
  const publishedDecisions = rows.filter(
    (card) => card.visibility_status === "published" && card.sensitivity_status === "normal",
  );
  const sensitiveDecisions = rows.filter((card) => card.sensitivity_status === "sensitive");
  const isPublic = project.data?.visibility_status === "public";
  const publicHref = project.data?.public_slug ? `/p/${project.data.public_slug}` : null;

  const publishProject = publishProjectAction.bind(null, projectId);
  const unpublishProject = unpublishProjectAction.bind(null, projectId);
  const publishDecision = publishDecisionAction.bind(null, projectId);
  const hideDecision = hideDecisionAction.bind(null, projectId);
  const markSensitive = markDecisionSensitiveAction.bind(null, projectId);
  const markNormal = markDecisionNormalAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Project map</p>
          <h2 style={{ marginBottom: 5 }}>왜 지금 이렇게 되었는가</h2>
          <p className="section-help">
            공식 Decision을 오래된 순서부터 현재 방향까지 이어서 읽습니다. 큰 방향 전환은 주요 전환점으로 따로 표시합니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone="success">{rows.length} decisions</Badge>
          <Badge tone="review">{majorTurningPoints.length} turning points</Badge>
          <Link className="button secondary" href={`/projects/${projectId}/workspace/review`}>
            Review
          </Link>
        </div>
      </div>

      {query.updated && updateMessages[query.updated] ? (
        <div className="alert success">{updateMessages[query.updated]}</div>
      ) : null}
      {query.error && errorMessages[query.error] ? (
        <div className="alert error">{errorMessages[query.error]}</div>
      ) : null}

      {project.error || !project.data ? (
        <div className="alert error">프로젝트 공개 상태를 불러오지 못했습니다.</div>
      ) : (
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Publication</p>
              <h2>Public Project Map</h2>
              <p className="section-help">
                프로젝트 공개 여부와 외부에 보여줄 공식 Decision을 Builder가 직접 선택합니다. 공개 화면에는 승인됨 + 공개됨 + 민감 정보 없음 Decision만 나타납니다.
              </p>
            </div>
            <div className="header-actions">
              <Badge tone={isPublic ? "success" : "neutral"}>
                {isPublic ? "Project public" : "Project private"}
              </Badge>
              <Badge tone="primary">{publishedDecisions.length} public decisions</Badge>
              {sensitiveDecisions.length > 0 ? (
                <Badge tone="danger">{sensitiveDecisions.length} sensitive</Badge>
              ) : null}
            </div>
          </div>

          <div className="subpanel">
            <div className="row">
              <div>
                <strong style={{ display: "block", color: "var(--text-strong)" }}>
                  {isPublic ? "현재 외부에서 읽을 수 있습니다." : "현재 Builder에게만 보입니다."}
                </strong>
                <span className="muted">
                  {isPublic
                    ? "아래에서 공개로 선택한 Decision만 Scout의 Public Map에 포함됩니다."
                    : "Decision 공개 선택을 미리 준비한 뒤 Project Map 전체를 공개할 수 있습니다."}
                </span>
              </div>
              <div className="header-actions">
                {isPublic && publicHref ? (
                  <Link className="button secondary" href={publicHref} target="_blank" rel="noreferrer">
                    Public Map 열기 ↗
                  </Link>
                ) : null}
                {isPublic ? (
                  <form action={unpublishProject}>
                    <button className="button secondary" type="submit">
                      프로젝트 비공개
                    </button>
                  </form>
                ) : (
                  <form action={publishProject}>
                    <button className="button" type="submit">
                      Public Map 공개
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="stack" style={{ marginTop: 16 }}>
              <div>
                <strong style={{ color: "var(--text-strong)" }}>Decision 공개 선택</strong>
                <p className="section-help" style={{ marginBottom: 0 }}>
                  공식 기록의 내용은 수정하지 않고 공개 상태와 민감도만 관리합니다.
                </p>
              </div>
              <ul className="compact-list">
                {rows.map((card) => {
                  const sensitive = card.sensitivity_status === "sensitive";
                  const published = card.visibility_status === "published" && !sensitive;
                  const publishable = card.visibility_status === "publishable" && !sensitive;

                  return (
                    <li className="compact-item" key={`publication-${card.id}`}>
                      <div className="row" style={{ alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                          <p style={{ marginBottom: 6 }}>{card.title}</p>
                          <div className="metadata-row">
                            <span>{cardTypeLabels[card.card_type] ?? card.card_type}</span>
                            {card.approved_at ? <span>{formatDateTime(card.approved_at)}</span> : null}
                            {published ? <Badge tone="success">Public</Badge> : null}
                            {publishable ? <Badge tone="primary">Publishable</Badge> : null}
                            {!published && !publishable && !sensitive ? <Badge>Internal</Badge> : null}
                            {sensitive ? <Badge tone="danger">Sensitive · hidden</Badge> : null}
                          </div>
                        </div>
                        <div className="header-actions">
                          <form action={published ? hideDecision : publishDecision}>
                            <input name="changeCardId" type="hidden" value={card.id} />
                            <button className={published ? "button secondary" : "button"} disabled={sensitive} type="submit">
                              {published ? "공개에서 내리기" : "Public Map에 공개"}
                            </button>
                          </form>
                          <form action={sensitive ? markNormal : markSensitive}>
                            <input name="changeCardId" type="hidden" value={card.id} />
                            <button className="button secondary" type="submit">
                              {sensitive ? "민감 해제" : "민감 처리"}
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {decisions.error ? (
        <div className="alert error">Project Map을 불러오지 못했습니다.</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <strong>아직 공식 판단이 없습니다.</strong>
          <span>Review에서 판단 후보를 확인하고 기록하면 프로젝트의 Decision History가 여기서 시작됩니다.</span>
          <Link className="button" href={`/projects/${projectId}/workspace/review`}>
            Review 열기
          </Link>
        </div>
      ) : (
        <>
          <section className="hero-card">
            <p className="section-kicker">Current direction</p>
            <h2>{currentDirection}</h2>
            <div className="hero-meta">
              <Badge tone="success">공식 Decision에서 파생</Badge>
              {latestDecision?.approved_at ? (
                <span className="muted">
                  마지막 판단 {formatDateTime(latestDecision.approved_at)}
                </span>
              ) : null}
            </div>
            <p style={{ marginBottom: 0 }}>
              가장 최근 승인 Decision의 변경·판단·요약을 기준으로 현재 방향을 보여줍니다.
            </p>
          </section>

          <div className="overview-grid">
            <section className="surface-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Decision timeline</p>
                  <h2>How this project got here</h2>
                  <p className="section-help">
                    첫 공식 판단부터 현재 방향까지 하나의 연속된 변화 흐름으로 읽습니다.
                  </p>
                </div>
              </div>

              <div className="timeline" style={{ gap: 24 }}>
                {rows.map((card, index) => (
                  <div className="timeline-item" id={`decision-${card.id}`} key={card.id}>
                    <div className="metadata-row" style={{ marginBottom: 7 }}>
                      <span>
                        Decision {index + 1} / {rows.length}
                      </span>
                      {card.visibility_status === "published" && card.sensitivity_status === "normal" ? (
                        <Badge tone="success">Public</Badge>
                      ) : card.sensitivity_status === "sensitive" ? (
                        <Badge tone="danger">Sensitive</Badge>
                      ) : (
                        <Badge>Internal</Badge>
                      )}
                    </div>
                    <DecisionCard card={card} />
                  </div>
                ))}

                {currentDirection ? (
                  <div className="timeline-item">
                    <time>현재</time>
                    <strong style={{ fontSize: 15 }}>Current direction</strong>
                    <p style={{ color: "var(--text-strong)", fontSize: 14 }}>
                      {currentDirection}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <div className="page-stack" style={{ gap: 18 }}>
              <section className="surface-card">
                <div className="section-head">
                  <div>
                    <p className="section-kicker">Major turning points</p>
                    <h2>큰 방향 전환만 빠르게 보기</h2>
                    <p className="section-help">
                      전체 기록을 읽기 전에 프로젝트의 큰 변곡점부터 훑을 수 있습니다.
                    </p>
                  </div>
                  <Badge tone="review">{majorTurningPoints.length}</Badge>
                </div>

                {majorTurningPoints.length === 0 ? (
                  <div className="empty-state">
                    <strong>아직 주요 전환점이 없습니다.</strong>
                    <span>Review에서 프로젝트 방향을 크게 바꾼 Decision만 선택적으로 지정합니다.</span>
                  </div>
                ) : (
                  <ul className="compact-list">
                    {majorTurningPoints.map((card) => (
                      <li className="compact-item" key={card.id}>
                        <a href={`#decision-${card.id}`}>
                          <p>{card.title}</p>
                          <div className="metadata-row">
                            <span>{cardTypeLabels[card.card_type] ?? card.card_type}</span>
                            {card.approved_at ? <span>{formatDateTime(card.approved_at)}</span> : null}
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {latestDecision ? (
                <section className="surface-card">
                  <div className="section-head">
                    <div>
                      <p className="section-kicker">Latest decision</p>
                      <h2>현재 방향을 만든 마지막 판단</h2>
                    </div>
                  </div>
                  <DecisionCard card={latestDecision} compact />
                </section>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
