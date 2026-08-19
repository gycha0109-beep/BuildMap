# Phase 40 — Decision ↔ Evidence Traceability

## Decision

Builder는 승인된 Decision에서 실제 source record까지 역추적할 수 있어야 한다.

```text
Approved Decision
→ recorded evidence summary
→ source Rough Note / Capture
→ External Feedback (if linked)
→ Feedback Request context (if linked)
```

이 trace는 Builder 내부 read-side이며 Public Project Map의 공개 데이터 계약을 확장하지 않는다.

## Why

Phase 39는 External Feedback provenance를 `rough_notes.source_feedback_id`와 `change_cards.linked_feedback_id`에 보존했다. 그러나 저장만 되고 읽을 수 없다면 provenance는 실제 제품 기능이 아니다.

Phase 40은 공식 Decision이 어떤 Capture에서 나왔고, 해당 Capture가 External Feedback에서 시작했다면 어떤 Feedback / Feedback Request였는지 확인할 수 있게 한다.

## Source-of-truth rules

- `change_cards.rough_note_id`가 Decision → Capture 연결의 authority다.
- `change_cards.linked_feedback_id`가 Decision → Feedback 연결의 authority다.
- `rough_notes.source_feedback_id`는 Capture → Feedback provenance를 검증하는 보조 연결이다.
- 연결 ID가 없으면 텍스트 유사도나 AI로 출처를 추정하지 않는다.
- 연결 ID가 있지만 source record를 읽을 수 없으면 unavailable 상태로 표시한다.
- `linked_feedback_id`와 `source_feedback_id`가 동시에 존재하면서 다르면 자동 보정하지 않고 mismatch를 표시한다.

## UX

Project Workspace에 `Evidence` 탭을 추가한다.

각 승인 Decision에 대해 다음을 분리해서 보여준다.

1. Decision에 기록된 Evidence 요약
2. 원본 Builder Capture
3. 연결된 External Feedback
4. 해당 Feedback Request의 질문과 공개 맥락

Decision 및 Feedback Workspace로 이동할 수 있지만 trace 자체에서 record를 수정하지 않는다.

## Privacy boundary

Evidence trace는 Builder-only 내부 화면이다.

조회하지 않는 값:

- Feedback author auth user id
- Feedback author user profile id
- 이메일
- 기타 Scout identity private data

Public-safe view, public Decision Timeline, Scout surface는 변경하지 않는다.

## Non-goals

- source record 자동 추론
- Evidence 신뢰도 scoring
- 여러 Feedback 자동 집계
- provenance 자동 수정
- Scout에게 내부 Capture 공개
- Public Project Map에 내부 Feedback review state 공개
