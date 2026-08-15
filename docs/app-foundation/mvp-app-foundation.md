# MVP Application Foundation

## Scope

첫 application milestone은 다음 흐름까지만 연결한다.

```text
Supabase email/password Auth
→ User Profile bootstrap
→ Builder Profile bootstrap
→ Builder dashboard
→ Project create/list
```

Rough Note → AI Structured Draft → Change Card는 다음 vertical slice에서 구현한다.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth / Data API
- `@supabase/ssr` cookie session
- application code: `apps/web`

## Staging contract finding

application 진입 전 read-only inspection에서 기존 RLS policy surface와 table ACL 사이의 불일치를 확인했다.

- `user_profiles`: authenticated UPDATE RLS는 존재하지만 table UPDATE privilege가 없음
- `builder_profiles`: authenticated UPDATE RLS는 존재하지만 table UPDATE privilege가 없음
- `projects`: authenticated INSERT/UPDATE RLS는 존재하지만 table INSERT/UPDATE privilege가 없음

따라서 기존 00–10은 수정하지 않고 additive migration 11에서 해당 authenticated privilege만 보정한다.

이 보정은 RLS를 우회하지 않는다. table privilege를 통과한 이후에도 기존 row-level policy가 최종 authorization boundary다.

## CI split

Phase31은 이미 CLOSED된 historical lifecycle이므로 신규 migration을 Phase31의 exact 11-migration gate로 검사하지 않는다.

- `Phase31 Historical Integrity Gate`: 과거 00–10과 Phase31 protected assets의 무결성 유지
- `Database Contract Gate`: 00–10 immutable + 11 이후 additive migration 허용
- `Web App CI`: lint + typecheck + build

모든 CI는 repository-only이며 remote database mutation을 수행하지 않는다.

## Deployment boundary

이 milestone에서는 migration 11을 staging에 적용하지 않고 application deployment도 하지 않는다.

순서:

1. repository PR exact-head CI
2. migration 11 review
3. staging additive migration 11 적용
4. privilege/poststate 검증
5. web local/staging runtime smoke test
6. application staging deployment 판단

Production은 OUT_OF_SCOPE다.
