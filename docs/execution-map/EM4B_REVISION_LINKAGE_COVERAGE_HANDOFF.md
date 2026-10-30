# EM-4B — Approved Revision Evidence Linkage Coverage

- Date: 2026-10-30
- State: **STACKED DRAFT / READ-ONLY UI + LOCAL CONTRACT / NO HOSTED DEPLOYMENT**
- Parent: EM-4A #106 → EM-3B #105 → EM-3A #104 → EM-2C #103 → EM-2B #101 → EM-2A #97 → EM-1 #96
- Independent parallel alternative EM-3B PR #107 must be reconciled before releasing the implementation family; it is not automatically merged into this stack.
- Roadmap: TECHNICAL_ROADMAP.md §5.2–5.3 / EM-4. UI preview is allowed during EM-2/3, but no fabricated progress.

## Scope and language

- New route: \`/projects/[projectId]/execution/coverage/[revisionId]\` for exactly one approved roadmap revision; linked from the approved revision entries on the project Execution page.
- Real authenticated Supabase user and read-only Builder lookup; explicit project ownership, approved revision and unarchived track.
- Exact project+revision scoped milestones and completion criteria; criterion-specific Builder review links only.
- Show **criterion linkage coverage** as raw counts: total criteria; UNKNOWN criterion count; criteria with one or more *reviewed* links; criteria without reviewed links. Show each milestone's approved weight and each criterion's link review status and link to the EM-4A provenance page.
- An association status of \`reviewed\` means only that the Builder reviewed a proposed reference. It is **not** a fresh GitHub reread, a completion PASS, source integrity verification or an official Decision.
- Every criterion's completion remains **UNKNOWN**. Official progress remains **미공개**, without a fallback 0%, 100%, or estimated value. No reason is inferred from a missing connection.
- For partial reads, unexpected/duplicate/orphan links, invalid weights, missing criteria, or cap overflows, suppress all count totals and per-criterion partial summaries with **조회 불완전** rather than silently inflating coverage.
- Bounded per-revision reads: 50 milestones, 200 criteria, 500 links (+1 sentinel each), never a project-wide unbounded search.
- Pure deterministic \`summarizeEvidenceLinkage\` function returns only linked/unlinked review counts and UNKNOWN for all completion states. No provider tokens or source status input.

## Verification

- EM-4B pure contract: exact deterministic linkage counts, strict UNKNOWN, reviewed≠verified, duplicate/cross-criterion/orphan/partial-read fail closed.
- Exact-head GitHub workflow: Node 22 pure contract + lint/typecheck/build, and disposable local Supabase (migrations 00–23) + authenticated Playwright SSR route test.
- Local browser assertions: owner approved revision visible; draft/wrong revision/non-owner 404; anonymous login redirect; canonical links to EM-4A criterion evidence; reviewed association displayed without synthetic progress.
- No hosted data migration or live GitHub App credentials; local RLS tests are not Production release acceptance.

## Exclusions and gates

- No mutation API/SQL, provider scope expansion, new service tokens, source recheck bypass, completion-evaluation persistence, Capture or Decision transition.
- No EM-3 readiness endpoint call and no automatic use of PR #107 data. EM-4B is deliberately independent of the parallel EM-3B authoring track until trust/merge gates reconcile.
- Hosted BuildMap remains on migration 21; EM-1/EM-2B migrations 22/23 require controlled release approval.
- Production EM-4 needs actual verified EM-3 results per approved revision, evidence freshness/coverage/blockers with detail drilldown, hosted auth/E2E and real GitHub installation smoke. This PR does **not** claim that release gate.

**Disposition:** keep stacked Draft; merge only after upstream lineage, production migration and provider trust acceptance.
