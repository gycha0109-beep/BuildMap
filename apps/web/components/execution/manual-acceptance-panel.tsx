import { SubmitButton } from "@/components/ui/submit-button";

export type ManualCriterionRow = {
  id: string;
  title: string;
  roadmap_revision_id: string;
};

export type ManualEventRow = {
  id: string;
  criterion_id: string;
  event_type: string;
  reason: string;
  recorded_at: string;
  actor_builder_profile_id: string;
};

export function ManualAcceptancePanel({
  criteria,
  events,
  unavailable,
  onRecord,
}: {
  criteria: ManualCriterionRow[];
  events: ManualEventRow[];
  unavailable: boolean;
  onRecord: (form: FormData) => Promise<void>;
}) {
  const current = new Map<string, ManualEventRow>();
  for (const item of events) {
    if (!current.has(item.criterion_id)) current.set(item.criterion_id, item);
  }

  return (
    <section className="surface-card stack">
      <p className="section-kicker">EM-3C-A · Builder authority</p>
      <h2>수동 완료 조건 승인·철회</h2>
      <p className="section-help">
        승인된 로드맵의 MANUAL_ACCEPTANCE 조건만 Builder가 사유와 함께 명시적으로
        승인하거나 철회할 수 있습니다. 기록은 삭제·수정할 수 없으며 철회도
        새로운 감사 이벤트로 남습니다. 이 작업은 BuildMap의 공식 Change Card
        또는 Decision 승인과 별개입니다.
      </p>
      {unavailable ? (
        <div className="alert error">수동 승인 조건 또는 감사 이력을 완전히 읽지 못했습니다.</div>
      ) : criteria.length === 0 ? (
        <div className="empty-state">
          <span>승인된 로드맵에 수동 완료 조건이 없습니다.</span>
        </div>
      ) : (
        <div className="stack">
          {criteria.map((criterion) => {
            const last = current.get(criterion.id);
            const accepted = last?.event_type === "accepted";
            return (
              <div className="stack" key={criterion.id}>
                <strong>{criterion.title}</strong>
                <p className="section-help">
                  현재 수동 기록: {accepted ? "Builder 승인" :
                    last?.event_type === "revoked" ? "철회됨" : "승인 기록 없음"}
                  {last ? ` · ${last.recorded_at} · 승인자 ${last.actor_builder_profile_id}` : ""}
                </p>
                <form action={onRecord} className="stack">
                  <input type="hidden" name="criterionId" value={criterion.id} />
                  <input type="hidden" name="eventType"
                    value={accepted ? "revoked" : "accepted"} />
                  <label className="field">
                    <span>{accepted ? "철회 사유" : "명시적 승인 사유"} (12~2000자)</span>
                    <textarea name="reason" required minLength={12} maxLength={2000}
                      rows={2}
                      placeholder={accepted
                        ? "어떤 검증 사항 때문에 승인을 철회하시는지 기록해 주세요."
                        : "어떤 결과를 직접 확인하고 수동 조건을 승인하시는지 기록해 주세요."} />
                  </label>
                  <SubmitButton
                    label={accepted ? "이 수동 승인을 철회하고 기록" : "수동 완료 조건 승인 기록"}
                    pendingLabel="감사 이벤트 기록 중…"
                    className={accepted ? "button secondary" : "button"}
                  />
                </form>
              </div>
            );
          })}
        </div>
      )}
      {events.length ? (
        <div className="stack">
          <h3>수동 승인 감사 이력 (최근 {events.length}건)</h3>
          <ul className="compact-list">
            {events.slice(0,30).map((event) => (
              <li key={event.id}>
                <strong>{event.event_type === "accepted" ? "승인" : "철회"}</strong>
                {" · "}
                {criteria.find((item)=>item.id===event.criterion_id)?.title ?? "완료 조건"}
                {" · "}{event.recorded_at}
                <p className="section-help">
                  사유: {event.reason} · Builder ID: {event.actor_builder_profile_id}
                </p>
              </li>
            ))}
          </ul>
          <p className="section-help">
            화면에는 최근 30개 이벤트만 표시합니다. 다른 이력의 삭제를 의미하지 않습니다.
          </p>
        </div>
      ) : null}
      <p className="section-help">
        수동 조건의 평가 상태는 EM-3 서버의 해당 승인 버전 검증 결과로만 결정합니다.
        운영 진행률은 EM-4 공개 게이트 통과 전까지 게시하지 않습니다.
      </p>
    </section>
  );
}
