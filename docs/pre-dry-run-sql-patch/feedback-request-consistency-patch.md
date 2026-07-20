# Feedback Request Consistency Patch

## 문제

`feedback_requests.change_card_id`가 존재할 때, 해당 Change Card가 `feedback_requests.project_id`와 다른 Project에 속하면 피드백 요청이 잘못된 판단에 연결될 수 있다.

## 12단계 검수 결과

- `feedback_requests.project_id`는 필수다.
- `change_card_id = null`이면 Project-level Feedback Request다.
- `change_card_id is not null`이면 Change Card-level Feedback Request다.
- 이 경우 `change_cards.project_id = feedback_requests.project_id`여야 한다.
- check constraint만으로 cross-table consistency를 보장하기 어렵다.

## 13단계 보정

`validate_feedback_request_target_project()` trigger function 후보를 `04_helpers_and_triggers` 파일에 추가했다.

## SQL draft 반영 위치

- `20260708004000_buildmap_04_helpers_and_triggers_draft.sql`

## 남은 검증 항목

- trigger 문법 검증
- RLS interaction 검증
- update 시 기존 Feedback Request 변경 정책 검증
- application validation 병행 여부

## dry-run 테스트 후보

- Project A의 Feedback Request에 Project B의 Change Card 연결 시 차단
- `change_card_id = null`인 Project-level Feedback Request는 허용
- archived Change Card target은 차단 후보로 동작하는지 확인
