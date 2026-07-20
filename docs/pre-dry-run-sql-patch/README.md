# BuildMap 13단계 Pre Dry-run SQL Patch

## 목적

13단계는 12단계 Supabase Migration Draft Static Review / Dry-run Preparation에서 확인한 dry-run 전 보정사항을 11단계 `supabase/migrations_draft` SQL draft와 보조 문서에 반영하는 단계다.

이번 단계는 구현 적용이 아니다. SQL draft는 계속 `DRAFT ONLY - DO NOT APPLY DIRECTLY` 상태이며, Supabase CLI 실행, `supabase db lint`, local dry-run, DB 적용, 정식 `supabase/migrations` 이동은 하지 않는다.

## 12단계 static review와의 관계

12단계에서 다음 위험이 확인되었다.

- public-safe view의 `security_invoker` / source table grant / RLS 충돌 가능성
- `SECURITY DEFINER` RPC의 `search_path`, grant, 반환 컬럼 제한 위험
- helper function의 `PUBLIC EXECUTE` 기본 노출 위험
- `feedback_requests.change_card_id`와 `project_id` 정합성 위험
- approved Change Card의 `approved_at`, `approved_by_builder_profile_id`, `work_status` 사후 조작 위험
- Feedback author spoofing 방지 조건 검증 필요
- 7.5 Test Case ID와 SQL draft 매핑 누락 위험

13단계는 이 위험을 dry-run 전에 줄이는 patch 단계다.

## 11단계 SQL draft와의 관계

11단계에서 생성한 `supabase/migrations_draft` SQL 파일을 patch 대상으로 삼았다. 정식 migration 파일로 승격하지 않았다.

## 이번 단계에서 수행한 patch 범위

- helper/RPC/trigger function `EXECUTE` 권한 revoke/grant 후보 보강
- secure RPC template 보강
- public-safe view 접근 모델 결정 문서화
- `feedback_requests` target project consistency trigger 후보 추가
- Feedback author integrity 보강
- approved Change Card mutation boundary 보강
- RLS `USING` / `WITH CHECK` 주석 및 조건 보강
- 7.5 Test Case ID / 8단계 Policy ID / SQL file mapping 보강
- no execution 상태 재확인

## 이번 단계에서 수행하지 않은 것

- SQL 실행
- Supabase CLI 실행
- `supabase db lint` 실행
- local dry-run 실행
- Supabase 프로젝트 연결
- 정식 `supabase/migrations` 이동
- API / 프론트엔드 / 자동화 테스트 구현

## 생성 및 수정한 문서 목록

- `patch-overview.md`
- `sql-draft-patch-map.md`
- `function-execute-permission-patch.md`
- `secure-rpc-template-patch.md`
- `public-safe-view-access-decision.md`
- `feedback-request-consistency-patch.md`
- `feedback-author-integrity-patch.md`
- `change-card-approval-mutation-patch.md`
- `rls-policy-patch-notes.md`
- `test-case-mapping-patch.md`
- `dry-run-readiness-after-patch.md`
- `no-execution-confirmation.md`
- `docs/decisions/phase13-pre-dry-run-sql-patch-scope.md`

## SQL draft 수정 대상 목록

- `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
- `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql`
- `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql`
- `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
- `supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

## 읽는 순서

1. `patch-overview.md`
2. `sql-draft-patch-map.md`
3. `function-execute-permission-patch.md`
4. `secure-rpc-template-patch.md`
5. `public-safe-view-access-decision.md`
6. `feedback-request-consistency-patch.md`
7. `change-card-approval-mutation-patch.md`
8. `test-case-mapping-patch.md`
9. `dry-run-readiness-after-patch.md`
10. `no-execution-confirmation.md`

## 13단계 핵심 결론

13단계 patch 후에도 전체 판정은 **Conditional Go**다. 14단계 local dry-run 실행 후보로 넘어갈 수 있지만, 실행은 사용자가 직접 수행하고 실패 로그를 가져오는 방식으로 진행한다.

- 14단계 local dry-run 결과는 `docs/local-dry-run/README.md`를 확인한다.
