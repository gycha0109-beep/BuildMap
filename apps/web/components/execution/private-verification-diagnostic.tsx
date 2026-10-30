"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  parsePrivateDiagnostic,
  type DiagnosticView,
} from "@/lib/execution/em4c-diagnostic-view";

type CriterionReference = { id: string; title: string; ruleType: string };
type InspectionState = "IDLE" | "LOADING" | "AVAILABLE" | "UNAVAILABLE";

const verdictLabels = {
  MATCHED_NOT_PUBLISHED: "원본 일치 관측 · 공식 완료 아님",
  FAIL: "불일치 관측 · 공식 완료 아님",
  PENDING: "검증 대기 · 공식 완료 아님",
  UNKNOWN: "검증 근거 불명 · 공식 완료 아님",
} as const;

export function PrivateVerificationDiagnostic({
  projectId,
  revisionId,
  criteria,
}: {
  projectId: string;
  revisionId: string;
  criteria: CriterionReference[];
}) {
  const [status, setStatus] = useState<InspectionState>("IDLE");
  const [diagnostic, setDiagnostic] = useState<DiagnosticView | null>(null);
  const [message, setMessage] = useState("");

  async function inspect() {
    if (status === "LOADING") return;
    setStatus("LOADING");
    setDiagnostic(null);
    setMessage("");

    try {
      const url = "/api/projects/" + encodeURIComponent(projectId) +
        "/execution/verification-readiness?revisionId=" + encodeURIComponent(revisionId);
      const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        setMessage(response.status === 401 || response.status === 403
          ? "인증 또는 권한 확인 실패"
          : response.status === 404
            ? "승인된 버전 또는 프로젝트에 접근할 수 없습니다"
            : "현재 원본 검증 서비스를 사용할 수 없습니다");
        setStatus("UNAVAILABLE");
        return;
      }
      const data: unknown = await response.json();
      const parsed = parsePrivateDiagnostic(data, revisionId, criteria.map((row) => row.id));
      if (!parsed) {
        setMessage("검증 응답의 버전·출처·비공개 경계가 일치하지 않습니다");
        setStatus("UNAVAILABLE");
        return;
      }
      setDiagnostic(parsed);
      setStatus("AVAILABLE");
    } catch {
      setMessage("요청 시간 초과 또는 원본 검증 연결 실패");
      setStatus("UNAVAILABLE");
    }
  }

  const lookup = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  return (
    <section className="surface-card stack" aria-label="원본 검증 진단">
      <p className="section-kicker">EM-4C · on-demand private source diagnostics</p>
      <h2>원본 검증 진단 (공식 완료 판정 아님)</h2>
      <p className="section-help">
        이 버튼을 누르면 현재 로그인한 Builder의 승인된 로드맵에 대해
        서버 전용 원본 재조회 진단을 요청합니다. 외부 GitHub 접근 권한 또는
        근거가 부족하면 검증 불가로 표시합니다. 확인 결과는 참고용이며,
        공식 완료 판정이나 진행률은 게시하지 않습니다.
      </p>
      <div className="row">
        <Badge tone="review">공식 완료 상태: UNKNOWN</Badge>
        <Badge>공식 진행률: 미공개</Badge>
        <button type="button" className="button secondary"
          disabled={status === "LOADING"} onClick={() => void inspect()}>
          {status === "LOADING" ? "원본 검증 진단 중…" : "원본 검증 진단 실행"}
        </button>
      </div>
      <div aria-live="polite">
        {status === "IDLE" ? (
          <p className="section-help">진단을 요청하지 않았습니다. 캐시가 완료 증명으로 사용되지 않습니다.</p>
        ) : null}
        {status === "LOADING" ? (
          <p className="section-help">권한과 원본 상태 확인 중입니다. 결과는 공식 진척률에 반영되지 않습니다.</p>
        ) : null}
        {status === "UNAVAILABLE" ? (
          <div className="alert error">원본 검증 진단 불가 — {message}. 공식 상태 UNKNOWN을 유지합니다.</div>
        ) : null}
        {status === "AVAILABLE" && diagnostic ? (
          <div className="stack">
            <p className="section-help">
              진단 정책 {diagnostic.policyVersion} ·
              {diagnostic.kind === "AVAILABLE" ? " 요청 시점 진단 응답 수신" : " 계산 불가"}
              {" · "}원본 재조회 시도 {diagnostic.rechecks}건
              {" · "}공식 완료 상태 UNKNOWN
            </p>
            {diagnostic.unavailableReason ? (
              <p className="section-help">진단 불가 사유 코드: {diagnostic.unavailableReason}</p>
            ) : null}
            {diagnostic.rows.length === 0 ? (
              <p className="section-help">개별 조건에 대한 검증 진단이 없습니다. 완료 여부를 추론하지 않습니다.</p>
            ) : (
              <ul className="compact-list">
                {diagnostic.rows.map((item) => (
                  <li className="compact-item stack" key={item.criterionId}>
                    <strong>{lookup.get(item.criterionId)?.title ?? "승인 조건"}</strong>
                    <p className="section-help">
                      {item.ruleType} · {verdictLabels[item.state]}
                      {" · "}사유: {item.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
