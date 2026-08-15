# BuildMap

BuildMap은 프로젝트가 **왜 지금의 모습이 되었는지**를 기록하고 공유하는 Decision Timeline 플랫폼이다.

코드 diff나 완료 목록만 남기는 것이 아니라, 문제 발견 → 가설 → 실험 → 피드백 → 유지/폐기/전환의 판단 흐름을 Change Card로 축적하고, 승인된 기록을 Decision Timeline과 공개 프로젝트 페이지로 표현한다.

## Product core

```text
Builder
→ Project
→ Problem Definition / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card Review / Approval
→ Decision Timeline
→ Public Project Page
→ Feedback Request / Feedback
→ next decision
```

BuildMap의 핵심 원천 기록은 **Change Card**다. AI draft는 공식 기록이 아니며 Builder가 최종 승인한다.

## Current repository status

### Completed foundation

- 제품 철학 / 문제 정의 / 포지셔닝
- Builder / Scout 유즈케이스
- 화면 흐름과 텍스트 와이어프레임
- 제품 데이터 모델
- Supabase schema / RLS / helper / trigger
- historical migrations `00–10` immutable lineage
- Phase31 staging reconciliation and lifecycle closure
- additive migration 11: app runtime privilege alignment
- additive migration 12: least-privilege ACL hardening
- Supabase Git `main` branch auto-deployment for migrations
- `apps/web` Next.js App Router + TypeScript runtime foundation
- Supabase SSR cookie session handling
- email/password signup / signin / confirmation route
- User Profile / Builder Profile bootstrap
- Builder dashboard
- project create/list
- Web App CI: install / lint / typecheck / build
- Database Contract Gate
- Phase31 Historical Integrity Gate

### Not yet proven / implemented

- real browser staging Auth smoke test
- BuildMap Vercel deployment
- automated browser E2E
- Problem / Hypothesis UI
- Rough Note workflow
- AI provider runtime integration
- AI Structured Draft workflow
- Change Card review / approval UI
- Decision Timeline UI
- Public Project Page / Feedback runtime
- production deployment

Production deployment remains `OUT_OF_SCOPE`.

## Staging database status

Staging migration history currently aligns with the repository through:

```text
20260816000000 buildmap_11_app_runtime_privilege_alignment
20260816001000 buildmap_12_least_privilege_acl_hardening
```

Source-table object privileges are reduced to the RLS operation surface:

- `anon`: no direct source-table privileges
- `authenticated`: `SELECT / INSERT / UPDATE`
- public-safe views: `anon / authenticated = SELECT only`
- service-role privileges preserved

Existing migrations `00–10` are immutable. New DB changes are additive migrations only.

The hosted Supabase default branch is connected to Git `main`, so migrations under `supabase/migrations/` are automatically applied after merge. Do not manually re-apply an already auto-applied migration.

## Documentation authority

Current product/runtime status:

1. `docs/handoff/ACTIVE-HANDOFF.md`
2. `docs/README.md`
3. `docs/use-cases/use-case-priorities.md`
4. `docs/screens/screen-priorities.md`
5. `docs/data-model/initial-data-scope.md`

`docs/handoff/CURRENT-HANDOFF.md` is a Phase31 hash-protected historical closure snapshot and is intentionally no longer the live handoff.

## Repository layout

```text
BuildMap/
├─ .github/
│  └─ workflows/
│     ├─ app-ci.yml
│     ├─ database-contract.yml
│     └─ phase31-lifecycle.yml
├─ apps/
│  └─ web/
├─ docs/
│  ├─ product/
│  ├─ use-cases/
│  ├─ screens/
│  ├─ wireframes/
│  ├─ data-model/
│  ├─ database/
│  ├─ access-policy*/
│  ├─ rls*/
│  ├─ migration-*/
│  └─ handoff/
├─ scripts/
│  ├─ database-contract/
│  └─ manual-*/
└─ supabase/
   ├─ migrations_draft/
   ├─ migrations/
   └─ README.md
```

Historical migration/RLS documents and runners are audit/replay assets, not current product runtime code.

`supabase/.temp/`, `.local-evidence/`, `.env*`, and `.buildmap.local.ps1` are local-only and must not be committed.

## Next milestone

First prove the implemented private staging slice end-to-end:

```text
Vercel staging/preview
→ Supabase Auth Site URL / redirect configuration
→ signup
→ email confirmation
→ signin/session refresh
→ User + Builder bootstrap
→ project create/list
→ signout/signin persistence
→ browser smoke / E2E
```

After that, implement the next product slice:

```text
Problem / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card approval
→ Decision Timeline
```

Public project pages, feedback, Scout discovery, heatmap, handoff mode, recruiting, and advanced recommendation follow after the core private decision-recording flow is proven.

## Security and credentials

Never commit:

- database passwords
- Supabase access tokens
- service-role keys
- private API keys
- connection secrets

The web application uses only Supabase public client values. Database authorization remains RLS-based.

Supabase Security Advisor still reports historical owner-executed public-safe views and callable SECURITY DEFINER helpers/RPCs. These must be explicitly reviewed before the public-facing milestone; they should not be changed blindly because they are part of the existing public-boundary design.

## Core product principle

> BuildMap은 무엇을 만들었는지가 아니라, 어떤 판단을 거쳐 지금의 프로젝트가 되었는지를 보여준다.
