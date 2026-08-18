import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DecisionCard } from "@/components/buildmap/decision-card";
import {
  formatDateTime,
  hypothesisStatusLabels,
  hypothesisTone,
} from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [problem, hypotheses, roughNotes, aiDrafts, changeCards] = await Promise.all([
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
      .select("id, statement, status, updated_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("rough_notes")
      .select("id, converted_to_change_card_at, created_at")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_structured_drafts")
      .select("id, status")
      .eq("project_id", projectId)
      .is("archived_at", null),
    supabase
      .from("change_cards")
      .select(
        "id, card_type, title, structured_summary, evidence, decision, change_content, next_check, work_status, visibility_status, importance, approved_at",
      )
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("approved_at", { ascending: false }),
  ]);

  const hypothesisRows = hypotheses.data ?? [];
  const roughNoteRows = roughNotes.data ?? [];
  const draftRows = aiDrafts.data ?? [];
  const cardRows = changeCards.data ?? [];
  const approvedCards = cardRows.filter((card) => card.work_status === "approved");
  const reviewCount =
    draftRows.filter((draft) => ["generating", "generated", "editing"].includes(draft.status)).length +
    cardRows.filter((card) => ["draft", "editing"].includes(card.work_status)).length;
  const activeHypotheses = hypothesisRows.filter(
    (hypothesis) => !["refuted", "held"].includes(hypothesis.status),
  );

  const loadError =
    problem.error || hypotheses.error || roughNotes.error || aiDrafts.error || changeCards.error;

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Project overview</p>
          <h2 style={{ marginBottom: 5 }}>현재 판단 상태</h2>
          <p className="section-help">
            작성 중인 맥락과 공식 기록을 한눈에 확인합니다.
          </p>
        </div>
        <Link className="button" href={`/projects/${projectId}/workspace`}>
          Workspace 열기
        </Link>
      </div>

      {loadError ? (
        <div className="alert error">프로젝트 요약 일부를 불러오지 못했습니다.</div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Problem</span>
          <strong className="metric-value">{problem.data ? 1 : 0}</strong>
          <span className="metric-note">현재 문제 정의</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Hypotheses</span>
          <strong className="metric-value">{hypothesisRows.length}</strong>
          <span className="metric-note">기록된 가설</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Rough Notes</span>
          <strong className="metric-value">{roughNoteRows.length}</strong>
          <span className="metric-note">관찰·메모</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Review Queue</span>
          <strong className="metric-value">{reviewCount}</strong>
          <span className="metric-note">검토 필요</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Decisions</span>
          <strong className="metric-value">{approvedCards.length}</strong>
          <span className="metric-note">승인된 기록</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="page-stack" style={{ gap: 18 }}>
          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Current problem</p>
                <h2>문제 정의</h2>
              </div>
              <Link className="button secondary" href={`/projects/${projectId}/workspace`}>
                편집
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
                <strong>아직 문제 정의가 없습니다.</strong>
                <span>Workspace에서 지금 해결하려는 문제를 먼저 기록하세요.</span>
              </div>
            )}
          </section>

          <section className="surface-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Hypotheses</p>
                <h2>활성 가설</h2>
              </div>
              <Badge tone="primary">{activeHypotheses.length}</Badge>
            </div>

            {activeHypotheses.length === 0 ? (
              <div className="empty-state">
                <strong>활성 가설이 없습니다.</strong>
                <span>Workspace에서 가설을 추가하고 검증 상태를 관리하세요.</span>
              </div>
            ) : (
              <ul className="compact-list">
                {activeHypotheses.slice(0, 5).map((hypothesis) => (
                  <li className="compact-item" key={hypothesis.id}>
                    <div className="row">
                      <p>{hypothesis.statement}</p>
                      <Badge tone={hypothesisTone(hypothesis.status)}>
                        {hypothesisStatusLabels[hypothesis.status] ?? hypothesis.status}
                      </Badge>
                    </div>
                    <div className="metadata-row">
                      <span>최근 변경 {formatDateTime(hypothesis.updated_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="surface-card">
          <div className="section-head">
            <div>
              <p className="section-kicker">Recent decisions</p>
              <h2>최근 공식 판단</h2>
            </div>
            <Link className="button secondary" href={`/projects/${projectId}/decisions`}>
              전체 보기
            </Link>
          </div>

          {approvedCards.length === 0 ? (
            <div className="empty-state">
              <strong>아직 승인된 판단이 없습니다.</strong>
              <span>Review Queue에서 Change Card를 승인하면 공식 기록이 됩니다.</span>
            </div>
          ) : (
            <div className="page-stack" style={{ gap: 12 }}>
              {approvedCards.slice(0, 3).map((card) => (
                <DecisionCard key={card.id} card={card} compact />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
