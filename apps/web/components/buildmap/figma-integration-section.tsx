import { FigmaContextPreview } from "@/components/buildmap/figma-context-preview";
import { FigmaIntegrationNotice } from "@/components/buildmap/figma-integration-notice";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
import {
  isFigmaOAuthConfigured,
  verifyFigmaBindingProof,
} from "@/lib/figma/oauth";
import { parseCanonicalFigmaResourceUrl } from "@/lib/figma/resource";
import { createClient } from "@/lib/supabase/server";
import {
  beginFigmaReadConnectionAction,
  disconnectFigmaReadConnectionAction,
} from "@/app/projects/[projectId]/figma-integration-actions";
import {
  addFigmaResourceAction,
  removeFigmaResourceAction,
  setFigmaResourceVisibilityAction,
} from "@/app/projects/[projectId]/integration-actions";

type ProviderLink = {
  id: string;
  label: string;
  url: string;
  visibility_status: string;
  created_at: string;
};

type FigmaBinding = {
  id: string;
  project_link_id: string;
  external_connection_id: string;
  external_resource_id: string;
  external_resource_type: string | null;
  external_resource_label: string;
  binding_proof: string;
  status: string;
  created_at: string;
};

export async function FigmaIntegrationSection({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const figmaOAuthConfigured = isFigmaOAuthConfigured();
  const [figmaLinks, figmaBindings] = await Promise.all([
    supabase
      .from("project_links")
      .select("id, label, url, visibility_status, created_at")
      .eq("project_id", projectId)
      .eq("link_type", "figma")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("integration_bindings")
      .select(
        "id, project_link_id, external_connection_id, external_resource_id, external_resource_type, external_resource_label, binding_proof, status, created_at",
      )
      .eq("provider", "figma")
      .eq("status", "active")
      .is("archived_at", null),
  ]);

  const figmaRows = (figmaLinks.data ?? []) as ProviderLink[];
  const figmaBindingRows = (figmaBindings.data ?? []) as FigmaBinding[];
  const figmaLinkById = new Map(figmaRows.map((link) => [link.id, link]));
  const validFigmaBindings = new Map<string, FigmaBinding>();
  const invalidFigmaBindingIds = new Set<string>();

  for (const binding of figmaBindingRows) {
    const link = figmaLinkById.get(binding.project_link_id);
    const resource = link ? parseCanonicalFigmaResourceUrl(link.url) : null;
    const resourceType = binding.external_resource_type;
    let proofValid = false;
    if (
      figmaOAuthConfigured &&
      resource &&
      (resourceType === "file" || resourceType === "branch") &&
      binding.external_resource_id === resource.fileKey
    ) {
      try {
        proofValid = verifyFigmaBindingProof(
          {
            projectLinkId: binding.project_link_id,
            figmaUserId: binding.external_connection_id,
            resourceId: binding.external_resource_id,
            resourceType,
            nodeId: resource.nodeId,
          },
          binding.binding_proof,
        );
      } catch {
        proofValid = false;
      }
    }

    if (proofValid) {
      validFigmaBindings.set(binding.project_link_id, binding);
    } else if (figmaOAuthConfigured) {
      invalidFigmaBindingIds.add(binding.project_link_id);
    }
  }

  const addFigmaResource = addFigmaResourceAction.bind(null, projectId);
  const setFigmaVisibility = setFigmaResourceVisibilityAction.bind(null, projectId);
  const removeFigmaResource = removeFigmaResourceAction.bind(null, projectId);
  const beginFigmaReadConnection = beginFigmaReadConnectionAction.bind(null, projectId);
  const disconnectFigmaReadConnection = disconnectFigmaReadConnectionAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <FigmaIntegrationNotice />

      {figmaLinks.error ? (
        <div className="alert error">Figma pointer 상태를 불러오지 못했습니다.</div>
      ) : null}
      {figmaBindings.error ? (
        <div className="alert error">Figma read binding 상태를 불러오지 못했습니다.</div>
      ) : null}

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Figma · Design Context</p>
            <h2>Exact file / optional node pointer 추가</h2>
            <p className="section-help">
              Figma file URL 또는 특정 node가 선택된 Copy link URL을 저장합니다. Pointer 저장은 위치만 기록하며 OAuth read authorization을 생성하지 않습니다.
            </p>
          </div>
          <div className="header-actions">
            <Badge tone="primary">Figma {figmaRows.length}</Badge>
            {figmaOAuthConfigured ? <Badge tone="success">OAuth read ready</Badge> : <Badge>Read config missing</Badge>}
          </div>
        </div>

        <form action={addFigmaResource} className="stack">
          <label className="field">
            <span>Figma file / selected node URL</span>
            <input
              name="resourceUrl"
              placeholder="https://www.figma.com/design/FILE_KEY/Name?node-id=123-456"
              required
              type="url"
            />
          </label>

          <div className="form-grid-2">
            <label className="field">
              <span>표시 이름 · 선택</span>
              <input maxLength={120} name="label" placeholder="Design context" />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select defaultValue="internal" name="visibility">
                <option value="internal">Internal only</option>
                <option value="public">Public Map에 pointer 표시</option>
              </select>
            </label>
          </div>

          <div className="save-row row">
            <button className="button" type="submit">Figma pointer 저장</button>
            <span className="muted">
              Public은 URL/label pointer만 의미합니다. OAuth token, verified binding, preview 내용, observation fingerprint는 공개하지 않습니다.
            </span>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Figma resources</p>
            <h2>현재 Design Context 연결</h2>
          </div>
          <Badge tone="primary">{figmaRows.length}</Badge>
        </div>

        {figmaRows.length === 0 ? (
          <div className="empty-state">
            <strong>연결된 Figma pointer가 없습니다.</strong>
            <span>Decision에 의미 있는 exact file 또는 selected node만 먼저 연결합니다.</span>
          </div>
        ) : (
          <div className="stack">
            {figmaRows.map((link) => {
              const isPublic = link.visibility_status === "public";
              const binding = validFigmaBindings.get(link.id);
              const bindingInvalid = invalidFigmaBindingIds.has(link.id);
              const activeBindingExists = figmaBindingRows.some(
                (row) => row.project_link_id === link.id,
              );
              const pointer = parseCanonicalFigmaResourceUrl(link.url);

              return (
                <article className="subpanel" key={link.id}>
                  <div className="section-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="metadata-row" style={{ marginBottom: 8 }}>
                        <Badge tone="primary">Figma</Badge>
                        {pointer?.nodeId ? <Badge tone="review">Node pointer</Badge> : <Badge>File pointer</Badge>}
                        {isPublic ? <Badge tone="success">Public pointer</Badge> : <Badge>Internal pointer</Badge>}
                        {binding ? <Badge tone="success">Read connected</Badge> : null}
                        {bindingInvalid ? <Badge tone="review">Reconnect required</Badge> : null}
                        {!figmaOAuthConfigured && activeBindingExists ? <Badge>Read config missing</Badge> : null}
                        <span>Linked {formatDateTime(link.created_at)}</span>
                      </div>
                      <h3 style={{ marginBottom: 6 }}>{link.label}</h3>
                      <a href={link.url} rel="noreferrer" target="_blank">{link.url} ↗</a>
                    </div>
                    <div className="header-actions">
                      <form action={setFigmaVisibility}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <input name="visibility" type="hidden" value={isPublic ? "internal" : "public"} />
                        <button className="button secondary" type="submit">
                          {isPublic ? "Internal로 전환" : "Public Map에 표시"}
                        </button>
                      </form>
                      <form action={removeFigmaResource}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <button className="button secondary" disabled={activeBindingExists} type="submit">
                          {activeBindingExists ? "Read access 먼저 해제" : "Pointer 제거"}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="subpanel" style={{ marginTop: 14 }}>
                    <div className="row">
                      <div>
                        <strong>Figma OAuth read authorization</strong>
                        <p className="section-help" style={{ margin: "4px 0 0" }}>
                          `file_metadata:read` + `file_content:read`만 요청합니다. Project/team listing, comments/write, version-history listing, webhook 권한은 요청하지 않습니다.
                        </p>
                        {binding ? (
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            Verified {binding.external_resource_type === "branch" ? "branch" : "file"} · {binding.external_resource_label}
                          </p>
                        ) : null}
                      </div>
                      <div className="header-actions">
                        {activeBindingExists ? (
                          <form action={disconnectFigmaReadConnection}>
                            <input name="linkId" type="hidden" value={link.id} />
                            <button className="button secondary" type="submit">Read access 해제</button>
                          </form>
                        ) : null}
                        {!binding ? (
                          <form action={beginFigmaReadConnection}>
                            <input name="linkId" type="hidden" value={link.id} />
                            <button className="button" disabled={!figmaOAuthConfigured} type="submit">
                              {bindingInvalid ? "Figma 다시 연결" : "Connect Figma read access"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    {binding ? (
                      <FigmaContextPreview projectId={projectId} linkId={link.id} />
                    ) : bindingInvalid ? (
                      <div className="alert" style={{ marginTop: 14 }}>
                        저장된 Figma binding이 현재 Project pointer와 exact file/node 무결성 검증을 통과하지 못했습니다. read access를 해제하거나 다시 연결해 주세요.
                      </div>
                    ) : !figmaOAuthConfigured ? (
                      <div className="alert" style={{ marginTop: 14 }}>
                        서버에 Figma OAuth client credentials, signed-state secret, AES-256-GCM credential key를 구성하면 exact read authorization을 활성화할 수 있습니다.
                      </div>
                    ) : (
                      <div className="alert" style={{ marginTop: 14 }}>
                        Pointer만 저장된 상태입니다. Figma OAuth를 별도로 완료해야 BuildMap이 exact file/node를 읽을 수 있습니다.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="surface-card">
        <p className="section-kicker">Figma authority boundary</p>
        <h2>Design Context도 Decision authority가 아닙니다.</h2>
        <p className="section-help" style={{ marginBottom: 0 }}>
          Figma pointer, OAuth credential, verified association, bounded observation, explicit Capture, official Decision은 서로 다른 authority입니다. Refresh는 ephemeral이며 Builder가 `Capture as evidence`를 누른 뒤에도 AI Candidate → Builder Review → explicit approval을 거쳐야만 공식 Decision이 됩니다.
        </p>
      </section>
    </div>
  );
}
