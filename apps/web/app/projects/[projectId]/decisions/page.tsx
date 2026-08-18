import Link from "next/link";
import { DecisionCard } from "@/components/buildmap/decision-card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
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
    .order("approved_at", { ascending: false });

  const rows = decisions.data ?? [];

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Decision timeline</p>
          <h2 style={{ marginBottom: 5 }}>공식 판단 기록</h2>
          <p className="section-help">
            Builder가 승인한 Change Card만 이곳에 남습니다. 작성 도구가 아니라 다시 읽는 기록입니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone="success">{rows.length} approved</Badge>
          <Link className="button secondary" href={`/projects/${projectId}/workspace/review`}>
            Review Queue
          </Link>
        </div>
      </div>

      {decisions.error ? (
        <div className="alert error">Decision Timeline을 불러오지 못했습니다.</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <strong>아직 공식 판단이 없습니다.</strong>
          <span>Review Queue에서 Change Card를 승인하면 여기에 read-only 기록으로 추가됩니다.</span>
          <Link className="button" href={`/projects/${projectId}/workspace/review`}>
            검토하러 가기
          </Link>
        </div>
      ) : (
        <div className="timeline" style={{ gap: 18 }}>
          {rows.map((card) => (
            <div className="timeline-item" key={card.id}>
              {card.approved_at ? <time>{formatDateTime(card.approved_at)}</time> : null}
              <div style={{ marginTop: 7 }}>
                <DecisionCard card={card} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
