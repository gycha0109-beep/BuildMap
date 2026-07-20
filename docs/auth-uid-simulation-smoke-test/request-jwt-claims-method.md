# Method B request.jwt.claims 결과

> 주의: 이 문서는 BuildMap 18단계 auth.uid() actor simulation smoke test 산출물이다.  
> 현재 ChatGPT 샌드박스에서는 Supabase CLI, Docker, psql이 없어 실제 local DB smoke test를 실행하지 못했다.  
> 따라서 결과 문서는 `미실행/No-Go in this environment` 기준으로 작성하며, 사용자의 로컬 PC에서 18단계 SQL 후보를 실행한 로그가 확보되면 19단계 진입 여부를 재판정한다.  
> remote Supabase, staging, production DB에는 어떤 명령도 실행하지 않는다.


## 목적

`auth.uid()`가 `request.jwt.claims` 설정을 통해 actor별 기대 UUID를 반환하는지 확인한다.

## 실행 여부

현재 문서 작성 환경에서는 실행하지 못했다. Supabase CLI, Docker, psql이 없어 local DB session을 열 수 없다.

## actor별 결과

| Actor | 기대 UUID | 실행 여부 | 결과 | 비고 |
|---|---:|---|---|---|
| `authenticated_owner` | `00000000-0000-0000-0000-000000000101` | 미실행 | 미확인 | 현재 환경에서 local DB 접속 불가 |
| `authenticated_non_owner` | `00000000-0000-0000-0000-000000000102` | 미실행 | 미확인 | 현재 환경에서 local DB 접속 불가 |
| `feedback_author` | `00000000-0000-0000-0000-000000000103` | 미실행 | 미확인 | 현재 환경에서 local DB 접속 불가 |
| `link_shared_authenticated_user` | `00000000-0000-0000-0000-000000000104` | 미실행 | 미확인 | 현재 환경에서 local DB 접속 불가 |

## local-only SQL 후보

### authenticated_owner

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}', true);
select auth.uid()::text as simulated_uid;
rollback;
```

기대 결과: `00000000-0000-0000-0000-000000000101`
### authenticated_non_owner

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}', true);
select auth.uid()::text as simulated_uid;
rollback;
```

기대 결과: `00000000-0000-0000-0000-000000000102`
### feedback_author

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}', true);
select auth.uid()::text as simulated_uid;
rollback;
```

기대 결과: `00000000-0000-0000-0000-000000000103`
### link_shared_authenticated_user

```sql
-- LOCAL ONLY. DO NOT RUN ON REMOTE/STAGING/PRODUCTION.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}', true);
select auth.uid()::text as simulated_uid;
rollback;
```

기대 결과: `00000000-0000-0000-0000-000000000104`


## PASS / FAIL 판정

현재 환경 기준: `No-Go / 미실행`.

## 채택 가능 여부

실행 결과가 없으므로 채택 method를 확정할 수 없다. 사용자의 로컬 PC에서 Method A 또는 Method B 중 모든 authenticated actor가 PASS하는 방식을 채택한다.
