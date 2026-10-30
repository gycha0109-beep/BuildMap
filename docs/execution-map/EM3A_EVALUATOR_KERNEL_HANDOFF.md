# EM-3A — Deterministic Criterion and Revision Progress Kernel

- Date: 2026-10-30
- Status: **IMPLEMENTED_IN_DRAFT / SOURCE-ONLY TESTED / NOT DEPLOYED / NO RUNTIME INTEGRATION**
- Roadmap: `docs/execution-map/TECHNICAL_ROADMAP.md` §5 and EM-3
- Scope: Independent pure kernel, not a shortcut around pending EM-1 (#96), EM-2A (#97) or EM-2B (#101) controlled releases

## Deliverables

- `apps/web/lib/execution/em3a-evaluator.ts`: deterministic criterion rules, explicit `em3a-criterion-v1` rule version on each evaluation, and revision-weighted progress.
- `apps/web/scripts/em3a-kernel-contract.mjs`: exact-SHA, project/revision isolation, stale/unknown, conflicting observations, five-rule matrix, manual approval and frozen denominator tests.
- `.github/workflows/em3a-kernel.yml`: read-only source contract job on an exact PR SHA; no hosted SQL, secrets, provider API or application deployment.

## Trust boundary — mandatory before any integration

`execution_evidence.source_state = SOURCE_CONFIRMED` represents **cached observation** and must not satisfy an acceptance criterion. An `ExactSourceAttestation` is a **server-only contract** that a future EM-3B adapter must create **after** an evaluation-time provider re-read under the currently authorized project/repository binding, or a verified Builder approval. Browser, Supabase row values, PR titles, model suggestions, release tags, older SHA caches, and imported JSON are not allowed to forge `VERIFIED`. The pure module intentionally has **no API route and no persistence**; its inputs are not a public request schema.

The pure kernel checks attestation project, revision, criterion, repository, source SHA, rule identity and bounded freshness; it never trusts a `SOURCE_CONFIRMED` preview flag and has no network, SQL, permission escalation, or approval mutation.

The future adapter must:

1. Enforce authenticated owner-only project access and current GitHub App repository binding proof.
2. Re-read the exact provider object/SHA/check/deployment at evaluation time using narrow permissions; unavailable GitHub API capabilities remain UNKNOWN.
3. Construct attestation origin/status/verification timestamp and finite expiration from trusted server logic only; no browser-writable `VERIFIED` status.
4. Verify `MANUAL_ACCEPTANCE` against the Builder actor, approval time and reason in the authoritative server-side acceptance record.
5. Persist only evaluated results with revision, provenance and rule version after protected RLS review. This PR does **not** do any of these steps.

## Deterministic policy

| Rule | PASS requires | Non-PASS boundaries |
| --- | --- | --- |
| PR_MERGED | Exact repository, PR number, merged=true and 40-hex merge SHA matches re-read SHA and optional expected SHA | Open=PENDING; closed-unmerged=FAIL; missing/conflicting SHA=UNKNOWN |
| CHECK_PASSED | All explicitly required named checks succeed at the designated relevant SHA | Failed=FAIL; in-progress=PENDING; unavailable/duplicate/wrong SHA=UNKNOWN |
| ARTIFACT_EXISTS | Exact named artifact exists at the explicitly required artifact version | Confirmed absence or version mismatch=FAIL; unknown artifact identity/revision=UNKNOWN |
| DEPLOY_VERIFIED | READY for exact target environment and exact deployed SHA | ERROR=FAIL; BUILDING/QUEUED=PENDING; unverified SHA=UNKNOWN |
| MANUAL_ACCEPTANCE | Verified authorized Builder acceptance with actor/time/reason | Explicit rejection=FAIL; no outcome=PENDING; actor/time/reason unverified=UNKNOWN |

`UNKNOWN` is not a failure assertion and is never silently promoted to PASS. Explicit `now` ensures repeated evaluations with identical attestations are deterministic. No AI produces progress numbers.

An approved revision is calculable only when milestone IDs, positive integer weights, scope-bound unique criterion IDs and at least one required criterion per milestone are defined. A milestone contributes all its weight only when **all required criteria PASS**; optional criteria do not change its denominator. Unknown or blocked milestones remain in the denominator; if the policy is incomplete or unapproved, progress is `NOT_CALCULABLE` rather than a guessed percentage. A new revision cannot reuse the old revision's attestations.

## Current verification and limitations

- Local Node 22 source contract: PASS.
- Local TypeScript strict no-emit: PASS.
- GitHub CI: **PENDING EXACT-HEAD RESULT** until this PR runs.
- Actual EM-1/2 Postgres, hosted RLS, GitHub App E2E, approved revision storage, evaluated provenance persistence, UI and deployment: **NOT RUN / NOT CLAIMED**.
- EM-3A runtime hardening checks untyped truthy JSON (`"false"` for merge/artifact/approval), contradictory PR state, malformed check lists and malformed revision policies; all fail closed to UNKNOWN/NOT_CALCULABLE.
- No Production merge is authorized by this isolated kernel. Keep as Draft until upstream EM-1 and EM-2B release gates are complete and the server-side re-read trust boundary is reviewed.

## Next bounded EM-3 step

**EM-3B: verified source attestation adapter + project/revision-scoped read path.** Begin only after EM-1/EM-2 trust and hosted schema are controlled and approved. Never add an automatic approval, background refresh, provider permission expansion or progress computation from preview-only observations.
