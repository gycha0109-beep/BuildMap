# Protected Scope and Hash Policy

## 보호 파일

Phase26 baseline manifest는 다음 18개 파일을 SHA-256으로 고정한다.

### Migration draft 9개

- `supabase/migrations_draft/20260708000000_buildmap_00_extensions_and_primitives_draft.sql`
- `supabase/migrations_draft/20260708001000_buildmap_01_core_schema_draft.sql`
- `supabase/migrations_draft/20260708002000_buildmap_02_decision_records_schema_draft.sql`
- `supabase/migrations_draft/20260708003000_buildmap_03_feedback_and_links_schema_draft.sql`
- `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
- `supabase/migrations_draft/20260708005000_buildmap_05_rls_policies_draft.sql`
- `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql`
- `supabase/migrations_draft/20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
- `supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

### Phase25 SQL 8개

- `scripts/manual-local-link-sharing/phase25_00_preflight.sql`
- `scripts/manual-local-link-sharing/phase25_01_seed_link_fixture.sql`
- `scripts/manual-local-link-sharing/phase25_02_read_rpc_matrix.sql`
- `scripts/manual-local-link-sharing/phase25_03_token_lifecycle_matrix.sql`
- `scripts/manual-local-link-sharing/phase25_04_feedback_rpc_matrix.sql`
- `scripts/manual-local-link-sharing/phase25_05_rpc_permission_security.sql`
- `scripts/manual-local-link-sharing/phase25_06_response_exposure.sql`
- `scripts/manual-local-link-sharing/phase25_99_result_summary.sql`

### Runner 1개

- `scripts/manual-local-link-sharing/run-phase25-link-sharing-local.ps1`

## 보호하지 않는 파일

문서, 결과 로그, Phase26 gate 자체는 Phase25 runtime baseline의 직접 입력이 아니므로 동일한 hash 목록에 넣지 않는다.

Phase26 gate 자체는 PowerShell parser로 검사한다. baseline JSON을 self-hash하거나 gate script가 자기 hash를 검증하도록 만들면 갱신 순환이 생기므로 채택하지 않는다.

## hash mismatch 의미

hash mismatch 자체가 결함이라는 뜻은 아니다. 다음 중 하나다.

1. 의도하지 않은 변경
2. 의도한 보안·계약 변경
3. 줄바꿈/인코딩만 달라진 변경
4. 기준선 파일을 잘못 복사한 상태

어떤 경우든 기존 Phase25 PASS와 동일한 파일이라고 판정할 수 없으므로 gate는 FAIL한다.

## 금지

- 변경된 파일에 맞춰 hash만 조용히 재생성
- SQL 실행 없이 baseline 갱신
- scenario 삭제 후 expected count 축소
- 실패를 피하기 위한 wrapper signal 약화
- raw token/hash/internal id 노출 허용
- remote 적용으로 local 검증 대체
