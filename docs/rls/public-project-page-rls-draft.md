# Public Project Page RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 핵심 원칙

Public Project Page는 별도 원천 테이블이 아니다. 공개 페이지는 원천 테이블의 공개 읽기 정책을 조합해 구성되는 파생 뷰다.

## 2. 공개 페이지 구성 원천

| 공개 페이지 요소 | 원천 테이블 후보 | 필요한 정책 후보 | 관련 Test Case ID | 노출 가능 여부 |
|---|---|---|---|---|
| Project 공개 정보 | `projects` | `project_select_public`, `project_select_link_shared` | `PP-001`~`PP-005` | 조건부 가능 |
| Builder 공개 Profile | `builder_profiles` | `builder_profile_select_public` | `PP-006`, `PP-007` | 조건부 가능 |
| Problem Definition 현재값 | `problem_definitions` | `problem_definition_select_public` | `PP-005`, `PH-PD-003`, `PH-PD-004` | 조건부 가능 |
| Hypothesis 현재값 | `hypotheses` | `hypothesis_select_public` | `PH-HY-005`, `PH-HY-006` | 조건부 가능 |
| 공개 Change Card | `change_cards` | `change_card_select_public` | `PP-010`~`PP-013` | 조건부 가능 |
| Feedback Request | `feedback_requests` | `feedback_request_select_public` | `PP-014` | 조건부 가능 |
| 공개 선택 Feedback | `feedbacks` | `feedback_select_public_selected` | `PP-015`, `PP-016` | 조건부 가능 |
| Project Link | `project_links` | `project_link_select_public` 후보 | `PP-017` | 조건부 가능 |
| Rough Note | `rough_notes` | 없음 | `PP-008` | 차단 |
| AI Draft | `ai_structured_drafts` | 없음 | `PP-009` | 차단 |

## 3. 공개 페이지 접근 정책 조합

```sql
-- draft only / conceptual
-- Public Project Page read =
-- project_select_public OR project_select_link_shared
-- + 공개 가능한 원천 테이블별 select policy
```

- 관련 Test Case ID: `PP-001`~`PP-018`
- 공개 페이지는 원천 정책을 초과해서 데이터를 보여주면 안 된다.

## 4. 노출하지 않는 정보

- Rough Note
- AI Draft
- 내부 전용 Change Card
- 공개 가능 상태 Change Card
- 민감 정보 포함 Change Card
- 내부 검토 Feedback
- 인증 ID
- 이메일
- 내부 user ID

## 5. 추가 검토 필요

- 공개 페이지용 SQL view를 만들지 여부.
- 컬럼 수준 정보 노출 제한을 view/API 레이어에서 처리할지.
- public_slug 기반 route와 share_token 기반 route를 어떻게 분리할지.
