import { Badge } from "@/components/ui/badge";
import { GitHubActivityPreview } from "@/components/buildmap/github-activity-preview";
import { formatDateTime } from "@/lib/buildmap/presentation";
import {
  isGitHubAppConfigured,
  verifyGitHubBindingProof,
} from "@/lib/github/app";
import { parseCanonicalGitHubRepositoryUrl } from "@/lib/github/repository";
import { createClient } from "@/lib/supabase/server";
import { captureGitHubObservationAction } from "../github-capture-actions";
import {
  beginGitHubReadConnectionAction,
  disconnectGitHubReadConnectionAction,
} from "../github-integration-actions";
import {
  addGitHubRepositoryAction,
  removeGitHubRepositoryAction,
  setGitHubRepositoryVisibilityAction,
} from "../integration-actions";

type GitHubLink = {
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
};

const successMessages: Record<string, string> = {
  "github-linked": "GitHub repository 연결을 저장했습니다.",
  "github-visibility": "GitHub repository 공개 설정을 변경했습니다.",
  "github-removed": "GitHub repository 연결을 제거했습니다.",
  "github-read-connected": "GitHub App read access를 검증하고 연결했습니다.",
  "github-read-disconnected": "GitHub App read access 연결을 해제했습니다.",
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

  const [links, bindings] = await Promise.all([
    supabase
      .from("project_links")
      .select("id, label, url, visibility_status, created_at")
      .eq("project_id", projectId)
      .eq("link_type", "github")
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
  ]);

  const rows = (links.data ?? []) as GitHubLink[];
  const bindingRows = (bindings.data ?? []) as GitHubBinding[];
  const linkById = new Map(rows.map((link) => [link.id, link]));
  const validBindings = new Map<string, GitHubBinding>();
  const invalidBindingIds = new Set<string>();

  if (githubAppConfigured) {
    for (const binding of bindingRows) {
      const link = linkById.get(binding.project_link_id);
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
        validBindings.set(binding.project_link_id, binding);
      } else {
        invalidBindingIds.add(binding.project_link_id);
      }
    }
  }

  const addRepository = addGitHubRepositoryAction.bind(null, projectId);
  const setVisibility = setGitHubRepositoryVisibilityAction.bind(null, projectId);
  const removeRepository = removeGitHubRepositoryAction.bind(null, projectId);
  const beginReadConnection = beginGitHubReadConnectionAction.bind(null, projectId);
  const disconnectReadConnection = disconnectGitHubReadConnectionAction.bind(null, projectId);
  const captureObservation = captureGitHubObservationAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Integrations</p>
          <h2 style={{ marginBottom: 5 }}>GitHub Build History 연결</h2>
          <p className="section-help">
            Repository pointer와 GitHub App read access를 분리해 관리합니다. Refresh 결과 중 Builder가 직접 선택한 PR/Release만 private Capture로 전환할 수 있습니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone="primary">{rows.length} repositories</Badge>
          {githubAppConfigured ? <Badge tone="success">GitHub App ready</Badge> : <Badge>App config missing</Badge>}
        </div>
      </div>

      {query.error && errorMessages[query.error] ? (
        <div className="alert error">{errorMessages[query.error]}</div>
      ) : null}
      {query.updated && successMessages[query.updated] ? (
        <div className="alert success">{successMessages[query.updated]}</div>
      ) : null}
      {links.error ? (
        <div className="alert error">GitHub repository 연결 상태를 불러오지 못했습니다.</div>
      ) : null}
      {bindings.error ? (
        <div className="alert error">GitHub read binding 상태를 불러오지 못했습니다.</div>
      ) : null}

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Repository pointer</p>
            <h2>Repository 추가</h2>
            <p className="section-help">
              `https://github.com/owner/repository` 형태의 root URL만 저장합니다. 이 pointer 자체에는 credential이나 installation ID를 넣지 않습니다.
            </p>
          </div>
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
            <button className="button" type="submit">
              Repository 연결
            </button>
            <span className="muted">Repository pointer는 GitHub read authorization과 분리됩니다.</span>
          </div>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Connected repositories</p>
            <h2>현재 연결</h2>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <strong>연결된 GitHub repository가 없습니다.</strong>
            <span>먼저 repository pointer를 추가한 뒤 필요한 repository에만 read access를 연결합니다.</span>
          </div>
        ) : (
          <div className="stack">
            {rows.map((link) => {
              const isPublic = link.visibility_status === "public";
              const binding = validBindings.get(link.id);
              const bindingInvalid = invalidBindingIds.has(link.id);

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
                      <a href={link.url} rel="noreferrer" target="_blank">
                        {link.url} ↗
                      </a>
                    </div>
                    <div className="header-actions">
                      <form action={setVisibility}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <input
                          name="visibility"
                          type="hidden"
                          value={isPublic ? "internal" : "public"}
                        />
                        <button className="button secondary" type="submit">
                          {isPublic ? "Internal로 전환" : "Public Map에 표시"}
                        </button>
                      </form>
                      <form action={removeRepository}>
                        <input name="linkId" type="hidden" value={link.id} />
                        <button className="button secondary" type="submit">
                          Pointer 제거
                        </button>
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
                          <button className="button secondary" type="submit">
                            Read access 해제
                          </button>
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
        <p className="section-kicker">Authority boundary</p>
        <h2>GitHub observation은 Capture 후보일 뿐 Decision authority가 아닙니다.</h2>
        <p className="section-help" style={{ marginBottom: 0 }}>
          Refresh는 읽기 전용입니다. Builder가 `Capture as evidence`를 명시적으로 선택하면 검증된 source identity와 함께 private Rough Note가 생성되고 AI가 Review 초안을 구조화합니다. 공식 Decision은 여전히 Builder Review와 승인으로만 생성됩니다.
        </p>
      </section>
    </div>
  );
}
