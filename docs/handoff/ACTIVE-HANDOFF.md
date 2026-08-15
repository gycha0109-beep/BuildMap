# BuildMap Active Handoff

## Current authority

이 문서는 Phase31 이후 제품 구현 단계의 현재 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase31 closure 당시의 hash-protected historical snapshot으로 유지한다.

## Current main baseline

- repository: `gycha0109-beep/BuildMap`
- current baseline before this documentation PR: `74ad4e406e10a1359a409c8e0f63f943529edff8`
- production deployment: `OUT_OF_SCOPE`

## Completed database foundation

- historical migrations `00–10`: immutable
- Phase31 staging reconciliation: PASS
- migration 11: `buildmap_11_app_runtime_privilege_alignment`
- migration 12: `buildmap_12_least_privilege_acl_hardening`
- local/remote migration versions currently aligned through `20260816001000`
- source-table ACL: `authenticated = SELECT/INSERT/UPDATE`, `anon = none`
- public-safe view ACL: `anon/authenticated = SELECT only`
- service-role ACL preserved

### Supabase deployment behavior

The hosted Supabase default branch is connected to Git branch `main`.

Migrations under `supabase/migrations/` are applied automatically after merge to `main` by Supabase branch deployment.

Do not additionally call a manual migration apply operation after merge unless the automatic branch deployment has been explicitly disabled or verified not to have run.

A duplicate generated migration-history row created during migration 12 investigation was removed with official CLI migration-history repair. No schema rollback was performed. Final local/remote migration history is aligned.

## MVP application foundation

Merged application runtime:

- `apps/web` Next.js App Router + TypeScript
- Supabase SSR cookie session handling
- email/password signup and signin actions
- email OTP confirmation route
- User Profile bootstrap
- Builder Profile bootstrap
- authenticated Builder dashboard
- project create/list flow
- no service-role key in application runtime

Repository CI:

- Web App CI: install / lint / typecheck / build
- Database Contract Gate: historical `00–10` integrity + additive migration contract
- Phase31 Historical Integrity Gate: frozen closure verification

PR #11 app foundation passed exact-head and merged-main CI.
PR #12 ACL hardening passed database contract CI and was applied to staging by Supabase branch deployment.

## Current staging runtime state

Application data is currently empty:

```text
auth users: 0
user_profiles: 0
builder_profiles: 0
projects: 0
```

Therefore authenticated end-to-end runtime behavior has not yet been proven against a real browser session.

## Known security-advisor debt

Supabase Security Advisor currently reports historical public-safe views as security-definer/owner-executed boundaries and reports callable SECURITY DEFINER helpers/RPCs.

Some of these are intentional historical design decisions for public-safe views/link-sharing RPCs. They must be reviewed before the public-project-page milestone rather than blindly changed, because changing views to security-invoker would also require revisiting source-table grants and the existing public boundary design.

This is not a blocker for the current private Auth → Builder → Project staging slice, but it is a production/public-surface blocker until explicitly resolved or accepted with evidence.

## Current blockers / next actions

1. Create/connect a BuildMap Vercel project for staging/preview deployment.
2. Configure only public Supabase client values for the web runtime.
3. Configure Supabase Auth Site URL / redirect allowlist and signup confirmation template for the deployed app URL.
4. Perform real browser smoke test:
   - signup
   - email confirmation
   - signin/session refresh
   - User/Builder bootstrap
   - project create
   - project list
   - signout/signin persistence
5. Add automated browser E2E after the first manual staging flow is proven.
6. Then implement the next product vertical slice: Problem/Hypothesis → Rough Note → AI Structured Draft → Change Card review/approval.

## Safety boundary

- do not modify migrations `00–10`
- new DB changes are additive migrations only
- do not manually re-apply a migration already auto-applied by Supabase branch deployment
- do not commit `.env.local`, database passwords, service-role keys, access tokens, or other secrets
- production remains `OUT_OF_SCOPE`
