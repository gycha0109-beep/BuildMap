# Function Permission Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 목적

helper, trigger function, public RPC의 execute permission이 의도보다 넓게 열리지 않았는지 확인한다.

| Scenario ID | 항목 | actor | 실행 후보 | 기대 결과 | 관련 파일 | 조치 기준 |
|---|---|---|---|---|---|---|
| FUNC-RUN-001 | internal helper direct execute | `anon` | `current_user_profile_id()`, `is_project_owner()` direct call 후보 | 필요 범위 외 차단 또는 안전한 null/false | `08_grants_and_final_checks` | broad execute grant 확인 시 patch |
| FUNC-RUN-002 | trigger function direct execute | `anon`, `authenticated_non_owner` | `prevent_approved_change_card_content_mutation()` direct call 후보 | 직접 실행 차단 후보 | `08_grants_and_final_checks` | PUBLIC execute revoke 필요 |
| FUNC-RUN-003 | public RPC execute scope | `anon` | `get_link_shared_*` read RPC | read RPC만 허용 후보 | `07_link_sharing_rpc`, `08_grants` | write RPC 노출 시 blocker |
| FUNC-RUN-004 | authenticated RPC execute scope | `authenticated` | `create_link_shared_feedback` | authenticated + valid token 필요 | `07_link_sharing_rpc`, `08_grants` | token 없이 허용 시 blocker |
| FUNC-RUN-005 | broad execute grant 없음 | `anon`, `authenticated` | function grant 확인 후보 | 과다 grant 없음 | `08_grants` | GRANT_ERROR |
| FUNC-RUN-006 | PUBLIC execute revoke | `anon` | helper direct call | 내부 helper 노출 안 됨 | `08_grants` | helper exposure patch |
| FUNC-RUN-007 | function signature mismatch | local DB | grant/revoke 대상 signature 확인 | grant/revoke가 실제 signature와 일치 | `08_grants` | signature patch |
| FUNC-RUN-008 | helper private state leak | `anon` | helper 직접 호출 후보 | private state 누출 없음 | `04_helpers`, `08_grants` | helper exposure patch |

## 권한 과다 노출 기준

- 내부 helper가 anon에게 의미 있는 private 상태를 반환하면 blocker다.
- trigger function이 외부에서 직접 호출 가능하면 patch 후보로 본다.
- `GRANT EXECUTE ON ALL FUNCTIONS`처럼 넓은 grant가 감지되면 `GRANT_ERROR`로 분류한다.
- public RPC는 link_shared read 목적에 한정한다.
- write RPC는 authenticated + token/project 조건이 필요하다.

## 권한 확인 SQL 후보

```sql
-- LOCAL ONLY CANDIDATE.
-- function privilege inventory candidate
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
```

```sql
-- LOCAL ONLY CANDIDATE.
-- direct helper call candidates. Expected: denied or safe null/false.
select public.current_user_profile_id();
select public.is_project_owner('<PROJECT_ID>'::uuid);
```

직접 helper 호출이 private state를 드러내면 `GRANT_ERROR` 또는 `UNEXPECTED_ALLOW`로 분류한다.
