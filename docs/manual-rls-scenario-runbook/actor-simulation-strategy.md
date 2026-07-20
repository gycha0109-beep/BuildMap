# Actor Simulation Strategy


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 핵심 문제

BuildMap RLS 정책은 `auth.uid()`와 role에 따라 달라진다. 따라서 수동 테스트에서는 actor별 SQL session이 실제로 어떤 `auth.uid()` 값을 반환하는지 먼저 검증해야 한다.

## Actor 목록

| Actor | 목적 | `auth_user_id` 후보 | `user_profile_id` 후보 | `builder_profile_id` 후보 | 가능 행위 | 차단 행위 |
|---|---|---|---|---|---|---|
| `anon` | 비로그인 읽기 경계 | null | null | null | public-safe read 후보 | write 전부 |
| `authenticated_owner` | owner read/write 검증 | owner UUID | owner profile | owner builder | owner project read/update | 남의 project mutation |
| `authenticated_non_owner` | non-owner 차단 검증 | non-owner UUID | non-owner profile | non-owner builder 후보 | public read, 조건부 feedback | private/internal read |
| `feedback_author` | feedback author integrity | feedback author UUID | feedback author profile | 없음 또는 별도 | 자신의 feedback read/insert 후보 | author spoofing |
| `link_shared_authenticated_user` | link_shared feedback write | link user UUID | link user profile | 없음 | valid token + feedback insert 후보 | token 없이 write |
| `project_owner_builder` | owner builder 권한 | owner UUID | owner profile | owner builder | approve/publish/update | 없음 |
| `non_owner_builder` | builder지만 owner 아님 | non-owner UUID | non-owner profile | non-owner builder | public read | project update/approve |

## SQL session에서 role 전환 후보

> VERIFY BEFORE EXECUTION: Supabase local/PostgREST 환경과 직접 `psql` 세션에서 JWT claim 설정 방식이 다를 수 있다. 18단계에서는 먼저 smoke test로 실제 `auth.uid()` 반환을 확인한다.

후보 A: `request.jwt.claim.sub`

```sql
-- LOCAL ONLY CANDIDATE. DO NOT RUN AGAINST REMOTE DB.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OWNER_AUTH_USER_UUID>', true);
select auth.uid();
```

후보 B: `request.jwt.claims`

```sql
-- LOCAL ONLY CANDIDATE. DO NOT RUN AGAINST REMOTE DB.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"<OWNER_AUTH_USER_UUID>","role":"authenticated"}',
  true
);
select auth.uid();
```

후보 C: anon

```sql
-- LOCAL ONLY CANDIDATE. DO NOT RUN AGAINST REMOTE DB.
reset role;
set local role anon;
select auth.uid();
```

## 필수 smoke test

- `anon`에서 `auth.uid()`는 null이어야 한다.
- `authenticated_owner`에서 owner UUID가 나와야 한다.
- `authenticated_non_owner`에서 non-owner UUID가 나와야 한다.
- actor 전환 후 `reset all` 또는 session 재시작으로 오염을 제거한다.

## 실패 시 중단

`auth.uid()` simulation이 실패하면 Project/Feedback/Change Card RLS 테스트를 진행하지 않는다. 모든 결과가 잘못된 actor 전제 위에서 나온다.
