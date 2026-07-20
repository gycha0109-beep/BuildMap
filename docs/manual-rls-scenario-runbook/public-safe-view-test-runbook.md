# Public-safe View Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


public-safe view는 전체 공개 카드/목록/Timeline 후보로 유지한다. 단, source table broad anon select 없이 공개 가능한 row/column만 노출해야 한다.

| VIEW-RUN ID | View | actor | 기대 row | 제외 row | 기대 column | 제외 column | `security_invoker` 확인 | 실패 시 RPC/API 전환 기준 |
|---|---|---|---|---|---|---|---|---|
| VIEW-RUN-001 | public_builder_profiles | `anon`, `authenticated_non_owner` | 공개 builder profile | auth id, email, private profile | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-002 | public_project_cards | `anon`, `authenticated_non_owner` | 전체 공개 project card | private/link token-only project, share_token_hash | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-003 | public_project_pages | `anon`, `authenticated_non_owner` | 전체 공개 project page 후보 | private project, internal notes | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-004 | public_change_cards | `anon`, `authenticated_non_owner` | approved + published + normal card | draft/internal/sensitive/private project card | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-005 | public_decision_timeline | `anon`, `authenticated_non_owner` | public project의 공개 timeline row | draft/internal/sensitive/private project card | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-006 | public_feedback_requests | `anon`, `authenticated_non_owner` | public Feedback Request | internal Feedback Request | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-007 | public_feedbacks | `anon`, `authenticated_non_owner` | public_selected Feedback | internal_review Feedback, author_user_profile_id | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |
| VIEW-RUN-008 | public_project_links | `anon`, `authenticated_non_owner` | public Project Link | internal Project Link | public-safe fields only | internal identifiers/token/hash/rough note/AI draft | security_invoker 동작 확인 | 접근 불가 충돌 또는 내부 노출 시 RPC/API 전환 |

## 반드시 제외 확인

- `email`
- auth id
- internal user id
- `owner_user_profile_id`
- `author_user_profile_id`
- `share_token_hash`
- Rough Note 원문
- AI Draft 본문
- internal Change Card
- sensitive Change Card
- internal Feedback

## 판정 기준

| 결과 | 판정 |
|---|---|
| 공개 row만 보이고 제외 column이 없음 | PASS |
| 접근이 막혀 public view 자체가 동작하지 않음 | VIEW_ACCESS_ERROR, boundary patch 후보 |
| 내부 row 또는 민감 column이 보임 | UNEXPECTED_ALLOW, P0 blocker |
| view가 source table broad anon select를 요구함 | boundary 재검토, RPC/API 전환 후보 |

## View 조회 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE.
select *
from public.public_project_cards
limit 20;

select *
from public.public_decision_timeline
where project_id = '<PUBLIC_PROJECT_ID>';

select *
from public.public_feedbacks
where feedback_request_id = '<PUBLIC_FEEDBACK_REQUEST_ID>';
```

## 컬럼 검사 후보

```sql
-- LOCAL ONLY CANDIDATE.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'public_project_cards',
    'public_decision_timeline',
    'public_feedbacks'
  )
order by table_name, ordinal_position;
```

제외 컬럼이 발견되면 `VIEW_ACCESS_ERROR` 또는 `UNEXPECTED_ALLOW`로 분류한다.
