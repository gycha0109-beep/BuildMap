# Windows PowerShell Runbook

> 단계: BuildMap 15단계  
> 성격: 사용자 로컬 PC 실행 후보  
> 주의: 아래 명령은 사용자가 직접 실행할 후보이며, 문서 작성 단계에서는 실행하지 않는다.

## 1. 작업 폴더 이동

```powershell
Set-Location "C:\path\to\BuildMap"
Get-Location
```

## 2. preflight 확인

```powershell
supabase --version
docker --version
docker info
git --version
git branch --show-current
git status --short
Test-Path "supabase\migrations_draft"
(Get-ChildItem "supabase\migrations_draft\*.sql").Count
```

## 3. secret env 존재 여부 확인

값을 출력하지 않는다. 존재 여부만 확인한다.

```powershell
"SUPABASE_ACCESS_TOKEN present=" + [bool]$env:SUPABASE_ACCESS_TOKEN
"SUPABASE_DB_URL present=" + [bool]$env:SUPABASE_DB_URL
"DATABASE_URL present=" + [bool]$env:DATABASE_URL
"SERVICE_ROLE_KEY present=" + [bool]$env:SERVICE_ROLE_KEY
"SUPABASE_SERVICE_ROLE_KEY present=" + [bool]$env:SUPABASE_SERVICE_ROLE_KEY
"ANON_KEY present=" + [bool]$env:ANON_KEY
"SUPABASE_ANON_KEY present=" + [bool]$env:SUPABASE_ANON_KEY
```

## 4. disposable workspace 생성 후보

```powershell
$source = "C:\path\to\BuildMap"
$workspace = "C:\temp\BuildMap-dry-run"
Remove-Item -Recurse -Force $workspace -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force $source $workspace
Set-Location $workspace
Get-Location
```

## 5. migrations_draft → migrations 복사 후보

```powershell
New-Item -ItemType Directory -Force "supabase\migrations"
Copy-Item "supabase\migrations_draft\*.sql" "supabase\migrations\"
Get-ChildItem "supabase\migrations\*.sql" | Sort-Object Name
```

## 6. supabase/config.toml 확인

```powershell
Test-Path "supabase\config.toml"
```

## 7. 필요 시 disposable workspace에서만 supabase init 후보

```powershell
supabase init
```

실행 전 현재 경로가 disposable workspace인지 다시 확인한다. `supabase link`는 실행하지 않는다.

## 8. supabase start 후보

```powershell
supabase start
```

## 9. supabase db reset 후보

```powershell
supabase db reset
```

## 10. supabase db lint --local 후보

```powershell
supabase db lint --local
```

## 11. 결과 로그 저장 후보

PowerShell transcript를 사용할 수 있으나, secret 출력 위험이 없도록 주의한다.

```powershell
Start-Transcript -Path ".\dry-run-log.txt"
# 필요한 명령 실행
Stop-Transcript
```

로그 공유 전 `log-redaction-guide.md`에 따라 마스킹한다.

## 12. 실행 중단 기준

- remote credential 값을 출력해야 하는 상황
- `supabase link`를 요구하는 상황
- `db push`, `db pull`을 안내받는 상황
- Docker daemon이 꺼져 있는 상황
- 첫 migration 실패 후 원인 분석 없이 다음 destructive 명령을 이어가야 하는 상황

## 13. 결과 전달 항목

- `log-intake-template.md`
- `result-report-template.md`
- 첫 번째 실패 명령
- 첫 번째 실패 파일
- 에러 메시지 요약
- secret 마스킹 완료 여부
