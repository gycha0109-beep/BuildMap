"use client";

import { useState } from "react";
import type { GitHubEvidencePreview } from "@/lib/execution/github-evidence";

type SourceLink = { id: string; label: string; url: string };
type LoadState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; code: string }
  | { state: "ready"; preview: GitHubEvidencePreview };

export function GitHubEvidencePreviewPanel({
  projectId,
  links,
}: {
  projectId: string;
  links: SourceLink[];
}) {
  const [linkId, setLinkId] = useState(links[0]?.id ?? "");
  const [load, setLoad] = useState<LoadState>({ state: "idle" });

  async function refresh() {
    if (!linkId) return;
    setLoad({ state: "loading" });
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/execution/evidence-preview?linkId=${encodeURIComponent(linkId)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const result = await response.json();
      if (!response.ok) {
        setLoad({ state: "error", code: result?.error?.code ?? "unknown" });
        return;
      }
      setLoad({ state: "ready", preview: result as GitHubEvidencePreview });
    } catch {
      setLoad({ state: "error", code: "network_unavailable" });
    }
  }

  const observed = load.state === "ready" ? load.preview : null;
  return (
    <section className="surface-card stack">
      <div className="section-head">
        <div>
          <p className="section-kicker">Execution Map · EM-2A</p>
          <h2>GitHub 증거 관측 미리보기</h2>
          <p className="section-help">
            이 화면은 읽기 전용 임시 관측입니다. DB에 저장하지 않으며 완료 조건 PASS나 진행률을 계산하지 않습니다.
          </p>
        </div>
      </div>

      {links.length ? (
        <div className="row">
          <label className="field">
            <span>연결된 GitHub 저장소</span>
            <select value={linkId} onChange={(event) => {
              setLinkId(event.target.value);
              setLoad({ state: "idle" });
            }}>
              {links.map((link) => (
                <option key={link.id} value={link.id}>{link.label || link.url}</option>
              ))}
            </select>
          </label>
          <button type="button" className="button" onClick={refresh} disabled={load.state === "loading"}>
            {load.state === "loading" ? "관측 중…" : "GitHub 새로고침"}
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <strong>GitHub 프로젝트 링크가 없습니다.</strong>
          <span>Integrations에서 GitHub 저장소 링크를 추가하고 연결한 다음 다시 확인해 주세요.</span>
        </div>
      )}

      {load.state === "error" ? (
        <div className="alert error">
          증거를 확인하지 못했습니다 ({load.code}). 권한·연결·네트워크 문제는 UNKNOWN으로 처리합니다.
        </div>
      ) : null}

      {observed ? (
        <div className="stack" aria-live="polite">
          <div className="row">
            <strong>{observed.repository}</strong>
            <span className="muted">관측 시점: {observed.observedAt}</span>
          </div>
          <p className="section-help">
            최근 갱신된 종료 PR 최대 30개에서 병합 후보 최대 10개와 릴리스 최대 10개만 읽었습니다.
            전체 히스토리나 증거 수집 완료를 의미하지 않습니다.
          </p>
          <h3>현재 권한·검증 범위</h3>
          <ul className="compact-list">
            {Object.entries(observed.capabilities).map(([name, capability]) => (
              <li key={name}>
                <strong>{name}</strong>: {capability.status === "OBSERVED" ? "관측 지원" : "UNKNOWN"}
                {capability.reason ? ` · ${capability.reason}` : ""}
              </li>
            ))}
          </ul>
          <h3>관측된 GitHub 참조 ({observed.evidence.length})</h3>
          {observed.evidence.length ? (
            <ul className="compact-list">
              {observed.evidence.map((item) => (
                <li className="compact-item" key={`${item.sourceType}:${item.sourceId}`}>
                  <div className="stack">
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <strong>{item.title}</strong>
                    </a>
                    <p className="section-help">
                      {item.sourceType === "merged_pull_request" ? "병합 PR" : "릴리스 참조"} ·
                      {item.sourceState === "SOURCE_CONFIRMED" ? " GitHub 원본 정보 확인" : " UNKNOWN"}
                      {item.sourceSha ? ` · merge SHA: ${item.sourceSha}` : ""}
                      {item.reason ? ` · ${item.reason}` : ""}
                    </p>
                    <p className="section-help">이 자료만으로 마일스톤이 완료되었다고 판정하지 않습니다.</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <span>관측 범위 내 병합 PR과 릴리스가 없습니다. 증거 부재는 작업 미완료를 의미하지 않습니다.</span>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
