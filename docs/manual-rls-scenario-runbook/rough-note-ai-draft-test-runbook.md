# Rough Note / AI Draft Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


Rough Note와 AI Structured Draft가 모든 공개 정책에서 제외되는지 검증한다.

| Scenario ID | 관련 7.5 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | pass/fail 기준 | 실패 분류 | 관련 SQL draft 파일 | 로그에 남길 내용 |
|---|---|---|---|---|---|---|---|---|---|
| RNAI-RUN-001 | RNAI-RN-002 | `project_owner_builder` | owner rough note | `rough_notes` select 후보 | owner read 가능 후보 | row 반환 | PASS/UNEXPECTED_DENY | `05_rls_policies` | row count |
| RNAI-RUN-002 | RNAI-RN-003 | `authenticated_non_owner` | non-owner rough note | `rough_notes` select 후보 | non-owner read 차단 | row 0/deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| RNAI-RUN-003 | RNAI-RN-004 | `anon` | rough note | `rough_notes` select 후보 | anon read 차단 | row 0/deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | query |
| RNAI-RUN-004 | RNAI-RN-006 | `anon` | public project + rough note | public-safe view read 후보 | public project여도 rough note 미노출 | 컬럼/row 없음 | EXPECTED_DENY/UNEXPECTED_ALLOW | `06_public_safe_views` | view columns |
| RNAI-RUN-005 | RNAI-AI-002 | `project_owner_builder` | owner AI draft | `ai_structured_drafts` select 후보 | owner read 가능 후보 | row 반환 | PASS/UNEXPECTED_DENY | `05_rls_policies` | row count |
| RNAI-RUN-006 | RNAI-AI-003 | `authenticated_non_owner` | non-owner AI draft | `ai_structured_drafts` select 후보 | non-owner read 차단 | row 0/deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | deny 형태 |
| RNAI-RUN-007 | RNAI-AI-004 | `anon` | AI draft | `ai_structured_drafts` select 후보 | anon read 차단 | row 0/deny | EXPECTED_DENY/UNEXPECTED_ALLOW | `05_rls_policies` | query |
| RNAI-RUN-008 | RNAI-AI-005, RNAI-AI-006 | `anon` | public project with rough note/AI draft | public view column/row 확인 | public-safe views에 rough note/AI draft 미포함 | 컬럼 미존재 | PASS/UNEXPECTED_ALLOW | `06_public_safe_views` | column list |

## 실행 원칙

- 모든 SQL/RPC는 local DB 전용 후보로만 다룬다.
- actor 전환 후 `auth.uid()` 기대값을 먼저 확인한다.
- 기대 차단이 허용되면 `UNEXPECTED_ALLOW`로 분류하고 즉시 중단 후보로 본다.
- 로그에는 secret, raw token, DB URL, password를 남기지 않는다.

## SQL 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE.
-- RNAI-RUN-001 owner read
select id, body
from public.rough_notes
where id = '<OWNER_ROUGH_NOTE_ID>';

-- RNAI-RUN-003 anon read denied candidate
select id, body
from public.rough_notes
where id = '<OWNER_ROUGH_NOTE_ID>';

-- RNAI-RUN-005 owner AI draft read
select id, structured_summary, status
from public.ai_structured_drafts
where id = '<OWNER_AI_DRAFT_ID>';
```

```sql
-- LOCAL ONLY CANDIDATE.
-- RNAI-RUN-008 public-safe views must not include rough note / AI draft columns
select *
from public.public_project_pages
where id = '<PUBLIC_PROJECT_ID>';
```

`body`, `rough_note_id`, `ai_draft_id`, AI draft 본문이 public-safe view에 보이면 blocker로 기록한다.
