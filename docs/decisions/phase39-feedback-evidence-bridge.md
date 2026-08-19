# Phase 39 — External Feedback → Capture as Evidence Bridge

## Decision

External Feedback은 자동으로 Decision이 되지 않는다. Builder가 명시적으로 `Capture as evidence`를 선택한 Feedback만 기존 판단 루프에 다시 진입한다.

```text
External Feedback
→ Capture as evidence
→ private Rough Note
→ AI structuring
→ Decision Candidate
→ Builder Review
→ Decision
```

## Why

Phase 38은 외부 관찰을 안전하게 수집하는 경계까지 닫았다. Phase 39의 목적은 그 관찰을 Builder의 Decision History에 연결하되, Scout 입력이 공식 기록 권한을 갖지 않도록 하는 것이다.

일반 Capture의 AI triage는 기록할 가치가 있는지를 AI가 보수적으로 판단한다. 그러나 `Capture as evidence`는 Builder가 이미 검토 가치가 있다고 명시적으로 선택한 행위이므로 다시 triage하면 인간 선택을 AI가 되돌리는 구조가 된다. 따라서 Feedback-origin Capture는 AI가 **구조화만** 하고 Review 후보로 남긴다.

## Provenance

- `rough_notes.source_feedback_id`는 private provenance다.
- 같은 Feedback은 active Rough Note 기준 한 번만 Capture할 수 있다.
- Feedback과 Rough Note는 같은 Project에 속해야 한다.
- 생성된 provenance는 직접 수정할 수 없다.
- 기존 `convert_ai_draft_to_change_card(...)` RPC signature는 유지한다.
- RPC가 `source_feedback_id`를 기존 `change_cards.linked_feedback_id`로 자동 승계한다.

## Authority boundary

- Scout: Feedback 작성
- Builder: Feedback을 evidence로 선택
- AI: candidate 구조화
- Builder: candidate 수정 및 승인
- approved Change Card: 공식 Decision

Feedback의 `review_status`와 공개 여부는 이 bridge와 별개다. Capture했다고 자동 `reflected` 처리하거나 자동 공개하지 않는다.

## Non-goals

- Feedback 자동 Decision 승격
- Feedback 자동 반영 판정
- Feedback 신뢰도 점수화
- 여러 Feedback 자동 병합
- Scout에게 Builder 내부 Review 상태 공개
