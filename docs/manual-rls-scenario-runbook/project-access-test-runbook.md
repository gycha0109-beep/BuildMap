# Project Access Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


Project 공개 상태와 Project Owner boundary를 검증한다.

| Scenario ID | 관련 7.5 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | pass/fail 기준 | 실패 분류 | 관련 SQL draft 파일 | 로그에 남길 내용 |
|---|---|---|---|---|---|---|---|---|---|
| PRJ-RUN-001 | PRJ-READ-001 | `authenticated_owner` | private project, owner 일치 | `projects` select 후보 | Owner가 자신의 private Project를 읽는다 | row 1개 반환 | PASS 또는 UNEXPECTED_DENY | `05_rls_policies` | row count, actor, project visibility |
| PRJ-RUN-002 | PRJ-READ-002 | `authenticated_non_owner` | private project, owner 불일치 | `projects` select 후보 | Non-owner는 private Project를 읽지 못한다 | row 0 또는 permission denied | EXPECTED_DENY 또는 UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| PRJ-RUN-003 | PRJ-READ-004 | `anon` | public project | `public_project_cards/pages` select 후보 | anon은 public-safe 공개 정보만 읽는다 | 공개 row 반환, 내부 컬럼 없음 | PASS/VIEW_ACCESS_ERROR | `06_public_safe_views` | 노출 컬럼 |
| PRJ-RUN-004 | PRJ-READ-003 | `anon` | private project | source table/view read 후보 | anon은 private Project를 읽지 못한다 | row 0 또는 deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | query 대상 |
| PRJ-RUN-005 | PRJ-READ-006 | `anon` | private project + approved/published/normal Change Card | public timeline/view read 후보 | Project가 private이면 published card도 외부에 노출되지 않는다 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | card id 마스킹 |
| PRJ-RUN-006 | PRJ-UPD-001, PRJ-VIS-001 | `project_owner_builder` | owner project | visibility/lifecycle update 후보 | Project Owner만 변경 가능 후보 | update 성공 | PASS/UNEXPECTED_DENY | `05_rls_policies` | 변경 필드 |
| PRJ-RUN-007 | PRJ-UPD-002 | `non_owner_builder` | owner 불일치 project | project update 후보 | non-owner update 차단 | permission denied 또는 row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |

## 실행 원칙

- 모든 SQL/RPC는 local DB 전용 후보로만 다룬다.
- actor 전환 후 `auth.uid()` 기대값을 먼저 확인한다.
- 기대 차단이 허용되면 `UNEXPECTED_ALLOW`로 분류하고 즉시 중단 후보로 본다.
- 로그에는 secret, raw token, DB URL, password를 남기지 않는다.

## SQL 후보 패턴

아래 SQL은 18단계 local DB에서만 검토 후 실행할 후보다.

```sql
-- LOCAL ONLY CANDIDATE. DO NOT RUN AGAINST REMOTE DB.
-- PRJ-RUN-001 owner reads own private project
select id, title, visibility_status
from public.projects
where id = '<PRIVATE_PROJECT_ID>';

-- PRJ-RUN-006 owner updates project visibility/lifecycle candidate
update public.projects
set visibility_status = 'public',
    lifecycle_status = 'testing'
where id = '<OWNER_PROJECT_ID>'
returning id, visibility_status, lifecycle_status;
```

```sql
-- LOCAL ONLY CANDIDATE. EXPECTED DENY OR ZERO ROW.
-- PRJ-RUN-002 non-owner cannot read private project
select id, title, visibility_status
from public.projects
where id = '<PRIVATE_PROJECT_ID>';

-- PRJ-RUN-007 non-owner update denied
update public.projects
set title = 'should not be allowed'
where id = '<OWNER_PROJECT_ID>';
```
