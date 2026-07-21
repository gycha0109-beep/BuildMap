# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase30.5 Target Project Read-only Attestation
- 상태: 설계 → 설계 리뷰 → 구현 → 독립 보완 → 정적 검증 완료
- 기준 날짜: 2026-07-21
- 공식 저장소: `gycha0109-beep/BuildMap`
- 작업 브랜치: `agent/phase30-5-target-project-attestation`
- Phase30 merge commit: `320bbd52f7bf18402b1fe10801bc809e173fcf4b`
- hosted migration execution: 없음
- remote operation capability: read-only probe만 허용
- Phase30.5 사용자 로컬 target attestation: pending

## 현재 보호 기준선

- migration source/replay mirror: exact `00–10`, 11 files
- Phase20 P0 RLS: `147` scenarios
- Phase25 Link Sharing: `107` scenarios
- Phase27.1 P1 RLS: `181` scenarios
- Phase28 unified gate: `47` protected files / `435` scenarios
- Phase29 catalog: `26` scenarios
- Phase29.2: `PROMOTION_READY`
- Phase30 formal bundle: `PROMOTION_READY`
- Phase30 protected promotion head: `884c13ccafcc29f452976de7033fae6e3f5fe06e`
- known security blockers: `0`
- automatic deployment/link/history repair: prohibited

## Phase30 종료

사용자 로컬에서 다음 결과가 확인됐다.

```text
BundleManifestPath: D:\Ji_hwan\personal\BuildMap\.local-evidence\phase30-formal-promotion\20260721-175812-07f2dc31-18f9-4974-82b8-9ff6ff3088cf\phase30-release-bundle.json
FormalPromotionDecision: PROMOTION_READY
DeploymentReadinessDecision: DEPLOYMENT_HOLD
Phase30ClosureResult: PASS
```

- PR #5 merge 완료
- merge commit: `320bbd52f7bf18402b1fe10801bc809e173fcf4b`
- migration SQL 변경 없음
- hosted/remote DB 작업 없음

상세 attestation:

- `docs/migration-promotion-readiness/phase30-user-local-attestation.md`

## Phase30.5 목적

Phase30 release bundle을 실제 대상 Supabase project와 결속하고, 적용 전 환경이 안전한지 읽기 전용으로 판정한다.

### Compatibility mode

```text
EMPTY_TARGET_ONLY_V1
```

다음 조건을 모두 만족하는 신규·빈 대상만 `DEPLOYMENT_READY` 후보가 된다.

- 대상 project ref와 connection identity 교차 확인
- explicit read-only transaction
- PostgreSQL version `15+`
- `public`, `auth`, `extensions` schema 조건 확인
- `pgcrypto`가 `extensions` schema에 설치됨
- DB/public/auth privilege 조건 확인
- Supabase migration history `0`
- `public` 사용자 relation/function/policy/trigger/type `0`
- backup 또는 recovery plan 확인
- maintenance window, rollback owner, authorized operator 확인
- production 대상은 별도 approval 확인

기존 migration history 또는 public 사용자 객체가 존재하면 자동 호환 처리하지 않고 `DEPLOYMENT_HOLD`로 종료한다.

## Phase30.5 구현

- `scripts/manual-target-project-attestation/phase30-5-common.ps1`
- `scripts/manual-target-project-attestation/phase30-5_target_project_attestation_manifest.json`
- `scripts/manual-target-project-attestation/phase30_5_00_read_only_target_probe.sql`
- `scripts/manual-target-project-attestation/run-phase30-5-static-gate.ps1`
- `scripts/manual-target-project-attestation/run-phase30-5-target-attestation-local.ps1`
- `scripts/manual-target-project-attestation/README.md`
- `docs/migration-promotion-readiness/phase30-5-design-review.md`
- `docs/migration-promotion-readiness/phase30-5-implementation-review.md`
- `docs/migration-promotion-readiness/phase30-5-static-validation.md`

## 보안·운영 설계

- SQL: `BEGIN TRANSACTION READ ONLY` + `ROLLBACK`
- connection: 전용 process environment variable만 사용
- command line에 DB URL/password를 넣지 않음
- `PGOPTIONS default_transaction_read_only=on` 강제
- statement/lock/idle transaction timeout 적용
- evidence/log는 `.local-evidence` 아래에만 생성
- host/user/database는 raw credential로 저장하지 않고 identity hash로 결속
- `supabase link`, `db push`, `migration repair`, DDL/DML capability 없음
- Phase30 bundle manifest와 11개 release artifact 재검증
- Phase30 이후 migration SQL drift 차단

## 현재 정확한 판정

```text
Phase29.2: USER_LOCAL_PROMOTION_READY
Phase30: USER_LOCAL_PROMOTION_READY
Phase30.5 design: PASS
Phase30.5 implementation: PASS
Phase30.5 static validation: PASS
TargetRuntimeAttestation: PENDING_USER_LOCAL
TargetProjectAttestation: PENDING
DeploymentReadinessDecision: DEPLOYMENT_HOLD
```

## 사용자 로컬 다음 실행

### 1. 브랜치 동기화

```powershell
git fetch origin
git switch agent/phase30-5-target-project-attestation
git pull --ff-only origin agent/phase30-5-target-project-attestation

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Get-ChildItem .\scripts\manual-target-project-attestation\*.ps1 | Unblock-File
```

### 2. credential을 현재 PowerShell 프로세스에만 설정

```powershell
$env:BUILDMAP_PHASE305_PGHOST = '<Supabase direct 또는 pooler host>'
$env:BUILDMAP_PHASE305_PGPORT = '5432'
$env:BUILDMAP_PHASE305_PGDATABASE = 'postgres'
$env:BUILDMAP_PHASE305_PGUSER = '<database user>'
$env:BUILDMAP_PHASE305_PGPASSWORD = '<database password>'
$env:BUILDMAP_PHASE305_PGSSLMODE = 'require'
```

credential과 project ref를 채팅·문서·Git에 기록하지 않는다.

### 3. read-only attestation 실행

```powershell
.\scripts\manual-target-project-attestation\run-phase30-5-target-attestation-local.ps1 `
  -BundleManifestPath 'D:\Ji_hwan\personal\BuildMap\.local-evidence\phase30-formal-promotion\20260721-175812-07f2dc31-18f9-4974-82b8-9ff6ff3088cf\phase30-release-bundle.json' `
  -TargetEnvironment staging `
  -TargetProjectRef '<20-character-project-ref>' `
  -OperatorName '<operator>' `
  -MaintenanceWindow '<window>' `
  -RecoveryPlanReference '<backup/PITR/recovery reference>' `
  -RollbackOwner '<owner>' `
  -TargetProjectIdentityConfirmed `
  -BackupOrRecoveryConfirmed `
  -MaintenanceWindowConfirmed `
  -RollbackOwnerConfirmed `
  -AuthorizedOperatorConfirmed `
  -CredentialHandlingConfirmed
```

production 대상이면 `-ProductionApprovalConfirmed`가 추가로 필요하다.

기대 성공 결과:

```text
ReadOnlyProbeResult: PASS
TargetProjectIdentityResult: PASS
TargetExtensionCompatibilityResult: PASS
TargetPrivilegeCompatibilityResult: PASS
TargetMigrationHistoryResult: PASS
TargetObjectCollisionResult: PASS
BackupReadinessResult: PASS
OperationalReadinessResult: PASS
TargetProjectClassification: TARGET_EMPTY_COMPATIBLE
TargetProjectAttestation: PASS
DeploymentReadinessDecision: DEPLOYMENT_READY
Phase30.5GateResult: PASS
```

### 4. 실행 후 password 제거

```powershell
Remove-Item Env:BUILDMAP_PHASE305_PGPASSWORD
```

## 절대 제약

- 실제 migration 적용 금지
- `supabase link`, `supabase db push`, `supabase migration repair` 금지
- DDL/DML 및 migration history 수정 금지
- credential을 명령 인자·채팅·로그·Git에 기록 금지
- generated evidence/log Git commit 금지
- Phase30.5 PASS 이후 branch commit 변경 시 evidence HEAD binding 재검토
- Phase31 진입 전 명시적 사용자 승인 필요
