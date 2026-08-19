# Phase 41 — Feedback Outcome Closure

## Decision

External Feedback의 처리 결과는 Builder가 명시적으로 닫는다.

```text
Feedback
→ Capture 여부
→ Review / Decision 진행 여부
→ Builder Outcome
   - reflected
   - not_reflected
```

Decision이 생성되었다는 사실만으로 Feedback을 자동 `reflected` 처리하지 않는다. 반대로 `reflected`는 반드시 새 Decision이 존재해야만 가능한 상태로 제한하지 않는다. BuildMap의 Decision History에 남길 정도의 방향 판단이 아닌 작은 반영도 존재할 수 있기 때문이다.

## Source-of-truth

- `feedbacks.review_status`
  - `new` / `reviewing`: outcome unresolved
  - `reflected`: Builder가 반영되었다고 판정
  - `not_reflected`: Builder가 반영하지 않기로 판정
- `rough_notes.source_feedback_id`: Feedback이 evidence Capture로 들어갔는지 확인
- `ai_structured_drafts.rough_note_id`: Capture가 AI structuring / Review 후보로 진행됐는지 확인
- `change_cards.linked_feedback_id` 및 `change_cards.rough_note_id`: Feedback이 Change Card / Decision으로 이어졌는지 확인

## Authority boundary

- Scout는 Feedback을 제출한다.
- Builder는 Feedback을 Capture할지 선택한다.
- AI는 후보를 구조화한다.
- Builder는 Decision 승인 여부를 결정한다.
- Builder만 Feedback Outcome을 `reflected` / `not_reflected`로 닫는다.

어떤 단계도 다음 단계의 판정을 자동으로 대신하지 않는다.

## UI contract

Feedback Workspace는 각 응답에 대해 다음을 구분해서 보여준다.

1. Evidence path
   - Not captured
   - Captured
   - AI structuring / Review candidate
   - Decision pending
   - Approved Decision
2. Outcome
   - Unresolved
   - Reflected
   - Not reflected
3. Linked Decision
   - 실제 DB link가 존재하는 경우에만 표시
   - 없는 경우 텍스트 유사도나 AI로 추정하지 않음

## Non-goals

- Decision 생성 시 자동 `reflected`
- `not_reflected` 자동 판정
- Feedback 가치 점수화
- 여러 Feedback의 자동 병합
- Scout에게 Builder 내부 처리 상태 공개
- Public Feedback view에 internal outcome/provenance 추가
