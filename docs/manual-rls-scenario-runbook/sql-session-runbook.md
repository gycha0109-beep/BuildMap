# SQL Session Runbook


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 접속 경계

허용 후보:

- local Studio SQL editor
- local DB `psql`
- local-only disposable workspace의 DB

금지:

- Supabase hosted SQL Editor
- remote `psql`
- remote DB URL
- service role key 공유

## connection string 처리

`supabase status`가 local DB 접속 정보를 출력할 수 있다. 로그 공유 시 password와 URL은 마스킹한다.

```text
postgresql://postgres:[REDACTED_PASSWORD]@127.0.0.1:<LOCAL_PORT>/postgres
```

## SQL session 기본 후보

```sql
-- LOCAL ONLY CANDIDATE. VERIFY BEFORE EXECUTION.
reset role;
reset all;
```

## actor 전환 후보

```sql
-- authenticated owner candidate
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OWNER_AUTH_USER_UUID>', true);
select auth.uid();
```

```sql
-- anon candidate
reset role;
set local role anon;
select auth.uid();
```

## transaction 사용 후보

테스트 데이터가 많을 경우 트랜잭션 또는 local reset으로 복구한다.

```sql
-- LOCAL ONLY CANDIDATE.
begin;
-- scenario SQL 후보
rollback;
```

단, trigger/RPC side effect를 확인해야 하는 테스트는 rollback 여부를 시나리오별로 판단한다.

## reset 원칙

- actor 전환마다 `reset role` 또는 새 session 사용 후보를 검토한다.
- `set_config(..., true)`는 transaction local 설정일 수 있으므로 transaction 경계와 함께 검증한다.
- claim 설정 방식이 불명확하면 RLS 테스트를 중단한다.

## 로그에 남길 것

- actor 이름
- scenario ID
- 기대 결과
- 실제 row count 또는 에러 종류
- raw token/password/DB URL은 제외
