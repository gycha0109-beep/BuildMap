# Schema Draft Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 대상

- `user_profiles`
- `builder_profiles`
- `projects`
- `problem_definitions`
- `hypotheses`
- `rough_notes`
- `ai_structured_drafts`
- `change_cards`
- `feedback_requests`
- `feedbacks`
- `project_links`

## 2. 테이블별 검수

| 테이블 후보 | 목적 정합성 | 필드 후보 정합성 | FK 후보 정합성 | public/private 분리 | 8.5 반영 | 보정 항목 | 11단계 전 확정 |
|---|---|---|---|---|---|---|---|
| `user_profiles` | 적합 | 표시 정보/내부 정보 분리 필요 | `auth.users(id)` 후보 적합 | 공개 view에서 내부 ID 제외 필요 | 반영 | 공개 표시명 필드 범위 | 테이블명 / auth FK |
| `builder_profiles` | 적합 | 공개 Profile 필드 필요 | `user_profiles` FK 적합 | 공개 Builder view 필요 | 반영 | 공개 여부 필드 후보 | 1차 필드 최소화 |
| `projects` | 적합 | `share_token_hash`, `public_slug` 반영 | owner builder FK 적합 | 원천 row 직접 공개 금지 | 반영 | `last_activity_at` 저장 여부 | `share_token_hash` index/unique |
| `problem_definitions` | 적합 | 현재값 중심 적합 | project FK 적합 | Project 공개 상태 의존 | 반영 | 자체 visibility 필요성 | 민감 problem 처리 방식 |
| `hypotheses` | 적합 | 상태값 check 적합 | project FK 적합 | Project 공개 상태 의존 | 반영 | 자체 visibility 필요성 | 상태 변경 기록 정책 |
| `rough_notes` | 적합 | 내부 원문 필드 적합 | project/builder FK 필요 | 외부 완전 차단 | 반영 | 전환 후 수정 제한 | trigger/app validation |
| `ai_structured_drafts` | 적합 | draft status 반영 | rough note/project FK 필요 | 외부 완전 차단 | 반영 | 전환 관계 명확화 | converted change card FK |
| `change_cards` | 핵심 원천으로 적합 | 필드 다소 많음 | 직접 선택 FK 적합 | 공개 조건 필수 | 반영 | `type` 명명, 승인 후 수정 제한 | approved mutation boundary |
| `feedback_requests` | 적합 | Project/Change Card 대상 축소 유지 | project FK 필수 | 공개/내부 요청 분리 | 반영 | target constraint | Project 또는 Change Card 대상 |
| `feedbacks` | 적합 | `project_id` 중복 후보 주의 | request/author FK 필요 | 공개 row 직접 노출 금지 | 반영 | author spoofing 방지 | project_id 저장 여부 |
| `project_links` | 선택 데이터로 적합 | 공개 가능 링크 구분 필요 | project FK 적합 | public view 제한 | 반영 | 공개/내부 링크 구분 | 1차 포함 여부 |

## 3. 필수 검토 항목

### 3.1 `feedbacks.project_id` 중복 저장 여부

`feedbacks`는 `feedback_request_id`를 통해 Project를 알 수 있다. `project_id`를 중복 저장하면 query/RLS는 쉬워지지만 불일치 위험이 생긴다.

1차 권장:

- `feedback_request_id`는 필수.
- `project_id`는 중복 저장 후보로 유지하되, 저장한다면 trigger/constraint로 request의 project와 일치시켜야 한다.
- 불일치 방지 장치가 없다면 저장하지 않는 편이 안전하다.

### 3.2 `problem_definitions` / `hypotheses` 자체 visibility

현재 draft는 Project 공개 상태를 기준으로 공개 여부를 판단한다. 다만 민감한 문제 정의나 가설이 있을 수 있으므로 후속 검토가 필요하다.

1차 권장:

- 자체 visibility 필드는 1차에서 보류 가능.
- 공개 페이지에 올릴 현재값은 Builder가 공개 가능한 내용만 입력한다는 운영 정책으로 시작.
- 민감도 필드가 필요해지면 2차 보정.

### 3.3 `last_activity_at`

탐색 정렬에 현실적으로 유용하다. 단, 어떤 이벤트가 갱신하는지 명확해야 한다.

1차 권장:

- 저장 후보 유지.
- 갱신 이벤트는 Change Card 승인, 공개 Feedback Request 생성, 공개 상태 변경 정도로 제한.
- trigger로 자동화할지 application에서 갱신할지는 후속 결정.

### 3.4 `approved_by_builder_profile_id`

1차는 Project Owner 승인으로 제한하지만, 승인자 기록은 감사 가능성 측면에서 유용하다.

1차 권장:

- 필드 후보 유지.
- 값은 Project Owner의 builder profile로 기록.
- Owner 외 승인 권한은 부여하지 않는다.

### 3.5 `archived_at`

soft delete 후보로 유용하지만 모든 정책에 `archived_at is null` 조건이 필요해진다.

1차 권장:

- 주요 원천 테이블에는 후보 유지.
- 공개 view/RLS에는 반드시 archived row 제외 조건을 검토.

## 4. 11단계 전 확정할 항목

1. `feedbacks.project_id` 저장 여부
2. `change_cards.type` 명명 변경 여부
3. `share_token_hash` unique/partial unique 방식
4. `last_activity_at` 저장 및 갱신 방식
5. 승인된 Change Card 수정 제한 구현 경계
6. public-safe view에 포함할 컬럼 최종 목록
