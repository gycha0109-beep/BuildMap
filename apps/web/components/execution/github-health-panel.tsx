"use client";

import { useState } from "react";
import type { InstallationDiagnostic } from "@/lib/execution/github-installation-diagnostic";
import type { GitHubSourceHealth } from "@/lib/execution/github-source-health";

type Source = { id: string; repository_name: string; source_id: string };
type Link = { id: string; label: string; url: string };
type Health =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; code: string }
  | { state: "ready"; providerState: string; diagnostic: InstallationDiagnostic; sourceHealth: GitHubSourceHealth | null };

const scopeLabels: Record<string, string> = {
  checks: "Check Runs",
  actions: "Actions workflows",
  deployments: "Deployments",
  issues: "Issues",
};

export function ExecutionGitHubHealthPanel({
  projectId,
  links,
  sources,
}: {
  projectId: string;
  links: Link[];
  sources: Source[];
}) {
  const [linkId, setLinkId] = useState(links[0]?.id ?? "");
  const [evidenceId, setEvidenceId] = useState("");
  const [health, setHealth] = useState<Health>({ state: "idle" });
  const selected = links.find((link) => link.id === linkId);
  const matchingSources = sources.filter((source) =>
    selected && selected.url.toLowerCase() ===
      `https://github.com/${source.repository_name}`.toLowerCase());

  async function inspect() {
    if (!linkId) return;
    setHealth({ state: "loading" });
    try {
      const params = new URLSearchParams({ linkId });
      if (evidenceId) params.set("evidenceId", evidenceId);
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/execution/evidence-health?${params}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const value = await response.json();
      if (!response.ok) {
        setHealth({ state: "error", code: value?.error?.code ?? value?.reason ?? "unknown" });
        return;
      }
      setHealth({
        state: "ready", providerState: value.providerState,
        diagnostic: value.diagnostic, sourceHealth: value.sourceHealth ?? null,
      });
    } catch {
      setHealth({ state: "error", code: "diagnostic_network_unavailable" });
    }
  }

  return (
    <section className="surface-card stack">
      <p className="section-kicker">Execution Map · EM-2C</p>
      <h2>GitHub App 권한 및 출처 상태 진단</h2>
      <p className="section-help">
        연결된 GitHub App 설치 정보를 실시간 읽기 전용으로 확인합니다.
        설치에 허용된 읽기 권한과 현재 발급되는 제한된 토큰의 권한은 서로 다릅니다.
        진단은 완료 조건 PASS나 배포 성공 판정이 아닙니다.
      </p>
      {links.length === 0 ? (
        <div className="empty-state">
          <span>연결된 GitHub 프로젝트 링크가 없어 실시간 진단을 실행할 수 없습니다.</span>
        </div>
      ) : (
        <div className="stack">
          <label className="field">
            <span>GitHub 프로젝트 연결</span>
            <select value={linkId} onChange={(event) => {
              setLinkId(event.target.value);
              setEvidenceId("");
              setHealth({ state: "idle" });
            }}>
              {links.map((link) => (
                <option key={link.id} value={link.id}>{link.label || link.url}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>개별 출처 현재 상태 확인 (선택)</span>
            <select value={evidenceId} onChange={(event) => {
              setEvidenceId(event.target.value);
              setHealth({ state: "idle" });
            }}>
              <option value="">설치·저장소 권한만 진단</option>
              {matchingSources.map((source) => (
                <option key={source.id} value={source.id}>{source.source_id}</option>
              ))}
            </select>
          </label>
          <button className="button" type="button" onClick={inspect}
            disabled={health.state === "loading"}>
            {health.state === "loading" ? "실제 GitHub 확인 중…" : "설치·출처 실시간 진단"}
          </button>
        </div>
      )}
      {health.state === "error" ? (
        <div className="alert error" aria-live="polite">
          실시간 진단 미확인: {health.code}. 출처 상태는 UNKNOWN입니다.
        </div>
      ) : null}
      {health.state === "ready" ? (
        <div className="stack" aria-live="polite">
          <strong>{health.diagnostic.repository}</strong>
          <p className="section-help">
            현재 GitHub App 설치·저장소 일치: {health.diagnostic.installationIdentity} /
            {" "}{health.diagnostic.repositoryIdentity} · 조회: {health.diagnostic.checkedAt}
          </p>
          <p className="section-help">
            현재 발급하는 토큰: {health.diagnostic.activeTokenScopes.join(", ")}
            {" "}· 추가 API 호출 권한 실험: 미실시
          </p>
          <ul className="compact-list">
            {Object.entries(health.diagnostic.scopes).map(([scope, status]) => (
              <li key={scope}>
                <strong>{scopeLabels[scope] ?? scope}</strong>: {status === "READ_GRANTED_BUT_TOKEN_NOT_REQUESTED"
                  ? "설치에 읽기 권한 존재 · 현재 토큰에는 미요청"
                  : status === "NOT_GRANTED" ? "설치 권한 없음" : "UNKNOWN"}
              </li>
            ))}
          </ul>
          {health.sourceHealth ? (
            <div className="stack">
              <h3>선택한 출처의 현재 상태</h3>
              <p className="section-help">
                {health.sourceHealth.sourceId}: {health.sourceHealth.sourceState}
                {health.sourceHealth.reason ? ` · ${health.sourceHealth.reason}` : ""}
                {health.sourceHealth.currentSha ? ` · 현재 SHA: ${health.sourceHealth.currentSha}` : ""}
              </p>
            </div>
          ) : null}
          <p className="section-help">
            실제 출처 일치 여부는 관측 시점에만 유효합니다. 현재 권한 진단과 SHA 재조회 결과만으로
            마일스톤을 완료 처리하거나 진행률을 산정하지 않습니다.
          </p>
        </div>
      ) : null}
    </section>
  );
}
