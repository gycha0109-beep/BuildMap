# RLS Helper Function Feasibility

## 1. 검토 목적

8단계 RLS 초안은 여러 helper function 후보를 제시했다. 8.5단계에서는 각 helper가 실제 RLS에서 적합한지, RPC/API로 미루는 것이 나은지 검토한다.

## 2. Helper 후보 요약

| Helper 후보 | 8.5 판단 |
|---|---|
| `is_project_owner(project_id, user_id)` | RLS helper로 적합 |
| `can_read_project(project_id, user_id, share_token)` | share_token 포함 시 추가 검토 필요 |
| `can_read_public_project(project_id)` | RLS helper로 적합 후보 |
| `can_read_link_shared_project(project_id, share_token)` | secure RPC/API 우선 검토 |
| `can_read_public_change_card(change_card_id, context)` | public-safe 경계와 함께 검토 |
| `can_create_feedback(feedback_request_id, user_id, share_token)` | 링크 공개 조건 때문에 RPC/API 검토 필요 |
| `can_read_feedback(feedback_id, user_id)` | RLS helper 후보 |
| `is_feedback_author(feedback_id, user_id)` | RLS helper 후보 |

## 3. is_project_owner(project_id, user_id)

- 목적: Project Owner 여부 확인
- 입력 후보: project id, current user id
- 출력 의미: 해당 사용자가 Project Owner이면 true
- 참조 테이블 후보: projects, builder_profiles, user_profiles
- RLS 사용 가능성: 높음
- 보안 위험: 낮음. 단, auth user와 user profile 관계가 확정되어야 함
- 관련 Test Case ID: PROJ-001, PROJ-006, OWN-004
- migration draft 전 결정: 실제 user profile / builder profile 관계

## 4. can_read_project(project_id, user_id, share_token 후보)

- 목적: Project 공개 상태와 Owner 접근을 통합 판단
- 입력 후보: project id, current user id, share_token 후보
- RLS 사용 가능성: 부분 가능
- 위험: share_token을 RLS helper 입력으로 넣는 방식이 복잡함
- 8.5 판단: Owner/public read는 helper 후보, link shared read는 secure RPC/API 우선 검토
- 관련 Test Case ID: PROJ-001~014, LINK-001~012

## 5. can_read_public_project(project_id)

- 목적: 전체 공개 Project 읽기 조건 확인
- 입력 후보: project id
- 출력 의미: Project가 전체 공개이고 공개 가능한 상태이면 true
- RLS 사용 가능성: 높음
- 관련 Test Case ID: PROJ-004, PROJ-005, PP-002
- 보정 판단: RLS helper 후보로 유지

## 6. can_read_link_shared_project(project_id, share_token 후보)

- 목적: 링크 공개 Project 접근 검증
- RLS 사용 가능성: 추가 검토 필요
- 위험:
  - token 원문 전달 방식
  - token hash 비교 위치
  - 로그 노출
  - client 직접 select와의 결합 위험
- 8.5 판단: secure RPC 또는 API 조합을 우선 검토, RLS helper는 보조 후보
- 관련 Test Case ID: LINK-002, LINK-004, LINK-005, LINK-006, LINK-011, LINK-012

## 7. can_read_public_change_card(change_card_id, 접근 context)

- 목적: 공개 Timeline에 Change Card가 노출 가능한지 판단
- 필요한 조건:
  - Project 공개 정책 만족
  - Change Card 승인됨
  - Change Card 공개됨
  - Change Card 민감도 일반
- RLS 사용 가능성: 높음. 단, 링크 공개 context가 들어오면 추가 검토 필요
- 관련 Test Case ID: CC-PUBLIC-001~018
- 8.5 판단: 전체 공개는 RLS helper 후보, 링크 공개는 RPC/API 경계와 함께 검토

## 8. can_create_feedback(feedback_request_id, user_id, share_token 후보)

- 목적: Feedback 작성 가능 여부 확인
- 필요한 조건:
  - 로그인 사용자
  - 공개 Feedback Request
  - Project 접근 조건 만족
  - 링크 공개이면 유효 share_token 조건
- RLS 사용 가능성: 부분 가능
- 위험: 링크 공개 token 검증과 Feedback insert가 결합됨
- 8.5 판단: 전체 공개 Feedback은 RLS로 가능 후보, 링크 공개 Feedback은 secure RPC/API 검토 필요
- 관련 Test Case ID: FB-007, FB-008, FB-009, FB-019, FB-020

## 9. can_read_feedback(feedback_id, user_id)

- 목적: Feedback 작성자/Project Owner/공개 선택 Feedback 읽기 판단
- RLS 사용 가능성: 높음
- 주의: 공개 선택 Feedback의 원천 row 전체 노출은 피해야 함
- 관련 Test Case ID: FB-010~017
- 8.5 판단: 내부 읽기 helper 후보. 공개 응답은 public-safe boundary 필요

## 10. is_feedback_author(feedback_id, user_id)

- 목적: 사용자가 자기 Feedback을 읽을 수 있는지 확인
- RLS 사용 가능성: 높음
- 전제: feedback author가 현재 auth user와 연결된 user profile로 저장되어야 함
- 관련 Test Case ID: FB-010
- 8.5 판단: helper 후보 유지

## 11. 결론

RLS helper는 Owner 확인, public 상태 확인, 내부 읽기 정책에는 적합하다. 그러나 `share_token`을 직접 다루는 helper는 보안 위험이 크므로 secure RPC 또는 API 조합을 우선 검토한다.
