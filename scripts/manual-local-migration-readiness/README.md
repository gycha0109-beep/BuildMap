# Phase29.2 Replay Evidence Closure

## 목적

fresh-install `00–10`과 incremental `00–09 → 10`을 서로 독립적으로 재생하고, 각 경로에서 보호 회귀와 catalog 검증을 다시 수행한 뒤 최종 `PROMOTION_READY` 여부를 판정합니다.

모든 DB 작업은 실행 중인 로컬 `supabase_db_*` 컨테이너만 대상으로 합니다. DB URL, 비밀번호, access token, anon/service key, linked-project flag를 받지 않습니다.

## 전체 실행

BuildMap 루트에서 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Get-ChildItem .\scripts\manual-local-migration-readiness\*.ps1 |
  Unblock-File

.\scripts\manual-local-migration-readiness\run-phase29-2-evidence-closure-local.ps1
```

여러 `supabase_db_*` 컨테이너가 실행 중이면 명시합니다.

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-2-evidence-closure-local.ps1 `
  -ContainerName supabase_db_BuildMap
```

## 실행 순서

1. tracked working tree clean 확인
2. Phase29 static preflight — 정상 HOLD인지 확인
3. `supabase db reset --no-seed`
4. fresh-install migration history `00–10` 확인
5. Phase20 / Phase25 / Phase27.1 실행
6. Phase28 `-RequireAllPassLogs` 실행
7. Phase29 catalog `26/26` 실행
8. fresh evidence 생성
9. `supabase db reset --version 20260720000000 --no-seed`
10. migration `00–09` exact history와 historical blocker precondition 확인
11. `supabase migration up --local`
12. migration 10만 추가 적용됐는지 확인
13. Phase20 / Phase25 / Phase27.1 / Phase28 / catalog 재실행
14. incremental evidence 생성
15. 두 evidence를 final readiness gate에 입력

## 최종 기대값

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

산출물은 기본적으로 다음 경로에 생성되며 Git에서 제외됩니다.

```text
.local-evidence/phase29-2/<timestamp>/
```

## 개별 실행

```powershell
.\scripts\manual-local-migration-readiness\run-phase29-fresh-install-evidence-local.ps1 `
  -EvidencePath .\.local-evidence\phase29-fresh.txt

.\scripts\manual-local-migration-readiness\run-phase29-incremental-upgrade-evidence-local.ps1 `
  -EvidencePath .\.local-evidence\phase29-incremental.txt

.\scripts\manual-local-migration-readiness\run-phase29-migration-readiness-gate.ps1 `
  -FreshInstallEvidencePath .\.local-evidence\phase29-fresh.txt `
  -IncrementalUpgradeEvidencePath .\.local-evidence\phase29-incremental.txt `
  -RequirePromotionReady
```

기존 migration `00–10`, hosted Supabase, remote DB에는 변경을 수행하지 않습니다.
