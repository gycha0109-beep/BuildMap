# 아직 검증되지 않은 영역

`supabase db reset`과 `supabase db lint --local`은 schema application과 schema lint를 확인한다. 아래 항목은 실제 actor, row state, token, function grant, trigger behavior를 사용한 manual scenario test가 필요하다.

| 항목 | 왜 아직 미검증인가 | 필요한 manual test | 관련 SQL draft 파일 | 관련 7.5 Test Case ID 후보 |
|---|---|---|---|---|
| RLS SELECT / INSERT / UPDATE / DELETE/archive behavior | RLS는 적용 가능하더라도 actor별 실제 허용/차단 결과는 db reset/lint가 검증하지 않는다. | actor별 select/insert/update/delete/archive 후보 SQL을 실행해 expected allow/deny를 기록한다. | `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql` | PRJ-READ-001, PRJ-UPD-001, CC-*, FB-* |
| owner read/update | 소유자 helper와 RLS policy가 실제 row에 대해 일치하는지 확인하지 않았다. | owner profile과 project를 만든 뒤 read/update 허용 여부를 검증한다. | `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`, `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql` | PRJ-READ-001, PRJ-UPD-001 |
| public read | public-safe view와 원천 table broad anon select 차단의 조합을 실제로 확인하지 않았다. | anon actor로 public view read와 source table direct read를 비교한다. | `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql`, `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql` | PRJ-READ-004, PP-COL-* |
| link shared read | share_token_hash, revoked, rotated, wrong token 조합을 실제 RPC로 검증하지 않았다. | valid/wrong/missing/revoked/old token으로 secure RPC 결과를 비교한다. | `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql` | LINK-001~LINK-012 |
| Feedback insert author spoofing | trigger/RLS/RPC 후보가 author spoofing을 차단하는지 실제 insert로 검증하지 않았다. | current_user_profile_id와 다른 author_user_profile_id insert를 시도한다. | `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`, `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql`, `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql` | FB-AUTH-*, FB-CREATE-* |
| Feedback Request project consistency | change_card_id가 다른 project에 속할 때 feedback_request 생성이 차단되는지 검증하지 않았다. | project_id와 change_card_id mismatch 데이터로 insert/update를 시도한다. | `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`, `supabase/migrations_draft/20260708003000_buildmap_03_feedback_and_links_schema_draft.sql` | FR-CONS-* |
| public-safe view column exposure | view 생성은 lint됐지만 내부 id/hash/author 필드가 실제 결과에서 빠지는지 확인하지 않았다. | 각 public-safe view의 column list와 sample row를 확인한다. | `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql` | PP-COL-* |
| security_invoker view access model | security_invoker가 source table RLS/grant와 충돌하지 않는지 실제 actor 접근 검증이 필요하다. | anon/authenticated actor로 view read와 source table direct read를 비교한다. | `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql`, `supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql` | PP-VIEW-* |
| secure RPC token scenarios | RPC가 token 실패 응답을 통일하고 internal id/hash를 숨기는지 확인하지 않았다. | missing/wrong/revoked/old/valid token matrix를 실행한다. | `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql` | LINK-*, RPC-* |
| function execute permission exposure | grant script 문법/lint와 실제 execute 권한 노출은 다르다. | PUBLIC/authenticated/anon 별 direct function execute를 시도한다. | `supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql` | GRANT-* |
| approved Change Card mutation trigger | 승인 이후 핵심 본문/승인 필드 변경 차단이 실제 trigger에서 동작하는지 확인하지 않았다. | approved card에 content/approved_at/approved_by/work_status 변경을 시도한다. | `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql` | CC-MUT-* |
| Rough Note / AI Draft external block | public project에서도 rough note/ai draft가 외부 노출되지 않는지 확인하지 않았다. | anon/non-owner actor로 raw table/view 접근을 시도한다. | `supabase/migrations_draft/20260708002000_buildmap_02_decision_records_schema_draft.sql`, `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql`, `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql` | RNAI-* |
| private Project + public Change Card external block | Change Card가 공개되어도 Project가 private이면 외부 차단되는지 실제로 검증하지 않았다. | private project + approved/published/normal card 조합에서 public read를 시도한다. | `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql`, `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql` | PRJ-READ-006, CC-READ-* |
| public Feedback author display | public_feedbacks view가 author_user_profile_id를 숨기고 표시명/역할만 노출하는지 확인하지 않았다. | public selected feedback row의 column과 표시값을 확인한다. | `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql` | FB-PRIV-*, PP-COL-* |
| share_token revoked/rotated/wrong/missing scenarios | token 상태별 접근 차단/허용이 실제 RPC에서 동일하게 작동하는지 확인하지 않았다. | missing/wrong/revoked/old/new token을 각각 실행한다. | `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql` | LINK-001, LINK-004, LINK-005, LINK-011, LINK-012 |

## 공통 판정 원칙

- `UNEXPECTED_ALLOW`는 보안 blocker로 분류한다.
- `UNEXPECTED_DENY`는 제품 동작 또는 helper/view/RPC boundary 수정 후보로 분류한다.
- token, author spoofing, private Project 노출, Rough Note / AI Draft 노출은 최우선 차단 영역이다.
