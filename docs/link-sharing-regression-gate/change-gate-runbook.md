# Phase26 Change Gate Runbook

## 1. BuildMap 루트 이동

```powershell
Set-Location "<Phase26 ZIP을 푼 BuildMap 루트>"
```

## 2. 다운로드 차단 해제

```powershell
Unblock-File .\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
Unblock-File .\scripts\manual-local-link-sharing\run-phase25-link-sharing-local.ps1
```

현재 PowerShell 창에서 실행 정책으로 차단되는 경우에만 다음을 사용한다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

시스템 전체 실행 정책은 변경하지 않는다.

## 3. 정적 기준선 gate

```powershell
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
```

기대 결과:

```text
ProtectedFileCount: 18
ScenarioFileCount: 8
ExpectedScenarioCount: 107
PassLogValidation: SKIPPED
Phase26GateResult: PASS
```

## 4. 기존 PASS 로그 검증

로그 파일이 있으면 다음처럼 넘긴다.

```powershell
$LatestLog = Get-ChildItem .\docs\link-sharing-secure-rpc-test-pack\logs\phase25-link-sharing-rpc-*.log |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1 `
  -PassLogPath $LatestLog.FullName
```

기대 결과:

```text
PassLogValidation: PASS
Phase26GateResult: PASS
```

## 5. protected file 변경 후 절차

Phase26 gate가 hash mismatch로 실패하면 baseline JSON을 먼저 수정하지 않는다.

1. 변경 목적과 파일을 기록한다.
2. 보안·계약 영향도를 리뷰한다.
3. PowerShell parse check를 수행한다.
4. local migrations를 clean copy한다.
5. `supabase db reset`을 실행한다.
6. Phase25 wrapper 전체를 실행한다.
7. Phase26 gate에 새 PASS 로그를 넘긴다.
8. 독립 리뷰 후 새로운 phase decision으로 baseline을 교체한다.

## local rerun 명령

```powershell
Remove-Item -Recurse -Force .\supabase\migrations -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\supabase\migrations | Out-Null
Copy-Item .\supabase\migrations_draft\*.sql .\supabase\migrations\ -Force

supabase start
supabase db reset

.\scripts\manual-local-link-sharing\run-phase25-link-sharing-local.ps1
```

## 중단 조건

- `Phase26GateResult: FAIL`
- `OverallResult`가 PASS가 아님
- FileResult가 8개가 아님
- missing/duplicate/conflicting scenario 존재
- expected/observed 총합이 107이 아님
- failure flag 중 하나라도 true
- remote command 사용 흔적 존재
