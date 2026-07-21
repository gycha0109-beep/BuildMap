# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase29.2 Fresh-install & Incremental Replay Evidence Closure
- 상태: 설계 → 설계 리뷰 → 구현 → 구현 리뷰 → 정적 검증 완료
- 기준 날짜: 2026-07-21
- 공식 저장소: `gycha0109-beep/BuildMap`
- 작업 브랜치: `agent/phase29-2-replay-evidence-closure`
- Phase29.1 merge commit: `c18b7995f6cf6cdff7787f5131cbb4d5d77df70d`
- hosted/remote/formal migration promotion: 없음
- Phase29.2 사용자 로컬 replay: pending

## 현재 보호 기준선

- migration drafts/local replay mirrors: exact `00–10`, 11 files
- Phase20 P0 RLS: `147` scenarios
- Phase25 Link Sharing: `107` scenarios
- Phase27.1 P1 RLS: `181` scenarios
- Phase28 unified gate: `47` protected files / `3` packs / `26` SQL files / `435` scenarios
- Phase29 catalog: `26` scenarios
- known security blockers: `0`
- resolved blocker: `MIG29-BLOCK-001`
- automatic manifest refresh/promotion: prohibited

## Phase29.1 사용자 로컬 종료

다음 결과가 사용자 로컬에서 확인됐다.

- Phase20: PASS
- Phase25: PASS
- Phase27.1: PASS
- Phase28: `47 files / 435 scenarios`, PASS
- Phase29 static: migrations `11`, mirror PASS, errors `0`, blockers `0`, PASS
- Phase29 catalog: `26/26`, PASS
- remote commands: none

상세 attestation:

- `docs/migration-promotion-readiness/phase29-1-user-local-attestation.md`

## Phase29.2 목적

두 runtime 경로를 독립적으로 재현하고 evidence를 현재 Git/manifest 계약에 결속한 뒤 최종 promotion readiness를 판정한다.

### Fresh-install

1. `supabase db reset --no-seed`
2. exact migration history `00–10`
3. Phase20/25/27.1 재실행
4. Phase28 `-RequireAllPassLogs`
5. Phase29 catalog `26/26`
6. `FRESH_INSTALL_00_10` evidence 생성

### Incremental

1. `supabase db reset --version 20260720000000 --no-seed`
2. exact migration history `00–09`
3. historical pre-upgrade oracle `MIG29-PREUP-001..006`
4. `supabase migration up --local`
5. applied delta가 migration 10 하나인지 확인
6. Phase20/25/27.1/Phase28/catalog 재실행
7. `INCREMENTAL_00_09_TO_10` evidence 생성

## Evidence contract

Evidence schema version: `2.0`

필수 결속:

- current repository HEAD
- clean tracked working tree
- local `supabase_db_*` container
- baseline ID
- migration-set digest
- protected-gate-set digest
- exact migration history before/after
- distinct evidence paths and RunId values
- same repository HEAD
- Phase20/25/27/28/catalog PASS

## 구현 파일

- `scripts/manual-local-migration-readiness/phase29-evidence-run-common.ps1`
- `scripts/manual-local-migration-readiness/phase29-evidence-validation.ps1`
- `scripts/manual-local-migration-readiness/run-phase29-fresh-install-evidence-local.ps1`
- `scripts/manual-local-migration-readiness/run-phase29-incremental-upgrade-evidence-local.ps1`
- `scripts/manual-local-migration-readiness/run-phase29-2-evidence-closure-local.ps1`
- `scripts/manual-local-migration-readiness/phase29_03_incremental_pre_upgrade.sql`
- `scripts/manual-local-migration-readiness/run-phase29-migration-readiness-gate.ps1`
- `scripts/manual-local-migration-readiness/phase29_migration_promotion_manifest.json`

## 설계·리뷰 결과

- 수동 evidence 작성: 거부
- fresh reset만으로 incremental 증명: 거부
- Phase28 supplied-log 검증 생략: 거부
- exact pre/post migration history 및 migration-10-only delta: 적용
- HEAD/digest/RunId evidence binding: 적용
- 긴 replay 전 static preflight: 적용
- PowerShell 5.1/7 native stderr 처리: 유지
- migration `00–10`: 변경 없음
- 설계 판정: PASS
- 구현 리뷰 판정: PASS
- 정적 검증 판정: PASS

관련 문서:

- `docs/migration-promotion-readiness/phase29-2-design-review.md`
- `docs/migration-promotion-readiness/phase29-2-implementation-review.md`
- `docs/migration-promotion-readiness/phase29-2-static-validation.md`

## 현재 정확한 판정

```text
Phase29.1: USER_LOCAL_PASS
Phase29.2 design: PASS
Phase29.2 implementation: PASS
Phase29.2 static validation: PASS
Fresh-install evidence: PENDING_USER_LOCAL
Incremental evidence: PENDING_USER_LOCAL
PromotionDecision: PROMOTION_HOLD
```

## 사용자 로컬 다음 실행

BuildMap 루트에서 다음 wrapper 하나를 실행한다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Get-ChildItem .\scripts\manual-local-migration-readiness\*.ps1 |
  Unblock-File

.\scripts\manual-local-migration-readiness\run-phase29-2-evidence-closure-local.ps1
```

여러 `supabase_db_*` 컨테이너가 실행 중이면 `-ContainerName`을 명시한다.

기대 최종 결과:

```text
FreshInstallEvidenceResult: PASS
IncrementalEvidenceResult: PASS
RuntimeEvidenceComplete: True
StaticErrorCount: 0
StaticBlockerCount: 0
PromotionDecision: PROMOTION_READY
Phase29GateResult: PASS
Phase29.2ClosureResult: PASS
```

## 절대 제약

- Supabase/Docker/psql runtime은 사용자 로컬 PC에서만 실행
- `supabase link`, `db push`, `db pull` 금지
- hosted SQL Editor/remote DB URL 금지
- DB URL/password/token/key 입력 금지
- migration history 수정 또는 formal promotion 금지
- generated evidence/log는 `.local-evidence/` 아래에만 저장
- 사용자 로컬 PASS 이후 branch commit 변경 금지: evidence HEAD binding이 무효화됨
