# BuildMap 11단계 Supabase Migration File Draft

## 목적

11단계는 실제 적용이 아니라 `supabase/migrations_draft`에 검토용 SQL 파일 초안을 작성하는 단계다.

## 10단계 review와의 관계

10단계에서 도출한 blocker를 해소하는 방향을 SQL draft에 반영한다.

- secure RPC `SECURITY DEFINER` / `search_path` / grant template
- `share_token_hash` 알고리즘 후보
- Feedback author spoofing 방지
- public Feedback view 컬럼 제한

## SQL draft 파일 목록

- `supabase/migrations_draft/20260708000000_buildmap_00_extensions_and_primitives_draft.sql`
- `supabase/migrations_draft/20260708001000_buildmap_01_core_schema_draft.sql`
- `supabase/migrations_draft/20260708002000_buildmap_02_decision_records_schema_draft.sql`
- `supabase/migrations_draft/20260708003000_buildmap_03_feedback_and_links_schema_draft.sql`
- `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
- `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql`
- `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql`
- `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
- `supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

## 읽는 순서

1. `blocker-resolution.md`
2. `sql-file-map.md`
3. `test-case-policy-file-mapping.md`
4. `apply-prohibition.md`
5. `manual-verification-next.md`
6. `known-open-items.md`
7. `docs/decisions/phase11-supabase-migration-file-draft-scope.md`

## 이번 단계에서 허용한 것

- 검토용 SQL draft 파일 생성
- SQL 주석에 위험/검증 필요 사항 명시
- 정책/테스트/파일 매핑 문서화

## 이번 단계에서 금지한 것

- 정식 `supabase/migrations` 생성
- Supabase CLI 실행
- DB 적용
- 실제 helper/RPC/view/trigger 생성
- API/프론트엔드/테스트 코드 작성

## 11단계 핵심 결론

이번 단계의 결과물은 실제 migration이 아니라 **migration 직전 검토용 파일 초안**이다.

## 12단계 정적 검수 문서 안내

12단계에서는 11단계 SQL draft를 실제로 실행하지 않고 정적으로 검수한다. Dry-run 준비와 예상 실패 목록은 `docs/migration-static-review/README.md`를 먼저 확인한다.
