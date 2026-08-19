# Phase 39 External Feedback → Capture Evidence Bridge

## 목적

External Feedback을 자동 Decision으로 승격하지 않고 Builder의 기존 판단 루프로 다시 진입시킨다.

```text
External Feedback
→ Builder: Capture as evidence
→ private Rough Note
→ AI structuring
→ Decision Candidate
→ Builder Review
→ approved Decision
```

## 고정 원칙

- Scout Feedback 자체는 Decision이 아니다.
- `Capture as evidence`는 Builder의 명시적 선택이다.
- 선택된 Feedback은 일반 Capture triage를 다시 거치지 않는다. AI는 구조화만 수행한다.
- AI 실패 시 Feedback 원문과 Request 맥락을 포함한 Rough Note는 먼저 보존되어야 한다.
- Decision Candidate는 기존 Review 승인 경계를 그대로 거친다.
- Rough Note의 Feedback provenance는 private이다.
- 공식 Decision으로 승인될 경우 기존 `change_cards.linked_feedback_id`에 provenance가 승계된다.
- Public Project Map의 공개 조건은 기존 approved + published + normal 경계를 그대로 사용한다.

## 데이터 계약

Phase 39 migration 16은 `rough_notes.source_feedback_id`를 추가한다.

- nullable FK → `feedbacks.id`
- active Rough Note 기준 동일 Feedback 중복 Capture 차단
- Feedback과 Rough Note Project 일치 검증
- 생성 후 `source_feedback_id` 직접 변경 차단
- public-safe view에는 추가하지 않음

기존 `convert_ai_draft_to_change_card(...)` RPC signature는 변경하지 않는다.
RPC가 source Rough Note의 `source_feedback_id`를 읽어 새 Change Card의 `linked_feedback_id`로 승계한다.

## 회귀 케이스

| ID | 조건 | 행위 | 기대 |
| --- | --- | --- | --- |
| P39-FB-001 | Project Owner + 자신의 Project Feedback | Capture as evidence | Rough Note 생성 허용 |
| P39-FB-002 | 다른 Project의 Feedback id | Capture as evidence | 차단 |
| P39-FB-003 | archived Feedback / Request | Capture as evidence | 차단 |
| P39-FB-004 | 동일 Feedback의 active evidence Capture 존재 | 다시 Capture | 중복 생성 차단, 기존 Review로 이동 |
| P39-FB-005 | Feedback evidence Capture 생성 | AI 처리 | triage hold 없이 structured candidate 생성 |
| P39-FB-006 | AI generation 실패 | Capture 상태 확인 | Rough Note 보존 + retry 가능 |
| P39-FB-007 | Feedback evidence retry | AI 처리 | 일반 triage가 아니라 evidence structuring 재시도 |
| P39-FB-008 | Candidate 생성 전 | 공식 Decision 조회 | 새 공식 Decision 없음 |
| P39-FB-009 | Builder가 Candidate 승인 | Change Card 확인 | `linked_feedback_id`가 source Feedback id와 일치 |
| P39-FB-010 | Builder가 Candidate 수정 후 승인 | Change Card 확인 | Builder 수정 내용 + provenance 모두 보존 |
| P39-FB-011 | Rough Note `source_feedback_id` 직접 변경 | UPDATE | DB trigger 차단 |
| P39-FB-012 | Feedback과 다른 Project id로 evidence Rough Note 생성 | INSERT | DB trigger 차단 |
| P39-FB-013 | public-safe views | source_feedback_id 조회 시도 | 필드 비노출 |

## 비목표

- Feedback 자동 승인
- Feedback 자동 공개
- Feedback review_status = reflected 자동 전환
- 여러 Feedback을 한 Candidate에 자동 병합
- Scout가 Builder Review 상태를 보는 기능
- AI가 Feedback의 신뢰도나 작성자를 점수화하는 기능
