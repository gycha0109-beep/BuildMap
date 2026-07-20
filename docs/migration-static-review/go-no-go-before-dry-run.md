# Go / No-Go Before Dry-run

## 판단 기준

| 항목 | 상태 | 비고 |
|---|---|---|
| SQL draft 파일이 draft 경로에만 있는가 | Go | `supabase/migrations_draft` 유지 |
| 정식 migrations 디렉터리로 이동하지 않았는가 | Go | 실제 적용 금지 유지 |
| public-safe view access model이 실험 항목으로 명확한가 | Conditional Go | security_invoker/source grant 검증 필요 |
| SECURITY DEFINER RPC template이 검수되었는가 | Conditional Go | search_path/grant/return 검증 필요 |
| helper function execute 권한 위험이 검수되었는가 | Conditional Go | REVOKE/GRANT 패턴 필요 |
| feedback_requests project consistency 보정 필요가 문서화되었는가 | Conditional Go | trigger/app validation 후보 |
| Feedback author spoofing 방지가 검수되었는가 | Conditional Go | helper/RLS/trigger/RPC 모두 검증 |
| approved Change Card approval fields mutation 위험이 검수되었는가 | Conditional Go | trigger 범위 보강 필요 |
| 7.5 Test Case mapping gap이 정리되었는가 | Conditional Go | 일부 보강 필요 |
| dry-run command plan이 문서화되었는가 | Go | 실행은 하지 않음 |
| expected failure catalog가 문서화되었는가 | Go | blocker/high 구분 |
| remote DB 적용 금지 원칙이 유지되는가 | Go | remote 적용 금지 |

## 종합 판정

**Conditional Go**

13단계 local dry-run 준비로 넘어갈 수 있다. 단, dry-run 전 SQL patch 또는 TODO 보강을 먼저 진행하는 것이 안전하다.

## No-Go로 전환되는 조건

- `supabase/migrations_draft` 파일을 정식 `supabase/migrations`로 이동하는 경우
- remote Supabase 연결이 감지되는 경우
- helper/RPC execute grant가 지나치게 넓게 열리는 경우
- public-safe view가 source table broad anon select를 요구하는데 대안 없이 진행하는 경우
- Feedback author spoofing 방지 조건이 빠진 상태로 dry-run을 진행하려는 경우


## 13단계 patch 후 업데이트

13단계 Pre Dry-run SQL Patch에서 다음 보정이 SQL draft와 보조 문서에 반영되었다.

- helper/RPC/trigger function `PUBLIC EXECUTE` revoke/grant 후보 보강
- secure RPC `SECURITY DEFINER` / `search_path` / grant template 보강
- `feedback_requests.change_card_id`와 `project_id` 정합성 trigger 후보 추가
- approved Change Card의 `approved_at`, `approved_by_builder_profile_id`, `work_status` 사후 조작 제한 후보 추가
- public-safe view 실패 시 RPC/API 전환 기준 문서화
- 7.5 Test Case ID 매핑을 token/view/feedback/change-card 중심으로 보강

### patch 후 종합 판정

**Conditional Go 유지**

14단계 local dry-run 실행 후보로 넘어갈 수 있다. 단, 실행은 사용자가 직접 수행하고 실패 로그를 가져오는 방식으로 진행한다. 실제 Supabase CLI 실행, DB 적용, 정식 migration 이동은 아직 금지한다.
