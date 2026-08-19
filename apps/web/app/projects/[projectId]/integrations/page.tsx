import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/buildmap/presentation";
import { createClient } from "@/lib/supabase/server";
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

const errorMessages: Record<string, string> = {
  "invalid-github-repository": "GitHub repository URL과 공개 설정을 확인해 주세요.",
  "github-link-save": "GitHub repository 연결을 저장하지 못했습니다.",
  "github-link-update": "GitHub repository 공개 설정을 변경하지 못했습니다.",
  "github-link-remove": "GitHub repository 연결을 제거하지 못했습니다.",
};

const successMessages: Record<string, string> = {
  "github-linked": "GitHub repository 연결을 저장했습니다.",
  "github-visibility": "GitHub repository 공개 설정을 변경했습니다.",
  "github-removed": "GitHub repository 연결을 제거했습니다.",
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

  const links = await supabase
    .from("project_links")
    .select("id, label, url, visibility_status, created_at")
    .eq("project_id", projectId)
    .eq("link_type", "github")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const rows = (links.data ?? []) as GitHubLink[];
  const addRepository = addGitHubRepositoryAction.bind(null, projectId);
  const setVisibility = setGitHubRepositoryVisibilityAction.bind(null, projectId);
  const removeRepository = removeGitHubRepositoryAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Integrations</p>
          <h2 style={{ marginBottom: 5 }}>GitHub repository 연결</h2>
          <p className="section-help">
            BuildMap Project가 어떤 GitHub repository와 연결되는지 명시합니다. 이 단계에서는 repository URL만 보존하며 GitHub 계정 권한이나 코드를 읽지 않습니다.
          </p>
        </div>
        <Badge tone="primary">{rows.length} repositories</Badge>
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

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Repository pointer</p>
            <h2>Repository 추가</h2>
            <p className="section-help">
              `https://github.com/owner/repository` 형태의 repository root URL만 허용합니다. commit, branch, PR, issue URL은 integration identity로 저장하지 않습니다.
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
            <span className="muted">OAuth · token · webhook · repository ID는 저장하지 않습니다.</span>
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
            <span>Repository를 연결해도 BuildMap의 Project/Decision identity는 바뀌지 않습니다.</span>
          </div>
        ) : (
          <div className="stack">
            {rows.map((link) => {
              const isPublic = link.visibility_status === "public";
              return (
                <article className="subpanel" key={link.id}>
                  <div className="section-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="metadata-row" style={{ marginBottom: 8 }}>
                        <Badge tone="primary">GitHub</Badge>
                        {isPublic ? <Badge tone="success">Public</Badge> : <Badge>Internal</Badge>}
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
                          연결 제거
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="surface-card">
        <p className="section-kicker">Authority boundary</p>
        <h2>GitHub는 BuildMap Decision authority가 아닙니다.</h2>
        <p className="section-help" style={{ marginBottom: 0 }}>
          Repository 연결은 외부 Build History 위치를 가리키는 포인터입니다. GitHub의 commit·PR·issue가 자동으로 BuildMap Decision이 되지 않으며, 공식 Decision은 계속 Builder Review와 승인으로만 생성됩니다.
        </p>
      </section>
    </div>
  );
}
