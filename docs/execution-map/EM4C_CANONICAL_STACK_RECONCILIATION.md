# EM-4 Integration Candidate — Parallel EM-3B Stack Reconciliation

- Date: 2026-10-30
- Status: INTEGRATION CANDIDATE / STACKED DRAFT / NOT RELEASED
- Parent lineage: EM-3C-A manual acceptance PR #109 → EM-3B trusted adapter #107 → EM-3A #104 → EM-2C #103 → EM-2B #101 → EM-2A #97 → EM-1 #96
- Alternate source lineage retained: EM-3B #105 → EM-4A #106 → EM-4B #108. Isolated alternative EM-3A #102 also remains separate.

## Scope and rationale

PR #105 and #107 independently implement server-side source evidence verification. PR #107 provides a broader authenticated, owner/approved-revision-scoped server evaluation and NOT_PUBLISHED readiness endpoint. PR #109 adds explicit Builder manual-acceptance and immutable revocation events in migration 24.

This integration candidate **copies only EM-4A and EM-4B's read-only UI, deterministic linkage-only helper, tests and CI** from PR #108 onto PR #109. It does not pull in PR #105's alternative source verifier or HMAC proof helper. It preserves PR #107's trusted evaluation and NOT_PUBLISHED endpoint and PR #109's manual approval actions/components/SQL. No existing parallel Draft PR is closed or silently superseded.

## Invariants

- EM-4A shows approved criterion provenance, Builder-reviewed linkage and old GitHub observation SHA. Completion always UNKNOWN, not PASS.
- EM-4B shows approved revision per-criterion linkage counts only. A reviewed association is NOT a live provider proof and is not a weighted progress percentage. Counts are suppressed for partial/truncated/unexpected records; official progress remains unpublished.
- EM-3B source verification is a server-only trust boundary; EM-3C-A manual acceptance/revocation is a separate Builder-authority audit trail. Neither equals official BuildMap Change Card approval or a Decision.
- No mutation, provider scope expansion, access token in browser, new schema or automatic Capture is introduced by this EM-4 patch.

## Verification

1. Exact-head EM-4A/B deterministic contracts and canonical-lineage contract: UI coexistence with trusted adapter, readiness endpoint and manual acceptance lineage.
2. Lint, TypeScript, Next.js build on combined source; PIE and GitGuardian.
3. Disposable local GoTrue/PostgREST Auth and RLS through migration 24, actual owner/non-owner/anonymous Playwright browser E2E for both private read-only pages. No hosted DB use.
4. Upstream EM-3B/3C exact-head CI, source diff review, and later actual repository-scoped GitHub App smoke.
5. Any missing or failed check means HOLD. Older commits cannot substitute for exact-head evidence.

## Production and roadmap gates

The hosted BuildMap schema was previously at migration 21. Migrations 22, 23 and 24 require a separate explicitly approved controlled release with hosted Auth/RLS verification. A mocked GitHub App or synthetic success cannot validate live source identity. EM-4 may publish numeric official progress only after fully verified EM-3 rule coverage, freshness/UNKNOWN semantics and authorized persistence/read path; local UI coverage is not this evidence.

Next: reconcile competing PRs #105/#107 against exact-source assurance, implement live GitHub App verification and controlled schema release; then EM-4 verified progress connection and EM-5 real-project acceptance.

**Release disposition:** keep stacked Draft. Do not merge to main or deploy Production from this candidate.
