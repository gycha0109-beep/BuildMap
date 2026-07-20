# Feedback Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


Feedback이 Feedback Request 기반으로만 생성되고, author spoofing과 내부 feedback 공개가 차단되는지 검증한다.

| Scenario ID | 관련 7.5 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | pass/fail 기준 | 실패 분류 | 관련 SQL draft 파일 | 로그에 남길 내용 |
|---|---|---|---|---|---|---|---|---|---|
| FB-RUN-001 | FB-REQ-005 | `anon` | public project + public Feedback Request | `public_feedback_requests` select 후보 | public Feedback Request read 가능 후보 | row 반환 | PASS/VIEW_ACCESS_ERROR | `06_public_safe_views` | row/columns |
| FB-RUN-002 | FB-REQ-* | `anon` | internal Feedback Request | `public_feedback_requests` select 후보 | internal request 외부 차단 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | visibility |
| FB-RUN-003 | FB-CREATE-001, FB-CREATE-002 | `anon` | public Feedback Request | feedback insert 후보 | feedback insert는 authenticated 필요 | deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| FB-RUN-004 | FB-CREATE-003 | `authenticated_non_owner` | feedback_request_id 없음 | feedback insert 후보 | feedback_request_id 필수 | constraint/RLS deny | EXPECTED_DENY/SCHEMA-FAIL | `03_feedback_and_links_schema` | error summary |
| FB-RUN-005 | FB-AUTH-* | `feedback_author` | 정상 author_user_profile_id | feedback insert 후보 | `author_user_profile_id = current_user_profile_id()` 강제 | insert 성공 | PASS/UNEXPECTED_DENY | `04_helpers_and_triggers`, `05_rls_policies` | author role |
| FB-RUN-006 | FB-AUTH-* | `authenticated_non_owner` | 다른 `author_user_profile_id` | feedback insert 후보 | author spoofing 차단 | deny/trigger error | EXPECTED_DENY/UNEXPECTED_ALLOW | `04_helpers_and_triggers` | error class |
| FB-RUN-007 | FB-* | `authenticated_owner` | feedback row | column 확인 후보 | `feedbacks.project_id` 미저장 검증 | column 없음 | PASS/SCHEMA-FAIL | `03_feedback_and_links_schema` | column list |
| FB-RUN-008 | FR-CONS-* | `project_owner_builder` | same project card request | feedback_request insert 후보 | valid project consistency 허용 | insert 성공 | PASS/UNEXPECTED_DENY | `04_helpers_and_triggers` | FR id 마스킹 |
| FB-RUN-009 | FR-CONS-* | `project_owner_builder` | 다른 project의 change_card_id | feedback_request insert 후보 | project mismatch 차단 | trigger error | EXPECTED_DENY/UNEXPECTED_ALLOW | `04_helpers_and_triggers` | error summary |
| FB-RUN-010 | FB-REVIEW-* | `project_owner_builder` | own project feedback | review_status update 후보 | Owner review update 가능 후보 | update 성공 | PASS/UNEXPECTED_DENY | `05_rls_policies` | status |
| FB-RUN-011 | FB-REVIEW-* | `authenticated_non_owner` | owner 불일치 feedback | review_status update 후보 | non-owner review update 차단 | deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| FB-RUN-012 | FB-PUBLIC-* | `anon` | public_selected Feedback | `public_feedbacks` select 후보 | public selected feedback 노출 | row 반환, author id 없음 | PASS/VIEW_ACCESS_ERROR | `06_public_safe_views` | columns |
| FB-RUN-013 | FB-PUBLIC-* | `anon` | internal Feedback | `public_feedbacks` select 후보 | internal feedback 미노출 | row 0 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | row count |
| FB-RUN-014 | FB-PUBLIC-* | `anon` | public feedback | view column 확인 | `author_user_profile_id` 미노출 | column 없음 | PASS/UNEXPECTED_ALLOW | `06_public_safe_views` | column list |

## 실행 원칙

- 모든 SQL/RPC는 local DB 전용 후보로만 다룬다.
- actor 전환 후 `auth.uid()` 기대값을 먼저 확인한다.
- 기대 차단이 허용되면 `UNEXPECTED_ALLOW`로 분류하고 즉시 중단 후보로 본다.
- 로그에는 secret, raw token, DB URL, password를 남기지 않는다.

## SQL 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE.
-- FB-RUN-003 authenticated feedback insert candidate
insert into public.feedbacks (
  feedback_request_id,
  author_user_profile_id,
  body,
  feedback_type,
  tester_interest
)
values (
  '<PUBLIC_FEEDBACK_REQUEST_ID>',
  '<CURRENT_USER_PROFILE_ID>',
  'local-only feedback body',
  'understanding',
  false
)
returning id, feedback_request_id, author_user_profile_id;
```

```sql
-- LOCAL ONLY CANDIDATE. EXPECTED DENY.
-- FB-RUN-006 author spoofing denied
insert into public.feedbacks (
  feedback_request_id,
  author_user_profile_id,
  body
)
values (
  '<PUBLIC_FEEDBACK_REQUEST_ID>',
  '<OTHER_USER_PROFILE_ID>',
  'spoof attempt'
);
```

```sql
-- LOCAL ONLY CANDIDATE.
-- FB-RUN-014 public feedback view must not expose author_user_profile_id
select *
from public.public_feedbacks
where feedback_request_id = '<PUBLIC_FEEDBACK_REQUEST_ID>';
```

`author_user_profile_id`, auth id, email이 public feedback 응답에 보이면 P0 blocker다.
