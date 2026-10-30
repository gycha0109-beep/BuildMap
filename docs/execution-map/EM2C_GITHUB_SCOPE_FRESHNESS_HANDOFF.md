# EM-2C — GitHub App Installation Capability and Source Freshness Diagnostic

- Date: 2026-10-30
- State: **SOURCE_IMPLEMENTED / SYNTHETIC_CONTRACT_PENDING / LIVE_GITHUB_APP_SMOKE_NOT_VERIFIED / HOSTED_NOT_DEPLOYED**
- Dependency: EM-1 #96 → EM-2A #97 → EM-2B #101 (all Draft)
- PR: stacked feature branch `feat/execution-map-em2c-permission-source-health` from #101
- No new migration, GitHub permission grant, background polling or credentials persisted.

## What this feature actually does

The authenticated Builder can open `/projects/[projectId]/execution/evidence` and manually request an **ephemeral, read-only diagnostic** of the selected GitHub project link. The server requires an active same-project GitHub link, an active integration binding, matching repository full name, HMAC proof and exact project ownership.

With GitHub App JWT it reads `GET /app/installations/{installation_id}`, matches the installation's ID and App ID, checks the suspension flag, and inspects **granted installation permissions**. It then mints the existing narrow installation token with only `contents:read` and `pull_requests:read` for exactly one repository ID, and uses `GET /repos/{owner}/{repo}` to verify that the current token really has access to the exact bound numeric repository ID and full name.

This is **not** a Checks/Actions/Deployments API permission test. The installation might have a read grant for an endpoint that the currently restricted token does not request. Results must display `READ_GRANTED_BUT_TOKEN_NOT_REQUESTED`, `NOT_GRANTED`, or `UNKNOWN`; it must never report unrequested capabilities as successfully fetched evidence.

If the Builder selects a previously cached `merged_pull_request` source, the server reloads only that source's most recent snapshot and re-reads exactly `GET /repos/{owner}/{repo}/pulls/{number}` using a repository-scoped token. The current merged SHA is compared to the cached SHA **only for a source-health diagnostic**. Invalid source identity, deleted/denied PR, API error, stale or changed SHA are `UNKNOWN`. A published release is never a deployment proof: the source health remains `UNKNOWN` without tag+revision+deployment verification.

## Security and authority boundaries

1. No direct client-supplied repository identity or SHA is trusted. GitHub App binding and same-project cached record are both checked on the server.
2. Installation capabilities are discovered via App JWT **GET** and displayed, but **never automatically granted**. GitHub App configuration and installation permission expansion require separate explicit owner action.
3. GitHub tokens and App JWTs stay server-side. Response includes only the four named permission categories, exact repo-name and their statuses; no raw API response or credential.
4. Both diagnostics use no-store responses, no persistence, and no changes to the existing evidence cache or Builder-controlled Decisions.
5. `CURRENT_SOURCE_MATCH` means a current provider read agrees with one cached merge SHA at one instant; it is **not** a rule-specific verified criterion PASS. There is no `criterion_evaluations` write or progress calculation.
6. Public/anonymous users and other project owners cannot open the diagnostic route. Mismatched installation/repository causes UNKNOWN with no source re-read.

## Tests and closure

- `apps/web/scripts/em2c-source-health-contract.mjs`: simulated GitHub App JWT + installation token; permission category distinction, strict repository ID, suspension, 403, SHA match/mismatch, 404/unmerged, release UNKNOWN, no extended API calls and no token leakage.
- Web App CI: EM-2A/B/C contract, ESLint, TypeScript, Next.js build.
- Local Supabase GoTrue + Playwright: authenticated private evidence page with no-linked-repository safe empty state and all previous EM-1/2B owner/tenant scenarios.
- **Not completed by synthetic tests:** real BuildMap GitHub App installation connected to a verified user-controlled project, actual installation permission state and exact repository-scoped source health result. The live diagnostic can only be exercised after the staged Execution Map code has passed controlled deployment and a real GitHub App connection exists.
- This diagnostic provides the inputs needed before a separate **EM-3 versioned deterministic evaluator**. It is not itself EM-3, because the stored snapshots remain owner-writable and no rule-specific acceptance logic has been verified.

## Next action

After CI: keep stacked PR Draft, confirm actual GitHub App installation metadata in an authorized test environment, identify whether Checks/Actions/Deployments read scopes are granted, seek explicit configuration change if required, then build EM-3 deterministic rules with distinct source-correlation, freshness, and completion-denominator tests. No production schema write is allowed until the upstream staged release gates are signed off.

Official GitHub API references: [installation access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app) and [installation REST endpoints](https://docs.github.com/en/rest/apps/installations).
