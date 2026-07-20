# Failure Log Analysis

## 요약

실제 migration 적용 실패 로그는 없다. preflight 단계에서 필수 도구 부재로 dry-run을 중단했다.

| Failure ID | 발생 명령 | 발생 파일 | 에러 요약 | 원인 후보 | 심각도 | 즉시 patch 필요 | 관련 단계 문서 | 관련 Test Case ID | 다음 조치 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FAIL-001 | supabase --version | 환경 preflight | supabase: command not found | Supabase CLI 미설치 | blocker | 즉시 필요 | 14단계 local dry-run | N/A | Supabase CLI 설치 후 재시도 |
| FAIL-002 | docker --version | 환경 preflight | docker: command not found | Docker 미설치 | blocker | 즉시 필요 | 14단계 local dry-run | N/A | Docker 설치/daemon 실행 후 재시도 |
| FAIL-003 | supabase/config.toml 확인 | 환경 preflight | config.toml 없음 | Supabase local project 초기화 전 상태 | high | dry-run 전 필요 | 14단계 local dry-run | N/A | disposable workspace에서 supabase init 후보 검토 |


## SQL failure 여부

SQL draft는 실행되지 않았으므로 SQL 문법 실패, RLS 실패, view 실패, RPC 실패, trigger 실패는 아직 발생하지 않았다.
