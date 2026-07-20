# feedback_author 결과

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 목적

Feedback author spoofing 방지 테스트 선행 조건이다.

## 실행 SQL 후보

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
-- Method B: request.jwt.claims JSON 후보
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}', true);
select auth.uid()::text as simulated_uid;
rollback;
```

## expected result

`auth.uid()` = `00000000-0000-0000-0000-000000000103`

## actual result

미실행. 현재 문서 작성 환경에서 local DB 접속이 불가능하다.

## PASS / FAIL

`No-Go / 미실행`

## 실패 시 원인 후보

- Supabase local stack 미실행
- `set local role` 권한 문제
- `request.jwt.claim.sub` / `request.jwt.claims` 설정 방식 불일치
- `auth.uid()`가 expected claim source를 읽지 못함
- local DB가 아니라 remote DB로 연결하려는 위험

## 19단계 진행 가능 여부 영향

이 actor 결과가 PASS하지 않으면 해당 actor를 사용하는 후속 RLS scenario test를 진행하지 않는다.
