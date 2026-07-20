# Next Patch Plan

## 현재 결론

SQL patch는 아직 수행하지 않는다. 실제 SQL 오류 로그가 없기 때문이다.

## 우선순위

| Patch ID | 문제 요약 | 보정 방향 | 우선순위 | blocker 여부 | 관련 로그 | 관련 Test Case ID | 예상 영향 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PATCH-ENV-001 | Supabase CLI 미설치 | Supabase CLI 설치 또는 사용자의 로컬 환경에서 실행 | blocker | 예 | FAIL-001 | N/A | dry-run 재시도 전 필수 |
| PATCH-ENV-002 | Docker 미설치 | Docker 설치 및 daemon 실행 확인 | blocker | 예 | FAIL-002 | N/A | dry-run 재시도 전 필수 |
| PATCH-ENV-003 | supabase/config.toml 없음 | disposable workspace에서 supabase init 후보 검토 | high | 예 | FAIL-003 | N/A | 원본에는 생성하지 않음 |
| PATCH-SQL-001 | 실제 SQL 실패 미검증 | local dry-run 실행 후 실패 로그 기반 patch | medium | 아니오 | 미발생 | 전체 | 로그 확보 후 판단 |
