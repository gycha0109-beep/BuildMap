# Helper Function Exposure Review

## 목적

helper function은 RLS 정책 가독성을 높이지만, 직접 호출 노출과 순환 의존성 위험을 만든다. 12단계에서는 helper가 외부 API처럼 노출되지 않도록 권한 경계를 검수한다.

## 핵심 원칙

- RLS 내부 사용 helper와 외부 호출 RPC를 구분한다.
- `share_token` 관련 검증은 helper가 아니라 secure RPC 경계로 분리한다.
- 내부 helper는 `PUBLIC EXECUTE` revoke 후보로 둔다.
- `current_user_profile_id()`가 null을 반환하면 관련 정책은 안전하게 차단되어야 한다.

## Helper별 검수

| Helper | RLS 사용 가능성 | SECURITY DEFINER 필요성 | 주요 위험 | 보정 제안 |
|---|---|---|---|---|
| `current_user_profile_id()` | 높음 | 후보 | null 처리, auth schema 접근 | null이면 차단되는 정책 확인 |
| `is_project_owner(project_id)` | 높음 | 후보 | builder profile 관계 오판 | `projects.owner_builder_profile_id` 기준 확인 |
| `is_project_owner_by_builder(builder_profile_id)` | 중간 | 후보 | helper 직접 호출 노출 | 내부 사용만 유지 |
| `can_read_public_project(project_id)` | 높음 | 낮음/후보 | public/link_shared 혼동 | 전체 공개만 처리하고 link_shared는 RPC |
| `can_read_public_change_card(change_card_id)` | 높음 | 후보 | Project visibility와 card 상태 누락 | `approved + published + normal` 포함 |
| `can_insert_feedback(feedback_request_id, author_user_profile_id)` | 높음 | 후보 | author spoofing, request 접근 조건 누락 | current user profile 일치 필수 |
| `can_read_feedback(feedback_id)` | 중간 | 후보 | 내부 Feedback 과다 노출 | owner 또는 author 또는 public_selected만 |

## 순환 의존성 위험

helper가 RLS 보호 테이블을 다시 조회하면 정책 평가 중 순환 또는 성능 문제가 생길 수 있다. dry-run에서는 다음을 확인한다.

- helper 호출 시 무한 재귀가 발생하지 않는가.
- helper가 필요한 최소 테이블만 조회하는가.
- helper가 결과를 과도하게 넓히지 않는가.

## Dry-run 검증 항목

1. `current_user_profile_id()`가 비로그인 환경에서 null이 되는가.
2. null일 때 insert/update가 차단되는가.
3. `is_project_owner()`가 다른 Project에 대해 false를 반환하는가.
4. `can_insert_feedback()`이 author spoofing을 차단하는가.
5. helper function 직접 호출 grant가 열려 있지 않은가.
