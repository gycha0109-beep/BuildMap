# EM-3A — Versioned Deterministic Evaluation Core

- Date: 2026-10-30
- State: **PURE_CORE_IMPLEMENTED / DETERMINISTIC_TEST_AND_WEB_CI_PASS / NOT_RUNTIME_CONNECTED / NO_PUBLIC_PERCENTAGE**
- Prerequisites: EM-1 #96, EM-2A #97, EM-2B #101, EM-2C #103 (stacked Draft PRs, not hosted).
- This stage has **no database migration, provider scope change, API that accepts client-submitted proof, or production progress output**.

## Purpose and policy

The first versioned, deterministic calculation policy `EM3A_V1` evaluates **one explicitly approved roadmap revision** only. It never edits original BuildMap Decision authority. The implementation is a pure function in `apps/web/lib/execution/deterministic-evaluator.ts`.

- Draft, invalid revision version, absent active milestones, missing/nonpositive/overprecise weights, missing required criterion, duplicate source IDs => `NOT_CALCULABLE`.
- A milestone is `PASS` only if **every active required criterion is PASS**. `FAIL` (when a future verified negative rule exists) overrides, then `UNKNOWN`, then `PENDING`. Optional criteria are shown but not required for milestone completion.
- A `PR_MERGED` criterion can be considered in pure tests only when an exact **Builder-reviewed source association** and a **recent, exact GitHub-app source SHA recheck** refer to the same evidence ID, repository ID, PR ID and canonical 40-hex merge SHA. Expected SHA, if configured in the approved revision, is an additional frozen constraint.
- Source without link => `PENDING`. Link without Builder review => `PENDING`. Missing source recheck, stale/future recheck, changed SHA, wrong repository ID or missing permission => `UNKNOWN`, not FAIL and never PASS.
- `CHECK_PASSED`, `ARTIFACT_EXISTS`, `DEPLOY_VERIFIED`, `MANUAL_ACCEPTANCE` remain `UNKNOWN` because their **rule-specific trusted verification adapters are not implemented**. A GitHub release is never equivalent to deployment verification.
- The weighted denominator contains **all active milestones** of the approved revision, including UNKNOWN and PENDING. Completed weight is only milestones with all required criteria passing. Weight units are integer 1/10000 to match the SQL numeric precision.
- Percentage `floor(10000 × completed_units / total_units) / 100` never rounds an incomplete revision up to 100.00%. Result includes policy version, each criterion reason, per-milestone verdict and required-criterion coverage counts.
- Time is an explicit argument rather than hidden wall clock to make repeated exact inputs deterministic. The initial freshness policy requires a provider recheck no older than five minutes and not later than evaluation time.

## Trust boundary before runtime integration

**A TypeScript type discriminator is not a security attestation.** A browser or database author can forge a JSON object called `GITHUB_PR_MERGE_RECHECK`. Therefore `evaluateApprovedRoadmap()` MUST NEVER be exposed directly as a client-configurable API and MUST NEVER accept user-supplied recheck objects as trusted truth.

EM-3B must construct provider recheck objects **inside a trusted server-only adapter**, on demand, from the actual GitHub API using a then-current HMAC-verified repository binding and appropriately scoped token; it must also resolve and verify same-project approved revision/criterion/source links from RLS. Only after this independent authenticated path and failure-mode tests pass may a real progress result be displayed. Cached `execution_evidence_observations` alone and reviewed links cannot authorize PASS.

## Verification scope

`apps/web/scripts/em3a-deterministic-evaluator-contract.mjs` tests:
- 25% and 100% weighted cases with synthetic server-rechecked PRs
- cache-only results 0%, missing source and unreviewed link distinction
- invalid, stale, future, changed SHA, wrong source/evidence/repository identity => no PASS
- manual/Checks/Artifacts/Deployment UNKNOWN
- no active milestones, no required criteria, duplicate identities, invalid and missing explicit weights => NOT_CALCULABLE
- fixed four-place weight precision and floor-to-2dp no false 100%
- byte-for-byte deterministic repeated calls and no runtime API exposure

**Verified source commit:** `7492421487da473e05af9eae1f22cfc92926adc7` — Web App CI (EM-1/2/3 contract + ESLint/TypeScript/Next.js build) PASS, PIE Prospective Shadow PASS. Check exact final PR HEAD again after documentation changes.\n\nThese tests are synthetic **calculation contracts**, not proof that BuildMap has processed a genuine GitHub deployment or check run. No real progress percentage is claimed for BuildMap or MyeongHa.

## Remaining gates

1. Web App CI exact PR HEAD passes EM-3A deterministic tests, TS, lint and build; do not overclaim unrelated SQL/E2E runs.
2. EM-3B server-only verified provider adapter and rule-specific evidence interpretation, with no user-controlled proof injection; stale/deleted/mismatch UNKNOWN.
3. EM-3C explicit Builder manual acceptance record and appropriate Checks/Actions/Artifact/Deployment read scopes, only after installation permission verification.
4. EM-4 UX: drill down from approved weights and criterion evidence to exact fresh source and show coverage/unknown with explicit timestamp.
5. EM-5 real MyeongHa pilot after the preceding release gates and actual app installation smoke.
