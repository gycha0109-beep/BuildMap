# Failure Analysis

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 현재 smoke test 기준 blocker

현재 실행 환경 기준 blocker가 있다.

| Failure ID | actor | method | error summary | expected result | actual result | suspected cause | severity | next action | 19단계 진행 가능 여부 |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-SMOKE-ENV-001 | all | all | Supabase CLI, Docker, psql 없음 | local DB session에서 `auth.uid()` 확인 | 실행 불가 | 현재 ChatGPT sandbox에는 local Supabase 실행 환경이 없음 | blocker | 사용자 로컬 PC에서 smoke test 실행 후 로그 수집 | No-Go |

## SQL/RLS 실패 여부

SQL/RLS 실패 로그는 없다. local DB smoke test 자체를 실행하지 못했기 때문이다.

## secret 노출 여부

secret, token, password, DB URL 원문은 출력하지 않았다.

## 다음 조치

사용자 로컬 PC에서 `manual-log-intake-template.md`에 맞춰 Method A/B 실행 결과를 가져와야 한다. 결과가 PASS 또는 Conditional PASS이면 19단계로 이동할 수 있다.
