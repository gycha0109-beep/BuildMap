import { GitHubActivityPreview } from "@/components/buildmap/github-activity-preview";
import { NotionResourcePreview } from "@/components/buildmap/notion-resource-preview";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
import {
  isGitHubAppConfigured,
  verifyGitHubBindingProof,
} from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import {
  isNotionOAuthConfigured,
  verifyNotionBindingProof,
} from "@/lib/notion/oauth";
import { parseCanonicalNotionResourceUrl } from "@/lib/notion/resource";
import { createClient } from "@/lib/supabase/server";
import { captureGitHubObservationAction } from "../github-capture-actions";
import {
  beginGitHubReadConnectionAction,
  disconnectGitHubReadConnectionAction,
} from "../github-integration-actions";
import {
  addGitHubRepositoryAction,
  addNotionResourceAction,
  removeGitHubRepositoryAction,
  removeNotionResourceAction,
  setGitHubRepositoryVisibilityAction,
  setNotionResourceVisibilityAction,
} from "../integration-actions";
import {
  beginNotionReadConnectionAction,
  disconnectNotionReadConnectionAction,
} from "../notion-integration-actions";

type ProviderLink = {
  id: string;
  label: string;
  url: string;
  visibility_status: string;
  created_at: string;
};

type GitHubBinding = {
  id: string;
  project_link_id: string;
  external_connection_id: string;
  external_resource_id: string;
  external_resource_label: string;
  binding_proof: string;
  status: string;
  created_at: string;
};

type NotionBinding = {
  id: string;
  project_link_id: string;
  external_connection_id: string;
  external_account_id: string | null;
  external_account_label: string | null;
  external_resource_id: string;
  external_resource_type: string | null;
  external_resource_label: string;
  binding_proof: string;
  status: string;
  created_at: string;
};

function compactUuid(value: string) {
  return value.replaceAll("-", "").toLowerCase();
}

const errorMessages: Record<string, string> = {
  "invalid-github-repository": "GitHub repository URL과 공개 설정을 확인해 주세요.",
  "github-link-save": "GitHub repository 연결을 저장하지 못했습니다.",
  "github-link-update": "GitHub repository 공개 설정을 변경하지 못했습니다.",
  "github-link-remove": "GitHub repository 연결을 제거하지 못했습니다.",
  "github-app-not-configured": "서버의 GitHub App 설정이 아직 완료되지 않았습니다.",
  "github-read-link-invalid": "GitHub read access를 연결할 repository pointer를 확인해 주세요.",
  "github-read-disconnect": "GitHub read access 연결을 해제하지 못했습니다.",
  "github-install-invalid": "GitHub App installation 응답이 올바르지 않습니다.",
  "github-install-state": "GitHub App installation state를 검증하지 못했습니다. 다시 연결해 주세요.",
  "github-install-user": "GitHub App installation을 시작한 BuildMap 사용자와 현재 사용자가 다릅니다.",
  "github-oauth-state": "GitHub authorization state를 검증하지 못했습니다. 다시 연결해 주세요.",
  "github-oauth-denied": "GitHub authorization이 취소되었습니다.",
  "github-oauth-user": "GitHub authorization을 시작한 BuildMap 사용자와 현재 사용자가 다릅니다.",
  "github-repository-not-authorized": "설치한 GitHub App이 이 repository에 접근할 수 없습니다.",
  "github-binding-save": "검증된 GitHub read binding을 저장하지 못했습니다.",
  "github-authorization-invalid": "GitHub authorization을 검증하지 못했습니다. 다시 연결해 주세요.",
  "github-provider-unavailable": "GitHub 응답을 확인하지 못했습니다. BuildMap 데이터는 변경되지 않았습니다.",
  "github-observation-invalid": "선택한 GitHub observation identity가 올바르지 않습니다.",
  "github-observation-read-access": "이 repository의 검증된 GitHub read access가 필요합니다.",
  "github-observation-unavailable": "선택한 PR/Release를 GitHub에서 다시 검증하지 못했습니다. BuildMap 데이터는 변경되지 않았습니다.",
  "github-observation-too-large": "선택한 GitHub observation이 Capture 허용 크기를 초과했습니다.",
  "github-capture-create": "GitHub observation을 private Capture로 보존하지 못했습니다.",
  "github-capture-source": "GitHub source provenance를 보존하지 못했습니다. Capture는 완료 처리되지 않았습니다.",
  "invalid-notion-resource": "Notion page/database URL과 공개 설정을 확인해 주세요.",
  "notion-link-save": "Notion resource pointer를 저장하지 못했습니다.",
  "notion-link-update": "Notion resource 공개 설정을 변경하지 못했습니다.",
  "notion-link-remove": "Notion resource pointer를 제거하지 못했습니다.",
  "notion-link-read-connected": "Notion read access를 먼저 해제한 뒤 pointer를 제거해 주세요.",
  "notion-oauth-not-configured": "서버의 Notion OAuth/read 설정이 아직 완료되지 않았습니다.",
  "notion-oauth-config-invalid": "Notion OAuth 보안 설정을 사용할 수 없습니다. 서버 설정을 확인해 주세요.",
  "notion-read-link-invalid": "Notion read access를 연결할 resource pointer를 확인해 주세요.",
  "notion-oauth-state": "Notion authorization state를 검증하지 못했습니다. 다시 연결해 주세요.",
  "notion-oauth-denied": "Notion authorization이 취소되었습니다.",
  "notion-oauth-user": "Notion authorization을 시작한 BuildMap 사용자와 현재 사용자가 다릅니다.",
  "notion-resource-not-authorized": "선택한 Notion authorization으로 이 exact Project resource를 읽을 수 없습니다.",
  "notion-resource-type-unsupported": "이 pointer는 data source를 가리킵니다. Phase 48에서는 Project root page 또는 database를 연결해 주세요.",
  "notion-binding-save": "검증된 Notion read authorization을 안전하게 저장하지 못했습니다.",
  "notion-authorization-invalid": "Notion authorization을 검증하지 못했습니다. 다시 연결해 주세요.",
  "notion-rate-limited": "Notion이 이 connection을 일시적으로 rate limit하고 있습니다. 잠시 후 다시 시도해 주세요.",
  "notion-provider-unavailable": "Notion 응답을 확인하지 못했습니다. BuildMap core 데이터는 변경되지 않았습니다.",
  "notion-read-disconnect": "Notion read access의 로컬 credential을 비활성화하지 못했습니다.",
};

const successMessages: Record<string, string> = {
  "github-linked": "GitHub repository 연결을 저장했습니다.",
  "github-visibility": "GitHub repository 공개 설정을 변경했습니다.",
  "github-removed": "GitHub repository 연결을 제거했습니다.",
  "github-read-connected": "GitHub App read access를 검증하고 연결했습니다.",
  "github-read-disconnected": "GitHub App read access 연결을 해제했습니다.",
  "notion-linked": "Notion resource pointer를 저장했습니다.",
  "notion-visibility": "Notion resource 공개 설정을 변경했습니다.",
  "notion-removed": "Notion resource pointer를 제거했습니다.",
  "notion-read-connected": "Notion read authorization과 exact resource access를 검증하고 연결했습니다.",
  "notion-read-disconnected": "이 pointer의 Notion read access를 해제했습니다.",
  "notion-read-disconnected-local": "로컬 Notion read authorization은 즉시 비활성화했습니다. 마지막 authorization의 provider revoke 확인은 완료하지 못했습니다.",
};

export default async function ProjectIntegrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const githubAppConfigured = isGitHubAppConfigured();
  const notionOAuthConfigured = isNotionOAuthConfigured();

  const [githubLinks, notionLinks, githubBindings, notionBindings, figmaLinks] = await Promise.all([
    supabase
      .from("project_links")
      .select("id, label, url, visibility_status, created_at")
      .eq("project_id", projectId)
      .eq("link_type", "github")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_links")
      .select("id, label, url, visibility_status, created_at")
      .eq("project_id", projectId)
      .eq("link_type", "notion")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("integration_bindings")
      .select(
        "id, project_link_id, external_connection_id, external_resource_id, external_resource_label, binding_proof, status, created_at",
      )
      .eq("provider", "github")
      .eq("status", "active")
      .is("archived_at", null),
    supabase
      .from("integration_bindings")
      .select(
        "id, project_link_id, external_connection_id, external_account_id, external_account_label, external_resource_id, external_resource_type, external_resource_label, binding_proof, status, created_at",
      )
      .eq("provider", "notion")
      .eq("status", "active")
      .is("archived_at", null),
    supabase
      .from("project_links")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("link_type", "figma")
      .is("archived_at", null),
  ]);

  const githubRows = (githubLinks.data ?? []) as ProviderLink[];
  const notionRows = (notionLinks.data ?? []) as ProviderLink[];
  const figmaCount = figmaLinks.count ?? 0;
  const githubBindingRows = (githubBindings.data ?? []) as GitHubBinding[];
  const notionBindingRows = (notionBindings.data ?? []) as NotionBinding[];
  const githubLinkById = new Map(githubRows.map((link) => [link.id, link]));
  const notionLinkById = new Map(notionRows.map((link) => [link.id, link]));
  const validGitHubBindings = new Map<string, GitHubBinding>();
  const invalidGitHubBindingIds = new Set<string>();
  const validNotionBindings = new Map<string, NotionBinding>();
  const invalidNotionBindingIds = new Set<string>();

  if (githubAppConfigured) {
    for (const binding of githubBindingRows) {
      const link = githubLinkById.get(binding.project_link_id);
      const repository = link ? parseCanonicalGitHubRepositoryUrl(link.url) : null;
      const valid =
        Boolean(repository) &&
        binding.external_resource_label.toLowerCase() === repository?.fullName.toLowerCase() &&
        verifyGitHubBindingProof(
          {
            projectLinkId: binding.project_link_id,
            installationId: binding.external_connection_id,
            repositoryId: binding.external_resource_id,
            fullName: repository?.fullName ?? "",
          },
          binding.binding_proof,
        );
      if (valid) {
        validGitHubBindings.set(binding.project_link_id, binding);
      } else {
        invalidGitHubBindingIds.add(binding.project_link_id);
      }
    }
  }

  for (const binding of notionBindingRows) {
    const link = notionLinkById.get(binding.project_link_id);
    const resource = link ? parseCanonicalNotionResourceUrl(link.url) : null;
    const resourceType = binding.external_resource_type;
    let proofValid = false;
    if (
      notionOAuthConfigured &&
      resource &&
      binding.external_account_id &&
      (resourceType === "page" || resourceType === "database") &&
      compactUuid(binding.external_resource_id) === compactUuid(resource.resourceId)
    ) {
      try {
        proofValid = verifyNotionBindingProof(
          {
            projectLinkId: binding.project_link_id,
            botId: binding.external_connection_id,
            workspaceId: binding.external_account_id,
            resourceId: binding.external_resource_id,
            resourceType,
          },
          binding.binding_proof,
        );
      } catch {
        proofValid = false;
      }
    }

    if (proofValid) {
      validNotionBindings.set(binding.project_link_id, binding);
    } else if (notionOAuthConfigured) {
      invalidNotionBindingIds.add(binding.project_link_id);
    }
  }

  const addRepository = addGitHubRepositoryAction.bind(null, projectId);
  const setRepositoryVisibility = setGitHubRepositoryVisibilityAction.bind(null, projectId);
  const removeRepository = removeGitHubRepositoryAction.bind(null, projectId);
  const beginReadConnection = beginGitHubReadConnectionAction.bind(null, projectId);
  const disconnectReadConnection = disconnectGitHubReadConnectionAction.bind(null, projectId);
  const captureObservation = captureGitHubObservationAction.bind(null, projectId);
  const addNotionResource = addNotionResourceAction.bind(null, projectId);
  const setNotionVisibility = setNotionResourceVisibilityAction.bind(null, projectId);
  const removeNotionResource = removeNotionResourceAction.bind(null, projectId);
  const beginNotionReadConnection = beginNotionReadConnectionAction.bind(null, projectId);
  const disconnectNotionReadConnection = disconnectNotionReadConnectionAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Integrations</p>
          <h2 style={{ marginBottom: 5 }}>External context 연결</h2>
          <p className="section-help">
            GitHub Build History, Notion Knowledge Context, Figma Design Context를 BuildMap Project에 연결합니다. Provider object는 BuildMap Project나 Decision identity를 대체하지 않습니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone="primary">GitHub {githubRows.length}</Badge>
          <Badge tone="review">Notion {notionRows.length}</Badge>
          <Badge tone="primary">Figma {figmaCount}</Badge>
        </div>
      </div>

      {query.error && errorMessages[query.error] ? (
        <div className="alert error">{errorMessages[query.error]}</div>
      ) : null}
      {query.updated && successMessages[query.updated] ? (
        <div className="alert success">{successMessages[query.updated]}</div>
      ) : null}
      {githubLinks.error ? (
        <div className="alert error">GitHub repository 연결 상태를 불러오지 못했습니다.</div>
      ) : null}
      {notionLinks.error ? (
        <div className="alert error">Notion resource 연결 상태를 불러오지 못했습니다.</div>
      ) : null}
      {figmaLinks.error ? (
        <div className="alert error">Figma resource 연결 상태를 불러오지 못했습니다.</div>
      ) : null}
      {githubBindings.error ? (
        <div className="alert error">GitHub read binding 상태를 불러오지 못했습니다.</div>
      ) : null}
      {notionBindings.error ? (
        <div className="alert error">Notion read binding 상태를 불러오지 못했습니다.</div>
      ) : null}

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">GitHub · Build History</p>
            <h2>Repository pointer 추가</h2>
            <p className="section-help">
              `https://github.com/owner/repository` 형태의 root URL만 저장합니다. Pointer와 read authorization은 분리됩니다.
            </p>
          </div>
          {githubAppConfigured ? <Badge tone="success">GitHub App ready</Badge> : <Badge>App config missing</Badge>}
        </div>

        <form action={addRepository} className="stack">
          <label className="field">
            <span>GitHub repository URL</span>
            <input
              name="repositoryUrl"
              placeholder="https://github.com/owner/repository"
              required
              type="url"
            />
          </label>

          <div className="form-grid-2">
            <label className="field">
              <span>표시 이름 · 선택</span>
              <input maxLength={120} name="label" placeholder="owner/repository" />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select defaultValue="internal" name="visibility">
                <option value="internal">Internal only</option>
                <option value="public">Public Map에 표시</option>
              </select>
            </label>
          </div>

          <div className="save-row row">
            <button className="button" type="submit">Repository 연결</button>
            <span className="muted">Repository pointer에는 credential이나 installation ID를 넣지 않습니다.</span>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">GitHub repositories</p>
            <h2>현재 Build History 연결</h2>
          </div>
          <Badge>{githubRows.length}</Badge>
        </div>

        {githubRows.length === 0 ? (
          <div className="empty-state">
            <strong>연결된 GitHub repository가 없습니다.</strong>
            <span>Repository pointer를 추가한 뒤 필요한 repository에만 read access를 연결합니다.</span>
          </div>
        ) : (
          <div className="stack">
            {githubRows.map((link) => {
              const isPublic = link.visibility_status === "public";
              const binding = validGitHubBindings.get(link.id);
              const bindingInvalid = invalidGitHubBindingIds.has(link.id);

              return (
                <article className="subpanel" key={link.id}>
                  <div className="section-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="metadata-row" style={{ marginBottom: 8 }}>
                        <Badge tone="primary">GitHub</Badge>
                        {isPublic ? <Badge tone="success">Public pointer</Badge> : <Badge>Internal pointer</Badge>}
                        {binding ? <Badge tone="success">Read connected</Badge> : null}
                        {bindingInvalid ? <Badge tone="review">Reconnect required</Badge> : null}
                        <span>Linked {formatDateTime(link.created_at)}</span>
                      </div>
                      <h3 style={{ marginBottom: 6 }}>{link.label}</h3>
                      <a href={link.url} rel="noreferrer" target="_blank">{link.url} ↗</a>
                    </div>
                    <div className="header-actions">
                      <form action={setRepositoryVisibility}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <input name="visibility" type="hidden" value={isPublic ? "internal" : "public"} />
                        <button className="button secondary" type="submit">
                          {isPublic ? "Internal로 전환" : "Public Map에 표시"}
                        </button>
                      </form>
                      <form action={removeRepository}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <button className="button secondary" type="submit">Pointer 제거</button>
                      </form>
                    </div>
                  </div>

                  <div className="subpanel" style={{ marginTop: 14 }}>
                    <div className="row">
                      <div>
                        <strong>GitHub App read access</strong>
                        <p className="section-help" style={{ margin: "4px 0 0" }}>
                          Contents: read + Pull requests: read 범위에서 이 repository 하나만 읽도록 연결합니다.
                        </p>
                      </div>
                      {binding ? (
                        <form action={disconnectReadConnection}>
                          <input name="linkId" type="hidden" value={link.id} />
                          <button className="button secondary" type="submit">Read access 해제</button>
                        </form>
                      ) : (
                        <form action={beginReadConnection}>
                          <input name="linkId" type="hidden" value={link.id} />
                          <button className="button" disabled={!githubAppConfigured} type="submit">
                            {bindingInvalid ? "GitHub App 다시 연결" : "GitHub App 연결"}
                          </button>
                        </form>
                      )}
                    </div>

                    {binding ? (
                      <GitHubActivityPreview
                        captureAction={captureObservation}
                        projectId={projectId}
                        linkId={link.id}
                      />
                    ) : !githubAppConfigured ? (
                      <div className="alert" style={{ marginTop: 14 }}>
                        서버에 GitHub App credentials와 callback 설정을 추가하면 read access 연결을 활성화할 수 있습니다.
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Notion · Knowledge Context</p>
            <h2>Project knowledge root 추가</h2>
            <p className="section-help">
              Notion에서 Copy link한 page 또는 database URL을 저장합니다. Pointer는 위치만 나타내며 authenticated read authorization과 별도입니다.
            </p>
          </div>
          {notionOAuthConfigured ? <Badge tone="success">OAuth read ready</Badge> : <Badge>Read config missing</Badge>}
        </div>

        <form action={addNotionResource} className="stack">
          <label className="field">
            <span>Notion page/database URL</span>
            <input
              name="resourceUrl"
              placeholder="https://www.notion.so/Project-knowledge-..."
              required
              type="url"
            />
          </label>

          <div className="form-grid-2">
            <label className="field">
              <span>표시 이름 · 선택</span>
              <input maxLength={120} name="label" placeholder="Project knowledge" />
            </label>
            <label className="field">
              <span>Visibility</span>
              <select defaultValue="internal" name="visibility">
                <option value="internal">Internal only</option>
                <option value="public">Public Map에 표시</option>
              </select>
            </label>
          </div>

          <div className="save-row row">
            <button className="button" type="submit">Notion resource 연결</button>
            <span className="muted">Pointer 공개 여부는 authenticated Notion content 공개 여부와 무관합니다.</span>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Notion resources</p>
            <h2>현재 Knowledge Context 연결</h2>
          </div>
          <Badge tone="review">{notionRows.length}</Badge>
        </div>

        {notionRows.length === 0 ? (
          <div className="empty-state">
            <strong>연결된 Notion resource가 없습니다.</strong>
            <span>Project를 설명하는 명시적 page/database root만 먼저 연결합니다.</span>
          </div>
        ) : (
          <div className="stack">
            {notionRows.map((link) => {
              const isPublic = link.visibility_status === "public";
              const binding = validNotionBindings.get(link.id);
              const bindingInvalid = invalidNotionBindingIds.has(link.id);
              const storedBindingExists = notionBindingRows.some(
                (row) => row.project_link_id === link.id,
              );

              return (
                <article className="subpanel" key={link.id}>
                  <div className="section-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="metadata-row" style={{ marginBottom: 8 }}>
                        <Badge tone="review">Notion</Badge>
                        {isPublic ? <Badge tone="success">Public pointer</Badge> : <Badge>Internal pointer</Badge>}
                        <Badge>Pointer linked</Badge>
                        {binding ? <Badge tone="success">Read connected</Badge> : null}
                        {bindingInvalid ? <Badge tone="review">Reconnect required</Badge> : null}
                        {!notionOAuthConfigured && storedBindingExists ? <Badge>Read config missing</Badge> : null}
                        <span>Linked {formatDateTime(link.created_at)}</span>
                      </div>
                      <h3 style={{ marginBottom: 6 }}>{link.label}</h3>
                      <a href={link.url} rel="noreferrer" target="_blank">{link.url} ↗</a>
                    </div>
                    <div className="header-actions">
                      <form action={setNotionVisibility}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <input name="visibility" type="hidden" value={isPublic ? "internal" : "public"} />
                        <button className="button secondary" type="submit">
                          {isPublic ? "Internal로 전환" : "Public Map에 표시"}
                        </button>
                      </form>
                      <form action={removeNotionResource}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <button className="button secondary" disabled={storedBindingExists} type="submit">
                          {storedBindingExists ? "Read access 먼저 해제" : "Pointer 제거"}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="subpanel" style={{ marginTop: 14 }}>
                    <div className="row">
                      <div>
                        <strong>Notion read authorization</strong>
                        <p className="section-help" style={{ margin: "4px 0 0" }}>
                          Public OAuth의 read content 권한으로 이 pointer가 가리키는 exact page/database만 BuildMap에서 검증하고 읽습니다.
                        </p>
                        {binding?.external_account_label ? (
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            Authorized workspace · {binding.external_account_label}
                          </p>
                        ) : null}
                      </div>
                      <div className="header-actions">
                        {storedBindingExists ? (
                          <form action={disconnectNotionReadConnection}>
                            <input name="linkId" type="hidden" value={link.id} />
                            <button className="button secondary" type="submit">Read access 해제</button>
                          </form>
                        ) : null}
                        {!binding ? (
                          <form action={beginNotionReadConnection}>
                            <input name="linkId" type="hidden" value={link.id} />
                            <button className="button" disabled={!notionOAuthConfigured} type="submit">
                              {bindingInvalid ? "Notion 다시 연결" : "Connect Notion read access"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    {binding ? (
                      <NotionResourcePreview projectId={projectId} linkId={link.id} />
                    ) : bindingInvalid ? (
                      <div className="alert" style={{ marginTop: 14 }}>
                        저장된 read binding이 현재 Project pointer와 보안 검증을 통과하지 못했습니다. 해제하거나 Notion authorization을 다시 완료해 주세요.
                      </div>
                    ) : !notionOAuthConfigured ? (
                      <div className="alert" style={{ marginTop: 14 }}>
                        서버에 Notion public OAuth credentials, state secret, AES-256-GCM encryption key를 구성하면 read access 연결을 활성화할 수 있습니다. 기존 binding은 별도로 해제할 수 있습니다.
                      </div>
                    ) : (
                      <div className="alert" style={{ marginTop: 14 }}>
                        Pointer만 저장된 상태입니다. Notion authorization을 별도로 완료해야 BuildMap이 이 resource를 읽을 수 있습니다.
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
        <p className="section-kicker">Authority boundary</p>
        <h2>External provider context는 Decision authority가 아닙니다.</h2>
        <p className="section-help" style={{ marginBottom: 0 }}>
          GitHub observation과 Notion current knowledge preview는 모두 외부 source context입니다. Pointer, credential, observation, Capture, Decision은 서로 다른 authority boundary이며 공식 Decision은 계속 Builder Review와 승인으로만 생성됩니다.
        </p>
      </section>
    </div>
  );
}
