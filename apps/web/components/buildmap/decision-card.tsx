import { Badge } from "@/components/ui/badge";
import { cardTypeLabels, formatDateTime } from "@/lib/buildmap/presentation";

type DecisionCardData = {
  id: string;
  card_type: string;
  title: string;
  structured_summary: string;
  evidence: string | null;
  decision: string | null;
  change_content: string | null;
  next_check: string | null;
  importance: string;
  visibility_status: string;
  approved_at: string | null;
};

export function DecisionCard({
  card,
  compact = false,
}: {
  card: DecisionCardData;
  compact?: boolean;
}) {
  return (
    <article className="decision-card">
      <div className="decision-card-content">
        <div className="row">
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <Badge tone="success">Approved</Badge>
            <Badge>{cardTypeLabels[card.card_type] ?? card.card_type}</Badge>
            {card.importance === "major_turning_point" ? (
              <Badge tone="review">주요 전환점</Badge>
            ) : null}
          </div>
          {card.approved_at ? (
            <time className="muted">{formatDateTime(card.approved_at)}</time>
          ) : null}
        </div>

        <h3>{card.title}</h3>
        <p className="decision-summary">{card.structured_summary}</p>

        {!compact ? (
          <div className="page-stack" style={{ gap: 15 }}>
            {card.evidence || card.decision ? (
              <div className="detail-grid">
                {card.evidence ? (
                  <div className="detail-block">
                    <span className="detail-label">근거</span>
                    <p className="detail-value">{card.evidence}</p>
                  </div>
                ) : null}
                {card.decision ? (
                  <div className="detail-block">
                    <span className="detail-label">판단</span>
                    <p className="detail-value">{card.decision}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {card.change_content ? (
              <div className="detail-block">
                <span className="detail-label">변경</span>
                <p className="detail-value">{card.change_content}</p>
              </div>
            ) : null}

            {card.next_check ? (
              <div className="detail-block">
                <span className="detail-label">다음 확인</span>
                <p className="detail-value">{card.next_check}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <footer className="decision-footer">
          <span>공식 Decision Record</span>
          <span>{card.visibility_status}</span>
        </footer>
      </div>
    </article>
  );
}
