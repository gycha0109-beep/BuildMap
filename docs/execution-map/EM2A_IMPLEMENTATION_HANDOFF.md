# EM-2A — Scoped GitHub Evidence Source Preview

- Date: 2026-10-30
- Status: **SOURCE_IMPLEMENTED / CONTRACT_AND_CI_PENDING / NOT_PERSISTED / NOT_DEPLOYED**
- Parent: EM-1 PR #96 (Draft; not merged), Execution Map Technical Roadmap EM-2
- Dependency: Existing GitHub integration with verified HMAC binding and repository-scoped installation token.
- Delivery: stacked **draft PR** targeting `feat/execution-map-em1-schema-foundation`; NOT eligible to merge into main before EM-1 controlled release.

## Source implementation

| Component | Behavior |
| --- | --- |
| `lib/execution/github-evidence-normalize.ts` | Canonical PR/release source references. PR observation is SOURCE_CONFIRMED only for exact detail response `merged=true`, valid merge SHA and timestamp. Invalid/missing SHA => UNKNOWN. Release tag without resolved revision => UNKNOWN. |
| `lib/execution/github-evidence.ts` | Creates existing narrow installation token, reads closed PR snapshot and release list, re-reads exact merged PRs in bounded groups, records observation timestamp; source detail failures remain UNKNOWN. |
| `app/api/projects/[projectId]/execution/evidence-preview/route.ts` | Authenticated Builder-only project authorization, active GitHub project link, canonical repository URL, active HMAC binding and no-store JSON response. No mutation or token return. |
| `app/projects/[projectId]/execution/evidence/page.tsx` | Private GitHub source preview, link selection and manual refresh. |
| `components/execution/github-evidence-preview-panel.tsx` | Displays bounded snapshot, source statuses, merge SHA for confirmed PR and explicit UNKNOWN for unsupported capability. |
| `scripts/em2-github-evidence-contract.mjs` | Source normalization tests and simulated GitHub REST reads; verifies no GitHub App permission expansion, no unsupported endpoint use or token exposure. |

## Deliberate constraints

- **No database evidence registry yet.** Preview is ephemeral; EM-2B must introduce separate, versioned private evidence tables and idempotent source refs after EM-1 release.
- **No acceptance PASS, percentage or verified CI/deployment** is derived from PR merge SHA, release title, merged PR count or tagged release.
- Current token requests only GitHub `contents:read` + `pull_requests:read`; Issues, Checks, Actions runs and Deployments stay **UNKNOWN** until GitHub App installation permissions are explicitly granted/verified.
- Source window is restricted to last 30 *updated* closed PRs (first 10 merged candidates re-read) plus first 10 releases. This is not a complete repo history. Missing observation is not negative evidence.
- Private project links and binding proof checks are mandatory; user-supplied repo URLs never authorize an unrelated repository fetch.
- GitHub API errors (missing permission, rate-limit, network, source detail unavailability) never become positive evidence.
- Never reuse `change_cards.evidence`, `capture_source_refs` or `project_links` as an execution evidence registry. Provider tokens remain server-only.

## Test expectations

- Node-based deterministic normalization/unit test covers valid canonical PR SHA, invalid merge SHA, unmerged PR, malformed repository, draft releases and unknown release SHA.
- Simulated scoped REST client confirms exact PR detail re-read, no calls to unauthorized Issues/Checks/Actions/Deployments endpoints, bounded source window and no token exposure.
- Web App CI builds and typechecks route/page/panel.
- **Not yet tested:** live repository-scoped GitHub App read from an actual user's connected private project; real hosted Supabase integration and browser preview. Must not mark EM-2 closed until these are exercised.

## Next steps

1. Confirm full exact-head CI for stacked PR. Address contract/runtime issues.
2. Once EM-1 is controlled-released to hosted BuildMap, retarget or rebase EM-2A safely to main, preserving its proof.
3. Implement EM-2B private evidence registry + refresh with RLS, idempotency, source SHA and stale/unknown semantics.
4. Plan and verify minimal GitHub App permission expansion separately: Check Runs (Checks read), workflow metadata (Actions read), deployments (Deployments read), issues (Issues read). Never silently request broad write scopes.
5. Implement EM-3 evaluator only when verified source SHA / rule evidence binding is available.
