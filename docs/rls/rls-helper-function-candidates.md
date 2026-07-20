# RLS helper function 후보

> 본 문서는 helper function 후보를 정리한다. 실제 SQL function을 생성하지 않는다.

## 1. helper 후보가 필요한 이유

RLS 정책에서 다음 조건은 반복되거나 직접 표현하기 어렵다.

- Project Owner 판별
- Project 공개 상태 판별
- 링크 공개 share_token 검증
- Change Card 공개 조건 판별
- Feedback Request 접근 가능 여부 판별
- Feedback 작성자 또는 Project Owner 판별

## 2. 후보 목록

### is_project_owner(project_id, user_id)

- 목적: 접근자가 Project Owner인지 확인한다.
- 입력: Project ID, auth user ID 후보
- 반환: boolean
- 참조 테이블 후보: `projects`, `builder_profiles`, `user_profiles`
- 사용 정책 후보: Project update, Change Card insert/update, Rough Note/AI Draft 내부 정책
- 관련 Test Case ID: `PRJ-UPD-001`, `OWN-002`, `CC-APP-001`
- 보안 위험: user_id와 builder profile 연결이 정확해야 한다.

### can_read_project(project_id, user_id, share_token 후보)

- 목적: 공개/링크/Owner 조건을 통합 판단한다.
- 입력: Project ID, auth user ID, share_token 후보
- 반환: boolean
- 사용 정책 후보: public project page, problem/hypothesis, feedback request
- 관련 Test Case ID: `PRJ-READ-001`~`PRJ-READ-006`, `LINK-001`~`LINK-012`
- 검토할 점: anon 접근에서 user_id가 없을 때 처리.

### can_read_public_project(project_id)

- 목적: 전체 공개 Project인지 확인한다.
- 관련 Test Case ID: `PRJ-READ-004`, `PRJ-READ-005`, `PP-002`

### can_read_link_shared_project(project_id, share_token 후보)

- 목적: 링크 공개 Project의 token 접근 조건을 검증한다.
- 관련 Test Case ID: `LINK-001`~`LINK-016`
- 보안 위험:
  - token 원문 저장 금지 후보
  - token hash 저장 후보
  - token 비교 timing 및 노출 위험
  - RLS에서 request token 접근 방식 불명확
- 실제 구현 전 검토할 점: RPC 기반 검증 또는 edge/API 계층 검증.

### can_read_public_change_card(change_card_id, 접근 context)

- 목적: 공개 Timeline 조건을 통합한다.
- 조건: Project 공개 조건 + 승인됨 + 공개됨 + 민감도 일반.
- 관련 Test Case ID: `CC-PUBLIC-001`~`CC-PUBLIC-005`, `CC-STATUS-001`~`CC-STATUS-003`

### can_create_feedback(feedback_request_id, user_id, share_token 후보)

- 목적: Feedback 작성 가능 여부를 판단한다.
- 조건: 로그인 사용자 + 공개 Feedback Request + Project 접근 조건.
- 링크 공개 조건: 유효 share_token 필요.
- 관련 Test Case ID: `FB-CREATE-001`~`FB-CREATE-003`, `FB-LINK-002`, `FB-LINK-003`

### can_read_feedback(feedback_id, user_id)

- 목적: Feedback 작성자, Project Owner, 공개 선택 상태를 판단한다.
- 관련 Test Case ID: `FB-READ-001`~`FB-READ-004`, `FB-PUB-002`

### is_feedback_author(feedback_id, user_id)

- 목적: Feedback 작성자 자기 읽기 여부를 판단한다.
- 관련 Test Case ID: `FB-READ-001`

## 3. helper 후보의 공통 주의점

- helper는 실제 migration 단계에서만 생성 여부를 결정한다.
- helper가 RLS 우회 경로가 되지 않아야 한다.
- SECURITY DEFINER 사용 여부는 별도 보안 검토가 필요하다.
- share_token 검증 helper는 token 원문 저장과 직접 비교를 피하는 방향으로 검토한다.
