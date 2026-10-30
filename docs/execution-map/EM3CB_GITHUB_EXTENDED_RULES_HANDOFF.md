# EM-3C-B1 — Scoped GitHub Checks, Actions Artifacts and Deployment Evidence Validators

- Date: 2026-10-30
- Status: **SOURCE_VERIFIED_IN_WEB_CI / MOCKED_PROVIDER_AND_V3_CONTRACT_PASS / REAL_APP_SCOPE_UNAPPROVED / HOSTED_NOT_DEPLOYED**
- Stacked Draft branch: `feat/execution-map-em3cb-github-rule-verifiers` on EM-3C-A #109.
- No schema migration, GitHub App permission change, new OAuth scopes, installation token expansion, hosted Supabase write or public progress output.

## Scope and GitHub permissions

EM-3C-B1 implements the **rule-specific parsing and correlation logic** needed to evaluate three previously unsupported conditions. The existing BuildMap GitHub App installation-token broker `createInstallationAccessToken()` is unchanged and still mints tokens with **only** `contents:read` and `pull_requests:read`. It is deliberately **not** wired into these expanded reads, and no runtime API accepts caller-supplied token or provider proof.

The GitHub REST capabilities are separate:
- `CHECK_PASSED`: [List check runs for a Git reference](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference) requires **Checks: read**.
- `ARTIFACT_EXISTS`: [Get workflow run / list run artifacts](https://docs.github.com/en/rest/actions/artifacts#list-workflow-run-artifacts) requires **Actions: read**.
- `DEPLOY_VERIFIED`: [List deployments and statuses](https://docs.github.com/en/rest/deployments/deployments#list-deployments) requires **Deployments: read**.

Installation-granted permissions are **not** equivalent to permissions included in the current narrow token. The prior EM-2C diagnostic exposes this distinction. Requesting, connecting or enabling expanded token permissions is an **explicit separate release/authorization step**, not accomplished in this PR.

## Rule-specific facts required

| Rule | Immutable approved configuration | Trusted current GitHub evidence | Fail-closed behavior |
| --- | --- | --- | --- |
| CHECK_PASSED | `expectedSha`, `checkName`, pinned `checkRunId` or `checkAppId` | Exact SHA, app/run identity, name; completed + success | Other SHA/name/app/ID, neutral/skipped, >100 total/ambiguous => UNKNOWN; in progress PENDING; verified failure FAIL |
| ARTIFACT_EXISTS | `expectedSha`, workflow run ID, artifact ID, name, sha256 digest | Successful completed run with matching SHA; exact unexpired named artifact and content digest | Missing/expired/different SHA/digest/run, truncated list => UNKNOWN; running workflow => PENDING |
| DEPLOY_VERIFIED | `expectedSha`, deployment ID, exact environment | Latest deployment in the environment points to SHA and ID; latest status is success | Superseding/newer deployment, wrong environment/SHA, inaccessible status or inactive => UNKNOWN; queued/in progress PENDING; verified error/failure FAIL |

A release tag or merged PR does not by itself prove deployment or artifact existence. For deployments, checking an old successful status without consulting the **current latest deployment in the same environment** would allow false completion and is explicitly rejected.

## Source and policy changes

- `apps/web/lib/execution/github-extended-rule-verifiers.ts`: pure checks, artifacts and deployment validators. Their input payloads are **not intrinsically trusted**.
- `apps/web/lib/execution/github-extended-rule-reads.ts`: bounded, `server-only` GitHub REST transport for a **future independently authorized scoped installation token**; confirms exact numeric repository ID before each read, uses fixed API paths and no-store, rejects provider errors, excessive responses and pagination gaps. The function does **not** mint tokens, widen permissions, authorize the calling actor, or run in the product.
- `apps/web/lib/execution/deterministic-evaluator.ts`: isolated `EM3CB_V3` policy adds `TrustedExtendedRuleProof[]` with exact checked-at, criterion, source evidence ID, PR source ID, numeric repository ID, SHA and provider object ID correlation. Even in V3 it additionally requires a fresh same-source PR merge SHA recheck and Builder-reviewed association. No PR correlation => UNKNOWN; a verified negative result may produce FAIL without any increased progress.
- Historical `EM3A_V1` and `EM3C_V2` semantics remain unchanged. The existing authenticated EM-3B endpoint explicitly chooses `EM3C_V2`, so **all expanded rules remain UNKNOWN in the running app** and the official numeric percentage is still NOT_PUBLISHED.

**Trust caveat:** An object typed as `TrustedExtendedRuleProof` is not authentication. Only a server-owned adapter, after project Builder authorization, HMAC-bound exact repository verification, explicit installation-scope approval, and a live source recheck, may construct these objects. This PR does **not** implement that final integration.

## Testing and release gates

- `apps/web/scripts/em3cb-github-extended-rules-contract.mjs` exercises success/negative/pending/unknown for all three rules with mocked GitHub JSON; wrong SHA/name/ID, checks from another app, missing or ambiguous/truncated lists, expired/mismatched artifacts, later deployment supersession, denied 403 and wrong repo ID.
- V3 deterministic tests require exact Builder-reviewed PR association and fresh merge SHA plus rule proof; test that forged/stale/wrong-source proofs cannot PASS, and that V2 is invariant when V3 proof is supplied.
- Web App CI executes prior EM-1/2/3 tests, the EM-3C-B1 mocked provider tests, TypeScript, lint and build. Prior SQL/Auth/Playwright tests remain upstream required gates.
- **Not verified:** actual GitHub App Checks/Actions/Deployments permissions, real controlled provider read with a newly authorized installation token, production hosting or progress calculation on real records.
- **Verified source HEAD:** `1d8a298941de5a0b068ccf7fbd70e78ed6600eb8` — [Web App CI](https://github.com/gycha0109-beep/BuildMap/actions/runs/41003485441) **PASS** (EM-1/2/3 contracts, ESLint, TypeScript, Next.js build); [PIE Prospective Shadow](https://github.com/gycha0109-beep/BuildMap/actions/runs/41003485891) **PASS**. These are mocked GitHub provider tests; no live installation acceptance. Recheck exact PR HEAD after this documentation-only commit.
- Check reruns: if several check runs share the same SHA/name/App, even a pinned older green run yields **UNKNOWN** instead of PASS until the current required check is unambiguous.
- **Next EM-3C-B2:** explicit GitHub App permission approval, server-only scoped token broker and live smoke, ruleConfig validation at approval, trusted provider recheck construction, cache revision/source binding, timeout/TOCTOU handling, and end-to-end no-false-PASS tests. Only then enable EM3CB_V3 on a private deployment and proceed toward EM-4.

No user request to expand the GitHub App's permissions has been assumed.
