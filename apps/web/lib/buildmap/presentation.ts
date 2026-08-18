import type { BadgeTone } from "@/components/ui/badge";

export const hypothesisStatusLabels: Record<string, string> = {
  assumed: "가정",
  validating: "검증 중",
  partially_validated: "부분 검증",
  validated: "검증됨",
  refuted: "반박됨",
  held: "보류",
};

export const cardTypeLabels: Record<string, string> = {
  problem_found: "문제 발견",
  problem_definition_changed: "문제 정의 변경",
  hypothesis_created: "가설 생성",
  hypothesis_refuted: "가설 반박",
  experiment: "실험",
  user_feedback: "사용자 피드백",
  feature_added: "기능 추가",
  feature_removed: "기능 제거",
  decision_kept: "판단 유지",
  decision_changed: "판단 변경",
  pivot: "방향 전환",
  release: "릴리즈",
  handoff_note: "인수인계 메모",
};

export const draftStatusLabels: Record<string, string> = {
  generating: "판단 중",
  generated: "판단 후보",
  editing: "Builder 검토 중",
  converted_to_change_card: "Decision 기록 전환됨",
  held: "보류",
  failed: "판단 실패",
};

export const workspaceErrors: Record<string, string> = {
  "invalid-problem": "문제 정의는 1자 이상 4,000자 이하로 입력해 주세요.",
  "problem-save": "문제 정의를 저장하지 못했습니다.",
  "invalid-hypothesis": "가설은 1자 이상 2,000자 이하로 입력해 주세요.",
  "hypothesis-create": "가설을 추가하지 못했습니다.",
  "invalid-hypothesis-status": "가설 상태 값이 올바르지 않습니다.",
  "hypothesis-update": "가설 상태를 변경하지 못했습니다.",
  "invalid-note": "Capture는 1자 이상 10,000자 이하로 입력해 주세요.",
  "note-create": "Capture를 저장하지 못했습니다.",
  "invalid-capture": "Capture는 1자 이상 10,000자 이하로 입력해 주세요.",
  "capture-create": "Capture를 저장하지 못했습니다.",
  "capture-ai-queue": "Capture는 저장했습니다. AI 판단을 시작하지 못했으므로 Review에서 다시 시도할 수 있습니다.",
  "capture-ai-generation": "Capture는 저장했습니다. AI 판단에 실패했으므로 Review에서 다시 시도할 수 있습니다.",
  "capture-ai-save": "Capture는 저장했습니다. AI 판단 결과를 저장하지 못했으므로 Review에서 다시 시도할 수 있습니다.",
  "invalid-ai-source": "AI 판단에 사용할 Capture 상태를 확인해 주세요.",
  "ai-draft-create": "AI 판단 상태를 저장하지 못했습니다.",
  "ai-draft-exists": "이 Capture에는 이미 검토 중인 판단 후보가 있습니다.",
  "ai-generation": "AI 판단에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  "ai-draft-save": "판단 후보를 저장하지 못했습니다.",
  "invalid-ai-draft": "판단 후보의 유형, 제목, 요약 또는 입력 길이를 확인해 주세요.",
  "ai-draft-convert": "판단 후보를 Decision 기록으로 전환하지 못했습니다.",
  "invalid-change-card": "Decision 기록의 필수 항목을 확인해 주세요.",
  "change-card-save": "Decision 기록을 저장하지 못했습니다.",
  "change-card-approve": "Decision을 확정하지 못했습니다.",
  "invalid-decision-candidate": "판단 후보의 유형, 제목, 요약 또는 입력 길이를 확인해 주세요.",
  "decision-candidate-unavailable": "이 판단 후보는 더 이상 기록 가능한 상태가 아닙니다.",
  "decision-finalize-convert": "판단 후보를 Decision 기록으로 전환하지 못했습니다. 다시 시도해 주세요.",
  "decision-finalize-approve": "Decision 기록은 생성됐지만 최종 확정을 완료하지 못했습니다. 아래 복구 항목에서 다시 확정할 수 있습니다.",
  "invalid-pending-decision": "확정을 마무리할 Decision 기록 상태를 확인해 주세요.",
};

export const workspaceNotices: Record<string, string> = {
  "capture-held": "Capture를 저장했습니다. AI가 공식 Decision으로 올릴 필요가 낮다고 판단해 원문만 보관했습니다.",
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function hypothesisTone(status: string): BadgeTone {
  if (status === "validated") return "success";
  if (status === "refuted") return "danger";
  if (status === "validating" || status === "partially_validated") return "primary";
  if (status === "held") return "review";
  return "neutral";
}

export function projectLifecycleLabel(status: string) {
  const labels: Record<string, string> = {
    builder_draft: "Builder Draft",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
  };
  return labels[status] ?? status;
}

export function visibilityLabel(status: string) {
  const labels: Record<string, string> = {
    private: "Private",
    unlisted: "Unlisted",
    public: "Public",
  };
  return labels[status] ?? status;
}
