# EM-3C-A — Immutable Builder Manual Acceptance / Revocation

- Date: 2026-10-30
- Branch: `feat/execution-map-em3c-manual-acceptance` stacked onto EM-3B #107
- Status: **SOURCE_IMPLEMENTED / CI_PENDING / HOSTED_NOT_APPLIED / PROGRESS_UNPUBLISHED**
- Additive migration: `20261030130000_buildmap_24_execution_manual_acceptance.sql` (Draft branch only)
- Scope: the MANUAL_ACCEPTANCE rule and Builder authority. **Not** Checks/Actions/Artifacts/Deployments verification.

## Authorized acceptance record

`execution_manual_acceptance_events` stores an immutable, project-scoped append-only stream of:
- `project_id`, `track_id`, `roadmap_revision_id`, `criterion_id` with a composite project+criterion foreign key
- `event_type`: `accepted` or `revoked`
- required human reason, 12–2000 characters
- `actor_builder_profile_id` and `recorded_at` **assigned by the PostgreSQL trigger from the current authenticated project owner**
- DB-generated event UUID

The trigger uses `SECURITY INVOKER`, checks current `auth.uid()`, the real project owner's builder identity, matching **approved** roadmap revision and live (non-archived) criterion of exact rule type `MANUAL_ACCEPTANCE`. It acquires a criterion-row lock before deciding the next legal transition: no acceptance of a draft, duplicate acceptance, or revocation without a prior current acceptance. It rejects other-tenant/anonymous access. Immutable UPDATE/DELETE guard and RLS/grants prevent rewriting past audit records.

**The event represents an explicit Builder statement**, not GitHub proof, AI confidence, automatic Change Card approval or hidden application progress. A deliberate owner-issued direct Data API INSERT is an explicit manual action; it cannot forge the actor or timestamp even if an input includes those fields.

## Application and versioned policy

- `recordManualAcceptanceAction` in the private project evidence Server Actions validates authenticated ownership, criterion ID, 12–2000 character reason, approved revision and event type, then inserts without any actor/time or event ID field. The DB owns those fields.
- `ManualAcceptancePanel` displays eligible approved manual criteria, their latest recorded state and recent audit events, with explicit accept/revoke reason forms.
- Versioned `EM3C_V2` policy adds optional `TrustedManualAcceptance[]` while preserving historical `EM3A_V1` results, populated only by the server. Latest matching, valid `accepted` record can yield **PASS** for that manual criterion; `revoked` yields **PENDING**; missing/invalid/ambiguous results remain **UNKNOWN**. A manual acceptance NEVER substitutes for Checks or Deployment verification.
- `trusted-evaluation-server.ts` fetches the approved revision's latest manual event per criterion under the current owner's session, using strict snapshot bounds; updates have a separate last-event read. The existing private `verification-readiness` route still returns **NOT_PUBLISHED** for numeric progress and official criterion evaluations.

The server-authenticity guarantee lies in RLS+trigger validation and the server-only read path. The TypeScript `TrustedManualAcceptance` shape on its own is **not** an attestation; never expose an evaluation API that accepts caller-supplied manual events.

## Required validation

- Disposable PostgreSQL 17: migration 24 applied after 22–23, correct approved/manual eligibility, no draft/nonmanual approvals, no owner/actor spoofing, duplicate+revoke transition rules, immutable audit, anonymous and cross-tenant denial, full migration lineage 00–24 replay.
- Real local Supabase GoTrue/PostgREST: legitimate Builder acceptance, attempted forged actor/timestamp, revoke/re-accept history, unauthorized/anonymous denial, update/delete rejection.
- Next.js/Playwright: explicit Builder reason form for approved manual criterion and revocation UI; existing private scope and Decision Timeline tests unchanged.
- Deterministic TS: accepted manual milestone counts weighted completion only when the latest trusted manual event is valid; revoked becomes PENDING; other Checks remain UNKNOWN; future, ambiguous, mismatched approval cannot yield PASS.
- Keep downstream Rules `CHECK_PASSED`, `ARTIFACT_EXISTS`, and `DEPLOY_VERIFIED` **UNKNOWN** until explicit app permission and exact correlated source/commit/environment validators exist.

## Remaining release and EM-3C-B gates

- All stacked PRs **remain Draft**. Hosted Supabase migration head was still 21 when EM-3B was completed; migration 24 must never apply before staged controlled release of 22 and 23.
- GitHub App currently mints only `contents:read` and `pull_requests:read`. GitHub Checks REST requires **Checks: read**; workflow runs require suitable Actions read scope; deployment evidence requires verified environment and deployed commit. These scopes are **not** automatically expanded or requested.
- EM-3C-B will add rule-specific source correlation and authorization gates, including exact SHA, required check name, status/conclusion, artifact revision and deployment environment; always UNKNOWN when permissions/capability are absent. No fabricated real evidence.
- Before EM-4 public progress UI and EM-5 MyeongHa pilot: actual connected GitHub App live-read smoke, authorized production migrations, post-release RLS/advisor verification and live Vercel smoke.

References: [GitHub Checks REST permission requirements](https://docs.github.com/en/rest/checks/runs), [Supabase API authorization/RLS](https://supabase.com/docs/guides/api/securing-your-api).
