# Change Card Approval Mutation Patch

## 수정 제한 필요성

Approved Change Card는 Decision Timeline의 원천 기록이다. 승인 이후 핵심 본문과 승인 필드가 사후 수정되면 판단 흐름의 신뢰성이 깨진다.

## 기존 제한 필드

- `structured_summary`
- `evidence`
- `decision`
- `change_content`
- `next_check`
- `linked_problem_definition_id`
- `linked_hypothesis_id`
- `linked_feedback_id`

## 13단계 추가 제한 필드

- `approved_at`
- `approved_by_builder_profile_id`
- `work_status` 되돌리기

## 허용 후보 필드

- `visibility_status`
- `sensitivity_status`
- `archived_at`
- `updated_at` 자동 갱신

단, 허용 후보도 Project Owner 권한을 전제로 한다.

## 최초 승인 transition과 승인 후 수정 제한

`draft/editing -> approved` 최초 승인 transition은 RLS owner check와 함께 허용 후보로 둔다. 단, `OLD.work_status = 'approved'`인 이후에는 핵심 필드와 승인 필드 직접 수정을 제한한다.

## 제품 정책

승인 후 내용 변경이 필요하면 기존 Change Card를 수정하지 않고 새 Change Card 생성을 유도한다.

## SQL draft 반영 위치

- `20260708004000_buildmap_04_helpers_and_triggers_draft.sql`

## dry-run 테스트 후보

- approved Change Card의 본문 수정 차단
- `approved_at` 수정 차단
- `approved_by_builder_profile_id` 수정 차단
- approved 상태에서 draft/editing/held로 되돌리기 차단
- `visibility_status` 변경은 Owner에게 허용 후보인지 확인
