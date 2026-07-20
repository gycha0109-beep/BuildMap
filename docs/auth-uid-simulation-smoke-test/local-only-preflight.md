# Local-only Preflight

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 현재 문서 작성 환경 preflight 결과


| 항목 | 현재 문서 작성 환경 기준 상태 |
|---|---|
| 첨부 ZIP 구조 확인 | 확인 |
| `BuildMap` 루트 확인 | 확인 |
| 기존 1~17단계 문서 | 확인 |
| `supabase/migrations_draft` | 확인 |
| Supabase CLI | 없음, `supabase: command not found` |
| Docker CLI | 없음, `docker: command not found` |
| Docker daemon | 확인 불가 |
| `psql` | 없음, `psql: command not found` |
| local DB 접속 | 실행 불가 |
| remote 적용 | 없음 |
| hosted SQL Editor 사용 | 없음 |
| 전체 RLS 테스트 | 미실행 |
| auth.uid() smoke test | 미실행 |


## 실행 전 사용자가 다시 확인해야 할 항목

| 항목 | 통과 기준 | 실패 시 조치 |
|---|---|---|
| local Supabase stack | `supabase start` 성공 상태 | stack 재시작 또는 15/16단계 환경 보정 |
| local DB reset/lint | 16단계처럼 `db reset`, `db lint --local` 성공 | schema 적용 문제부터 해결 |
| remote link | 없음 | remote 관련 명령 중단 |
| SQL Editor | hosted SQL Editor 미사용 | local Studio 또는 local psql만 사용 |
| secret logging | 값 출력 없음 | 로그 마스킹 후 재수집 |
| 본 RLS 테스트 | 미실행 | auth smoke 통과 전 진행 금지 |

## 본 RLS 테스트 미실행 확인

현재 단계에서는 Project, Change Card, Feedback, public-safe view, secure RPC, trigger, function permission 테스트를 실행하지 않는다.

## remote 적용 미실행 확인

`supabase link`, `supabase db push`, `supabase db pull`, hosted SQL Editor, production/staging/remote DB SQL 실행은 모두 금지 상태로 유지한다.
