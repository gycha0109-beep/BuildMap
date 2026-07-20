# Change Card Access Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


Change Card의 공개 조건 `Project 공개 정책 + approved + published + normal`을 반복 검증한다.

| Scenario ID | 관련 7.5 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | pass/fail 기준 | 실패 분류 | 관련 SQL draft 파일 | 로그에 남길 내용 |
|---|---|---|---|---|---|---|---|---|---|
| CC-RUN-001 | CC-READ-* | `project_owner_builder` | owner project cards | `change_cards` select 후보 | Owner는 자신의 project Change Card를 읽는다 | row 반환 | PASS/UNEXPECTED_DENY | `05_rls_policies` | row count |
| CC-RUN-002 | CC-READ-* | `authenticated_non_owner` | private project cards | `change_cards` select 후보 | non-owner는 private card를 읽지 못한다 | row 0 또는 deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| CC-RUN-003 | CC-READ-* | `anon` | public project + approved/published/normal card | `public_change_cards` select 후보 | 외부 공개 가능 | row 반환 | PASS/VIEW_ACCESS_ERROR | `06_public_safe_views` | 노출 컬럼 |
| CC-RUN-004 | CC-READ-* | `anon` | sensitive card | `public_change_cards` select 후보 | sensitive card 외부 차단 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | row count |
| CC-RUN-005 | CC-READ-* | `anon` | internal card | `public_change_cards` select 후보 | internal card 외부 차단 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | row count |
| CC-RUN-006 | CC-READ-* | `anon` | draft card + published visibility | `public_change_cards` select 후보 | approved가 아니면 외부 차단 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | work_status |
| CC-RUN-007 | PRJ-READ-006 | `anon` | private project + published normal card | `public_decision_timeline` select 후보 | Project private이면 외부 차단 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | project visibility |
| CC-RUN-008 | CC-MUT-* | `project_owner_builder` | owner draft/editing card | approve update 후보 | Owner approve 가능 후보 | update 성공 | PASS/UNEXPECTED_DENY | `05_rls_policies` | approved_at 설정 |
| CC-RUN-009 | CC-MUT-* | `non_owner_builder` | owner 불일치 card | approve update 후보 | non-owner approve 차단 | permission denied 또는 row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| CC-RUN-010 | CC-MUT-* | `project_owner_builder` | owner approved card | publish update 후보 | Owner publish 가능 후보 | update 성공 | PASS/UNEXPECTED_DENY | `05_rls_policies` | visibility_status |
| CC-RUN-011 | CC-MUT-* | `non_owner_builder` | owner 불일치 card | publish update 후보 | non-owner publish 차단 | permission denied 또는 row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |

## 실행 원칙

- 모든 SQL/RPC는 local DB 전용 후보로만 다룬다.
- actor 전환 후 `auth.uid()` 기대값을 먼저 확인한다.
- 기대 차단이 허용되면 `UNEXPECTED_ALLOW`로 분류하고 즉시 중단 후보로 본다.
- 로그에는 secret, raw token, DB URL, password를 남기지 않는다.

## SQL 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE.
-- CC-RUN-003 public read via public-safe view
select id, title, structured_summary
from public.public_change_cards
where project_id = '<PUBLIC_PROJECT_ID>';

-- CC-RUN-004 sensitive card must be absent
select id
from public.public_change_cards
where id = '<SENSITIVE_CHANGE_CARD_ID>';
```

```sql
-- LOCAL ONLY CANDIDATE.
-- CC-RUN-008 owner approve candidate
update public.change_cards
set work_status = 'approved',
    approved_at = now(),
    approved_by_builder_profile_id = '<OWNER_BUILDER_PROFILE_ID>'
where id = '<DRAFT_CHANGE_CARD_ID>'
returning id, work_status, approved_at, approved_by_builder_profile_id;

-- CC-RUN-009 non-owner approve denied candidate
update public.change_cards
set work_status = 'approved',
    approved_at = now(),
    approved_by_builder_profile_id = '<NON_OWNER_BUILDER_PROFILE_ID>'
where id = '<OWNER_CHANGE_CARD_ID>';
```
