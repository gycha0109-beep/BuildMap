# Migration Draft Overview

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. migration draft의 목적

migration draft는 실제 Supabase migration 파일을 만들기 전에 스키마, RLS, helper, view, RPC, trigger 후보를 한 번에 검토하기 위한 설계 문서다.

이 문서는 BuildMap의 핵심 원천 기록인 Change Card를 중심으로 다음 흐름을 migration 가능한 형태로 정리한다.

```text
Auth User
→ User Profile
→ Builder Profile
→ Project
→ Problem Definition / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card
→ Public-safe View / Secure RPC
→ Feedback Request
→ Feedback
```

## 2. 실제 migration과의 차이

| 구분 | 9단계 migration draft | 실제 migration |
|---|---|---|
| 목적 | 검토와 보정 | DB 적용 |
| 위치 | `docs/migration-draft/*.md` | `supabase/migrations/*.sql` 후보 |
| 실행 | 실행 금지 | 후속 단계에서만 실행 후보 |
| SQL 문법 | 검토용 | 실제 문법 검증 필요 |
| RLS | 정책 초안 | 실제 `CREATE POLICY` |

## 3. 9단계에서 작성할 SQL 초안의 범위

- `create table` 후보
- `check constraint` 후보
- `foreign key` 후보
- `create view` 후보
- `create function` / RPC 후보
- `create policy` 후보
- `trigger` 후보
- `index` 후보

단, 모든 SQL은 실행용 최종본이 아니라 초안이다.

## 4. 9단계에서 작성하지 않을 것

- 실제 `.sql` 파일
- 실제 migration
- DB 실행
- API route
- 프론트엔드 코드
- 자동화 테스트 코드
- 관리자/팀/조직 권한

## 5. 주요 생성 후보

### Table 후보

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

### Constraint 후보

- 상태값 check constraint
- `public_slug` unique 후보
- `share_token_hash` nullable unique 후보
- Change Card 승인 후 수정 제한 trigger 후보
- Feedback 작성자 위조 방지 helper/policy 후보

### Public-safe View 후보

- `public_project_cards`
- `public_project_pages`
- `public_decision_timeline`
- `public_change_cards`
- `public_feedback_requests`
- `public_feedbacks`
- `public_builder_profiles`
- `public_project_links`

### Secure RPC 후보

- `get_link_shared_project_page`
- `get_link_shared_decision_timeline`
- `get_link_shared_feedback_requests`
- `create_link_shared_feedback`

## 6. 8.5단계 보안 보정 반영 요약

- `share_token` 원문 저장 금지
- `share_token_hash` 저장 후보
- 전체 공개 조회는 public-safe view 후보
- 링크 공개 조회는 secure RPC 후보
- 공개 응답에 내부 식별자 노출 금지
- 공개 Feedback은 원천 row 전체 직접 노출 금지
- 승인된 Change Card 수정 제한 후보 포함

## 7. 10단계로 넘어가기 전 필요한 확인 사항

- `share_token` 검증을 secure RPC로 확정할지
- token hash 알고리즘을 무엇으로 둘지
- public-safe view에 `security_invoker` 옵션을 적용할지
- 실제 Supabase 문법에서 view/RLS/RPC 조합이 기대대로 동작하는지
- 승인된 Change Card 수정 제한을 trigger로 둘지 application validation으로 둘지
