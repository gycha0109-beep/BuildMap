# EM-3B — Verified Source Attestation: Release Prerequisites and Test Contract

- Date: 2026-10-30
- Status: **PREFLIGHT ONLY / SERVER ADAPTER NOT IMPLEMENTED / NOT DEPLOYED**
- Depends on: EM-1 PR #96, EM-2A PR #97, EM-2B PR #101, and EM-3A Draft PR #102
- Roadmap authority: [TECHNICAL_ROADMAP.md](TECHNICAL_ROADMAP.md) §5–§9
- Core contract: `apps/web/lib/execution/em3a-evaluator.ts` (rule version `em3a-criterion-v1`)

## Blockers to implementing or releasing EM-3B

1. EM-1's additive migration 22 and EM-2B's migration 23 are stacked Draft PRs. Do not merge/apply either to hosted Supabase without controlled release approval and complete RLS/Auth/PostgREST regression evidence.
2. EM-2A has source-preview reads, **not authoritative criterion verification**. EM-2B stores owner-scoped observation snapshots, **not PASS attestations**. Neither proves a condition after refresh merely because a row says `SOURCE_CONFIRMED`.
3. The GitHub App currently only permits repository-scoped `contents:read` and `pull_requests:read`. Checks, Actions, Issues and Deployments are **UNKNOWN** until permissions are deliberately authorized and live-tested. Do not silently broaden GitHub App scopes.
4. A trusted Builder manual-acceptance record (actor, clock, reason, revision binding) must be defined and proven under owner authorization before a MANUAL_ACCEPTANCE attestation can become VERIFIED.
5. This preflight does not change implementation routes, secrets, RLS, migrations, provider grants or existing Capture / Review / Decision identity.

## Required server-only authority chain

```text
Authenticated Builder
→ owner-scoped Project read and approved revision read
→ current active project GitHub binding and HMAC proof
→ repository-scoped installation token, server-only
→ exact provider object read at evaluation time
→ canonical identity + relevant SHA + capability check
→ finite-lifetime server-authored ExactSourceAttestation
→ EM-3A deterministic evaluator
→ explainable per-criterion result; no auto-approval
```

Never accept a client-provided `ExactSourceAttestation`, `origin='PROVIDER_EXACT_REREAD'`, `status='VERIFIED'`, `verifiedAt`, `sourceSha`, `ruleVersion`, or `fact` as proof. A typed TypeScript object is not a security boundary: the server must derive those fields from its own authenticated/authorized reads.

## Exact proof requirements by rule

| Criterion | Required trusted read | Missing or conflicting evidence |
| --- | --- | --- |
| PR_MERGED | Exact repository numeric identity, PR number, `merged=true`, closed state, 40-hex merge SHA; re-read this exact object rather than a PR list | UNKNOWN for missing identity, SHA or access; PENDING for confirmed open PR; FAIL only for verified closed/unmerged |
| CHECK_PASSED | Every required exact check context at criterion's relevant SHA, authorized checks permission, checked/check-run conclusion on the same SHA, duplicate context policy | UNKNOWN for permission, ambiguous duplicate contexts, wrong SHA, missing check; PENDING for live run; FAIL for confirmed failed check |
| ARTIFACT_EXISTS | Exact artifact name, version, source revision and repository-specific authorized read; verified existence/absence | UNKNOWN if missing permission, source/version/identity or unobservable artifact; FAIL only for a verified absence |
| DEPLOY_VERIFIED | Exact environment and deployed commit SHA from an authorized deployment source, with READY/ERROR/in-progress state | UNKNOWN when only Release/PR exists, when permissions absent or target/SHA inaccessible; no inferred deployment PASS |
| MANUAL_ACCEPTANCE | Authoritative BuildMap owner-bound Builder approval record with actor, timestamp, explicit decision and reason, matching exact roadmap revision | UNKNOWN for forgery, wrong Builder/revision, missing reason/time; PENDING for verified undecided; FAIL only for verified explicit rejection |

## Failure-isolation fixture matrix (must become executable before release)

- **Identity:** Owner vs non-owner vs anonymous; project mismatch; inactive/disconnected binding; invalid HMAC; wrong repository numeric ID, renamed repository display label and cross-project criterion.
- **Source freshness:** Provider 401/403/404/429/5xx, timeout and malformed JSON; stale observation; PR SHA changed from cached A→B; check-run targets SHA B while criterion fixes SHA A; target branch, environment or repository mismatch.
- **Authorization:** No Checks/Actions/Deployments scopes; rejected manual approval actor; user-supplied `VERIFIED` or `SOURCE_CONFIRMED` payload; untrusted PR body/prompt injection; cache-only evidence.
- **Lifecycle:** Two identical refreshes yield one logical evidence identity; historical A→B→A versions are preserved; old revisions do not inherit progress; manual acceptance cannot approve an official BuildMap Decision.
- **Determinism:** Same approved revision and verified attestation set yield identical outputs; unknown/blocked milestones stay in the denominator; unknown policy yields NOT_CALCULABLE; no provider outage mutates source snapshots or Decision data.
- **Operational:** Bounded request fan-out, server-side timeouts, no token in logs/JSON, no background polling, no schema migrations from the verifier PR and no implicit release from CI.

## Promotion criteria

Only after the upstream controlled DB/auth gates PASS should a separate EM-3B implementation PR add a server-only verifier, explicit adapter tests and Project-authenticated read path. Before merging that implementation: isolated PostgreSQL RLS regression, local Auth/PostgREST E2E, real repository-scoped GitHub App source re-read, exact-head CI/PIE/GitGuardian, reviewed permitted scopes and safe hosted release. Do not claim full EM-3, EM-4, EM-5 or MyeongHa end-to-end progress before these gates.

**Current disposition:** Contract frozen for review; verified source adapter and production integration **NOT STARTED**.
