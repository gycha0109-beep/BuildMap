import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cardTypeLabels, formatDateTime } from "@/lib/buildmap/presentation";
import {
  isGitHubAppConfigured,
  verifyGitHubCaptureSourceProof,
} from "@/lib/github/app";
import { createClient } from "@/lib/supabase/server";

type DecisionRow = {
  id: string;
  card_type: string;
  title: string;
  structured_summary: string;
  evidence: string | null;
  rough_note_id: string | null;
  linked_feedback_id: string | null;
  importance: string;
  approved_at: string | null;
};

type CaptureRow = {
  id: string;
  body: string;
  source_feedback_id: string | null;
  created_at: string;
};

type CaptureSourceRefRow = {
  id: string;
  rough_note_id: string;
  project_link_id: string;
  provider: string;
  source_type: string;
  external_source_id: string;
  canonical_url: string;
  source_title: string;
  source_context: string | null;
  occurred_at: string | null;
  observed_at: string;
  source_proof: string;
  created_at: string;
};

type ProjectLinkRow = {
  id: string;
  label: string;
  url: string;
  link_type: string;
  archived_at: string | null;
};

type FeedbackRow = {
  id: string;
  feedback_request_id: string;
  body: string;
  feedback_type: string | null;
  tester_interest: boolean;
  review_status: string;
  visibility_status: string;
  created_at: string;
};

type FeedbackRequestRow = {
  id: string;
  title: string;
  question: string;
  context: string | null;
  change_card_id: string | null;
  status: string;
  visibility_status: string;
  created_at: string;
};

function safeProviderSourceUrl(provider: string, value: string) {
  if (provider !== "github") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") return null;
    if (parsed.username || parsed.password || parsed.port) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function sourceTypeLabel(source: CaptureSourceRefRow) {
  if (source.provider === "github" && source.source_type === "merged_pull_request") {
    return "GitHub Merged PR";
  }
  if (source.provider === "github" && source.source_type === "release") {
    return "GitHub Release";
  }
  return `${source.provider} · ${source.source_type}`;
}

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const githubProofConfigured = isGitHubAppConfigured();

  const decisions = await supabase
    .from("change_cards")
    .select(
      "id, card_type, title, structured_summary, evidence, rough_note_id, linked_feedback_id, importance, approved_at",
    )
    .eq("project_id", projectId)
    .eq("work_status", "approved")
    .is("archived_at", null)
    .order("approved_at", { ascending: true });

  const decisionRows = (decisions.data ?? []) as DecisionRow[];
  const captureIds = Array.from(
    new Set(
      decisionRows
        .map((decision) => decision.rough_note_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const captures =
    captureIds.length > 0
      ? await supabase
          .from("rough_notes")
          .select("id, body, source_feedback_id, created_at")
          .eq("project_id", projectId)
          .in("id", captureIds)
          .is("archived_at", null)
      : { data: [] as CaptureRow[], error: null };

  const captureRows = (captures.data ?? []) as CaptureRow[];
  const captureById = new Map(captureRows.map((capture) => [capture.id, capture]));

  const captureSources =
    captureIds.length > 0
      ? await supabase
          .from("capture_source_refs")
          .select(
            "id, rough_note_id, project_link_id, provider, source_type, external_source_id, canonical_url, source_title, source_context, occurred_at, observed_at, source_proof, created_at",
          )
          .in("rough_note_id", captureIds)
      : { data: [] as CaptureSourceRefRow[], error: null };

  const captureSourceRows = (captureSources.data ?? []) as CaptureSourceRefRow[];
  const verifiedCaptureSourceByRoughNoteId = new Map<string, CaptureSourceRefRow>();
  const invalidCaptureSourceRoughNoteIds = new Set<string>();

  for (const source of captureSourceRows) {
    const githubType =
      source.source_type === "merged_pull_request" || source.source_type === "release";
    const verified =
      source.provider === "github" &&
      githubType &&
      githubProofConfigured &&
      verifyGitHubCaptureSourceProof(
        {
          roughNoteId: source.rough_note_id,
          projectLinkId: source.project_link_id,
          sourceType: source.source_type as "merged_pull_request" | "release",
          sourceId: source.external_source_id,
          canonicalUrl: source.canonical_url,
        },
        source.source_proof,
      );

    if (verified) {
      verifiedCaptureSourceByRoughNoteId.set(source.rough_note_id, source);
    } else {
      invalidCaptureSourceRoughNoteIds.add(source.rough_note_id);
    }
  }

  const projectLinkIds = Array.from(
    new Set(
      Array.from(verifiedCaptureSourceByRoughNoteId.values()).map(
        (source) => source.project_link_id,
      ),
    ),
  );
  const projectLinks =
    projectLinkIds.length > 0
      ? await supabase
          .from("project_links")
          .select("id, label, url, link_type, archived_at")
          .eq("project_id", projectId)
          .in("id", projectLinkIds)
      : { data: [] as ProjectLinkRow[], error: null };
  const projectLinkRows = (projectLinks.data ?? []) as ProjectLinkRow[];
  const projectLinkById = new Map(projectLinkRows.map((link) => [link.id, link]));

  const feedbackIds = Array.from(
    new Set(
      [
        ...decisionRows.map((decision) => decision.linked_feedback_id),
        ...captureRows.map((capture) => capture.source_feedback_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const feedbacks =
    feedbackIds.length > 0
      ? await supabase
          .from("feedbacks")
          .select(
            "id, feedback_request_id, body, feedback_type, tester_interest, review_status, visibility_status, created_at",
          )
          .in("id", feedbackIds)
          .is("archived_at", null)
      : { data: [] as FeedbackRow[], error: null };

  const feedbackRows = (feedbacks.data ?? []) as FeedbackRow[];
  const feedbackById = new Map(feedbackRows.map((feedback) => [feedback.id, feedback]));
  const requestIds = Array.from(
    new Set(feedbackRows.map((feedback) => feedback.feedback_request_id)),
  );

  const requests =
    requestIds.length > 0
      ? await supabase
          .from("feedback_requests")
          .select(
            "id, title, question, context, change_card_id, status, visibility_status, created_at",
          )
          .eq("project_id", projectId)
          .in("id", requestIds)
          .is("archived_at", null)
      : { data: [] as FeedbackRequestRow[], error: null };

  const requestRows = (requests.data ?? []) as FeedbackRequestRow[];
  const requestById = new Map(requestRows.map((request) => [request.id, request]));

  const withCapture = decisionRows.filter(
    (decision) => decision.rough_note_id && captureById.has(decision.rough_note_id),
  ).length;
  const withExternalFeedback = decisionRows.filter((decision) => {
    const capture = decision.rough_note_id ? captureById.get(decision.rough_note_id) : null;
    return Boolean(decision.linked_feedback_id || capture?.source_feedback_id);
  }).length;
  const withProviderSource = decisionRows.filter(
    (decision) =>
      Boolean(
        decision.rough_note_id &&
          verifiedCaptureSourceByRoughNoteId.has(decision.rough_note_id),
      ),
  ).length;
  const withRecordedEvidence = decisionRows.filter((decision) => Boolean(decision.evidence?.trim()))
    .length;
  const sourceReadError = Boolean(
    decisions.error ||
      captures.error ||
      captureSources.error ||
      projectLinks.error ||
      feedbacks.error ||
      requests.error,
  );
  const sourceIntegrityIssue = invalidCaptureSourceRoughNoteIds.size > 0;

  return (
    <div className="page-stack">
      <div className="row">
        <div>
          <p className="section-kicker">Evidence traceability</p>
          <h2 style={{ marginBottom: 5 }}>이 Decision은 무엇을 근거로 만들어졌는가</h2>
          <p className="section-help">
            공식 Decision에서 원본 Capture, External Feedback, Builder가 명시적으로 Capture한 provider source까지 역추적합니다. 저장된 연결과 검증 가능한 source proof만 사용하며 과거 출처를 텍스트나 AI로 추정하지 않습니다.
          </p>
        </div>
        <div className="header-actions">
          <Badge tone="success">{decisionRows.length} decisions</Badge>
          <Badge tone="primary">{withCapture} captures</Badge>
          <Badge tone="review">{withExternalFeedback} external feedback</Badge>
          {withProviderSource > 0 ? <Badge tone="primary">{withProviderSource} provider sources</Badge> : null}
        </div>
      </div>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <p className="section-kicker">Authority boundary</p>
            <h2>Builder-only provenance</h2>
            <p className="section-help">
              이 화면은 내부 근거 추적용입니다. Rough Note, Feedback 내부 상태, provider source metadata는 Public Project Map에 추가하지 않습니다.
            </p>
          </div>
          <Badge>Private read-side</Badge>
        </div>
        <div className="detail-grid">
          <div className="detail-block">
            <span className="detail-label">기록된 Evidence</span>
            <p className="detail-value">{withRecordedEvidence}개 Decision에 근거 요약이 있습니다.</p>
          </div>
          <div className="detail-block">
            <span className="detail-label">Source record</span>
            <p className="detail-value">
              DB에 실제 연결된 `rough_note_id` / `linked_feedback_id`와 server proof가 검증된 `capture_source_refs`만 provenance로 취급합니다.
            </p>
          </div>
        </div>
      </section>

      {sourceReadError ? (
        <div className="alert error">
          일부 provenance source를 읽지 못했습니다. 연결되지 않은 것으로 추정하지 않고 확인 가능한 기록만 표시합니다.
        </div>
      ) : null}
      {sourceIntegrityIssue ? (
        <div className="alert error">
          provider source row가 존재하지만 server integrity proof를 검증하지 못한 기록이 있습니다. 해당 row를 verified provenance로 사용하거나 다른 source로 자동 대체하지 않습니다.
        </div>
      ) : null}

      {decisions.error ? (
        <div className="alert error">Decision 기록을 불러오지 못했습니다.</div>
      ) : decisionRows.length === 0 ? (
        <div className="empty-state">
          <strong>추적할 공식 Decision이 없습니다.</strong>
          <span>Review에서 Decision을 승인하면 근거 연결을 여기서 확인할 수 있습니다.</span>
          <Link className="button" href={`/projects/${projectId}/workspace/review`}>
            Review 열기
          </Link>
        </div>
      ) : (
        <div className="page-stack" style={{ gap: 18 }}>
          {decisionRows.map((decision, index) => {
            const capture = decision.rough_note_id
              ? captureById.get(decision.rough_note_id) ?? null
              : null;
            const providerSource = decision.rough_note_id
              ? verifiedCaptureSourceByRoughNoteId.get(decision.rough_note_id) ?? null
              : null;
            const providerSourceIntegrityInvalid = Boolean(
              decision.rough_note_id &&
                invalidCaptureSourceRoughNoteIds.has(decision.rough_note_id),
            );
            const providerProjectLink = providerSource
              ? projectLinkById.get(providerSource.project_link_id) ?? null
              : null;
            const providerUrl = providerSource
              ? safeProviderSourceUrl(providerSource.provider, providerSource.canonical_url)
              : null;
            const feedbackFromDecision = decision.linked_feedback_id;
            const feedbackFromCapture = capture?.source_feedback_id ?? null;
            const provenanceMismatch = Boolean(
              feedbackFromDecision &&
                feedbackFromCapture &&
                feedbackFromDecision !== feedbackFromCapture,
            );
            const feedbackId = feedbackFromDecision || feedbackFromCapture;
            const feedback = feedbackId ? feedbackById.get(feedbackId) ?? null : null;
            const request = feedback
              ? requestById.get(feedback.feedback_request_id) ?? null
              : null;
            const sourceCount =
              Number(Boolean(capture)) + Number(Boolean(feedback)) + Number(Boolean(providerSource));

            return (
              <section className="surface-card" key={decision.id}>
                <div className="section-head">
                  <div>
                    <div className="metadata-row" style={{ marginBottom: 8 }}>
                      <Badge tone="success">Decision {index + 1}</Badge>
                      <Badge>{cardTypeLabels[decision.card_type] ?? decision.card_type}</Badge>
                      {decision.importance === "major_turning_point" ? (
                        <Badge tone="review">주요 전환점</Badge>
                      ) : null}
                      <Badge tone={sourceCount > 0 ? "primary" : "neutral"}>
                        {sourceCount > 0 ? `${sourceCount} source records` : "No linked source"}
                      </Badge>
                    </div>
                    <h2>{decision.title}</h2>
                    <p className="section-help">{decision.structured_summary}</p>
                  </div>
                  <div className="header-actions">
                    {decision.approved_at ? (
                      <span className="muted">{formatDateTime(decision.approved_at)}</span>
                    ) : null}
                    <Link
                      className="button secondary"
                      href={`/projects/${projectId}/decisions#decision-${decision.id}`}
                    >
                      Decision 보기
                    </Link>
                  </div>
                </div>

                {provenanceMismatch ? (
                  <div className="alert error">
                    Decision의 linked Feedback과 Capture의 source Feedback이 일치하지 않습니다. 자동 보정하지 않고 두 연결을 그대로 보존합니다.
                  </div>
                ) : null}
                {providerSourceIntegrityInvalid ? (
                  <div className="alert error">
                    이 Capture에는 provider source row가 있지만 integrity proof를 검증하지 못했습니다. provider provenance로 표시하지 않습니다.
                  </div>
                ) : null}

                {decision.evidence ? (
                  <div className="subpanel" style={{ marginBottom: 14 }}>
                    <p className="section-kicker">Recorded evidence</p>
                    <strong style={{ display: "block", marginBottom: 7 }}>Decision에 기록된 근거 요약</strong>
                    <p style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>{decision.evidence}</p>
                  </div>
                ) : null}

                <div className="timeline" style={{ gap: 18 }}>
                  <div className="timeline-item">
                    <time>Decision</time>
                    <strong>{decision.title}</strong>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      Builder가 승인한 공식 Decision Record
                    </p>
                  </div>

                  {capture ? (
                    <div className="timeline-item">
                      <time>Source Capture · {formatDateTime(capture.created_at)}</time>
                      <strong>Builder가 보존한 원본 맥락</strong>
                      <p style={{ whiteSpace: "pre-wrap" }}>{capture.body}</p>
                      {capture.source_feedback_id ? (
                        <div className="metadata-row">
                          <Badge tone="review">External Feedback source</Badge>
                          <span>Feedback provenance 보존됨</span>
                        </div>
                      ) : providerSource ? (
                        <div className="metadata-row">
                          <Badge tone="primary">{providerSource.provider} source</Badge>
                          <span>Verified provider provenance 보존됨</span>
                        </div>
                      ) : (
                        <div className="metadata-row">
                          <Badge>Builder Capture</Badge>
                          <span>Verified external source 연결 없음</span>
                        </div>
                      )}
                    </div>
                  ) : decision.rough_note_id ? (
                    <div className="timeline-item">
                      <time>Source Capture</time>
                      <strong>연결 ID는 있으나 source record를 읽을 수 없습니다.</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        삭제·archive·접근 경계 등 원인을 추정하지 않습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="timeline-item">
                      <time>Source Capture</time>
                      <strong>연결된 Capture가 없습니다.</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        이 Decision의 출처를 기존 텍스트만으로 역추정하지 않습니다.
                      </p>
                    </div>
                  )}

                  {providerSource ? (
                    <div className="timeline-item">
                      <time>
                        {sourceTypeLabel(providerSource)}
                        {providerSource.occurred_at
                          ? ` · ${formatDateTime(providerSource.occurred_at)}`
                          : ""}
                      </time>
                      <strong>{providerSource.source_title}</strong>
                      {providerUrl ? (
                        <p style={{ marginBottom: 8 }}>
                          <a href={providerUrl} rel="noreferrer" target="_blank">
                            Provider source 열기 ↗
                          </a>
                        </p>
                      ) : null}
                      <div className="metadata-row">
                        <Badge tone="primary">{providerSource.provider}</Badge>
                        <Badge tone="success">Source proof verified</Badge>
                        <span>source: {providerSource.external_source_id}</span>
                        {providerProjectLink ? <span>repository: {providerProjectLink.label}</span> : null}
                        {providerProjectLink?.archived_at ? <Badge>Repository pointer archived</Badge> : null}
                        <span>observed: {formatDateTime(providerSource.observed_at)}</span>
                      </div>
                      {providerSource.source_context ? (
                        <p className="muted" style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
                          {providerSource.source_context}
                        </p>
                      ) : null}
                      {!providerProjectLink ? (
                        <p className="muted" style={{ margin: "8px 0 0" }}>
                          Project Link ID는 보존되어 있으나 현재 link record를 읽지 못했습니다. 다른 repository로 추정하지 않습니다.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {feedback ? (
                    <div className="timeline-item">
                      <time>External Feedback · {formatDateTime(feedback.created_at)}</time>
                      <strong>Scout가 제공한 외부 관찰</strong>
                      <p style={{ whiteSpace: "pre-wrap" }}>{feedback.body}</p>
                      <div className="metadata-row">
                        {feedback.feedback_type ? <span>{feedback.feedback_type}</span> : null}
                        <span>review: {feedback.review_status}</span>
                        <span>visibility: {feedback.visibility_status}</span>
                        {feedback.tester_interest ? <Badge tone="primary">Tester interest</Badge> : null}
                      </div>
                    </div>
                  ) : feedbackId ? (
                    <div className="timeline-item">
                      <time>External Feedback</time>
                      <strong>연결 ID는 있으나 Feedback source를 읽을 수 없습니다.</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        source 부재 원인을 추정하거나 다른 Feedback으로 대체하지 않습니다.
                      </p>
                    </div>
                  ) : null}

                  {request ? (
                    <div className="timeline-item">
                      <time>Feedback Request · {formatDateTime(request.created_at)}</time>
                      <strong>{request.title}</strong>
                      <p style={{ color: "var(--text-strong)" }}>{request.question}</p>
                      {request.context ? (
                        <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                          {request.context}
                        </p>
                      ) : null}
                      <div className="row">
                        <div className="metadata-row">
                          <span>status: {request.status}</span>
                          <span>visibility: {request.visibility_status}</span>
                          {request.change_card_id ? <span>Decision-targeted request</span> : <span>Project-level request</span>}
                        </div>
                        <Link className="button secondary" href={`/projects/${projectId}/feedback`}>
                          Feedback workspace
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
