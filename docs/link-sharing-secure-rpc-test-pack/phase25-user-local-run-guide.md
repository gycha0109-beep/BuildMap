# Phase25 User Local Run Guide

## 1. BuildMap 루트 이동 및 script 차단 해제

```powershell
Set-Location "<Phase24 ZIP을 푼 BuildMap 루트>"
Unblock-File .\scripts\manual-local-link-sharing\run-phase25-link-sharing-local.ps1
```

`Unblock-File`은 다운로드 ZIP에서 상속된 Windows 차단 표시만 제거한다. 실행 정책 자체를 넓히지는 않는다.

## 2. PowerShell parse check

```powershell
$ScriptPath = Resolve-Path ".\scripts\manual-local-link-sharing\run-phase25-link-sharing-local.ps1"
$Tokens = $null
$ParseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($ScriptPath,[ref]$Tokens,[ref]$ParseErrors) | Out-Null
if ($ParseErrors.Count -eq 0) { "POWERSHELL_PARSE_CHECK: PASS" } else { "POWERSHELL_PARSE_CHECK: FAIL"; $ParseErrors }
```

FAIL이면 wrapper를 실행하지 않는다.

## 3. local migration copy/reset

```powershell
Remove-Item -Recurse -Force .\supabase\migrations -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\supabase\migrations | Out-Null
Copy-Item .\supabase\migrations_draft\*.sql .\supabase\migrations\ -Force
supabase start
supabase db reset
```

## 4. wrapper

```powershell
.\scripts\manual-local-link-sharing\run-phase25-link-sharing-local.ps1
```

## 5. 로그

```powershell
$LatestLog = Get-ChildItem .\docs\link-sharing-secure-rpc-test-pack\logs\*.log |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1

Select-String -Path $LatestLog.FullName -Pattern "FileResult|MissingScenarioIds|DuplicateScenarioIds|ConflictingScenarioIds|ParsedSignals|UnexpectedAllowDetected|UnexpectedDenyDetected|SeedFailDetected|AuthContextFailDetected|PolicyFailDetected|TriggerFailDetected|ViewExposureFailDetected|ViewBoundaryFailDetected|ViewAccessErrorDetected|ViewOptionMismatchDetected|ViewExecutionModelMismatchDetected|GrantFailDetected|AccessPathMismatchDetected|RpcBoundaryFailDetected|TokenLifecycleFailDetected|ResponseExposureFailDetected|ScriptErrorDetected|EnvErrorDetected|NeedsReviewDetected|ScenarioCoverageFailDetected|FailDetected|UncaughtErrorDetected|ExpectedDenyDetected|PassDetected|OverallResult"
Get-Content $LatestLog.FullName -Tail 300
```

로그에는 local fixture token 문자열이 출력되지 않도록 유지한다.
