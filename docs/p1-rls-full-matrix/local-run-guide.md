# Phase27 Local Run Guide

## 절대 안전 규칙

- BuildMap 루트에서만 실행한다.
- local Docker Supabase DB container만 사용한다.
- DB URL, password, access token, anon/service-role key를 입력하지 않는다.
- `supabase link`, `supabase db push`, `supabase db pull`을 실행하지 않는다.
- hosted SQL Editor를 사용하지 않는다.

## clean reset

```powershell
Set-Location "<BuildMap root>"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Get-ChildItem .\scripts\manual-local-rls-p1 -Recurse -File | Unblock-File

Remove-Item -Recurse -Force .\supabase\migrations -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\supabase\migrations | Out-Null
Copy-Item .\supabase\migrations_draft\*.sql .\supabase\migrations\ -Force

supabase start
supabase db reset
```

## PowerShell syntax-only gate

Docker/SQL 실행 전에 두 wrapper의 parser error를 먼저 확인한다.

```powershell
$Scripts = @(
  (Resolve-Path ".\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1"),
  (Resolve-Path ".\scripts\manual-local-rls-p1\run-phase27-p1-local.ps1")
)

foreach ($ScriptPath in $Scripts) {
  $Tokens = $null
  $ParseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseFile(
    $ScriptPath,
    [ref]$Tokens,
    [ref]$ParseErrors
  ) | Out-Null

  if ($ParseErrors.Count -eq 0) {
    "POWERSHELL_PARSE_CHECK: PASS | $ScriptPath"
  } else {
    "POWERSHELL_PARSE_CHECK: FAIL | $ScriptPath"
    $ParseErrors | Format-List Message, Extent
  }
}
```

두 파일 모두 `PASS`일 때만 다음 단계로 진행한다.

## P0 compatibility rerun

Phase27.1 introduces column-level Project UPDATE privileges. Before the Link Sharing and P1 gates, rerun the existing Phase20 P0 pack with the corrected `PRE-021` privilege oracle.

```powershell
.\scripts\manual-local-rls\run-phase20-p0-local.ps1
```

기대:

```text
OverallResult: PASS
```

## Phase26 regression gate

Phase27.1은 기존 Phase25 보호 파일 18개를 변경하지 않고 additive migration draft 09를 추가한다. 따라서 Phase26 gate는 기존 보호 기준선의 무변경만 확인하며, migration 09의 유효성은 Phase27 181-scenario runtime으로 검증한다.

```powershell
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
```

기대:

```text
Phase26GateResult: PASS
```

## Phase27 실행

```powershell
.\scripts\manual-local-rls-p1\run-phase27-p1-local.ps1
```

container 자동 선택이 애매하면:

```powershell
.\scripts\manual-local-rls-p1\run-phase27-p1-local.ps1 -ContainerName "supabase_db_BuildMap"
```

## 성공 기준

```text
ExpectedScenarioCount total: 181
모든 FileOverallResult: PASS
MissingScenarioIds: none
DuplicateScenarioIds: none
ConflictingScenarioIds: none
OverallResult: PASS
```

`UNEXPECTED_ALLOW`, `VIEW_BOUNDARY_FAIL`, `TRIGGER_FAIL`, `POLICY_FAIL`이 하나라도 나오면 로그를 보존하고 기존 PASS를 유지한 채로 최소 patch를 설계한다.
