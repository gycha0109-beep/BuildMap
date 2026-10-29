# EM-0 — Repository Integration Boundary Audit

- Audit date: 2026-10-29
- Baseline protected main: `78b052ffad6b12018bf51bdff3dde989ee4b787c` (roadmap registration #94 merged)
- Scope: repository/source audit only; no hosted DB introspection, no production mutation, no simulated execution PASS.
- Result: **EM-0 repository boundary and implementation entrypoints identified.** EM-1 migration must be validated before merge.

## Confirmed entrypoints (source evidence)

| Concern | Existing source | EM disposition |
| --- | --- | --- |
| Project primary identity and owner | `supabase/migrations/20260708001000_buildmap_01_core_schema_draft.sql`; `projects.id`, `owner_builder_profile_id` | Reuse ID; never introduce a competing Project |
| Builder authorization | `public.is_project_owner(uuid)` from migration 04; `apps/web/lib/buildmap/account.ts`; project layout owner query | Every new row scoped to project; RLS owner-only; route/action additionally checks authenticated Builder |
| Browser session | `apps/web/lib/supabase/server.ts` | Reuse Supabase SSR user-session client; no service-role bypass |
| GitHub binding | `apps/web/app/api/projects/[projectId]/integrations/github/activity/route.ts` | Reuse verified project link, active integration binding and HMAC proof checks; no blind URL trust |
| GitHub credentials | `apps/web/lib/github/api.ts:createInstallationAccessToken` | Installation token is scoped to one repository; never store tokens in Execution Map |
| GitHub activity | `apps/web/lib/github/api.ts:readGitHubActivity` | Existing normalized merged PR/release activity is insufficient as final completion evidence |
| Source provenance | migration 18 `capture_source_refs` and migration 20 observation keys | Private explicit **Capture** provenance; do not reuse as execution evidence registry |
| Navigation and pages | `apps/web/app/projects/[projectId]/layout.tsx`, `components/app/project-tabs.tsx` | Add an independent `execution` route/tab only when read model is ready |
| Runtime discipline | `.github/workflows/app-ci.yml`; `.github/workflows/database-contract.yml` | Protected-main PR, current required checks, exact-head verification; no direct production mutation |
| Latest migration in repository | `20260820190000_buildmap_21_figma_oauth_credentials.sql` | New migration must be strictly later; never edit 00–21; check remote history before applying |

## Key findings and non-negotiable gaps

1. **Evidence capability gap:** Current `createInstallationAccessToken` only requests `contents:read` and `pull_requests:read`. GitHub PR merge/release observation does **not** establish Checks, Actions, Deployments or Issue-read authority. EM-2 must explicitly verify GitHub App installation permissions and permitted endpoints, then add narrowly scoped permissions only when justified; provider API authorization failures become UNKNOWN, not PASS. No implicit privilege expansion in EM-1.
2. **SHA gap:** Current `GitHubActivityObservation` holds source type/ID/title/summary/URL/time/context but does not carry verified merge or check SHA. EM-2 must retrieve exact source-revision metadata independently before EM-3 can authorize `PR_MERGED` or `CHECK_PASSED`.
3. **Authority separation:** `change_cards.evidence` is decision-context text. `capture_source_refs` is Builder-initiated immutable Capture provenance. `project_links` is a project pointer and `integration_bindings` is authorization binding. None is Execution Map's standalone evidence registry.
4. **No provider dependency for core:** GitHub outage/disconnect must not affect Capture, Review, Decision or manually authored roadmap; only integration-specific evidence refresh/evaluation is degraded.
5. **DB deployment:** Migrations under `supabase/migrations/` can auto-apply after merge. Do not merge EM-1 schema until its SQL and RLS are independently tested against a safe database environment and current hosted migration head is checked.
6. **Revision guarantees:** Approved roadmap revisions and criteria cannot be silently rewritten after approval. The progress denominator must remain reconstructible for historical views.
7. **RLS graph integrity:** Child rows must not point across Projects by supplied FK IDs; use project-scoped composite foreign keys or verified triggers in addition to owner policy. A single malicious write must never re-parent an existing child entity across projects.
8. **Public isolation:** Execution tables are private by default; no anon grants, public-safe views, unrestricted service-role integration, or credential mirroring.

## Selected implementation boundary for EM-1

Proposed additive files (not assumed to exist today):

- `supabase/migrations/<new_timestamp>_buildmap_22_execution_roadmap_foundation.sql`
- `apps/web/lib/execution/` for typed roadmap/revision service and validation
- `apps/web/app/projects/[projectId]/execution/` for user-facing track/roadmap route (only after tested schema)
- `scripts/execution-contract/` for deterministic schema/ownership/progress policy fixtures
- `docs/execution-map/` for scope, tests and evidence

EM-1 MVP requires versioned Track → Revision → Milestone → Completion Criterion ownership, explicit draft/published state, immutable published scope, stable denominator and owner-only RLS. EM-2 evidence tables and EM-3 calculations should be introduced in their own strictly additive follow-up slices unless EM-1 contract tests demonstrate a need earlier.

## Current status and handoff

| Milestone | State |
| --- | --- |
| EM-0 repository audit | SOURCE_AUDITED; pending CI/PR closure |
| EM-1 schema + revision model | NOT_STARTED |
| EM-2 external evidence | NOT_STARTED |
| EM-3 criteria evaluator | NOT_STARTED |

**Next:** EM-1 isolated additive schema/validation PR from the latest protected main. Preserve active BuildMap Phase 53A authority and run RLS regression, migration contract and application CI before deciding to merge. No hosted SQL migration has been run by this audit.
