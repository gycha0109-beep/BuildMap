import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";
import {
  approveRoadmapRevisionAction,
  archiveCompletionCriterionAction,
  archiveExecutionMilestoneAction,
  importRoadmapDraftAction,
  updateCompletionCriterionAction,
  updateExecutionMilestoneAction,
  createCompletionCriterionAction,
  createExecutionMilestoneAction,
  createExecutionTrackAction,
  createRoadmapRevisionAction,
} from "./actions";

const notices: Record<string, string> = {
  "track-created": "개발 트랙이 등록되었습니다.",
  "revision-created": "로드맵 초안 버전이 생성되었습니다.",
  "milestone-created": "마일스톤이 추가되었습니다.",
  "criterion-created": "완료 조건이 추가되었습니다.",
  "milestone-updated": "마일스톤을 수정했습니다.",
  "milestone-archived": "마일스톤을 초안에서 제외했습니다.",
  "criterion-updated": "완료 조건을 수정했습니다.",
  "criterion-archived": "완료 조건을 초안에서 제외했습니다.",
  "import-created": "로드맵을 새 초안으로 가져왔습니다.",
  "import-error": "로드맵을 가져오지 못했습니다. 초안 중복과 입력 구조를 확인해 주세요.",
  "invalid-import": "가져오기 JSON 구조, 필수 조건 또는 크기를 확인해 주세요.",
  "revision-approved": "로드맵 버전이 승인되었습니다. 정의는 변경할 수 없습니다.",
  "track-error": "트랙 등록 실패: 입력 또는 중복된 이름을 확인해 주세요.",
  "revision-error": "로드맵 버전 생성에 실패했습니다.",
  "milestone-error": "마일스톤 등록 실패: 위치 중복 또는 입력값을 확인해 주세요.",
  "criterion-error": "완료 조건 등록 실패: 위치 중복 또는 입력값을 확인해 주세요.",
  "approve-error": "승인할 수 없습니다. 각 마일스톤에 필수 완료 조건이 있는지 확인해 주세요.",
  "invalid-track": "개발 트랙 입력값이 올바르지 않습니다.",
  "invalid-revision": "로드맵 버전 입력값이 올바르지 않습니다.",
  "invalid-milestone": "마일스톤 입력값이 올바르지 않습니다.",
  "invalid-criterion": "완료 조건 입력값이 올바르지 않습니다.",
  "draft-required": "수정 가능한 로드맵 초안이 아닙니다.",
  "draft-exists": "먼저 현재 초안을 승인해 주세요.",
};

const ruleTypes = [
  { value: "PR_MERGED", name: "PR 병합" },
  { value: "CHECK_PASSED", name: "필수 CI 통과" },
  { value: "ARTIFACT_EXISTS", name: "산출물 확인" },
  { value: "DEPLOY_VERIFIED", name: "배포 확인" },
  { value: "MANUAL_ACCEPTANCE", name: "Builder 수동 승인" },
];

export default async function ExecutionMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  if (!auth.data.user) redirect("/login");
  const actor = await ensureBuilderContext(supabase, auth.data.user);

  const project = await supabase.from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_builder_profile_id", actor.builderProfileId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) redirect("/dashboard?error=project-access");

  const [tracks, revisions, milestones, criteria] = await Promise.all([
    supabase.from("execution_tracks")
      .select("id, name, description, position")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("position")
      .order("created_at")
      .limit(100),
    supabase.from("roadmap_revisions")
      .select("id, track_id, version, title, status, approved_at")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(200),
    supabase.from("execution_milestones")
      .select("id, track_id, roadmap_revision_id, title, description, weight, position")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("position")
      .limit(500),
    supabase.from("completion_criteria")
      .select("id, milestone_id, title, rule_type, is_required, position")
      .eq("project_id", projectId)
      .is("archived_at", null)
      .order("position")
      .limit(1000),
  ]);

  const loadError = tracks.error || revisions.error || milestones.error || criteria.error;
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? notices[query.notice] : undefined;
  const selectedRevision = typeof query.revision === "string" ? query.revision : null;
  const createTrack = createExecutionTrackAction.bind(null, projectId);
  const createRevision = createRoadmapRevisionAction.bind(null, projectId);
  const createMilestone = createExecutionMilestoneAction.bind(null, projectId);
  const createCriterion = createCompletionCriterionAction.bind(null, projectId);
  const approveRevision = approveRoadmapRevisionAction.bind(null, projectId);
  const importRoadmap = importRoadmapDraftAction.bind(null, projectId);
  const updateMilestone = updateExecutionMilestoneAction.bind(null, projectId);
  const archiveMilestone = archiveExecutionMilestoneAction.bind(null, projectId);
  const updateCriterion = updateCompletionCriterionAction.bind(null, projectId);
  const archiveCriterion = archiveCompletionCriterionAction.bind(null, projectId);

  return (
    <div className="page-stack">
      <section className="hero-card">
        <p className="section-kicker">Execution Map · EM-1</p>
        <h2>로드맵과 완료 조건</h2>
        <p className="section-help">
          승인된 로드맵 버전은 변경되지 않습니다. GitHub 증거 검증 및 진행률 계산은 EM-2/EM-3 이후 제공됩니다.
        </p>
        <div className="row">
          <Badge>진행률: 산정 불가</Badge>
          <Badge>현재 단계: 로드맵 정의</Badge>
        </div>
      </section>

      {notice ? <div className="alert">{notice}</div> : null}
      {loadError ? (
        <div className="alert error">
          Execution Map 테이블을 읽지 못했습니다. 신규 마이그레이션의 적용 및 RLS 검증 상태를 확인해 주세요.
        </div>
      ) : null}

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Development tracks</p>
            <h2>개발 트랙 생성</h2>
          </div>
        </div>
        <form className="stack" action={createTrack}>
          <div className="form-grid-3">
            <label className="field">
              <span>트랙명</span>
              <input name="name" maxLength={160} required placeholder="예: 캐릭터 런타임" />
            </label>
            <label className="field">
              <span>표시 순서</span>
              <input name="position" type="number" min={0} defaultValue={0} required />
            </label>
            <label className="field">
              <span>설명 (선택)</span>
              <input name="description" maxLength={1000} placeholder="개발 범위" />
            </label>
          </div>
          <SubmitButton label="트랙 추가" pendingLabel="등록 중…" />
        </form>
      </section>

      {!loadError && (tracks.data ?? []).length === 0 ? (
        <div className="empty-state">
          <strong>아직 개발 트랙이 없습니다.</strong>
          <span>트랙을 생성한 다음 버전별 로드맵과 검증 조건을 등록해 주세요.</span>
        </div>
      ) : null}

      {!loadError && (tracks.data ?? []).map((track) => {
        const trackRevisions = (revisions.data ?? []).filter((revision) => revision.track_id === track.id);
        const latest = trackRevisions[0] ?? null;
        const draft = trackRevisions.find((revision) => revision.status === "draft") ?? null;
        const active = trackRevisions.find((revision) => revision.id === selectedRevision) ?? draft ?? latest;
        const items = (milestones.data ?? []).filter(
          (milestone) => milestone.roadmap_revision_id === active?.id,
        );

        return (
          <section className="surface-card stack" key={track.id}>
            <div className="section-head">
              <div>
                <p className="section-kicker">Execution track</p>
                <h2>{track.name}</h2>
                <p className="section-help">{track.description || "설명 없음"}</p>
              </div>
              <Badge>{draft ? "초안 작성 중" : latest ? "승인된 로드맵" : "로드맵 없음"}</Badge>
            </div>

            {trackRevisions.length > 0 ? (
              <div className="row">
                {trackRevisions.map((revision) => (
                  <Link key={revision.id} href={`/projects/${projectId}/execution?revision=${revision.id}`}>
                    <Badge tone={active?.id === revision.id ? "primary" : "neutral"}>
                      v{revision.version} · {revision.status === "approved" ? "승인" : "초안"}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : null}

            {!draft ? (
              <form className="stack" action={createRevision}>
                <input type="hidden" name="trackId" value={track.id} />
                <div className="form-grid-3">
                  <label className="field">
                    <span>새 버전 제목</span>
                    <input name="title" maxLength={200} placeholder="예: 초기 개발 로드맵" required />
                  </label>
                  <label className="field">
                    <span>변경 이유 (선택)</span>
                    <input name="changeReason" maxLength={2000} placeholder="예: 범위 조정" />
                  </label>
                </div>
                <SubmitButton label="새 초안 생성" pendingLabel="생성 중…" />
              </form>
            ) : null}

              <details className="stack">
                <summary>구조화 로드맵 JSON 가져오기</summary>
                <p className="section-help">
                  새 버전을 원자적으로 생성합니다. 기존 초안이 있으면 가져오기를 차단합니다.
                  각 마일스톤에는 필수 완료 조건이 하나 이상 있어야 합니다.
                </p>
                <form className="stack" action={importRoadmap}>
                  <input type="hidden" name="trackId" value={track.id} />
                  <label className="field">
                    <span>로드맵 제목</span>
                    <input name="title" maxLength={200} required />
                  </label>
                  <label className="field">
                    <span>변경 사유 (선택)</span>
                    <input name="changeReason" maxLength={2000} />
                  </label>
                  <label className="field">
                    <span>마일스톤 JSON 배열</span>
                    <textarea name="roadmapJson" maxLength={65536} rows={9} required
                      placeholder={'[{"title":"인증 기능","weight":1,"criteria":[{"title":"필수 CI 통과","ruleType":"CHECK_PASSED","required":true}]}]'} />
                  </label>
                  <SubmitButton label="새 로드맵 가져오기" pendingLabel="검증하고 저장 중…" />
                </form>
              </details>

            {active ? (
              <div className="stack">
                <div className="row">
                  <h3>v{active.version} · {active.title}</h3>
                  <Badge tone={active.status === "approved" ? "success" : "primary"}>
                    {active.status === "approved" ? "승인 완료" : "편집 가능"}
                  </Badge>
                </div>
                {items.length === 0 ? (
                  <div className="empty-state">
                    <span>마일스톤이 없습니다. 승인하려면 필수 완료 조건이 있는 마일스톤이 필요합니다.</span>
                  </div>
                ) : (
                  <ul className="compact-list">
                    {items.map((milestone) => {
                      const linked = (criteria.data ?? []).filter(
                        (criterion) => criterion.milestone_id === milestone.id,
                      );
                      return (
                        <li className="compact-item stack" key={milestone.id}>
                          <div className="row">
                            <strong>{milestone.title}</strong>
                            <Badge>가중치 {milestone.weight}</Badge>
                          </div>
                          {draft && active?.id === draft.id ? (
                            <div className="stack">
                              <form className="stack" action={updateMilestone}>
                                <input type="hidden" name="trackId" value={track.id} />
                                <input type="hidden" name="revisionId" value={draft.id} />
                                <input type="hidden" name="milestoneId" value={milestone.id} />
                                <div className="form-grid-3">
                                  <label className="field">
                                    <span>마일스톤명</span>
                                    <input name="title" defaultValue={milestone.title} maxLength={200} required />
                                  </label>
                                  <label className="field">
                                    <span>가중치</span>
                                    <input name="weight" type="number" min="0.0001" max="100000" step="0.0001" defaultValue={milestone.weight} required />
                                  </label>
                                  <label className="field">
                                    <span>설명</span>
                                    <input name="description" defaultValue={milestone.description || ""} maxLength={2000} />
                                  </label>
                                </div>
                                <SubmitButton label="마일스톤 수정" pendingLabel="저장 중…" />
                              </form>
                              <form action={archiveMilestone}>
                                <input type="hidden" name="trackId" value={track.id} />
                                <input type="hidden" name="revisionId" value={draft.id} />
                                <input type="hidden" name="milestoneId" value={milestone.id} />
                                <SubmitButton label="마일스톤 제외" pendingLabel="제외 중…" className="button secondary" />
                              </form>
                            </div>
                          ) : null}

                          {linked.length === 0 ? (
                            <p className="section-help">완료 조건이 아직 없습니다.</p>
                          ) : (
                            <ul className="compact-list">
                              {linked.map((criterion) => (
                                <li key={criterion.id} className="stack">
                                  {draft && active?.id === draft.id ? (
                                    <>
                                      <form className="stack" action={updateCriterion}>
                                        <input type="hidden" name="trackId" value={track.id} />
                                        <input type="hidden" name="revisionId" value={draft.id} />
                                        <input type="hidden" name="milestoneId" value={milestone.id} />
                                        <input type="hidden" name="criterionId" value={criterion.id} />
                                        <div className="form-grid-3">
                                          <label className="field">
                                            <span>완료 조건</span>
                                            <input name="title" defaultValue={criterion.title} maxLength={300} required />
                                          </label>
                                          <label className="field">
                                            <span>검증 유형</span>
                                            <select name="ruleType" defaultValue={criterion.rule_type}>
                                              {ruleTypes.map((rule) => (
                                                <option key={rule.value} value={rule.value}>{rule.name}</option>
                                              ))}
                                            </select>
                                          </label>
                                          <label className="field">
                                            <span>조건 구분</span>
                                            <span><input name="isRequired" type="checkbox" defaultChecked={criterion.is_required} /> 필수 조건</span>
                                          </label>
                                        </div>
                                        <SubmitButton label="조건 수정" pendingLabel="저장 중…" />
                                      </form>
                                      <form action={archiveCriterion}>
                                        <input type="hidden" name="trackId" value={track.id} />
                                        <input type="hidden" name="revisionId" value={draft.id} />
                                        <input type="hidden" name="milestoneId" value={milestone.id} />
                                        <input type="hidden" name="criterionId" value={criterion.id} />
                                        <SubmitButton label="이 조건 제외" pendingLabel="처리 중…" className="button secondary" />
                                      </form>
                                    </>
                                  ) : (
                                    <span>{criterion.title} · {criterion.rule_type} · {criterion.is_required ? "필수" : "선택"}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {draft && active?.id === draft.id ? (
                            <form className="stack" action={createCriterion}>
                              <input type="hidden" name="trackId" value={track.id} />
                              <input type="hidden" name="revisionId" value={draft.id} />
                              <input type="hidden" name="milestoneId" value={milestone.id} />
                              <div className="form-grid-3">
                                <label className="field">
                                  <span>완료 조건</span>
                                  <input name="title" maxLength={300} required />
                                </label>
                                <label className="field">
                                  <span>검증 유형</span>
                                  <select name="ruleType" defaultValue="PR_MERGED">
                                    {ruleTypes.map((rule) => (
                                      <option key={rule.value} value={rule.value}>{rule.name}</option>
                                    ))}
                                  </select>
                                </label>
                                <label className="field">
                                  <span>순서</span>
                                  <input name="position" type="number" min={0} defaultValue={Math.max(-1, ...linked.map((criterion) => criterion.position)) + 1} required />
                                </label>
                              </div>
                              <label className="field">
                                <span><input type="checkbox" name="isRequired" defaultChecked /> 필수 완료 조건</span>
                              </label>
                              <SubmitButton label="완료 조건 추가" pendingLabel="등록 중…" />
                            </form>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {draft && active?.id === draft.id ? (
                  <>
                    <form className="stack" action={createMilestone}>
                      <input type="hidden" name="trackId" value={track.id} />
                      <input type="hidden" name="revisionId" value={draft.id} />
                      <div className="form-grid-3">
                        <label className="field">
                          <span>마일스톤 제목</span>
                          <input name="title" maxLength={200} required />
                        </label>
                        <label className="field">
                          <span>순서</span>
                          <input name="position" type="number" min={0} defaultValue={Math.max(-1, ...items.map((milestone) => milestone.position)) + 1} required />
                        </label>
                        <label className="field">
                          <span>가중치</span>
                          <input name="weight" type="number" min="0.0001" max="100000" step="0.0001" defaultValue="1" required />
                        </label>
                      </div>
                      <label className="field">
                        <span>설명 (선택)</span>
                        <input name="description" maxLength={2000} />
                      </label>
                      <SubmitButton label="마일스톤 추가" pendingLabel="등록 중…" />
                    </form>
                    <form action={approveRevision}>
                      <input type="hidden" name="trackId" value={track.id} />
                      <input type="hidden" name="revisionId" value={draft.id} />
                      <SubmitButton
                        label="이 로드맵 버전 승인"
                        pendingLabel="승인 중…"
                      />
                    </form>
                    <p className="section-help">
                      승인 후 이 버전의 마일스톤과 완료 조건은 수정할 수 없습니다. 변경은 새 버전으로 진행합니다.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
