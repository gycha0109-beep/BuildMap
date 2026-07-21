# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase29 Migration Promotion Readiness & Release Safety Gate — 설계/구현/독립 리뷰/정적 검증 및 Windows PowerShell 5.1 호환 보정 완료
- 기준 날짜: 2026-07-21
- 공식 작업 기준: GitHub `gycha0109-beep/BuildMap`
- 기준 브랜치: `agent/phase29-migration-promotion-readiness`
- Phase28 merge commit: `2382fe78b75acedcad034076c083c29264f6f1af`
- Phase20 P0 RLS: 사용자 로컬 PASS
- Phase25 Link Sharing: 사용자 로컬 PASS
- Phase26 legacy gate: 사용자 로컬 PASS
- Phase27.1 P1 RLS: 사용자 로컬 PASS, `181/181`
- Phase28 unified gate: 사용자 로컬 PASS, `46 files / 435 scenarios`
- Phase29 implementation validation: PASS
- Phase29 current promotion decision: `PROMOTION_HOLD`
- Phase29 첫 사용자 로컬 static run: Windows PowerShell 5.1의 `Path.GetRelativePath()` 부재로 inventory 단계 중단
- Phase29 compatibility correction: 적용 완료, 사용자 로컬 재실행 pending
- hosted/remote 적용: 없음
- migration draft 수정 또는 정식 migration 승격: 없음

## 보호 기준선

### Unified Phase28 baseline

- manifest: `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
- gate: `scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1`
- protected files: 46
- packs: 3
- scenario SQL files: 26
- scenarios: 435
- evidence level: `USER_LOCAL_PASS`

### Phase29 readiness contract

- manifest: `scripts/manual-local-migration-readiness/phase29_migration_promotion_manifest.json`
- static gate: `scripts/manual-local-migration-readiness/run-phase29-migration-readiness-gate.ps1`
- local catalog runner: `scripts/manual-local-migration-readiness/run-phase29-catalog-readiness-local.ps1`
- migration drafts: exact `00–09`, 10 files
- protected Phase29 executable/catalog files: 7
- catalog runtime scenarios: 16
- decision values: `PROMOTION_READY`, `PROMOTION_HOLD`
- automatic promotion: prohibited
- automatic manifest refresh: prohibited

## Phase29 구현 내용

- migration `00–09` 순서·dependency·hash·분류 계약 고정
- Phase28 protected baseline을 필수 선행 gate로 연결
- destructive SQL, broad grant, PUBLIC EXECUTE, remote URL 정적 차단
- SQL comment/string을 제거한 뒤 실행 구문만 분석하여 false positive 최소화
- migration 순서대로 function definition을 처리하고 final `SECURITY DEFINER` 정의만 평가
- tracked `supabase/migrations/*.sql` 조기 승격 감지
- fresh-install 및 incremental evidence를 서로 다른 파일로 강제
- 증거 필드 singleton/정확한 PASS 계약 검증
- gate 분석 성공과 promotion readiness를 별도 출력
- local PostgreSQL catalog 16-scenario wrapper 구현
- forward-fix, emergency access-control recovery, Go/No-go 문서화

## 독립 리뷰 결과

### 보완 완료

1. 주석·예외문 속 위험 키워드 false positive 제거
2. 과거에 존재했으나 후속 migration에서 수정된 function의 false blocker 방지
3. manifest 약화로 migration 누락이 가능하지 않도록 canonical 10 paths hard-code
4. HOLD와 harness FAIL 분리
5. runtime evidence 누락 fail-open 차단
6. 동일 evidence 재사용 차단
7. untracked local replay copy를 premature promotion으로 오판하지 않도록 Git tracked 파일만 검사
8. Phase29 gate 자체 7개 파일 hash 보호
9. catalog scenario 누락·추가·중복·충돌 차단
10. PowerShell 7 native stderr/non-zero exit의 terminating error 경로 차단
11. Windows PowerShell 5.1에 없는 `System.IO.Path.GetRelativePath()` 제거 및 `System.Uri.MakeRelativeUri()` 기반 호환 함수 적용

### 실제 발견 blocker

- ID: `MIG29-BLOCK-001`
- object: `public.is_feedback_author(uuid)`
- final state: `SECURITY DEFINER`, `search_path = public, auth`
- required rule: `search_path = pg_catalog, pg_temp` + 명시적 schema qualification
- migration 09가 이 function을 재정의하지 않으므로 `00–09` 최종 상태에 잔존
- 판정: `PROMOTION_HOLD`
- 기대 조치: 기존 migration 수정이 아니라 additive forward hardening migration 작성 후 전체 회귀 재검증

## 사용자 로컬 첫 실행과 보정

첫 Phase29 static gate 실행은 다음 오류로 verdict 출력 전에 중단됐다.

```text
[System.IO.Path]에 이름이 'GetRelativePath'인 메서드가 없음
```

분류:

- migration/RLS/security failure 아님
- Windows PowerShell 5.1/.NET Framework compatibility failure
- Phase29 test harness defect

보정:

- `phase29-common.ps1`에 `Get-CompatibleRelativePath` 추가
- absolute file URI와 `MakeRelativeUri()`로 상대경로 계산
- separator normalization 유지
- static gate의 직접 `Path.GetRelativePath()` 호출 제거
- 변경된 common/gate 파일의 protected normalized SHA-256 갱신

## 정적 검증 상태

- manifest parse: PASS
- migration inventory/order: 10/10 PASS
- migration normalized hashes: 10/10 PASS
- Phase29 protected gate/catalog hashes: 7/7 PASS after compatibility refresh
- runtime scenario source IDs: 16 unique
- PowerShell lexical/delimiter checks: PASS
- SQL delimiter checks: PASS
- ambiguous `$variable:`: 0
- `elselseif`: 0
- executable remote-capable commands: 0
- destructive SQL approved exceptions: 0
- direct `System.IO.Path.GetRelativePath()` dependency: 0
- implementation verdict: PASS
- corrected native PowerShell runtime: 사용자 로컬 rerun pending
- PostgreSQL catalog execution: 사용자 로컬 pending
- fresh-install evidence: pending
- incremental upgrade evidence: pending

## 현재 정확한 판정

```text
Phase29 implementation: PASS
Phase29 corrected local gate: pending rerun
PromotionDecision: PROMOTION_HOLD
```

HOLD 원인:

1. unpinned `public.is_feedback_author(uuid)` SECURITY DEFINER
2. fresh-install `00–09` runtime evidence 없음
3. incremental `00–08 → 09` runtime evidence 없음

## 절대 제약

- ZIP 대신 GitHub 저장소를 기준으로 작업한다.
- Supabase CLI, Docker, psql, SQL 실제 실행은 사용자 로컬 PC에서만 수행한다.
- `supabase link`, `supabase db push`, `supabase db pull`을 사용하지 않는다.
- hosted SQL Editor 또는 remote DB URL을 사용하지 않는다.
- Phase29에서는 migration draft를 수정하거나 정식 migration으로 승격하지 않는다.
- applied migration history rewrite를 금지하고 forward-fix만 사용한다.
- raw secret/share token/remote connection 정보를 문서·로그에 포함하지 않는다.
- blocker를 기대값 변경으로 숨기지 않는다.

## 다음 작업

1. 사용자는 Phase29 브랜치 최신 커밋을 `git pull --ff-only`로 반영
2. corrected Phase29 PowerShell parser 실행
3. corrected static gate 재실행 — 예상 `Phase29GateResult: PASS`, `PromotionDecision: PROMOTION_HOLD`
4. local final catalog runner 실행 — 예상 `MIG29-CATALOG-007 PROMOTION_BLOCKER`
5. 결과가 예상과 일치하면 Phase29 분석 기준선 확정
6. 후속 Phase29.1에서 additive SECURITY DEFINER hardening migration 설계

## 정확한 재개 지점

1. `docs/handoff/CURRENT-HANDOFF.md`
2. `docs/migration-promotion-readiness/phase29-risk-register.md`
3. `docs/migration-promotion-readiness/phase29-independent-review.md`
4. `scripts/manual-local-migration-readiness/phase29_migration_promotion_manifest.json`
5. `scripts/manual-local-migration-readiness/run-phase29-migration-readiness-gate.ps1`
6. `scripts/manual-local-migration-readiness/run-phase29-catalog-readiness-local.ps1`
