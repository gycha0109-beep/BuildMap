# Preflight Environment Report

## 요약

preflight 결과, BuildMap 구조와 SQL draft는 확인되었지만 Supabase CLI와 Docker가 없어 local dry-run 실행은 중단했다.

판정: **실행 불가 / No-Go**

## 환경 확인 결과

| 항목 | 결과 |
| --- | --- |
| 작업 경로 | /mnt/data/buildmap14_unzip/BuildMap |
| BuildMap 루트 존재 | True |
| migrations_draft 존재 | True |
| SQL draft 파일 수 | 9 |
| DRAFT ONLY 주석 전체 확인 | True |
| 정식 supabase/migrations 존재 | False |
| git repo 여부 | False |
| 현재 branch | 확인 불가: git repository 아님 |
| git status 요약 | 확인 불가: git repository 아님 |
| Supabase CLI 설치 여부 | False |
| Supabase CLI version | 확인 불가: supabase 명령 없음 |
| Docker 설치 여부 | False |
| Docker daemon 여부 | 확인 불가: docker 명령 없음 |
| supabase/config.toml 존재 | False |
| remote link 감지 여부 | 감지되지 않음: config.toml 없음 |


## secret env 존재 여부

값은 출력하지 않고 존재 여부만 기록한다.

| 환경변수 | 존재 여부 |
| --- | --- |
| SUPABASE_ACCESS_TOKEN | False |
| SUPABASE_DB_URL | False |
| DATABASE_URL | False |
| SUPABASE_SERVICE_ROLE_KEY | False |
| SUPABASE_ANON_KEY | False |
| SERVICE_ROLE_KEY | False |
| ANON_KEY | False |


## dry-run 진행 가능 여부

진행 불가.

사유:

- `supabase` CLI가 설치되어 있지 않다.
- `docker` 명령이 설치되어 있지 않다.
- `supabase/config.toml`이 없다.

## 결론

이번 단계에서는 dry-run을 억지로 실행하지 않는다. 15단계 또는 사용자의 로컬 환경에서 Supabase CLI와 Docker를 준비한 뒤 다시 실행해야 한다.
