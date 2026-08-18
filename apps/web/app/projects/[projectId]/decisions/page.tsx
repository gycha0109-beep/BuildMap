import Link from "next/link";
import { DecisionCard } from "@/components/buildmap/decision-card";
import { Badge } from "@/components/ui/badge";
import { cardTypeLabels, formatDateTime } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const decisions = await supabase
    .from("change_cards")
    .select(
      "id, card_type, title, structured_summary, evidence, decision, change_content, next_check, work_status, visibility_status, importance, approved_at",
    )
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .is("archived_at", null)
    .order("approved_at", { ascending: true });

  const rows = decisions.data ?? [];
  const latestDecision = rows.length > 0 ? rows[rows.length - 1] : null;
  const currentDirection = latestDecision
    ? latestDecision.change_content || latestDecision.decision || latestDecision.structured_summary
    : null;
  const majorTurningPoints = rows.filter(
    (card) => card.importance === "major_turning_point",
  );

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
                      {card.approved_at ? <span>{formatDateTime(card.approved_at)}</span> : null}
                      <span>
                        Decision {index + 1} / {rows.length}
                      </span>
                      {card.importance === "major_turning_point" ? (
                        <Badge tone="review">주요 전환점</Badge>
                      ) : null}
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
