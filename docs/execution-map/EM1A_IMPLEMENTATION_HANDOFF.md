# EM-1A — Revisioned Roadmap Storage Implementation Handoff

- **Baseline main:** 010aaeb454bc01e959dd8a9e0f6f50998116f674 (EM-0 audit #95)
- **Status:** SOURCE_IMPLEMENTED / ISOLATED_POSTGRES_RLS_AND_CONCURRENCY_PASS / HOSTED_NOT_DEPLOYED
- **Migration:** supabase/migrations/20261029053000_buildmap_22_execution_roadmap_foundation.sql
- **Static contract test:** apps/web/scripts/phase-em1-schema-contract.mjs (Web App CI)
- **Isolated SQL contract:** .github/workflows/execution-map-sql-contract.yml, running a disposable PostgreSQL 17 service with owner/tenant/anon/approval/concurrency scenarios
- **UI/actions:** apps/web/app/projects/[projectId]/execution/{page.tsx,actions.ts}, plus project navigation tab
- **Related design:** TECHNICAL_ROADMAP.md; EM0_BOUNDARY_AUDIT.md
- **EM-1B continuation:** [EM1B_IMPLEMENTATION_HANDOFF.md](EM1B_IMPLEMENTATION_HANDOFF.md) — draft editing, soft exclusion, atomic JSON import and their SQL/CI proof

## Scope implemented in source

Four private project-scoped tables:

1. **execution_tracks** — project-owned execution-track list with immutable project identity and no hard deletion for browser roles.
2. **roadmap_revisions** — unique positive version per track, one draft per track, explicit draft → approved transition, approval actor and time, immutable approved rows.
3. **execution_milestones** — ordered positively weighted milestones tied to the same project/track/revision via composite FK.
4. **completion_criteria** — ordered typed required/optional conditions tied to the same project/track/revision/milestone via composite FK.

The migration restricts table privileges to SELECT/INSERT/UPDATE for authenticated clients under owner-only RLS, denies anon and authenticated DELETE, and adds trigger guards against cross-project reparenting and changes to approved revisions and their children. A revision cannot be approved without at least one milestone and a required criterion for each milestone.

Existing schema and migrations 00–21 remain untouched. No direct updates to Change Cards, provider bindings, Capture provenance, GitHub API permissions, or production credential stores.

## Important limits

- Project-owner scoped editor, draft edit/archive actions and atomic JSON import are committed in PR #96 but **not deployed**. See EM-1B handoff for the later continuation. **EM-1 is not complete** until realistic schema/browser verification and hosted release.
- EM-2 source ingestion, evidence hashes, linked checks/deployments and EM-3 evaluator are absent.
- No progress percentage or publication is authorized; the source schema is not live product functionality.
- Static checks alone are insufficient. Disposable PostgreSQL 17 tests do exercise SQL execution, owner/tenant/anon RLS, approved-revision immutability and concurrent approval serialization, but **do not prove compatibility with the full hosted Supabase schema or live browser behavior**.
- The repository has Git-linked migration auto-apply. **Do not merge the migration PR solely because lint/typecheck/build and static checks passed.**

## Safe required verification before merge

1. Confirm the actual latest protected main commit, changed migration files and Supabase hosted migration list; 00–21 must be unchanged and hosted revision 22 must be absent.
2. Apply the proposed EM-1A migration in an **isolated PostgreSQL/Supabase test database** matching relevant production schema/functions and auth roles; do not apply as an experiment to production.
3. Prove successful owner track → draft revision → milestone → required criterion → approval.
4. Prove **non-owner SELECT/INSERT/UPDATE denial** for each of four tables, plus anon denied SELECT and all writes.
5. Prove cross-project IDs cannot be smuggled through the composite child foreign keys.
6. Prove after approval all four domain-identifying fields are stable, revised milestones/criteria cannot be inserted/updated/deleted, and approved revisions cannot revert to draft.
7. Prove approval fails when zero milestones, when any milestone lacks a required criterion, and when approval actor differs from authenticated owner.
8. Prove the database owner-lock pattern prevents concurrent milestone/criterion modification racing with approval (two concurrent authenticated sessions).
9. Run DB security advisor and privileges checks. Confirm no new public-safe views or provider credential exposure.
10. Run full PR exact-head checks and verify migration history and runtime after controlled deployment. Do not replay a migration already applied by automatic deployment.

## Next bounded slices

- **EM-1 remaining:** full production-schema migration rehearsal, authenticated real-browser E2E, controlled migration/release and post-deploy verification. Editing and import source work is in [EM-1B handoff](EM1B_IMPLEMENTATION_HANDOFF.md).
- **EM-2:** GitHub evidence adapter with separately reviewed and appropriately scoped permission expansion for Issues, Checks and Deployments.
- **EM-3:** deterministic evaluator/progress engine using approved immutable revision definitions and verified evidence.

## Verified facts versus pending

- Historical 00–21 migration list was observed read-only against the connected BuildMap Supabase project on 2026-10-29.
- EM-0 source audit #95 is merged.
- EM-1A schema, private Builder editor/actions and CI fixtures are committed in PR #96. Disposable PostgreSQL/tenant/concurrency runs are passing at tested commits; final PR-head verification must be repeated after later changes.
- Isolated SQL/RLS/concurrency checks: **PASS in disposable PostgreSQL CI**. Hosted migration deployment and real authenticated browser behavior: **NOT VERIFIED / NOT CLAIMED**.
