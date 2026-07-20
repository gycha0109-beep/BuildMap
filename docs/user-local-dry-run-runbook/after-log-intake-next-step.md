# After Log Intake Next Step

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 로그 수집 후 분기

| 수집 결과 | 다음 단계 |
|---|---|
| ENV-FAIL | 환경 보정 단계 |
| INIT-FAIL | disposable workspace/config 보정 |
| MIGRATION-COPY-FAIL | copy 절차 보정 |
| SCHEMA-FAIL | 16단계 SQL schema patch |
| EXTENSION-FAIL | pgcrypto/hash 검토 patch |
| HELPER-FAIL | helper function patch |
| TRIGGER-FAIL | trigger patch |
| RLS-FAIL | RLS policy patch |
| VIEW-FAIL | public-safe view 또는 RPC/API 경계 재검토 |
| RPC-FAIL | secure RPC template patch |
| GRANT-FAIL | revoke/grant/function signature patch |
| LINT-WARN | Security/Lint Patch |
| SECURITY-WARN | Security Patch |
| 모두 성공 | Manual RLS Scenario Test Plan |

## 16단계 후보

16단계는 로그 결과에 따라 아래 중 하나로 결정한다.

1. SQL Patch
2. 환경 보정
3. Security/Lint Patch
4. Manual RLS Scenario Test Plan

## 여전히 금지되는 것

로그를 받았더라도 바로 remote 적용으로 넘어가지 않는다.

- remote Supabase migration 금지
- production/staging DB 적용 금지
- SQL Editor 실행 금지
- 정식 migration 승격 금지
- API/프론트 구현 보류

## remote 적용 전 최소 조건

최소한 다음이 필요하다.

- local dry-run 성공
- `supabase db lint --local` 결과 검토
- 7.5 Test Case 기반 수동 검증
- RLS/public-safe view/RPC 보안 경계 재검토
- 실패 로그 기반 patch 완료
