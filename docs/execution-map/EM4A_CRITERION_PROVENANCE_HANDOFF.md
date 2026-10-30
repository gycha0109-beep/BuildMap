# EM-4A — Read-only Criterion Provenance Drilldown

- Date: 2026-10-30
- Status: **SOURCE IMPLEMENTED ON STACKED DRAFT / NOT HOSTED / NO VERIFIED PROGRESS DISPLAY**
- Base: EM-3B PR #105; upstream EM-3A #104 → EM-2C #103 → EM-2B #101 → EM-2A #97 → EM-1 #96
- Roadmap authority: TECHNICAL_ROADMAP.md §6 EM-4. Roadmap explicitly permits developing a UI shell while EM-2/3 mature but does not permit invented progress.

## Change boundary

- New private, server-rendered criterion detail:
  /projects/[projectId]/execution/provenance/[criterionId]
- Add a link from the existing approved roadmap criterion to its evidence lineage.
- Query with authenticated Supabase user, read-only user/Builder profiles, owner-scoped Project, exact criterion, approved roadmap revision and matched milestone. Cross-owner, unauthenticated, draft, archived and missing criteria must not expose private data.
- Display original revision title/version/approval timestamp, milestone weight, criterion rule/required flag, Builder review states, repository/PR identity, exact previous cache SHA, observation time and source reason.
- Show **UNKNOWN** completion and no progress percentage in all cases. Reviewed evidence links and SOURCE_CONFIRMED history are **not** provider rechecks or attestations.
- Bounded at 20 linked records; on truncation explicitly warn about incomplete provenance. On failed reads show UNKNOWN and do not infer missing data.
- PR links are constructed only for strict GitHub owner/repository and PR numeric identity; release references do not invent tag/deployment URLs. Never expose access tokens, installation credentials or private binding proofs.
- No new API routes, database writes, schema migrations, provider scopes, background refresh, auto-approval, new official Decision or Capture flow.

## Validation

- EM-4A contract: GitHub PR URL normalization rejects alternate domains/path injection; cache statuses never return PASS; read-only owner/approved-revision/criterion/snapshot retrieval and bounded display are asserted.
- Dedicated GitHub Actions CI: Node 22 static/deterministic contract, eslint, TypeScript and Next.js build on the exact PR head.
- **EM-4A local owner/anon/non-owner browser E2E = PASS** at tested code SHA `b521fe005c1d1b071d144a6adc8bf30625e87b4b` ([Actions run](https://github.com/gycha0109-beep/BuildMap/actions/runs/40998736954)). Disposable GoTrue/PostgREST migrations 00–23 plus local Next.js/Playwright verified owner 200, cross-owner 404, anonymous login redirect, cached SHA labeled UNKNOWN and a canonical safe GitHub PR link. No hosted provider touched.
- EM-3B disposable GoTrue/PostgREST E2E also passed at the same code SHA; it remains the authority for the server-only PR proof adapter.
- Hosted BuildMap Supabase remains on migration 21, no execution tables; no Production deployment or real GitHub App smoke is claimed.

## Remaining EM-4 exit gates

1. Controlled hosted migration 22/23, exact app authorization and RLS.
2. Approved EM-3B provider-verified proof adapter with actual App installation live smoke and separate check/artifact/deployment/manual rule validation as authorized.
3. Hosted/Production SSR browser and real linked GitHub App smoke remain pending. Local owner/anon/non-owner/missing criterion and cache-marking browser tests passed, but hosted auth and freshness have not.
4. EM-4 revision-aware progress/coverage/blocker explanation connected only to trusted, versioned evaluation results; do not hardcode a percentage.
5. EM-5 real project pilot and source-by-source acceptance evidence.

Do not promote EM-4A from Draft based only on a passing static UI/Next build.
