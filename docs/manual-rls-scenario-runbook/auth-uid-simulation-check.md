# auth.uid() Simulation Check


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 왜 필요한가

`auth.uid()`가 actor별 기대값을 반환하지 않으면 owner 정책, author 정책, feedback insert 정책이 모두 무의미해진다. schema reset/lint 성공은 `auth.uid()` simulation 성공을 보장하지 않는다.

## Smoke Test 후보

### 1. anon actor

```sql
-- LOCAL ONLY CANDIDATE. VERIFY BEFORE EXECUTION.
reset role;
set local role anon;
select auth.uid() as current_auth_uid;
```

기대 결과:

| 항목 | 기대값 |
|---|---|
| `current_auth_uid` | null |

### 2. authenticated owner actor

```sql
-- LOCAL ONLY CANDIDATE. VERIFY BEFORE EXECUTION.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<OWNER_AUTH_USER_UUID>', true);
select auth.uid() as current_auth_uid;
```

대체 후보:

```sql
-- LOCAL ONLY CANDIDATE. VERIFY BEFORE EXECUTION.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"<OWNER_AUTH_USER_UUID>","role":"authenticated"}',
  true
);
select auth.uid() as current_auth_uid;
```

기대 결과: `<OWNER_AUTH_USER_UUID>`

### 3. authenticated non-owner actor

동일한 절차로 `<NON_OWNER_AUTH_USER_UUID>`를 설정한다. 기대 결과는 owner와 달라야 한다.

## 판정

| 판정 | 의미 | 다음 조치 |
|---|---|---|
| PASS | actor별 `auth.uid()`가 기대값 반환 | seed/test 진행 |
| FAIL | null 또는 잘못된 UUID 반환 | RLS 시나리오 중단 |
| NEEDS_ADJUSTMENT | claim 설정 방식만 불일치 | claim 방식 보정 후 재시도 |

## 실패 시 조치

- Supabase local auth helper 구현 방식 확인
- `request.jwt.claim.sub` / `request.jwt.claims` 중 실제 동작 방식 확인
- actor simulation 문서를 수정한 뒤 다시 smoke test
- remote DB에는 아무 것도 실행하지 않음
