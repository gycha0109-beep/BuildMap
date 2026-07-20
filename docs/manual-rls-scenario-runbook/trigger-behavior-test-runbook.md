# Trigger Behavior Test Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


| Scenario ID | Trigger / Function | 전제 데이터 | 허용되어야 하는 변경 | 차단되어야 하는 변경 | 기대 에러 | 오탐 가능성 | 누락 가능성 | 다음 patch 후보 |
|---|---|---|---|---|---|---|---|---|
| TRG-RUN-001 | `set_updated_at` | update 가능한 row | 정상 update 시 `updated_at` 갱신 | 없음 | 없음 | updated_at만 바뀌어 diff noise | trigger 누락 | trigger attach 대상 보정 |
| TRG-RUN-002 | `prevent_approved_change_card_content_mutation` | approved Change Card | visibility/sensitivity 후보 변경 | `structured_summary`, `evidence`, `decision`, `change_content`, `next_check` 수정 | mutation blocked 후보 | metadata 수정까지 차단 | 본문 변경 허용 | 차단 필드 조정 |
| TRG-RUN-003 | `prevent_approved_change_card_content_mutation` | approved Change Card | 없음 | `approved_at` 수정 | mutation blocked 후보 | 승인 correction까지 차단 | 승인시각 조작 허용 | trigger 조건 보정 |
| TRG-RUN-004 | `prevent_approved_change_card_content_mutation` | approved Change Card | 없음 | `approved_by_builder_profile_id` 수정 | mutation blocked 후보 | 운영 correction 차단 | 승인자 조작 허용 | trigger 조건 보정 |
| TRG-RUN-005 | `prevent_approved_change_card_content_mutation` | approved Change Card | archive 후보 | `work_status` rollback | mutation blocked 후보 | 정당한 보류 처리 차단 | approved 되돌리기 허용 | workflow 결정 필요 |
| TRG-RUN-006 | `prevent_approved_change_card_content_mutation` | approved Change Card | Owner `visibility_status` 변경 후보 | non-owner 변경 | permission denied 후보 | Owner도 차단 | non-owner 허용 | RLS/trigger 분리 |
| TRG-RUN-007 | `prevent_approved_change_card_content_mutation` | approved Change Card | Owner `sensitivity_status` 변경 후보 | non-owner 변경 | permission denied 후보 | Owner도 차단 | non-owner 허용 | RLS/trigger 분리 |
| TRG-RUN-008 | `prevent_feedback_author_spoofing` | authenticated feedback insert | current user profile과 author 일치 | 다른 `author_user_profile_id` insert/update | author spoofing blocked 후보 | service seed까지 차단 | spoofing 허용 | trigger 조건/role 예외 보정 |
| TRG-RUN-009 | `validate_feedback_request_target_project` | FR + same project card | 같은 project의 request 생성 | 없음 | 없음 | project-level request 차단 | valid mismatch 확인 누락 | 조건 분기 보정 |
| TRG-RUN-010 | `validate_feedback_request_target_project` | FR + other project card | 없음 | 다른 project의 `change_card_id` 연결 | project mismatch blocked 후보 | valid request까지 차단 | mismatch 허용 | trigger 조건 보정 |

## 공통 판정

- 내부 기록 노출이나 author spoofing 허용은 blocker다.
- approved Change Card 핵심 필드 변경 허용은 blocker다.
- trigger 오탐은 `UNEXPECTED_DENY` 또는 `TRIGGER_ERROR`로 기록한다.
- trigger 누락은 `UNEXPECTED_ALLOW` 또는 `TRIGGER_ERROR`로 기록한다.

## Trigger 실행 후보 패턴

```sql
-- LOCAL ONLY CANDIDATE. EXPECTED DENY.
-- TRG-RUN-002 approved content mutation denied
update public.change_cards
set structured_summary = 'should be blocked'
where id = '<APPROVED_CHANGE_CARD_ID>';

-- TRG-RUN-003 approved_at mutation denied
update public.change_cards
set approved_at = now() - interval '7 days'
where id = '<APPROVED_CHANGE_CARD_ID>';

-- TRG-RUN-005 work_status rollback denied
update public.change_cards
set work_status = 'draft'
where id = '<APPROVED_CHANGE_CARD_ID>';
```

```sql
-- LOCAL ONLY CANDIDATE. EXPECTED DENY.
-- TRG-RUN-010 invalid feedback_request target project denied
insert into public.feedback_requests (
  project_id,
  change_card_id,
  created_by_builder_profile_id,
  title,
  question,
  visibility_status
)
values (
  '<PROJECT_A_ID>',
  '<PROJECT_B_CHANGE_CARD_ID>',
  '<OWNER_BUILDER_PROFILE_ID>',
  'invalid target',
  'should be blocked?',
  'public'
);
```
