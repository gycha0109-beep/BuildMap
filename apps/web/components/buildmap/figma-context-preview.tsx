"use client";

import { useState } from "react";
import { captureFigmaObservationAction } from "@/app/projects/[projectId]/figma-capture-actions";
import { Badge } from "@/components/ui/badge";

type FigmaReadResponse = {
  fileKey: string;
  resourceType: "file" | "branch";
  title: string;
  editorType: string | null;
  providerVersionId: string | null;
  lastModified: string | null;
  mainFileKey: string | null;
  selectedNodeId: string | null;
  canonicalUrl: string;
  observedAt: string;
  preview:
    | {
        kind: "file";
        pages: Array<{ id: string; name: string; type: string }>;
        truncated: boolean;
      }
    | {
        kind: "node";
        node: {
          id: string;
          name: string;
          type: string;
          childCount: number;
          children: Array<{ id: string; name: string; type: string }>;
          text: string[];
          layout: {
            layoutMode: string | null;
            primaryAxisAlignItems: string | null;
            counterAxisAlignItems: string | null;
            opacity: number | null;
            blendMode: string | null;
          };
        };
        truncated: boolean;
      };
  captureToken: string;
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

export function FigmaContextPreview({ projectId, linkId }: { projectId: string; linkId: string }) {
  const [resource, setResource] = useState<FigmaReadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const captureAction = captureFigmaObservationAction.bind(null, projectId);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/integrations/figma/context?linkId=${encodeURIComponent(linkId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as FigmaReadResponse & ErrorResponse;
      if (!response.ok) {
        setResource(null);
        const retry = payload.error?.retryAfterSeconds;
        setError(
          `${payload.error?.message || "Figma context를 불러오지 못했습니다."}${retry ? ` ${retry}초 후 다시 시도할 수 있습니다.` : ""}`,
        );
        return;
      }
      setResource(payload);
    } catch {
      setResource(null);
      setError("Figma context를 불러오지 못했습니다. BuildMap 데이터는 변경되지 않았습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ marginTop: 14 }}>
      <div className="row">
        <div>
          <strong>Read-only Design Context</strong>
          <p className="section-help" style={{ margin: "4px 0 0" }}>
            Refresh는 exact Figma file/branch와 optional selected node를 제한적으로 읽기만 합니다. Raw file JSON은 저장하지 않습니다.
          </p>
        </div>
        <button className="button secondary" disabled={loading} onClick={refresh} type="button">
          {loading ? "읽는 중..." : "Refresh Figma context"}
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {resource ? (
        <div className="stack">
          <div className="metadata-row">
            <Badge tone="primary">{resource.resourceType === "branch" ? "Branch" : "File"}</Badge>
            {resource.selectedNodeId ? <Badge tone="review">Selected node</Badge> : null}
            {resource.providerVersionId ? <span>Version {resource.providerVersionId}</span> : null}
            {resource.lastModified ? <span>Modified {formatDateTime(resource.lastModified)}</span> : null}
            <span>Observed {formatDateTime(resource.observedAt)}</span>
            <span>preview is ephemeral</span>
          </div>

          <article className="subpanel">
            <h3 style={{ marginBottom: 6 }}>
              <a href={resource.canonicalUrl} rel="noreferrer" target="_blank">
                {resource.title} ↗
              </a>
            </h3>
            <p className="muted" style={{ marginTop: 0 }}>
              File identity · {resource.fileKey}
              {resource.selectedNodeId ? ` · Node ${resource.selectedNodeId}` : ""}
            </p>

            {resource.preview.kind === "file" ? (
              resource.preview.pages.length > 0 ? (
                <div className="stack" style={{ gap: 8 }}>
                  <span className="muted">Bounded page/canvas structure</span>
                  <div className="metadata-row">
                    {resource.preview.pages.map((page) => (
                      <Badge key={page.id}>{page.name}</Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="muted">표시할 page/canvas metadata가 없습니다.</p>
              )
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                <div>
                  <strong>{resource.preview.node.name}</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {resource.preview.node.type} · direct children {resource.preview.node.childCount}
                  </p>
                </div>
                {resource.preview.node.children.length > 0 ? (
                  <div className="metadata-row">
                    {resource.preview.node.children.map((child) => (
                      <Badge key={child.id}>{child.name} · {child.type}</Badge>
                    ))}
                  </div>
                ) : null}
                {resource.preview.node.text.length > 0 ? (
                  <div className="subpanel">
                    <span className="muted">Bounded text excerpts</span>
                    <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                      {resource.preview.node.text.join("\n")}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {resource.preview.truncated ? (
              <p className="section-help" style={{ marginTop: 12, marginBottom: 0 }}>
                Bounded read 한도까지만 표시했습니다. 전체 design file mirror나 recursive raw dump는 수행하지 않습니다.
              </p>
            ) : null}

            <div className="row" style={{ marginTop: 14 }}>
              <span className="muted">
                Capture 시 서버가 exact source를 다시 읽고 방금 본 bounded observation hash와 동일한 경우에만 private provenance를 저장합니다.
              </span>
              <form action={captureAction}>
                <input name="linkId" type="hidden" value={linkId} />
                <input name="captureToken" type="hidden" value={resource.captureToken} />
                <button className="button" type="submit">Capture as evidence</button>
              </form>
            </div>
          </article>

          <p className="section-help" style={{ marginBottom: 0 }}>
            Refresh 자체는 Rough Note나 Decision을 만들지 않습니다. Capture 이후에도 AI Candidate와 Builder Review가 필요하며 공식 Decision은 자동 생성되지 않습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
