# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase29.1 Residual SECURITY DEFINER Boundary Hardening — 설계 자체 리뷰/구현/독립 리뷰/정적 검증 완료
- 기준 날짜: 2026-07-21
- 공식 저장소: `gycha0109-beep/BuildMap`
- 작업 브랜치: `agent/phase29-1-security-definer-hardening`
- Phase29 merge commit: `0413ea9a8dafa2e2fb098a2b30b94c75a4a95676`
- hosted/remote/formal migration promotion: 없음
- 사용자 로컬 Phase29.1 runtime: pending

## 보호 기준선

### 이전 사용자 로컬 PASS

- Phase20 P0 RLS: PASS, 147 scenarios
- Phase25 Link Sharing: PASS, 107 scenarios
- Phase26 legacy gate: PASS
- Phase27.1 P1 RLS: PASS, 181 scenarios
- Phase28 unified gate: PASS, 46 protected files / 435 scenarios
- Phase29 corrected static gate: PASS
- Phase29 tracked replay mirror: PASS

### Phase29.1 변경 후 기준선

- migration drafts: exact `00–10`, 11 files
- Phase28 protected files: `47`
- Phase28 packs: `3`
- Phase28 scenario SQL files: `26`
- Phase28 scenarios: `435`
- Phase28 baseline ID: `buildmap-unified-rls-phase28-1-20260721`
- Phase28 evidence status: `PENDING_USER_LOCAL_REVALIDATION`
- Phase29 protected gate/catalog files: `8`
- Phase29 catalog scenarios: `26`
- automatic baseline refresh/promotion: prohibited

## Phase29 종료

- migration `00–09` readiness gate 구현
- destructive SQL, broad grants, PUBLIC EXECUTE, remote URL 차단
- final-definition SECURITY DEFINER 검사
- fresh-install/incremental evidence fail-closed validator
- Windows PowerShell 5.1 relative-path compatibility 보정
- tracked local replay mirror를 formal promotion으로 오판하던 detector 보정
- 사용자 로컬 corrected gate 정확히 PASS
- 실제 blocker `MIG29-BLOCK-001`과 runtime evidence 미완료를 분리
- PR #2 병합 완료

## Phase29.1 구현

### Additive migration

- draft: `supabase/migrations_draft/20260721000000_buildmap_10_security_definer_boundary_hardening_draft.sql`
- local replay mirror: `supabase/migrations/20260721000000_buildmap_10_security_definer_boundary_hardening_draft.sql`
- 기존 `00–09`: 수정 없음

### 보안 보정

`public.is_feedback_author(uuid)`를 다음 계약으로 재정의했다.

- return: `boolean`
- language: `sql`
- volatility: `stable`
- security: `SECURITY DEFINER`
- search path: `pg_catalog, pg_temp`
- qualified objects: `public.feedbacks`, `public.current_user_profile_id()`
- EXECUTE: `PUBLIC`/`anon`/기존 권한 revoke 후 `authenticated`만 grant
- row/data rewrite: 없음

### Gate와 oracle 확장

- Phase28 migration inventory `00–09 → 00–10`
- Phase28 protected files `46 → 47`
- 기존 Phase28 PASS 재사용 금지; evidence status pending 전환
- Phase29 migration count `10 → 11`
- protected gate/catalog files `7 → 8`
- catalog scenarios `16 → 26`
- 신규 `MIG29-HARD-001..010` 추가
- evidence types:
  - `FRESH_INSTALL_00_10`
  - `INCREMENTAL_00_09_TO_10`

## 설계 자체 리뷰 결과

1. migration 10만 추가하면 Phase28 exact inventory가 실패하므로 Phase28 계약을 함께 확장했다.
2. `supabase/migrations`는 formal promotion이 아닌 exact local replay mirror로 유지했다.
3. source-text 검사만으로 부족하여 PostgreSQL catalog oracle 10개를 추가했다.
4. signature 검증은 포맷 의존 문자열 대신 `pronargs`와 `oidvectortypes(proargtypes)`를 사용한다.
5. 변경된 migration set에 기존 사용자 PASS를 자동 계승하지 않는다.

설계 판정: `PASS`

## 구현 리뷰 및 정적 검증

- migration 10 draft/mirror parity: PASS
- normalized migration hash contract: PASS
- search path pinning: PASS
- schema qualification: PASS
- ACL intent: PASS
- Phase28 47-file contract: PASS
- Phase29 11-migration contract: PASS
- Phase29 8-file self-protection: PASS
- 26 catalog scenario IDs unique: PASS
- PowerShell 5.1 compatibility: 유지
- prohibited remote-capable command: 없음
- known security blockers in manifest: `0`
- resolved blocker record: `MIG29-BLOCK-001`
- independent/static verdict: `PASS`

## 현재 정확한 판정

```text
Phase29.1 design: PASS
Phase29.1 implementation: PASS
Phase29.1 static validation: PASS
Security blocker implementation: RESOLVED
User-local runtime: PENDING
PromotionDecision: PROMOTION_HOLD
```

현재 HOLD 사유는 다음 runtime evidence 미완료뿐이다.

1. fresh-install `00–10`
2. incremental `00–09 → 10`
3. 변경 후 Phase20/25/27.1/28 전체 회귀

## 사용자 로컬 예상 결과

Migration 10이 local reset/replay로 적용된 뒤:

```text
Phase28GateResult: PASS
MigrationCount: 11
TrackedReplayMirrorResult: PASS
StaticErrorCount: 0
StaticBlockerCount: 0
Phase29GateResult: PASS
ExpectedScenarioCount: 26
ObservedScenarioCount: 26
CatalogReadinessResult: PASS
PromotionDecision: PROMOTION_HOLD
```

## 절대 제약

- GitHub 저장소를 canonical source로 사용한다.
- Supabase CLI, Docker, psql, SQL runtime은 사용자 로컬 PC에서만 실행한다.
- `supabase link`, `supabase db push`, `supabase db pull` 금지
- hosted SQL Editor/remote DB URL 금지
- 기존 migration history 수정 금지; additive forward-fix만 허용
- raw secret/share token/remote connection 정보 기록 금지
- 기존 PASS의 자동 재사용 및 manifest 자동 갱신 금지

## 다음 실행 지점

1. `docs/migration-promotion-readiness/phase29-1-design-review.md`
2. `docs/migration-promotion-readiness/phase29-1-static-validation.md`
3. `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
4. `scripts/manual-local-migration-readiness/phase29_migration_promotion_manifest.json`
5. `scripts/manual-local-migration-readiness/run-phase29-migration-readiness-gate.ps1`
6. `scripts/manual-local-migration-readiness/run-phase29-catalog-readiness-local.ps1`
