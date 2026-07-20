# Change Card Approval Integrity Review

## 목적

Change Card는 BuildMap의 핵심 원천 기록이다. 승인된 Change Card의 핵심 내용과 승인 메타데이터가 사후 조작되면 Decision Timeline의 신뢰가 깨진다.

## 승인 후 변경 금지 후보

- `structured_summary`
- `evidence`
- `decision`
- `change_content`
- `next_check`
- `linked_problem_definition_id`
- `linked_hypothesis_id`
- `linked_feedback_id`
- `approved_at`
- `approved_by_builder_profile_id`

## 승인 후 변경 가능 후보

- `visibility_status`
- `sensitivity_status`
- `archived_at`
- `updated_at` 자동 갱신

단, 변경 가능 후보도 Project Owner만 가능해야 한다.

## `work_status` 사후 변경 위험

검토해야 할 질문:

- `approved` 상태에서 `draft`, `editing`, `held`로 되돌릴 수 있는가?
- 되돌리기를 금지할 것인가?
- `archived_at`만 허용할 것인가?
- 운영 예외는 후순위로 둘 것인가?

## 1차 권장

- approved 상태의 핵심 본문/근거/판단/연결근거/승인자/승인시각 직접 수정 제한.
- `work_status` approved 되돌리기는 원칙적으로 제한 후보.
- 공개 상태/민감도/보관 처리는 Project Owner 변경 가능 후보.
- 내용 변경이 필요하면 새 Change Card 작성 유도.

## RLS와 trigger 역할 분리

| 영역 | RLS | Trigger |
|---|---|---|
| 누가 수정 가능한가 | Project Owner 제한 | 보조 |
| 어떤 컬럼이 수정 가능한가 | 제한 어려움 | 적합 |
| 승인 필드 사후 조작 방지 | 부분적 | 적합 |
| UX 예외 처리 | 어려움 | app validation 병행 |

## Dry-run 테스트 후보

1. approved 카드의 `decision` 수정 시 실패.
2. approved 카드의 `approved_at` 수정 시 실패.
3. approved 카드의 `approved_by_builder_profile_id` 수정 시 실패.
4. approved 카드의 `visibility_status` 변경은 Project Owner에게 허용 후보.
5. approved 카드의 `work_status` 되돌리기 시도는 실패 후보.
