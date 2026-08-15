# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase31 Controlled Staging Migration Execution
- 상태: 실제 저장소 검증 → 설계 → 구현 → 독립 리뷰 완료, 사용자 로컬 정적/hosted runtime pending
- 기준 날짜: 2026-07-23
- 공식 저장소: `gycha0109-beep/BuildMap`
- 작업 브랜치: `agent/phase31-controlled-staging-migration-execution`
- Phase30.5 implementation HEAD: `eb40bea433a3e3f51c13520879e797728dc7bc05`
- Phase30.5 merge commit / Phase31 base: `ed2be349de1d9114d321fc2a66b97fbd5740bcc1`
- hosted staging migration execution: 아직 없음
- production deployment: 범위 밖

## 확정 기준선

```text
Phase29.2: PROMOTION_READY
Phase30 FormalPromotionDecision: PROMOTION_READY
Phase30.5 TargetProjectAttestation: PASS
Phase30.5 DeploymentReadinessDecision: DEPLOYMENT_READY
Phase30.5 TargetProjectClassification: TARGET_EMPTY_COMPATIBLE
```

Phase30.5 user-local evidence:

```text
D:\Ji_hwan\personal\BuildMap\.local-evidence\phase30-5-target-attestation\20260723-160204-fc783c22-2881-45d3-9a34-bfffdfd4805e\phase30-5-target-attestation.json
```

Phase30 release bundle:

```text
D:\Ji_hwan\personal\BuildMap\.local-evidence\phase30-formal-promotion\20260721-175812-07f2dc31-18f9-4974-82b8-9ff6ff3088cf\phase30-release-bundle.json
```

## 실제 저장소 검증 결과

- PR #6은 이미 `main`에 병합됨
- merge commit: `ed2be349de1d9114d321fc2a66b97fbd5740bcc1`
- PR #6 본문은 병합 시점의 pending 상태가 남아 있었음
- PR #6 conversation에 Phase30.5 `USER_LOCAL_PASS` attestation 기록 완료
- `main`의 `CURRENT-HANDOFF.md`는 Phase30.5 pending 상태였으므로 Phase31 기준으로 갱신

## Phase31 구현

### 실행 엔진

```text
SUPABASE_CLI_DB_PUSH_V1
```

### 흐름

```text
static gate
→ protected bundle/evidence binding
→ isolated workdir init/link
→ migration list before
→ exact 00–10 db push --dry-run
→ read-only empty-target re-probe
→ exact interactive approval
→ actual db push
→ migration list/read-only history probe
→ Phase29 catalog 26/26
→ evidence
```

### 구현 파일

- `scripts/manual-controlled-staging-migration/phase31_controlled_staging_migration_manifest.json`
- `scripts/manual-controlled-staging-migration/phase31-common.ps1`
- `scripts/manual-controlled-staging-migration/phase31-runtime.ps1`
- `scripts/manual-controlled-staging-migration/phase31-evidence.ps1`
- `scripts/manual-controlled-staging-migration/run-phase31-static-gate.ps1`
- `scripts/manual-controlled-staging-migration/run-phase31-controlled-staging-migration-local.ps1`
- `scripts/manual-controlled-staging-migration/README.md`
- `docs/migration-promotion-readiness/phase30-5-user-local-attestation.md`
- `docs/migration-promotion-readiness/phase31-design-review.md`
- `docs/migration-promotion-readiness/phase31-implementation-review.md`
- `docs/migration-promotion-readiness/phase31-static-validation.md`

## 보호 경계

- migration source/replay SQL `00–10`: 변경 금지
- Phase30 bundle exact hash: 필수
- Phase30.5 evidence target/project/connection/bundle binding: 필수
- staging only
- explicit approval phrase 전 remote write 금지
- remote mutation command: controlled actual `db push` 1회만 허용
- migration history repair 금지
- linked/remote reset 금지
- seed/roles 금지
- `--db-url`/command-line password 금지
- automatic rollback 금지
- production deployment 금지

## 현재 정확한 판정

```text
Phase31 repository source review: PASS
Phase31 design review: PASS
Phase31 implementation review: PASS
Phase31 user-local static gate: PENDING
Controlled staging migration execution: PENDING_USER_LOCAL
Hosted migration applied: false
Production deployment: OUT_OF_SCOPE
```

## 다음 사용자 로컬 작업

BuildMap 루트에서:

```powershell
git fetch origin
git switch agent/phase31-controlled-staging-migration-execution
git pull --ff-only origin agent/phase31-controlled-staging-migration-execution

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Get-ChildItem .\scripts\manual-controlled-staging-migration\*.ps1 | Unblock-File

.\scripts\manual-controlled-staging-migration\run-phase31-static-gate.ps1
```

static gate PASS 후 credential과 운영 확인 값을 현재 PowerShell process에만 설정하고 `scripts/manual-controlled-staging-migration/README.md`의 controlled runner를 실행합니다.

## 성공 종료 기준

```text
Phase31StaticGateResult: PASS
DryRunResult: PASS
PreExecutionStateResult: PASS
MigrationHistoryResult: PASS
CatalogReadinessResult: PASS
PostValidationResult: PASS
ControlledStagingMigrationResult: PASS
ProductionDeploymentDecision: OUT_OF_SCOPE
Phase31GateResult: PASS
```

## 실패 종료 기준

어느 단계든 FAIL이면:

- 추가 mutation 중지
- evidence/log 보존
- 자동 rollback 금지
- migration repair/remote reset 금지
- 실제 remote history와 apply log를 rollback owner가 검토
- 별도 forward-fix/recovery 결정 전 재실행 금지
