"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type PagePreview = {
  kind: "page";
  text: string;
  topLevelBlocksRead: number;
  truncated: boolean;
};

type DatabasePreview = {
  kind: "database";
  dataSources: Array<{ id: string; name: string }>;
  truncated: boolean;
};

type NotionReadResponse = {
  resourceId: string;
  objectType: "page" | "database";
  title: string;
  canonicalUrl: string;
  workspaceLabel: string | null;
  lastEditedTime: string | null;
  observedAt: string;
  preview: PagePreview | DatabasePreview;
};

type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
  };
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotionResourcePreview({
  projectId,
  linkId,
}: {
  projectId: string;
  linkId: string;
}) {
  const [resource, setResource] = useState<NotionReadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/integrations/notion/resource?linkId=${encodeURIComponent(linkId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as NotionReadResponse & ErrorResponse;
      if (!response.ok) {
        setResource(null);
        const retry = payload.error?.retryAfterSeconds;
        setError(
          `${payload.error?.message || "Notion context를 불러오지 못했습니다."}${retry ? ` ${retry}초 후 다시 시도할 수 있습니다.` : ""}`,
        );
        return;
      }
      setResource(payload);
    } catch {
      setResource(null);
      setError("Notion context를 불러오지 못했습니다. BuildMap 데이터는 변경되지 않았습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ marginTop: 14 }}>
      <div className="row">
        <div>
          <strong>Read-only Knowledge Context</strong>
          <p className="section-help" style={{ margin: "4px 0 0" }}>
            Refresh는 이 Project Link가 가리키는 exact Notion resource의 현재 상태만 제한적으로 읽습니다. 결과는 저장되지 않습니다.
          </p>
        </div>
        <button className="button secondary" disabled={loading} onClick={refresh} type="button">
          {loading ? "읽는 중..." : "Refresh Notion context"}
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {resource ? (
        <div className="stack">
          <div className="metadata-row">
            <Badge tone="review">{resource.objectType === "page" ? "Page" : "Database"}</Badge>
            {resource.lastEditedTime ? (
              <span>Last edited {formatDateTime(resource.lastEditedTime)}</span>
            ) : null}
            <span>Observed {formatDateTime(resource.observedAt)}</span>
            <span>preview is ephemeral</span>
          </div>

          <article className="subpanel">
            <h3 style={{ marginBottom: 6 }}>
              <a href={resource.canonicalUrl} rel="noreferrer" target="_blank">
                {resource.title} ↗
              </a>
            </h3>

            {resource.preview.kind === "page" ? (
              resource.preview.text ? (
                <p style={{ whiteSpace: "pre-wrap" }}>{resource.preview.text}</p>
              ) : (
                <p className="muted">상위 block 범위에서 표시할 텍스트를 찾지 못했습니다.</p>
              )
            ) : resource.preview.dataSources.length > 0 ? (
              <div className="stack" style={{ gap: 8 }}>
                <span className="muted">Database container의 child data source</span>
                <div className="metadata-row">
                  {resource.preview.dataSources.map((dataSource) => (
                    <Badge key={dataSource.id}>{dataSource.name}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted">이 database에서 표시할 child data source metadata가 없습니다.</p>
            )}

            {resource.preview.truncated ? (
              <p className="section-help" style={{ marginTop: 12, marginBottom: 0 }}>
                Phase 48 bounded read 한도까지만 표시했습니다. 재귀 page tree나 전체 database row는 읽지 않습니다.
              </p>
            ) : null}
          </article>

          <p className="section-help" style={{ marginBottom: 0 }}>
            Refresh는 Rough Note, AI Draft, Capture provenance, Change Card, Decision 또는 Current Direction을 만들거나 변경하지 않습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
