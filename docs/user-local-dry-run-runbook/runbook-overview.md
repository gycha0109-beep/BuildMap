# 15단계 Runbook Overview

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 전체 실행 흐름

1. BuildMap ZIP 압축을 해제한다.
2. BuildMap 루트로 이동한다.
3. Supabase CLI 설치 여부를 확인한다.
4. Docker 설치 여부와 Docker daemon 실행 여부를 확인한다.
5. remote credential 존재 여부를 확인하되 값을 출력하지 않는다.
6. disposable branch 또는 disposable workspace를 만든다.
7. 원본 `supabase/migrations_draft`를 보존한다.
8. 임시 workspace 안에서만 `supabase/migrations`를 만든다.
9. `supabase/migrations_draft/*.sql`을 임시 `supabase/migrations`로 복사한다.
10. `supabase/config.toml` 존재 여부를 확인한다.
11. 필요한 경우 disposable workspace에서만 `supabase init` 후보를 실행한다.
12. `supabase start` 후보를 실행한다.
13. `supabase db reset` 후보를 실행한다.
14. `supabase db lint --local` 후보를 실행한다.
15. 실패 로그를 수집한다.
16. secret을 마스킹한다.
17. `log-intake-template.md` 또는 `result-report-template.md` 형식으로 결과를 정리한다.
18. 정리한 로그를 다음 단계 입력으로 전달한다.

## 이번 runbook의 핵심 분기

| 상황 | 다음 행동 |
|---|---|
| Supabase CLI 없음 | 설치 후 다시 preflight |
| Docker 없음 또는 daemon 미실행 | Docker 준비 후 다시 preflight |
| `config.toml` 없음 | disposable workspace에서만 `supabase init` 후보 검토 |
| `supabase start` 실패 | 환경 실패로 분류하고 로그 수집 |
| `supabase db reset` 실패 | 첫 실패 migration 파일과 에러 요약 수집 |
| `supabase db lint --local` warning | warning 종류별로 정리 |
| 모든 명령 성공 | 16단계에서 Manual RLS Scenario Test Plan 후보로 이동 |

## 원본 보호 원칙

원본 BuildMap 폴더의 `supabase/migrations_draft`는 계속 draft다. dry-run을 위해 정식 `supabase/migrations`가 필요하더라도, 원본이 아니라 disposable workspace 안에서만 만든다.

## remote 금지 원칙

이번 runbook은 local-only다. remote Supabase 프로젝트와 연결되는 명령은 절대 실행하지 않는다.
