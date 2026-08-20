# Phase 51 — P3 Integration Activation Readiness & Controlled Live E2E

## Status

Phase 51 validates the already-closed P3 GitHub + Notion provider contracts against the configured hosted target environment without promoting the Preview deployment to production.

This Phase does not add a third provider, change schema/migrations, add webhook/polling/background sync, or change Builder Decision authority.

## Starting authority

- repository: `gycha0109-beep/BuildMap`
- starting `main`: `2289070c51f38f135b38e192178cccdb5264fa6c`
- starting tree: `a7315a8f03b20e35d7646e8f46cf8e733691b4e3`
- Phase 50 repository/application contract: CLOSED
- Phase 50 runtime claims for migrations 17–20 and real GitHub/Notion E2E: NOT VERIFIED

## Controlled target boundary

Validation was performed on the Phase 51 Vercel Preview branch and the configured hosted Supabase target. It was not a production promotion.

Repository configuration was temporarily changed only on the Phase 51 branch to permit Preview deployment, then restored to:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

No `main` production deployment was performed by Phase 51.

## Live migration authority

The hosted Supabase migration history was read directly and contains all provider migrations:

- `20260819002000` — `buildmap_17_integration_bindings`
- `20260819003000` — `buildmap_18_capture_source_refs`
- `20260819043000` — `buildmap_19_notion_oauth_credentials`
- `20260819060000` — `buildmap_20_capture_observation_keys`

Therefore:

```text
LIVE_MIGRATION_17 = APPLIED
LIVE_MIGRATION_18 = APPLIED
LIVE_MIGRATION_19 = APPLIED
LIVE_MIGRATION_20 = APPLIED
```

No migration was applied or modified during Phase 51.

## GitHub controlled live E2E

Test Project: `BuildMap E2E Test`

Target repository:

`gycha0109-beep/BuildMap`

Validated sequence:

```text
internal repository pointer
→ GitHub App installation restricted to BuildMap repository
→ user OAuth authorization
→ exact installation/repository verification
→ active integration binding
→ Builder-triggered activity refresh
→ real merged PR observations
→ Builder explicit Capture
→ server exact provider re-read
→ private Rough Note
→ GitHub capture_source_refs provenance
→ evidence-mode AI Structured Draft
→ Builder Review candidate
→ no automatic Change Card / approved Decision
```

Observed provider identity after initial connection:

- repository ID: `1306433852`
- installation ID: `155131457`
- binding status: `active`

The explicit Capture used a real merged Pull Request and produced one GitHub provenance row. Capture did not automatically create an official Decision.

## Notion controlled live E2E

Test resource:

- workspace: `make 자동화`
- resource label: `사업 과제`
- resource type: `database`
- exact resource ID: `10538de5-a5db-4002-a52c-01b82e2cd097`

Validated sequence:

```text
internal Notion pointer
→ Public OAuth page/database selection
→ OAuth code exchange
→ sealed credential persistence
→ exact database verification
→ active integration binding
→ Builder-triggered bounded refresh
→ ephemeral database metadata/data-source preview
→ Builder explicit Capture
→ server exact re-read
→ bounded observation fingerprint verification
→ private Rough Note
→ Notion capture_source_refs provenance + observation_key
→ evidence-mode AI Structured Draft
→ Builder Review candidate
→ no automatic Change Card / approved Decision
```

Refresh alone created no Capture.

The explicit Capture created exactly one Notion provenance row and retained Builder approval as the official Decision boundary.

## Runtime defects discovered and remediated

### 1. Current Notion copied-link host was rejected

Current Notion UI produced links in the form:

```text
https://app.notion.com/p/<resource-id>...
```

The BuildMap parser accepted only `notion.so` / `www.notion.so`.

Remediation:

- accept the current `app.notion.com` copied-link host;
- continue canonicalizing the stored pointer to the existing canonical Notion resource URL form;
- do not change external resource identity semantics.

### 2. Notion database verification treated endpoint-type validation as fatal authorization failure

For a database resource, Notion returned HTTP `400` with `validation_error` when the resource ID was first tested against the page endpoint.

The existing verifier treated only `404` as an endpoint-type miss and converted the `400` into a fatal authorization error.

Remediation:

- treat the bounded `400 validation_error` endpoint-type mismatch as a safe miss;
- continue to the database endpoint;
- preserve fatal behavior for actual authorization/provider failures.

The repaired flow then completed token exchange, exact database verification, sealed credential persistence, bounded read, and explicit Capture E2E.

### 3. GitHub reconnect incorrectly forced a new App installation

GitHub read disconnect intentionally archives the BuildMap binding; it does not uninstall the GitHub App from the provider account.

The previous reconnect action always redirected to `/installations/new`, which sent an already-installed user to the repository-access settings screen instead of reconnecting.

Remediation:

- locate the latest disconnected GitHub binding for the exact Project Link;
- verify its stored tamper-evidence binding proof against the current exact repository pointer;
- mint a repository-scoped installation access token to prove that the old installation still exists and still covers the exact repository;
- when valid, skip new installation and continue directly to the existing PKCE user OAuth flow;
- if verification fails, fall back to the original fresh-install path.

No installation identity is trusted merely because it was stored previously.

## Disconnect / reconnect failure-isolation evidence

### GitHub

After explicit `Read access 해제`:

```text
active GitHub binding       = 0
disconnected GitHub binding = 1
GitHub pointer              = preserved
GitHub Capture/provenance   = preserved
Notion active binding       = preserved
```

After reconnect with the repaired existing-installation path:

```text
active GitHub binding       = 1
historical disconnected row = preserved
GitHub Capture/provenance   = still exactly 1
Notion active binding       = preserved
```

No duplicate Capture was created by reconnect.

### Notion

After explicit `Read access 해제`:

```text
active Notion binding       = 0
disconnected Notion binding = 1
active Notion credential    = 0
Notion Capture/provenance   = preserved
GitHub active binding       = preserved
```

At that point the Notion credential lifecycle reported the credential as disconnected. Reconnect used a new OAuth authorization for the same exact resource.

After reconnect:

```text
active Notion binding       = 1
Notion credential status    = active
credential_version          = 3
encryption_key_version      = 1
exact database ID           = unchanged
Notion Capture/provenance   = still exactly 1
GitHub active binding       = preserved
```

The same provider `bot_id` credential row is reactivated/upserted by design, so the disconnected credential state is historical lifecycle evidence rather than a permanently retained second credential row.

## Public/private boundary evidence

The controlled test Project remained `private` and had zero public provider pointers during the E2E.

Provider refreshes and Captures did not expose:

- integration bindings;
- source proofs;
- observation keys;
- GitHub installation identity;
- Notion bot/workspace credential material;
- access/refresh token ciphertext;
- Rough Note bodies;
- AI draft internals.

No provider-derived test Capture was auto-published.

## Decision authority evidence

The controlled GitHub and Notion Captures each reached:

```text
AI Candidate
+ Builder 확인 필요
```

and stopped there.

The test did not press `Decision으로 기록` for the provider E2E candidates.

Required invariant remains:

```text
Provider Observation
→ Builder explicit Capture
→ private provenance
→ AI candidate
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Forbidden remains:

```text
Refresh → automatic Capture
Capture → automatic approved Decision
AI Candidate → official Decision without Builder action
```

## Schema / migration decision

No schema defect was found during live activation. Existing migrations 17–20 support the real GitHub + Notion flows as designed.

Therefore:

```text
NEW_MIGRATION = NOT JUSTIFIED
MIGRATIONS_00_20 = UNCHANGED
```

## PIE / Factory boundary

Phase 51 does not change the existing architecture stance:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Provider runtime activation does not turn `capture_source_refs` into PIE Evidence authority and does not add Factory Intelligence runtime coupling.

## Phase classification

Subject to exact-head repository CI and tested-tree/merged-tree equality:

```text
PHASE_51_CONTROLLED_LIVE_E2E = READY_FOR_REPOSITORY_CLOSEOUT
LIVE_MIGRATIONS_17_20 = VERIFIED_APPLIED
LIVE_GITHUB_ASSOCIATION_READ_CAPTURE = PASS
LIVE_NOTION_ASSOCIATION_READ_CAPTURE = PASS
GITHUB_DISCONNECT_RECONNECT_ISOLATION = PASS
NOTION_DISCONNECT_RECONNECT_ISOLATION = PASS
BUILDER_DECISION_AUTHORITY = PRESERVED
PUBLIC_PRIVATE_PROVIDER_BOUNDARY = PRESERVED
PRODUCTION_DEPLOYMENT = NOT PERFORMED
```
