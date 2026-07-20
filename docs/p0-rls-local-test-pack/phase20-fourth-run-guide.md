# Phase20 Fourth Run Guide

## 목적

이 문서는 Phase22 public-safe view execution boundary patch 이후 사용자가 로컬 PC에서 phase20 wrapper를 다시 실행하는 절차를 정리한다.

이번 문서는 실행 기록이 아니다. 실제 실행은 사용자의 로컬 PC에서만 수행한다.

## 재실행 전제

| 항목 | 기준 |
|---|---|
| remote Supabase | 사용 금지 |
| hosted SQL Editor | 사용 금지 |
| DB URL/password/token/key | 출력 금지 |
| local DB | Docker Supabase local DB |
| migration 경로 | 임시 `supabase/migrations` 복사본 |
| 원본 draft | `supabase/migrations_draft` 유지 |

## 실행 순서

PowerShell 기준 후보:

```powershell
Set-Location "<Phase22 ZIP을 푼 BuildMap 루트>"

Remove-Item -Recurse -Force .\supabase\migrations -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\supabase\migrations | Out-Null
Copy-Item .\supabase\migrations_draft\*.sql .\supabase\migrations\ -Force

supabase start
supabase db reset

.\scripts\manual-local-rls\run-phase20-p0-local.ps1
```

## 로그 확인 명령 후보

```powershell
$LatestLog = Get-ChildItem .\docs\p0-rls-local-test-pack\logs\*.log |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

$LatestLog.FullName

Select-String -Path $LatestLog.FullName `
  -Pattern "UNEXPECTED_ALLOW|VIEW_BOUNDARY_FAIL|VIEW_ACCESS_ERROR|GRANT_FAIL|ACCESS_PATH_MISMATCH|FAIL|ERROR|EXPECTED_DENY|PASS"

Get-Content $LatestLog.FullName -Tail 200
```

## 우선 확인할 signal

| signal | 의미 | 조치 |
|---|---|---|
| `PRE-050 PASS` | `public_project_cards` view actual SELECT 통과 | 다음 P0 script 진행 |
| `VIEW_ACCESS_ERROR` | view execution model 또는 privilege 문제 | 로그 제출 |
| `VIEW_BOUNDARY_FAIL` | view가 private/sensitive/internal/draft row 또는 forbidden column 노출 | 즉시 중단 |
| `UNEXPECTED_ALLOW` | P0 security blocker | 즉시 중단 |
| `GRANT_FAIL` | 필요한 object privilege 부족 | 로그 제출 |
| `ACCESS_PATH_MISMATCH` | script가 source/view 경계를 잘못 사용 | 로그 제출 |
| `FAIL` | 기대 결과 불일치 | scenario별 로그 제출 |

## 중단 조건

다음 중 하나라도 있으면 전체 결과를 PASS로 판단하지 않는다.

```text
VIEW_BOUNDARY_FAIL
UNEXPECTED_ALLOW
private Project public-safe view 노출
private Project Change Card public 노출
sensitive Change Card public 노출
draft/internal Change Card public 노출
Rough Note public 노출
AI Draft public 노출
Feedback author identifier public 노출
share_token_hash public 노출
Feedback author spoofing 허용
approved Change Card core mutation 허용
```

## 가져올 로그

최소 제출 형식:

```text
1. phase20_00_preflight.sql 출력 전체
2. PRE-050 주변 로그
3. VIEW_ACCESS_ERROR / VIEW_BOUNDARY_FAIL / UNEXPECTED_ALLOW / GRANT_FAIL / FAIL / ERROR 검색 결과
4. 마지막 200줄
5. secret/token/password/DB URL 마스킹 확인
```

## Phase22.5 fourth-run note

네 번째 실행은 Phase22.5 ZIP 기준으로 수행한다.

추가 확인 signal:

```text
VIEW-P0-BP-001
VIEW-P0-BP-002
VIEW-P0-BP-003
VIEW-P0-BP-004
VIEW-P0-BP-005
VIEW-P0-BP-006
SUMMARY-009A
SUMMARY-009B
SUMMARY-014
SUMMARY-015
SUMMARY-016
SUMMARY-017
```

가져올 로그에는 `public_builder_profiles` 관련 PASS/FAIL/VIEW_BOUNDARY_FAIL/VIEW_ACCESS_ERROR 출력이 포함되어야 한다.

## Phase22.6 wrapper note

네 번째 실행은 Phase22.6 ZIP 기준으로 수행한다.

Phase22.6 이후 wrapper는 PostgreSQL `NOTICE` / `WARNING`이 stderr로 전달되는 상황을 `psql` process failure와 분리한다. 따라서 `NativeCommandError` 표시 여부만으로 실패를 판정하지 말고, 최신 log의 다음 항목을 기준으로 판단한다.

```text
ExitCode
UNEXPECTED_ALLOW
VIEW_BOUNDARY_FAIL
VIEW_ACCESS_ERROR
VIEW_OPTION_MISMATCH
VIEW_EXECUTION_MODEL_MISMATCH
GRANT_FAIL
ACCESS_PATH_MISMATCH
FAIL
ERROR
EXPECTED_DENY
PASS
```

`NOTICE` 또는 `WARNING` 문자열만으로는 실패가 아니다. SQL 내부 signal이 `VIEW_ACCESS_ERROR`, `VIEW_BOUNDARY_FAIL`, `UNEXPECTED_ALLOW`, `FAIL` 등을 명시한 경우에만 해당 분류를 따른다.

## Phase23 이후 선택적 wrapper classification verification

Phase23은 SQL/migration/P0 scenario를 수정하지 않고 wrapper signal parser만 수정했다. 따라서 전체 P0 재검증은 필수가 아니다.

다만 wrapper가 `OverallResult: PASS`를 출력하는지 확인하고 싶다면 local-only로 동일 wrapper를 다시 실행할 수 있다. 이 실행은 “필수 P0 재검증”이 아니라 “wrapper classification verification”이다.

기대 확인값:

```text
OverallResult: PASS
UnexpectedAllowDetected: False
GrantFailDetected: False
AccessPathMismatchDetected: False
ViewAccessErrorDetected: False
ViewBoundaryFailDetected: False
ViewOptionMismatchDetected: False
ViewExecutionModelMismatchDetected: False
FailDetected: False
UncaughtErrorDetected: False
ExpectedDenyDetected: True
PassDetected: True
```
