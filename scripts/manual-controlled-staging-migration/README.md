# Phase31 Controlled Staging Migration Execution

## 목적

Phase30에서 생성한 byte-preserving release bundle `00–10`을 Phase30.5에서 attestation한 **동일한 staging Supabase project**에 통제 적용합니다.

이 단계는 staging 전용입니다. production 적용은 범위 밖입니다.

## 실행 모델

```text
protected bundle validation
→ Phase30.5 evidence binding
→ isolated Supabase workdir
→ migration list before
→ db push --dry-run exact 00–10
→ read-only target re-probe
→ explicit approval phrase
→ db push
→ migration list after
→ read-only history/object probe
→ Phase29 catalog 26/26
→ local evidence
```

Supabase CLI가 `supabase_migrations.schema_migrations`를 관리합니다. 수동 history INSERT/DELETE, `migration repair`, remote reset은 사용하지 않습니다.

## 절대 경계

- `TargetEnvironment`: `staging` 고정
- production deployment: 금지
- 자동 실행·무인 실행: 금지
- 자동 rollback: 금지
- `supabase migration repair`: 금지
- linked/remote `db reset`: 금지
- `--db-url`, `--password`, `-p`: 금지
- seed/roles 배포: 금지
- migration source/replay SQL 변경: 금지
- credential을 command line, console, evidence, Git에 기록: 금지
- 생성된 workdir와 evidence를 Git에 커밋: 금지

실패 시 추가 mutation을 중단하고 evidence를 보존합니다. 복구는 recovery plan과 rollback owner가 별도로 수행하며 이 runner가 자동으로 destructive rollback을 실행하지 않습니다.

## 선행 조건

- 브랜치: `agent/phase31-controlled-staging-migration-execution`
- Phase30 release bundle manifest 존재
- Phase30.5 target attestation JSON 존재
- attestation 결과:
  - `TargetProjectAttestation: PASS`
  - `DeploymentReadinessDecision: DEPLOYMENT_READY`
  - `TargetProjectClassification: TARGET_EMPTY_COMPATIBLE`
- `git`, `psql`, Supabase CLI가 PATH에 존재
- staging project access token과 DB credential을 현재 PowerShell process environment에만 설정
- maintenance window, recovery plan, rollback owner, authorized operator 확인

## 1. 브랜치와 스크립트 준비

BuildMap 루트에서 실행합니다.

```powershell
git fetch origin
git switch agent/phase31-controlled-staging-migration-execution
git pull --ff-only origin agent/phase31-controlled-staging-migration-execution

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Get-ChildItem .\scripts\manual-controlled-staging-migration\*.ps1 | Unblock-File
```

## 2. 정적 게이트

```powershell
.\scripts\manual-controlled-staging-migration\run-phase31-static-gate.ps1
```

기대 결과:

```text
MigrationCount: 11
ProtectedFileCount: 11
StaticErrorCount: 0
StaticBlockerCount: 0
TargetEnvironment: staging
ProductionDeploymentDecision: OUT_OF_SCOPE
Phase31StaticGateResult: PASS
```

## 3. 현재 PowerShell process에 credential 설정

host, port, database, user에는 Supabase Dashboard의 staging connection 정보를 입력합니다. project ref와 credential은 채팅·문서·Git에 기록하지 않습니다.

```powershell
$env:BUILDMAP_PHASE31_PGHOST = '<staging host>'
$env:BUILDMAP_PHASE31_PGPORT = '<staging port>'
$env:BUILDMAP_PHASE31_PGDATABASE = 'postgres'
$env:BUILDMAP_PHASE31_PGUSER = '<staging database user>'
$env:BUILDMAP_PHASE31_PGSSLMODE = 'require'

$secureDbPassword = Read-Host 'Staging database password' -AsSecureString
$dbPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureDbPassword)
try {
  $databasePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($dbPasswordPointer)
  $env:BUILDMAP_PHASE31_PGPASSWORD = $databasePassword
  $env:SUPABASE_DB_PASSWORD = $databasePassword
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($dbPasswordPointer)
  Remove-Variable secureDbPassword, dbPasswordPointer, databasePassword -ErrorAction SilentlyContinue
}

$secureAccessToken = Read-Host 'Supabase access token' -AsSecureString
$accessTokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureAccessToken)
try {
  $env:SUPABASE_ACCESS_TOKEN =
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($accessTokenPointer)
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($accessTokenPointer)
  Remove-Variable secureAccessToken, accessTokenPointer -ErrorAction SilentlyContinue
}
```

## 4. 통제 실행

실제 확인된 운영 값만 인자로 전달합니다.

```powershell
.\scripts\manual-controlled-staging-migration\run-phase31-controlled-staging-migration-local.ps1 `
  -BundleManifestPath 'D:\Ji_hwan\personal\BuildMap\.local-evidence\phase30-formal-promotion\20260721-175812-07f2dc31-18f9-4974-82b8-9ff6ff3088cf\phase30-release-bundle.json' `
  -TargetAttestationPath 'D:\Ji_hwan\personal\BuildMap\.local-evidence\phase30-5-target-attestation\20260723-160204-fc783c22-2881-45d3-9a34-bfffdfd4805e\phase30-5-target-attestation.json' `
  -TargetProjectRef '<20-character-staging-project-ref>' `
  -OperatorName '<authorized operator>' `
  -MaintenanceWindow '<approved maintenance window>' `
  -RecoveryPlanReference '<backup/PITR/recovery reference>' `
  -RollbackOwner '<rollback owner>' `
  -TargetProjectIdentityConfirmed `
  -BackupOrRecoveryConfirmed `
  -MaintenanceWindowConfirmed `
  -RollbackOwnerConfirmed `
  -AuthorizedOperatorConfirmed `
  -CredentialHandlingConfirmed
```

runner가 dry-run과 read-only re-probe를 통과하면 다음 형식의 승인 문구를 화면에 표시합니다.

```text
APPLY 11 MIGRATIONS TO STAGING <project-ref>
```

표시된 문구를 대소문자까지 정확히 입력한 경우에만 실제 `db push`가 실행됩니다.

## 기대 성공 결과

```text
DryRunResult: PASS
PreExecutionStateResult: PASS
MigrationHistoryResult: PASS
CatalogReadinessResult: PASS
PostValidationResult: PASS
ControlledStagingMigrationResult: PASS
ProductionDeploymentDecision: OUT_OF_SCOPE
Phase31GateResult: PASS
```

## 실패 시 처리

- 추가 migration 명령을 실행하지 않습니다.
- `migration repair`, remote reset, 자동 rollback을 실행하지 않습니다.
- `Phase31EvidencePath` 아래 로그와 JSON을 보존합니다.
- 실제 remote state, apply log, migration history를 rollback owner와 검토한 뒤 별도 forward-fix/recovery 결정을 내립니다.
- 실패 상태에서 동일 runner를 무조건 재실행하지 않습니다.

## 5. credential 제거

```powershell
Remove-Item Env:BUILDMAP_PHASE31_PGHOST -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE31_PGPORT -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE31_PGDATABASE -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE31_PGUSER -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE31_PGPASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE31_PGSSLMODE -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
```
