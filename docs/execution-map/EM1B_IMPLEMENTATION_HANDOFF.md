# EM-1B — Draft Editor, Atomic Import and Release Gate

- Date: 2026-10-29
- Parent: [EM-1A handoff](EM1A_IMPLEMENTATION_HANDOFF.md)
- Roadmap: [Execution Map Technical Roadmap](TECHNICAL_ROADMAP.md)
- PR: [#96](https://github.com/gycha0109-beep/BuildMap/pull/96)
- State: **SOURCE_IMPLEMENTED / LOCAL_SUPABASE_AUTH_AND_BROWSER_E2E_PASS / HOSTED_NOT_APPLIED**
- Completion classification: **EM-1 SOURCE_VERIFIED / RELEASE_NOT_CLOSED**. The disposable Supabase Auth + PostgREST and real Playwright browser acceptance tests pass, but controlled hosted deployment and post-release verification are outstanding.

## Source implementation

1. `apps/web/app/projects/[projectId]/execution/actions.ts`: authenticated Builder-owner server actions for track, revision, milestone and criterion creation, draft milestone/criterion edit and logical exclusion, explicit roadmap approval, bounded JSON import.
2. `apps/web/app/projects/[projectId]/execution/page.tsx`: revision selection/history, draft forms, validation feedback and import entry point; progress remains **NOT_CALCULABLE** until EM-2/3.
3. `supabase/migrations/20261029053000_buildmap_22_execution_roadmap_foundation.sql`: additive private schema only. Active milestone/criterion indexes permit logical exclusion without historical loss. All mutations to approved roadmap definitions remain prohibited.
4. `public.execution_import_draft(uuid,uuid,text,text,jsonb)`: transactional, **SECURITY INVOKER** import RPC that validates current project ownership, track identity, draft uniqueness, bounded size, positive explicit milestone weights and at least one required criterion per milestone. A mid-import error rolls back the entire import statement.
5. The input format for MVP import is an array of milestones, e.g.:

```json
[
  {
    "title": "GitHub evidence",
    "weight": 2,
    "description": "Evidence collection boundary",
    "criteria": [
      { "title": "Merge SHA verified", "ruleType": "PR_MERGED", "required": true },
      { "title": "Required checks passed", "ruleType": "CHECK_PASSED", "required": true }
    ]
  }
]
```

The UI imports into a **new draft** for a selected existing track, rather than overwriting an approved revision. It does not automatically approve the imported data, claim completion or create an official BuildMap Decision.

## Test evidence

The following CI groups have passed on the implementation branch; check the **exact final PR HEAD** before promotion.

| Gate | Contents |
| --- | --- |
| Web App CI | Static schema contract, lint, typecheck, Next build |
| Database Contract Gate | Historical migration integrity and additive-migration policy |
| Execution Map SQL Contract | PostgreSQL 17 fresh isolated database migration application; owner vs non-owner/anon matrix; cross-project FK; revision immutability; concurrent approval locking; imported JSON nested round-trip, rollback, draft uniqueness and archived-definition semantics; **secondary disposable DB replays all repository migrations 00–22 in order and repeats EM-1 owner/tenant/import scenarios** |
| PIE Prospective Shadow | Existing optional provider-side decision observation integration remains unaffected |
| Execution Map Supabase Auth E2E | Local Supabase CLI GoTrue + PostgREST actual JWT sessions, Builder-vs-non-owner RLS, denied anonymous access, nested JSON import/rollback, approved-revision immutability and historical revisions; Next.js + Playwright Builder login, draft editing, import, explicit approval, cross-user denial and anonymous login redirect. **PASS at PR HEAD acd7056edff110611e4ce7b21aec14b1840cb24e.** |

The additional local Supabase Auth/PostgREST + Playwright test **does** verify real local authentication and browser flows, but does not prove production settings, hosted migration application, domain/network controls or live Vercel delivery.

## Release / security gates still outstanding

1. Recheck migration 21 as current hosted head and verify no unexpected migration drift since this PR was created. Last read-only audit: 2026-10-29.
2. **PASS in disposable PostgreSQL:** the complete repository migration lineage 00–22 is applied in order and the owner/tenant/import scenarios pass. This is a repository-SQL compatibility rehearsal with a minimal Supabase auth shim, **not** a hosted Supabase platform or auth/browser E2E.
3. **PASS:** local Supabase GoTrue/REST owner sessions, unauthorized access denial, import and approval; real Next.js/Playwright Builder login, historical revision selection, draft edit, import, explicit approval, cross-tenant denial and anonymous redirect. The automated browser flow does not yet cover every invalid-input UX variant; SQL/REST tests cover invalid import and archived definitions.
4. Review owner-only ACL/RLS, new invoker RPC EXECUTE grants, advisor findings and app error handling in the realistic test environment.
5. Approve PR promotion only after all preceding safety gates; then verify exact-head CI, squash merge, Git-linked hosted migration history and Vercel production application.
6. Only then mark EM-1 `DONE`; EM-2 must not claim provider evidence without an independently verified GitHub installation permission grant.

**Release blocker:** repository migration lineage, real local Supabase Auth/PostgREST and browser UI E2E are passing; **controlled production release authorization, migration 22 application and live Vercel smoke remain outstanding**. The connected hosted BuildMap Supabase project was read-only observed with migration head 21 and no execution tables on 2026-10-29. No production schema was modified. The connected hosted BuildMap Supabase project was read-only observed with no `execution_*`/`roadmap_*`/`completion_*` tables at the time of review. Existing schema was not modified by this implementation work.

## Non-goals preserved

- No automatic Capture, AI Draft, Change Card or official Decision transition from importing a roadmap.
- No fabricated progress percentage, evidence status or deployment claim.
- No mandatory external PIE/WatchTower service dependency.
- No provider credential ingestion or changes to historical migrations 00–21.
