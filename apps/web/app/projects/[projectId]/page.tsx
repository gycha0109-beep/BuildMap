import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DecisionCard } from "@/components/buildmap/decision-card";
import {
  cardTypeLabels,
  formatDateTime,
} from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [problem, aiDrafts, changeCards] = await Promise.all([
    supabase
      .from("problem_definitions")
      .select("id, current_text, updated_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ai_structured_drafts")
      .select("id, status")
      .eq("project_id", projectId)
      .is("archived_at", null),
    supabase
      .from("change_cards")
      .select(
        "id, card_type, title, structured_summary, evidence, decision, change_content, next_check, work_status, visibility_status, importance, approved_at, created_at",
      )
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("approved_at", { ascending: false }),
  ]);

  const draftRows = aiDrafts.data ?? [];
  const cardRows = changeCards.data ?? [];
  const approvedCards = cardRows.filter((card) => card.work_status === "approved");
  const latestDecision = approvedCards[0] ?? null;
  const currentDirection = latestDecision
    ? latestDecision.change_content || latestDecision.decision || latestDecision.structured_summary
    : null;
  const reviewCount =
    draftRows.filter((draft) => ["generating", "generated", "editing"].includes(draft.status)).length +
    cardRows.filter((card) => ["draft", "editing"].includes(card.work_status)).length;
  const majorTurningPoints = approvedCards.filter(
    (card) => card.importance === "major_turning_point",
  );
  const timelineCards = approvedCards.slice(0, 8).reverse();

  const loadError = problem.error || aiDrafts.error || changeCards.error;

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Project overview</p>
          <h2 style={{ marginBottom: 5 }}>프로젝트가 여기까지 온 이유</h2>
          <p className="section-help">
            현재 방향과 그 방향을 만든 주요 Decision을 한눈에 확인합니다.
          </p>
        </div>
        <Link className="button" href={`/projects/${projectId}/workspace`}>
          Capture 남기기
        </Link>
      </div>

      {loadError ? (
        <div className="alert error">프로젝트 맥락 일부를 불러오지 못했습니다.</div>
      ) : null}

      <section className="hero-card">
        <p className="section-kicker">Current direction</p>
        {currentDirection ? (
          <>
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
              별도 상태값을 입력하지 않고 가장 최근 승인 Decision의 변경·판단·요약을 기준으로 표시합니다.
            </p>
          </>
        ) : (
          <div className="empty-state">
            <strong>아직 공식 Current Direction이 없습니다.</strong>
            <span>
              중요한 판단을 Capture하고 Decision으로 확정하면 현재 방향이 자동으로 나타납니다.
            </span>
            <Link className="button" href={`/projects/${projectId}/workspace`}>
              첫 Capture 남기기
            </Link>
          </div>
        )}
      </section>

      <div className="form-grid-3">
        <Link className="metric-card project-row-link" href={`/projects/${projectId}/decisions`}>
          <span className="metric-label">Latest Decision</span>
          <strong
            style={{
              display: "block",
              margin: "7px 0 5px",
              color: "var(--text-strong)",
              fontSize: 15,
            }}
          >
            {latestDecision?.title ?? "아직 Decision 없음"}
          </strong>
          <span className="metric-note">
            {latestDecision?.approved_at
              ? formatDateTime(latestDecision.approved_at)
              : "첫 공식 판단을 남겨보세요."}
          </span>
        </Link>

        <Link className="metric-card project-row-link" href={`/projects/${projectId}/workspace/review`}>
          <span className="metric-label">Open Review</span>
          <strong className="metric-value">{reviewCount}</strong>
          <span className="metric-note">
            {reviewCount > 0 ? "Builder 확인이 필요한 판단 후보" : "검토 대기 항목 없음"}
          </span>
        </Link>

        <Link className="metric-card project-row-link" href={`/projects/${projectId}/decisions`}>
          <span className="metric-label">Major Turning Points</span>
          <strong className="metric-value">{majorTurningPoints.length}</strong>
          <span className="metric-note">프로젝트 방향을 크게 바꾼 공식 판단</span>
        </Link>
      </div>

      <div className="overview-grid">
        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Decision history</p>
              <h2>How this project got here</h2>
              <p className="section-help">
                최근 공식 판단을 오래된 순서부터 이어서 봅니다.
              </p>
            </div>
            <Link className="button secondary" href={`/projects/${projectId}/decisions`}>
              전체 Decisions
            </Link>
          </div>

          {timelineCards.length === 0 ? (
            <div className="empty-state">
              <strong>아직 Decision Timeline이 비어 있습니다.</strong>
              <span>Capture에서 중요한 판단을 남기면 프로젝트의 변화 흐름이 만들어집니다.</span>
            </div>
          ) : (
            <div className="timeline">
              {timelineCards.map((card) => (
                <div className="timeline-item" key={card.id}>
                  {card.approved_at ? <time>{formatDateTime(card.approved_at)}</time> : null}
                  <strong>{card.title}</strong>
                  <p>
                    {cardTypeLabels[card.card_type] ?? card.card_type}
                    {card.importance === "major_turning_point" ? " · 주요 전환점" : ""}
                    {" — "}
                    {card.change_content || card.decision || card.structured_summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="page-stack" style={{ gap: 18 }}>
          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Latest decision</p>
                <h2>최근 공식 판단</h2>
              </div>
            </div>

            {latestDecision ? (
              <DecisionCard card={latestDecision} compact />
            ) : (
              <div className="empty-state">
                <strong>아직 승인된 판단이 없습니다.</strong>
                <span>Review에서 AI Candidate를 확인하고 Decision으로 기록하세요.</span>
              </div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Major turning points</p>
                <h2>주요 전환점</h2>
              </div>
              <Badge tone="review">{majorTurningPoints.length}</Badge>
            </div>

            {majorTurningPoints.length === 0 ? (
              <div className="empty-state">
                <strong>아직 주요 전환점으로 지정된 Decision이 없습니다.</strong>
                <span>프로젝트 방향을 크게 바꾼 판단만 선택적으로 표시합니다.</span>
              </div>
            ) : (
              <ul className="compact-list">
                {majorTurningPoints.slice(0, 4).map((card) => (
                  <li className="compact-item" key={card.id}>
                    <p>{card.title}</p>
                    <div className="metadata-row">
                      <span>{cardTypeLabels[card.card_type] ?? card.card_type}</span>
                      {card.approved_at ? <span>{formatDateTime(card.approved_at)}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Project context</p>
                <h2>현재 문제</h2>
              </div>
              <Link className="button secondary" href={`/projects/${projectId}/workspace`}>
                Context 열기
              </Link>
            </div>

            {problem.data ? (
              <>
                <p className="detail-value">{problem.data.current_text}</p>
                <div className="metadata-row" style={{ marginTop: 14 }}>
                  <span>마지막 저장 {formatDateTime(problem.data.updated_at)}</span>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>현재 문제는 선택 입력입니다.</strong>
                <span>필요할 때 Project Context에서 문제와 가설을 보완할 수 있습니다.</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
