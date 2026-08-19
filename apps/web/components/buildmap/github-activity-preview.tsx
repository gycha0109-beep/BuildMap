"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type Observation = {
  sourceType: "merged_pull_request" | "release";
  sourceId: string;
  title: string;
  summary: string | null;
  url: string;
  occurredAt: string;
  context: string | null;
};

type ActivityResponse = {
  repository: string;
  observedAt: string;
  observations: Observation[];
};

type ErrorResponse = {
  error?: { code?: string; message?: string };
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GitHubActivityPreview({
  projectId,
  linkId,
}: {
  projectId: string;
  linkId: string;
}) {
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/integrations/github/activity?linkId=${encodeURIComponent(linkId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ActivityResponse & ErrorResponse;
      if (!response.ok) {
        setActivity(null);
        setError(payload.error?.message || "GitHub activity를 불러오지 못했습니다.");
        return;
      }
      setActivity(payload);
    } catch {
      setActivity(null);
      setError("GitHub activity를 불러오지 못했습니다. BuildMap 데이터는 변경되지 않았습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ marginTop: 14 }}>
      <div className="row">
        <div>
          <strong>Read-only Build History</strong>
          <p className="section-help" style={{ margin: "4px 0 0" }}>
            버튼을 누를 때만 merged PR과 Release를 GitHub에서 읽습니다. 결과는 DB에 저장하지 않습니다.
          </p>
        </div>
        <button className="button secondary" disabled={loading} onClick={refresh} type="button">
          {loading ? "읽는 중..." : "Refresh GitHub activity"}
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {activity ? (
        <div className="stack">
          <div className="metadata-row">
            <span>{activity.repository}</span>
            <span>Observed {formatDateTime(activity.observedAt)}</span>
            <span>ephemeral · not persisted</span>
          </div>

          {activity.observations.length === 0 ? (
            <div className="empty-state">
              <strong>최근 merged PR 또는 Release가 없습니다.</strong>
              <span>Commit 전체 스트림은 Phase 45 기본 intake에 포함하지 않습니다.</span>
            </div>
          ) : (
            activity.observations.map((observation) => (
              <article className="subpanel" key={`${observation.sourceType}:${observation.sourceId}`}>
                <div className="metadata-row" style={{ marginBottom: 8 }}>
                  <Badge tone={observation.sourceType === "release" ? "success" : "primary"}>
                    {observation.sourceType === "release" ? "Release" : "Merged PR"}
                  </Badge>
                  {observation.context ? <span>{observation.context}</span> : null}
                  <span>{formatDateTime(observation.occurredAt)}</span>
                </div>
                <h3 style={{ marginBottom: 6 }}>
                  <a href={observation.url} rel="noreferrer" target="_blank">
                    {observation.title} ↗
                  </a>
                </h3>
                {observation.summary ? <p style={{ marginBottom: 0 }}>{observation.summary}</p> : null}
              </article>
            ))
          )}

          <p className="section-help" style={{ marginBottom: 0 }}>
            이 목록은 GitHub observation일 뿐이며 Capture·Decision을 자동 생성하지 않습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
