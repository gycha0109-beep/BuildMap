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
  generating: "생성 중",
  generated: "AI 초안",
  editing: "Builder 수정 중",
  converted_to_change_card: "Change Card 전환됨",
  held: "보류",
  failed: "생성 실패",
};

export const workspaceErrors: Record<string, string> = {
  "invalid-problem": "문제 정의는 1자 이상 4,000자 이하로 입력해 주세요.",
  "problem-save": "문제 정의를 저장하지 못했습니다.",
  "invalid-hypothesis": "가설은 1자 이상 2,000자 이하로 입력해 주세요.",
  "hypothesis-create": "가설을 추가하지 못했습니다.",
  "invalid-hypothesis-status": "가설 상태 값이 올바르지 않습니다.",
  "hypothesis-update": "가설 상태를 변경하지 못했습니다.",
  "invalid-note": "Rough Note는 1자 이상 10,000자 이하로 입력해 주세요.",
  "note-create": "Rough Note를 저장하지 못했습니다.",
  "invalid-ai-source": "AI 구조화에 사용할 Rough Note 상태를 확인해 주세요.",
  "ai-draft-create": "AI Draft 생성 상태를 저장하지 못했습니다.",
  "ai-draft-exists": "이 Rough Note에는 이미 검토 중인 AI Draft가 있습니다.",
  "ai-generation": "AI 구조화에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  "ai-draft-save": "AI Draft를 저장하지 못했습니다.",
  "invalid-ai-draft": "AI Draft의 유형, 제목, 요약 또는 입력 길이를 확인해 주세요.",
  "ai-draft-convert": "AI Draft를 Change Card 초안으로 전환하지 못했습니다.",
  "invalid-change-card": "Change Card의 필수 항목을 확인해 주세요.",
  "change-card-save": "Change Card를 저장하지 못했습니다.",
  "change-card-approve": "Change Card를 승인하지 못했습니다.",
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
