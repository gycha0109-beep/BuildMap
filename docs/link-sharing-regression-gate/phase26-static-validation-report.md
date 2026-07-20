# Phase26 Static Validation Report

## 수행 범위

현재 작업 환경에는 PowerShell runtime, Docker, Supabase CLI, psql이 없다. 따라서 SQL/RPC runtime과 PowerShell `Parser.ParseFile()`의 실제 호출은 수행하지 않았다.

대신 다음 정적 검증을 수행했다.

## 결과

| 검증 | 결과 |
|---|---|
| baseline JSON parse | PASS |
| protected file entries | 18 |
| protected file SHA-256 match | 18/18 PASS |
| 원본 Phase25.1 ZIP 대비 protected file 무변경 | 18/18 PASS |
| scenario files | 8 |
| baseline expected scenarios | 107 |
| SQL unique scenario IDs | 107 |
| Phase25 wrapper expected IDs | 107 |
| baseline ↔ SQL ID set | PASS |
| baseline ↔ wrapper ID set | PASS |
| cross-file duplicate scenario ownership | 0 |
| invalid PowerShell keyword (`elselseif` 등) | 0 |
| PowerShell lightweight delimiter/quote/comment balance | PASS |
| executable remote command pattern | 0 |
| standalone CR newline | 0 |
| maximum ZIP internal path length | 105 |
| handoff canonical files | PASS |

## 보호 파일 무변경

Phase26은 기존 migration, Phase25 SQL, Phase25 wrapper를 수정하지 않았다. baseline manifest는 입력 Phase25.1 ZIP의 파일 bytes를 기준으로 생성했다.

## runtime 미검증

다음은 사용자 로컬에서 확인해야 한다.

```powershell
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1
```

이 실행 시 Phase25 runner와 Phase26 gate를 실제 PowerShell parser로 검사한다.

기존 Phase25 raw log가 있다면:

```powershell
.\scripts\manual-local-link-sharing\run-phase26-link-sharing-regression-gate.ps1 -PassLogPath "<log path>"
```
