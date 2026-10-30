# EM-2B — Persistent Evidence Registry and Trust Boundary (Implementation Contract)

- Date: 2026-10-30
- Status: **SOURCE_IMPLEMENTED_IN_DRAFT_PR_101 / NOT_HOSTED_DEPLOYED / LIVE_PROVIDER_VALIDATION_PENDING**
- Predecessors: EM-1 (PR #96) and EM-2A source preview (PR #97)
- Implementation and test details: [EM2B_IMPLEMENTATION_HANDOFF.md](EM2B_IMPLEMENTATION_HANDOFF.md). Additive migration 23 and browser/API/test source are committed to Draft PR #101; final exact-head CI is required.

## Core security distinction

A reference stored in a database is **not automatically a provider-verified proof**.

- **Observed source:** GitHub data fetched using a verified project GitHub App installation and repository-bound access token. Observation includes observed time, canonical provider object identity, repository identity, SHA if present and raw-source reference. It is useful for browsing/caching.
- **Trusted verification:** an evaluation-time, exact GitHub API re-read under the currently authorized repository binding, with exact object identity and SHA correlation. Until that succeeds, any stored source is **UNKNOWN/PENDING for completion criteria**.
- **Official Decision:** separate Builder-controlled BuildMap Change Card/Decision. Execution evidence never auto-creates or approves it.

Under no circumstances should a browser-writable `source_state='SOURCE_CONFIRMED'` column, cached SHA, title, merged PR, release URL or user-submitted metadata cause `criterion_evaluations.PASS` without independent verification.

## Proposed entity model (subject to EM-2B schema review)

### execution_evidence

- Primary UUID and BuildMap Project ID (existing `projects.id`).
- Provider (`github`) and exact canonical repository identity (GitHub numeric repository ID plus full name for display).
- Provider source type (`merged_pull_request`, `release`, future `check_run`, `deployment`, `issue`), source ID (`pr:123`, `release:456`).
- Canonical provider URL (constructed from verified object identity, not accepted from arbitrary user text).
- Source SHA (strict 40-hex when present), source event time and observed time.
- Retrieval/capability reason code; `SOURCE_CONFIRMED` means observed source metadata, **not acceptance PASS**.
- First-observed and last-observed metadata; identity cannot be reassigned to another project.
- Unique idempotency key: Project + provider + numeric repository identity + source type + source ID. Revision history/snapshot tracking must be retained or explicitly versioned; a retry must never multiply evidence.
- No token, client secret, raw private provider response body, or sensitive developer data in public-safe views.

### criterion_evidence_links

- Criterion ID and evidence ID with **same-project composite FK**.
- Link proposal and review status; explicit Builder review for uncertain associations.
- Not authoritative evaluation. The evaluator rechecks source identity and revision.

### Permission design

- Owner-only RLS for reads and permitted writes; no anonymous source table grants.
- Decide whether writes require a narrow server-only mutation API or provisional-cache writes with mandatory EM-3 re-verification. Do not accidentally treat browser-writeable cache as trusted proof.
- Exact project-link binding HMAC must be checked on each remote refresh, and disconnection must mark subsequent evaluations UNKNOWN rather than forging success.
- Read-only failure fallback: network 502/timeout, API 401/403/404/429, source deletion and stale SHA => UNKNOWN, preserve last observation for audit but never treat stale cache as currently verified.

## Test matrix and gate to close EM-2B

1. Owner, non-owner and anon table/RPC access matrix; cross-project FK and IDOR denied.
2. Exact GitHub App repository binding proof required for refresh; token never persisted or returned.
3. Two identical refreshes produce exactly one logical evidence entry and one current snapshot. **A → B → A** creates three ordered immutable versions; returning to an older state must not be suppressed by global fingerprint uniqueness.
4. A forged browser insert/UPDATE can **never** cause a Completion Criterion PASS (EM-3 prerequisite).
5. Missing/ungranted Checks, Actions, Issues and Deployment permissions produce UNKNOWN; no unapproved new GitHub App scopes.
6. Source re-read / SHA mismatch and stale-or-removed GitHub objects transition to UNKNOWN; no false-negative completion assertion.
7. Independent Postgres migration/RLS contract, complete migration lineage test, local Supabase Auth/PostgREST and controlled browser E2E pass before hosted migration.
8. Review against current hosted migration head and production auto-apply behavior before merge.

Migration 23 exists **only on a stacked Draft PR**. This contract does not authorize applying it to hosted Supabase, granting extra GitHub permissions or production release.
