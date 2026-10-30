# EM-3B — Trusted Server-Only GitHub Recheck Adapter

- Date: 2026-10-30
- Parent: EM-3A PR #104. Stacked Draft branch `feat/execution-map-em3b-trusted-source-adapter`.
- State: **SOURCE_VERIFIED / WEB_CI_AND_LOCAL_AUTH_BROWSER_E2E_PASS / HOSTED_NOT_DEPLOYED / PUBLIC_PROGRESS_NOT_PUBLISHED**
- No new migration, provider permission expansion, scheduled job, hosted writes or Change Card authority change.

## Server-only implementation

`apps/web/lib/execution/trusted-evaluation-server.ts` is a Next.js `server-only` module. The exported `computeTrustedExecutionReadiness({ projectId, revisionId })` takes **only two object identifiers** and no client-supplied SHA, associations, evaluated proof, percentage, or roadmap weights.

It obtains the authenticated session and enforces Builder project ownership before reading an *explicitly approved* revision. Milestones and criteria are fetched with exact project, track and revision filters and active-only status. Reviewed associations and evidence source identities are reloaded from owner-scoped Supabase tables. All queries have explicit safety caps; truncated/incomplete data fails with `UNAVAILABLE`, not partial optimistic completion.

For each eligible reviewed `PR_MERGED` source only:

1. Match a stored GitHub source to an active same-project GitHub project link.
2. Require an active repository binding, valid HMAC integrity proof, and matching numeric repository ID, owner/repo name and installation ID. Reject duplicate active bindings to one numeric repository ID.
3. Call the EM-2C GitHub App installation probe to confirm current App ID, suspension state and exact current repository identity via its **existing narrow repository token**. No extra scopes are requested.
4. Load **the latest immutable snapshot by version sequence** and require source state `SOURCE_CONFIRMED`, canonical lowercase 40-character SHA and snapshot age no more than 24 hours.
5. Re-read the exact merged PR via GitHub API and compare source ID and current merge SHA against that snapshot. Missing source, provider/permission failure, changed SHA or stale cache yields **no trusted recheck object**.
6. Only then construct the internal `FreshProviderRecheck` object inside the server. Feed it into the unchanged `EM3A_V1` pure policy with the evaluation clock captured **after** network reads. The policy independently rejects proofs older than five minutes.

A provider read failure cannot become FAIL or PASS; supported PR source stays UNKNOWN. Other rule types (Checks, artifacts, deployment, manual acceptance) remain UNKNOWN until their own independent adapters are reviewed.

## Private non-publishing diagnostic

`GET /api/projects/[projectId]/execution/verification-readiness?revisionId=<uuid>`

This endpoint uses the trusted server adapter but deliberately **does not return the calculated percentage, basis points, milestone PASS or an official completion verdict**. It provides only a private, no-store, non-published per-criterion source health preview with reason codes, source recheck count, and the policy version. Even a successful provider SHA match is labeled `FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION`.

This is an instrumentation route for controlled acceptance, not EM-4's public progress UI. The server does not persist `criterion_evaluations`, alter the BuildMap Decision Timeline, mutate a source cache, or grant GitHub permissions.

## Verification matrix

- `apps/web/scripts/em3b-trusted-server-adapter-contract.mjs`: simulated session/DB/GitHub App adapter with owner-only authorization, approved-revision selection, HMAC binding, numerical repository ID, provider match, suspended/mismatch, forged/revoked token handling, 24h stale snapshot, unsupported rule UNKNOWN, and truncated data rejection. Full-rate API error cases are UNKNOWN without fabricating progress.
- CI: EM-1/2/3A/3B static/unit contracts, ESLint, TS check, Next.js build.
- Local Supabase Auth/Playwright: owner sees only `NOT_PUBLISHED` diagnostic for approved revision, other user gets 404, anon 401. No provider credentials are available in this local test.
- Real BuildMap GitHub App private repository smoke: **NOT YET VERIFIED**, and therefore no product-facing official progress percentage is authorized.

## Important limitations

- A TypeScript object shape does not attest a provider source; only the server's verified direct call does. The owner-writable observation cache is **never** a direct completion authority.
- Rechecks are intentionally bounded to 12 sources per request; exceeding the cap fails closed rather than silently omitting unknown criteria.
- This is *not* a durable evaluation record, live progress display, CI/deployment/issue verifier or multi-repository background worker. It makes no claim that a GitHub PR equals production deployment.
- The app currently requests only `contents:read` and `pull_requests:read`. Other provider capabilities require explicit authorization and their own tests.

## Next milestones

1. Source implementation commit `7b42b2241de920c8618aba2cf6935ba019d9d95f` verified: [Web App CI](https://github.com/gycha0109-beep/BuildMap/actions/runs/40998924860) PASS, [local Supabase Auth + Playwright E2E](https://github.com/gycha0109-beep/BuildMap/actions/runs/40998924853) PASS, [PIE Prospective Shadow](https://github.com/gycha0109-beep/BuildMap/actions/runs/40998925292) PASS. Recheck exact PR HEAD after documentation commits.
2. Keep staged PRs Draft until EM-1/2 hosted migrations 22/23 are approved, deployed and checked.
3. Run a real BuildMap-linked GitHub App installation smoke in a controlled environment, validating a known merged PR SHA and unknown/permission paths.
4. EM-3C: rule-specific Checks, artifact, deployment and manual acceptance adapters with explicit Builder authority, installation scopes and source correlation.
5. EM-4: only after trusted recheck and live smoke, expose source-grounded per-milestone drilldown and revision-frozen weighted progress.
