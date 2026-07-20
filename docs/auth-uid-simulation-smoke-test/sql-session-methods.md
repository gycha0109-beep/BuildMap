# SQL Session Methods

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## local SQL 실행 후보

- local `psql` 후보
- local Supabase Studio SQL editor 후보

Hosted Supabase SQL Editor는 금지한다. connection string, password, DB URL은 로그에 출력하지 않는다.

## transaction 사용 이유

`set local role`, `set_config(..., true)`는 transaction-local 설정으로 사용하는 것이 안전하다. 테스트 후 `rollback`을 수행하면 session 오염을 줄일 수 있다.

## Method A: request.jwt.claim.sub

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
-- Method A: request.jwt.claim.sub 후보
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select auth.uid()::text as simulated_uid;
rollback;
```

## Method B: request.jwt.claims JSON

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
-- Method B: request.jwt.claims JSON 후보
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}', true);
select auth.uid()::text as simulated_uid;
rollback;
```

## anon actor 후보

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
begin;
set local role anon;
select auth.uid() as anon_uid;
rollback;
```

## session cleanup 후보

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
reset role;
reset all;
```

## 주의 사항

- local Supabase/Postgres 환경에 따라 `request.jwt.claim.sub`와 `request.jwt.claims` 중 동작 방식이 다를 수 있다.
- Method A 또는 Method B 중 하나만 안정적으로 성공해도 후속 테스트용 method로 채택할 수 있다.
- 둘 다 실패하면 RLS scenario test로 넘어가지 않는다.
