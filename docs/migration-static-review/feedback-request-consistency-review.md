# Feedback Request Consistency Review

## 문제

`feedback_requests.change_card_id`가 존재할 때, 해당 Change Card가 `feedback_requests.project_id`와 같은 Project 소속인지 보장해야 한다.

## 현재 11단계 SQL draft 상태

- `feedback_requests.project_id`는 필수 후보다.
- `feedback_requests.change_card_id`는 선택 후보다.
- `feedbacks.project_id`는 저장하지 않는 방향을 유지한다.
- Change Card-level Feedback Request는 `change_card_id`가 존재하는 요청으로 표현한다.

## 기존 constraint 후보의 한계

단순 check constraint는 같은 row 내부 조건에는 적합하지만, 다른 테이블의 `change_cards.project_id`와 비교하는 데에는 제한이 있다. 따라서 cross-table consistency는 trigger 또는 application validation 후보가 필요하다.

## 1차 권장 방향

- `feedback_request.project_id`는 필수.
- `change_card_id is null`이면 Project-level Feedback Request.
- `change_card_id is not null`이면 Change Card-level Feedback Request.
- 이때 `change_cards.project_id = feedback_requests.project_id`여야 한다.
- dry-run 전 SQL draft에는 TODO 또는 trigger 후보를 보강한다.

## 보정 후보

| 방식 | 장점 | 단점 | 12단계 판단 |
|---|---|---|---|
| DB trigger | DB 무결성 강함 | trigger 문법/성능 검증 필요 | 후보 |
| application validation | UX 제어 쉬움 | DB 우회 시 무결성 약함 | 병행 후보 |
| RPC 생성 경계 | 생성 경로 통제 가능 | RPC 책임 증가 | 후순위 후보 |

## 실제 migration 전 결정 필요

**필수**다. 최소한 trigger 후보 또는 application validation 후보 중 하나를 13단계 dry-run 전 보강해야 한다.
