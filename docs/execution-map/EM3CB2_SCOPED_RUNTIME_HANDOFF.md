# EM-3C-B2 — Default-off Scoped GitHub App Broker and Trusted Extended Rule Runtime

- Date: 2026-10-30
- State: **SOURCE_IMPLEMENTED / CONTRACT_AND_WEB_CI_PENDING / LIVE_GITHUB_APP_SCOPE_NOT_APPROVED / HOSTED_NOT_DEPLOYED**
- Parent: EM-3C-B1 #111 (all upstream Execution Map PRs remain Draft).
- No new SQL migration, no GitHub App configuration mutation, no production environment change, no token persistence, no official progress publication.

## Implemented server path

1. `github-extended-capability-broker.ts` is `server-only` and disabled unless **both** server-side release controls are set by an authorized operator:
   - `EXECUTION_EXTENDED_GITHUB_VERIFICATION_ENABLED=true`
   - `EXECUTION_EXTENDED_GITHUB_APPROVED_APP_ID=<actual explicitly authorized GitHub App ID>`
   
   An unset/mismatched App ID or disabled switch returns **null** without a GitHub token call. No client can set these values via requests. The operator flag is not proof of the GitHub installation's grant.

2. The broker verifies the live GitHub App installation and exact repository ID using the existing EM-2C narrow-token check. It only proceeds when the required **installation grant** (`checks`, `actions`, or `deployments`) is reported as read-capable.

3. The broker requests `POST /app/installations/{id}/access_tokens` using App JWT with **exactly one** `repository_ids` integer and **one** `{ capability: "read" }` permission. It rejects 401/403/rate failures, absent token, wrong repository/name, unexpected additional token permissions, write permissions, or invalid expiry. GitHub token stays server-side, never saved in Evidence/DB or returned by API.

4. `approved-extended-rule-config.ts` permits only exact immutable revision configuration:
   - `CHECK_PASSED`: 40-hex `expectedSha`, exact `checkName`, pinned check-run ID and/or App ID.
   - `ARTIFACT_EXISTS`: 40-hex `expectedSha`, exact workflow-run ID, artifact ID/name, `sha256:...` digest.
   - `DEPLOY_VERIFIED`: 40-hex `expectedSha`, exact deployment ID and target environment.
   Invalid, loose, wildcard, malformed or extra-field configs produce no proof.

5. `trusted-evaluation-server.ts` retains the existing authenticated Builder owner and approved revision query. It constructs extended candidates **only from reviewed same-project PR source associations** with active HMAC binding and exact numeric repository identity. It fetches the latest immutable evidence observation, checks the 24-hour cache ceiling, reads the live merged PR SHA, and re-reads latest observation sequence after the network call (TOCTOU guard). Only then `trusted-extended-rule-adapter.ts` obtains a scoped broker token and performs the rule-specific GitHub GET with a bounded payload.

6. When allowed, the adapter assembles internal `GITHUB_EXTENDED_RULE_RECHECK` data **on the server** with matching source ID, evidence ID, repository ID, SHA, criterion ID, provider object identity and freshness. The deterministic **EM3CB_V3** policy additionally enforces this source correlation. A real 403, missing grant, stale/moved SHA, mismatched config, changed cache or ambiguous provider evidence remains `UNKNOWN`; no error becomes PASS.

7. If not allowed, the server remains on historical `EM3C_V2`, and CHECK_PASSED/ARTIFACT_EXISTS/DEPLOY_VERIFIED stay UNKNOWN. `verification-readiness` remains a private `NOT_PUBLISHED` diagnostic, intentionally omitting the numeric percent, basis points and official milestone PASS.

## Important security and release distinction

This is **capability-ready code, not proof of a live GitHub App permission grant**. The code does not update GitHub App settings. An App owner/installation administrator must separately authorize Checks:read, Actions:read, Deployments:read; existing installations may require review and approval. Until a real authorized installation is verified, **do not set the opt-in release controls**. The existing `createInstallationAccessToken()` stays narrow (Contents/Pull Requests only) and is unchanged.

The token response is checked for exact permissions/repository identity. If GitHub changes its token response format, fail closed and fix/test the broker rather than silently accepting a broader token. `TrustedExtendedRuleProof` is a TypeScript shape, not a cryptographic credential: never add a public POST endpoint accepting these objects.

## Verification and remaining steps

- `apps/web/scripts/em3cb2-capability-broker-contract.mjs`: default-disabled and wrong-App-ID requests never mint tokens; installed grant/installation/repo denial; returned extra-write permission or wrong repository rejected; one-repo, one-read permission token; approved config parser; fresh exact SHA adapter; current runtime remains V2 when disabled; no percentage leak.
- `apps/web/scripts/em3b-trusted-server-adapter-contract.mjs`: mocked owner-scoped Supabase, approved revision, reviewed PR association, exact SHA, HMAC and TOCTOU, V2 default OFF; V3 simulated on when allowed and valid provider recheck; access failures never PASS.
- Web CI: all EM1/2/3 legacy contracts, extended B1/B2 contracts, ESLint, TypeScript, Next.js build; PIE shadow.
- Local real Supabase/Playwright upstream gate: owner/other/anonymous denial, private unpublished diagnostics and Builder manual approvals; no live GitHub App scope in disposable local auth.
- **Not verified:** real GitHub App installation's authorized scope expansion, real Checks/Actions/Deployments read from a BuildMap-bound repository, production/Vercel runtime smoke, hosted migrations 22–24.

## Next authorized release gates

1. GitHub App owner reviews requested read permissions and explicitly authorizes any expanded installation privileges; never assume a GitHub user connector is the same as the BuildMap App.
2. In isolated staging with an authorized linked repository, confirm installation ID, numeric repository ID, exact token permission echo, live named check, artifact digest and current deployment environment.
3. Confirm stale/403/revoked/duplicate run and superseded deployment yield UNKNOWN; test real source/DB audit ordering and V3 failure modes.
4. Only after staging smoke, authorize the **operator feature-flag rollout** and controlled hosted migrations in order 22→23→24. Re-run RLS, app and post-release browser validation.
5. EM-4 explainable progress UI, then EM-5 MyeongHa pilot; never auto-approve BuildMap Decisions.

Official GitHub installation token model: https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app
