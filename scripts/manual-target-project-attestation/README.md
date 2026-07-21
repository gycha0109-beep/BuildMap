# Phase30.5 Target Project Attestation

## 목적

Phase30 release bundle을 실제 Supabase 대상 프로젝트에 적용하기 전에, 원격 DB를 **읽기 전용**으로 조사해 배포 가능 여부를 판정합니다.

현재 compatibility mode는 `EMPTY_TARGET_ONLY_V1`입니다. migration history 또는 `public` 사용자 객체가 하나라도 존재하면 자동 해석하지 않고 `DEPLOYMENT_HOLD`로 종료합니다.

## 절대 경계

이 pack은 다음 작업을 수행하지 않습니다.

- `supabase link`
- `supabase db push`
- `supabase migration repair`
- DDL/DML
- migration history 수정
- Docker 또는 로컬 DB 변경
- credential 출력 또는 evidence 저장

원격 SQL은 `BEGIN TRANSACTION READ ONLY`와 `PGOPTIONS default_transaction_read_only=on`을 이중 적용합니다.

## 연결 정보

대상 DB credential은 채팅, 문서, Git 또는 명령 인자에 넣지 않습니다. 현재 PowerShell 프로세스에 다음 전용 환경 변수만 설정합니다.

```powershell
$env:BUILDMAP_PHASE305_PGHOST = '<host from target project connection details>'
$env:BUILDMAP_PHASE305_PGPORT = '<port from target project connection details>'
$env:BUILDMAP_PHASE305_PGDATABASE = 'postgres'
$env:BUILDMAP_PHASE305_PGUSER = '<database user>'
$env:BUILDMAP_PHASE305_PGSSLMODE = 'require'
```

비밀번호는 shell history에 남지 않도록 secure prompt로 입력합니다.

```powershell
$securePassword = Read-Host 'Target database password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $env:BUILDMAP_PHASE305_PGPASSWORD =
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Variable securePassword, passwordPointer -ErrorAction SilentlyContinue
}
```

`PGHOST` 또는 `PGUSER` 중 하나는 입력한 Supabase project ref를 포함해야 합니다. 일반 PostgreSQL session과 read-only transaction을 지원하는 대상 connection endpoint를 사용합니다.

## 사전 확인

```powershell
psql --version
```

`psql`이 PATH에서 확인되지 않으면 target probe를 실행하지 않습니다.

## 실행

Phase30에서 생성된 `phase30-release-bundle.json` 경로를 그대로 사용합니다. 운영 확인 인자에는 실제 확인된 값만 입력합니다.

```powershell
.\scripts\manual-target-project-attestation\run-phase30-5-target-attestation-local.ps1 `
  -BundleManifestPath '<Phase30 BundleManifestPath>' `
  -TargetEnvironment staging `
  -TargetProjectRef '<20-character-project-ref>' `
  -OperatorName '<authorized operator>' `
  -MaintenanceWindow '<approved window>' `
  -RecoveryPlanReference '<backup/PITR/recovery reference>' `
  -RollbackOwner '<rollback owner>' `
  -TargetProjectIdentityConfirmed `
  -BackupOrRecoveryConfirmed `
  -MaintenanceWindowConfirmed `
  -RollbackOwnerConfirmed `
  -AuthorizedOperatorConfirmed `
  -CredentialHandlingConfirmed
```

production 대상이면 `-ProductionApprovalConfirmed`도 필수입니다.

## 성공 기준

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

## 실행 후 credential 정리

```powershell
Remove-Item Env:BUILDMAP_PHASE305_PGPASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE305_PGHOST -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE305_PGPORT -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE305_PGDATABASE -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE305_PGUSER -ErrorAction SilentlyContinue
Remove-Item Env:BUILDMAP_PHASE305_PGSSLMODE -ErrorAction SilentlyContinue
```
