# EM-2B — Persistent GitHub Evidence Cache / Source-Association Handoff

- Date: 2026-10-30
- PR: [#101](https://github.com/gycha0109-beep/BuildMap/pull/101) (stacked Draft onto EM-2A #97 → EM-1 #96)
- State: **SOURCE_VERIFIED / SQL_WEB_AUTH_BROWSER_CI_PASS / HOSTED_NOT_DEPLOYED**
- Production migration: **NOT APPLIED** (new additive `20261030100000_buildmap_23_execution_evidence_registry.sql`)

## Implementation in this PR

| Component | Implementation |
| --- | --- |
| `execution_evidence` | Stable project/provider/numeric repository/source identity, project-owner RLS and first/last observed times |
| `execution_evidence_observations` | Immutable change-only observations with monotonic `version_sequence`, snapshot fingerprint, status/SHA/reason/time and canonical source URL; old versions never overwritten |
| `criterion_evidence_links` | Same-project composite FK to approved criterion/source; Builder proposal/review/rejection, with reviewed link frozen after decision |
| `execution_record_evidence_batch` | Bounded invoker-rights transactional RPC with verified owner RLS, canonical source references, source-state validation and serialized idempotency |
| `POST /api/projects/[projectId]/execution/evidence-refresh` | Origin gate, real Builder project owner authorization, canonical GitHub project link and HMAC binding proof, restricted GitHub App read, then session-scoped cache RPC. Server never returns provider credentials |
| `/projects/[projectId]/execution/evidence` | Explicit manual preview vs cache refresh/save, cached latest source observation list, reviewed criterion/source links and UNKNOWN completion label |

## Core invariant: cached source != verified completion

The source identity, snapshot digest and Builder review are **not trusted completion proofs**. The SQL function uses `SECURITY INVOKER`, authenticated project-owner table grants and RLS, not a hidden elevated service-role client. Consequently a determined authorized Builder can write or spoof some cached source metadata using their own Data API role; it is intentionally **untrusted cache**. EM-3 must independently re-read the GitHub object using the then-current verified repository App binding, validate exact SHA/check/deployment requirements, and decide PASS/FAIL/PENDING/UNKNOWN from current policy. No `criterion_evaluations` table, progress RPC or auto-Decision transition exists here.

Snapshot integrity is append-only for ordinary clients (no UPDATE/DELETE grant and explicit guard); the dedup fingerprint is *not a cryptographic attestation*. The DB takes the lock on the logical source identity before comparing latest snapshots. Two identical refreshes yield the same current version; `SHA A → B → A` yields three ordered versions rather than hiding the return to A.

## Verification

- `scripts/execution-contract/em2-evidence-scenarios.sql`: owner/other/anonymous RLS, source-version idempotency, A→B→A, invalid multi-item rollback, canonical repository, release UNKNOWN, cross-project link FK, immutable snapshots and reviewed links, no evaluation authority
- `scripts/execution-contract/em2-parallel-refresh.sh`: concurrent same-source refresh under independent authenticated sessions yields one logical identity and one snapshot
- `.github/workflows/execution-map-sql-contract.yml`: PostgreSQL 17 isolated execution of migrations 22–23 and full repository lineage 00–23, including EM-1 regression suite
- `apps/web/scripts/em2-local-auth-e2e.mjs`: real local Supabase GoTrue JWT + PostgREST cache RPC, cross-user read/write isolation, review actor, replay, rollback and anon denial
- `apps/web/scripts/em1-local-browser-e2e.mjs`: real Next.js/Playwright view of cached sources, approved criterion link proposal/review, other-user denial and cross-origin write protection
- `apps/web/scripts/em2-evidence-persistence-contract.mjs`: source/test guard against accidental trusted PASS, permissive writes or source-boundary regressions
- `apps/web/scripts/em2-github-evidence-contract.mjs`: existing EM-2A mocked GitHub REST source-level tests

**Verification status:** Web App CI, complete SQL migration lineage 00–23 with EM-1/EM-2 RLS/idempotency/concurrency scenarios, PIE, real local GoTrue/PostgREST, and Playwright UI flows all **PASS** at source commit `e5c22be348b3008534cb8b47f9f1220f5a963f66`. Final documentation commits require exact-head rerun before PR promotion. Real GitHub App live repository smoke remains **unverified**; no actual BuildMap GitHub App installation token was used in the synthetic/local provider tests.

## Release constraints and next stages

1. Keep #101 Draft and based on #97; #97 remains stacked on EM-1 #96, which is still Draft.
2. Do not merge migration 23 into `main` or write it to hosted Supabase until EM-1 migration 22 controlled release is complete and this exact migration has repeatable local Auth/E2E/security verification.
3. Verify latest hosted migration head, complete GitHub Actions checks, security Advisor differences and post-merge Vercel smoke before claim of deployment.
4. EM-2C: live GitHub App connection smoke against an actual authorized BuildMap project, narrowly scoped Checks/Actions/Deployment access request, freshness and missing-source invalidation.
5. EM-3: versioned deterministic criterion evaluator with exact SHA and current provider re-read. Never infer progress from cached source title, stored SHA or Builder link approval.

No supplier credentials, public-safe views, PIE/WatchTower core, Capture/Change Card/Decision authority or original historical migrations 00–21 were modified.
