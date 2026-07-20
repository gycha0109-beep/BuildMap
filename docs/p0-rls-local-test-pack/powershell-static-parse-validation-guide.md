# PowerShell Static Parse Validation Guide

## 목적

이 검사는 `run-phase20-p0-local.ps1`을 실행하지 않고 PowerShell syntax error만 확인한다. Docker, `docker exec`, `psql`, SQL, Supabase CLI 또는 remote command를 실행하지 않는다.

## 사용자 로컬 실행 명령

BuildMap 루트에서 실행한다.

```powershell
$ScriptPath = Resolve-Path ".\scripts\manual-local-rls\run-phase20-p0-local.ps1"
$Tokens = $null
$ParseErrors = $null

[System.Management.Automation.Language.Parser]::ParseFile(
  $ScriptPath,
  [ref]$Tokens,
  [ref]$ParseErrors
) | Out-Null

if ($ParseErrors.Count -eq 0) {
  "POWERSHELL_PARSE_CHECK: PASS"
} else {
  "POWERSHELL_PARSE_CHECK: FAIL"
  $ParseErrors | Format-List Message, Extent
}
```

## 판정

- `POWERSHELL_PARSE_CHECK: PASS`: local migration reset 및 wrapper 실행 단계로 이동할 수 있다.
- `POWERSHELL_PARSE_CHECK: FAIL`: wrapper를 실행하지 않고 parse error의 `Message`, `Extent`를 공유한다.

## 제한

현재 작업 환경에는 PowerShell parser runtime이 없으므로 작업자는 위 명령을 실제 실행하지 않았다. 파일 텍스트 기준 invalid keyword 검색과 구조 검토만 수행했다. 최종 parse 판정은 사용자의 로컬 PowerShell에서 수행한다.

## 자기 parse check를 wrapper 안에 넣지 않는 이유

PowerShell은 script body 실행 전에 전체 파일을 parse한다. 따라서 syntax error가 있는 wrapper 내부의 self-check는 실행될 수 없다. parse gate는 wrapper 외부에서 먼저 수행해야 한다.
