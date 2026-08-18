import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function FirstDecisionActivation({
  projectId,
  hasCapture,
  reviewCount,
}: {
  projectId: string;
  hasCapture: boolean;
  reviewCount: number;
}) {
  const reviewReady = reviewCount > 0;
  const href = reviewReady
    ? `/projects/${projectId}/workspace/review`
    : `/projects/${projectId}/workspace`;
  const actionLabel = reviewReady
    ? "판단 후보 확인하기"
    : hasCapture
      ? "새 Capture 남기기"
      : "첫 Capture 남기기";
  const message = reviewReady
    ? "판단 후보가 준비되었습니다. Builder가 확인하고 기록하면 첫 Decision이 완성됩니다."
    : hasCapture
      ? "첫 Capture는 저장되었습니다. 중요한 판단 후보가 생기면 Review로 올라갑니다."
      : "프로젝트 설명을 더 작성할 필요 없습니다. 만드는 과정에서 생긴 중요한 일을 그대로 남겨 첫 Decision을 시작하세요.";

  return (
    <section className="activation-card" aria-label="첫 Decision 진행 상태">
      <div className="activation-head">
        <div>
          <p className="section-kicker">First decision</p>
          <h2>첫 판단 기록까지</h2>
          <p className="section-help">{message}</p>
        </div>
        {reviewReady ? <Badge tone="review">Review {reviewCount}</Badge> : <Badge tone="primary">시작하기</Badge>}
      </div>

      <div className="activation-steps">
        <div className={`activation-step ${hasCapture ? "complete" : "active"}`}>
          <span className="activation-index">1</span>
          <div>
            <strong>Capture</strong>
            <span>{hasCapture ? "첫 기록 저장됨" : "무슨 일이 있었는지 적기"}</span>
          </div>
        </div>
        <div className={`activation-step ${reviewReady ? "active" : "waiting"}`}>
          <span className="activation-index">2</span>
          <div>
            <strong>Review</strong>
            <span>{reviewReady ? "판단 후보 확인 필요" : "AI 후보가 생기면 열림"}</span>
          </div>
        </div>
        <div className="activation-step waiting">
          <span className="activation-index">3</span>
          <div>
            <strong>Decision</strong>
            <span>Builder가 공식 판단으로 확정</span>
          </div>
        </div>
      </div>

      <div className="activation-action">
        <Link className="button" href={href}>
          {actionLabel}
        </Link>
        <span className="muted">첫 Decision이 생기면 이 가이드는 자동으로 사라집니다.</span>
      </div>
    </section>
  );
}
