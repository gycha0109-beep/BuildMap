# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase31 closure 당시의 historical snapshot으로 유지한다.

## Current main baseline

- repository: `gycha0109-beep/BuildMap`
- implementation baseline entering this closeout: `472b6ac5bdb69daff36e9d7def743d348bee9684`
- implementation tree: `f05b9d3794714b27d73440c261f860e2c50b18e9`
- implementation state: **Phase 45 — GitHub App Read Access Bootstrap merged**
- P2 closure verdict: `PASS WITH CONSISTENCY HARDENING`
- P3 state: GitHub repository pointer + read architecture + read runtime bootstrap complete
- production deployment: `OUT_OF_SCOPE`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

Important activation boundary:

```text
Repository implementation: COMPLETE
Live GitHub App environment configuration: NOT VERIFIED
Migration 17 live BuildMap DB application: NOT VERIFIED
Production deployment: NOT PERFORMED
```

Do not claim GitHub read access is live in any deployed BuildMap environment until the actual target environment has both the GitHub App server configuration and migration 17 applied.

---

## Product definition

BuildMap V2 is an AI-native Capture-first Decision Journal for Builders.

Core question:

> 왜 이 프로젝트가 지금의 모습이 되었는가?

Positioning:

- GitHub = Build History
- Notion = Knowledge History
- BuildMap = Decision History

Primary user mental model:

```text
Capture → Review → Decision
```

AI remains non-authoritative. Builder owns official judgment and approval.

Problem/Hypothesis remain optional context.

---

## Completed application foundation

### Capture / Review / Decision

Implemented:

- authenticated Builder workspace
- Capture-first Rough Notes
- conservative AI decision-worthiness triage for ordinary Capture
- AI Structured Draft generation
- Review surface
- Builder-only edit/approve authority
- approved Change Card as official Decision Record
- Current Direction derived from approved Decisions

### Project Map / Decision Timeline

Implemented:

- internal Decision Timeline / Project Map
- chronological approved Decision history
- Current Direction
- Major Turning Points
- Latest Decision
- first-Decision activation/onboarding guidance

### Public Project Map / publication

Implemented:

- Scout-facing `/p/[publicSlug]`
- public-safe Project/Decision reads
- Project public/private controls
- Builder-selected public Decisions
- sensitive Decision exclusion
- approved + published + normal public Decision boundary

`link_shared` token UX remains intentionally unimplemented.

### External Feedback and evidence loop

Implemented:

```text
Public Project Map
→ Feedback Request
→ Scout Feedback
→ Builder review
→ Capture as evidence
→ private Rough Note
→ AI structuring
→ Decision Candidate
→ Builder Review
→ Decision
→ Evidence traceability
→ explicit Feedback Outcome closure
```

Important invariants:

- Feedback never automatically becomes a Decision.
- Builder explicitly chooses `Capture as evidence`.
- provenance uses explicit stored links rather than text/AI inference.
- approved Decision does not automatically imply `reflected`.
- `feedbacks.review_status` remains Builder outcome authority.

### P2 end-to-end closure

Phase 42 closed cross-surface consistency gaps without schema expansion:

1. Decision approval revalidates Evidence and Outcomes.
2. publication mutations revalidate affected Feedback/Public Feedback surfaces.
3. Feedback Requests cannot be reopened while Project is private; Decision-target reopen still requires an eligible public target.

P2 is structurally closed at repository/application-contract level.

---

## GitHub integration state

### Phase 43 — Repository Pointer Foundation

Implemented:

- Builder-only `Integrations` Project tab
- canonical GitHub repository root association through existing `project_links`
- `link_type = github`
- canonical `https://github.com/{owner}/{repository}` normalization
- nested commit/branch/PR/issue URLs rejected as repository identity
- internal/public repository pointer visibility
- archive-on-remove
- Scout Public Map repository pointer display through `public_project_links`

Authority:

```text
GitHub repository pointer
≠ BuildMap Project identity
≠ BuildMap Decision
≠ BuildMap Evidence authority
```

Authoritative decision:

`docs/decisions/phase43-github-integration-foundation.md`

### Phase 44 — Read Integration Architecture & Sync Boundary

Architecture contract fixed:

- GitHub App installation model
- no stored PAT/classic broad OAuth App as primary integration
- repository permissions initially limited to Metadata read + Contents read + Pull requests read
- primary signals = merged Pull Requests + Releases
- commits are supporting drill-down, not default intake
- Issues deferred
- first read mode = Builder-triggered on-demand Refresh
- no webhook/polling/cron/background sync
- GitHub observation must pass explicit Builder Capture before Review/Decision
- provider failures are non-blocking
- `project_links` is not credential, installation, sync, event, or Evidence storage

Authoritative decision:

`docs/decisions/phase44-github-read-integration-architecture.md`

Regression contract:

`docs/access-policy-tests/phase44-github-read-integration-boundary.md`

### Phase 45 — GitHub App Read Access Bootstrap

Implemented runtime boundary:

```text
BuildMap Project
→ canonical GitHub Project Link
→ Builder starts GitHub App connection
→ HMAC-signed installation state
→ GitHub App installation
→ BuildMap Setup URL
→ BuildMap validates state + Builder session + Project ownership
→ explicit GitHub App user authorization with PKCE
→ callback exchanges authorization code server-side
→ GitHub user token verifies exact App installation + exact linked repository
→ private provider-neutral integration binding
→ GitHub user token discarded
→ Builder clicks Refresh GitHub activity
→ binding integrity proof verified
→ repository- and permission-scoped installation token minted server-side
→ merged PR + Release reads
→ normalized ephemeral observation response
→ installation token discarded
```

Implemented application surfaces/code:

- server-only GitHub App configuration boundary
- signed installation state
- PKCE user authorization flow
- dedicated installation Setup route
- dedicated OAuth callback route
- exact linked-repository verification
- request-local App JWT / installation token minting
- Builder-triggered activity API
- merged PR + non-draft Release normalization
- Builder-only ephemeral preview UI
- non-mutating provider/reconnect errors
- pointer removal archives its active GitHub read binding

Server-only environment names:

- `GITHUB_APP_ID`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_STATE_SECRET`
- optional `GITHUB_APP_CALLBACK_URL`

No secret values are committed and no GitHub secret uses a `NEXT_PUBLIC_*` prefix.

Phase 45 environment runbook:

`docs/runbooks/phase45-github-app-bootstrap.md`

Authoritative implementation decision:

`docs/decisions/phase45-github-app-read-bootstrap.md`

Regression contract:

`docs/access-policy-tests/phase45-github-app-read-bootstrap.md`

#### Durable integration binding

Phase 45 proved that a durable provider connection association is necessary for private repository reads.

Migration 17 adds private provider-neutral:

`integration_bindings`

It stores normalized association identity only:

- Project Link reference
- provider
- external connection identity
- optional external account identity/label
- external resource identity/label
- server-generated tamper-evidence binding proof
- connection status

It does **not** store:

- GitHub App private key
- GitHub client secret
- GitHub user access token
- GitHub installation access token
- webhook secret
- raw GitHub provider payload
- PR/Release observation rows
- sync cursor

No public-safe view is created for `integration_bindings`.

#### Binding integrity boundary

Phase 45 does not introduce a Supabase service-role web runtime.

Authenticated source rows are therefore not treated as token-mint authority by themselves.

After GitHub verification, the server creates an HMAC proof bound to:

```text
provider = github
project_link_id
installation_id
repository_id
canonical repository full name
```

Every Refresh verifies this proof before an installation token may be minted.

This prevents a directly forged/tampered binding row from becoming provider authorization.

#### Token boundary

GitHub user access token:

- created only during callback verification,
- used to verify the installation and exact repository,
- never persisted,
- never sent to browser,
- discarded after callback processing.

GitHub installation token:

- created only for Builder-triggered Refresh,
- restricted to the single bound repository ID,
- explicitly restricted to `contents: read` and `pull_requests: read`,
- never persisted,
- never sent to browser,
- discarded after request processing.

#### Observation boundary

Phase 45 activity is ephemeral:

```text
GitHub API
→ normalized response
→ Builder browser component state
```

No GitHub observation table is created.

A merged PR or Release never automatically:

- creates a Rough Note,
- invokes AI structuring,
- creates a Change Card,
- approves a Decision,
- changes Current Direction,
- marks a Major Turning Point,
- publishes anything,
- closes Feedback Outcome.

#### Public boundary

Scout/Public behavior remains Phase 43 behavior:

```text
public_project_links
→ optional public GitHub repository pointer only
```

GitHub authorization, binding state, and PR/Release observations remain Builder-private.

---

## Database / migration contract

Historical migrations `00–10` remain immutable.

Repository additive migrations currently extend through sequence 17:

- 11: app runtime privilege alignment
- 12: least-privilege ACL hardening
- 13: AI draft conversion RPC
- 14: project insert owner-policy alignment
- 15: Rough Note conversion RLS alignment
- 16: External Feedback evidence provenance alignment
- 17: provider-neutral private integration bindings

Phase 45 migration:

`supabase/migrations/20260819002000_buildmap_17_integration_bindings.sql`

Phase 45 exact-head Database Contract Gate passed on:

`24b646ef04d61d7749b96d319c42e0781cec1060`

The gate verified repository migration integrity and no remote DB access. It does not prove migration 17 is applied to a live BuildMap database.

### Live DB verification boundary

The actual BuildMap production/staging DB migration state was not verified during Phase 45.

Therefore:

- repository migration: PRESENT + CONTRACT-VALID
- live BuildMap migration application: UNKNOWN / NOT CLAIMED

Do not claim GitHub read binding works in a deployed environment until migration 17 is explicitly confirmed there.

---

## CI / merge evidence

Phase 45 implementation PR: `#53`

Exact tested head:

`24b646ef04d61d7749b96d319c42e0781cec1060`

Exact tested tree:

`f05b9d3794714b27d73440c261f860e2c50b18e9`

Web App CI #80 passed:

- exact event SHA checkout
- Node 22
- install
- lint
- typecheck
- production build

Database Contract Gate #19 passed:

- exact event SHA checkout
- exact SHA verification
- historical migration integrity / additive migration contract
- safety boundary / no remote DB mutation

Squash merge commit:

`472b6ac5bdb69daff36e9d7def743d348bee9684`

Merged tree:

`f05b9d3794714b27d73440c261f860e2c50b18e9`

Therefore:

```text
CI-tested tree == merged implementation main tree
```

---

## Public / private authority boundary

Public-safe views and RLS/grants remain authority for Scout/public reads.

Never expose through Scout/Public surfaces:

- Rough Notes
- AI Structured Drafts
- internal/unpublished/sensitive Change Cards
- internal Feedback review/outcome state
- private author/auth/profile identifiers
- Builder-only provenance
- GitHub credentials/tokens
- `integration_bindings`
- GitHub installation/account state
- raw or normalized private GitHub observations

Current public-safe surfaces include:

- `public_project_pages`
- `public_decision_timeline`
- `public_feedback_requests`
- `public_feedbacks`
- `public_project_links`

---

## PIE architecture compatibility boundary

Current verdict:

```text
PIE integration readiness: STRUCTURALLY COMPATIBLE
Core redesign required now: NO
Runtime integration required now: NO
Current roadmap conflict: NO
BLOCKER: NONE
```

Authoritative decision:

`docs/decisions/pie-integration-boundary.md`

Operating stance:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Hard constraints:

- BuildMap owns Project and Decision identities.
- External IDs never replace `projects.id` or `change_cards.id`.
- provider references/bindings remain additive.
- `project_links` must not become a PIE evidence registry.
- `change_cards.evidence` remains BuildMap decision-context evidence text.
- BuildMap Decision != PIE Technical Decision.
- BuildMap must work when PIE is absent/unavailable.
- PIE core remains BuildMap-independent.
- Factory Intelligence remains out of scope.

`integration_bindings` is provider-neutral infrastructure required by the GitHub read boundary. It must not be reinterpreted as PIE Evidence authority or Factory Intelligence infrastructure.

---

## Explicit non-goals / prohibited expansion

Unless a later explicit phase authorizes them, do not add:

- GitHub repository write permissions
- stored PATs
- persistent GitHub user/installation tokens
- GitHub webhook ingestion
- periodic polling / cron / background sync
- Issue ingestion
- raw broad commit-stream ingestion
- automatic Capture from GitHub
- automatic Decision creation/approval
- public raw GitHub activity feed
- PIE client/API/SDK/auth
- PIE webhook/polling
- PIE IDs on BuildMap core entities
- PIE evidence ingestion
- Factory Intelligence
- cross-project/factory intelligence models
- scoring/gamification
- GitHub/Notion/Jira replacement behavior

---

## Production / deployment state

Production deployment remains out of scope.

`apps/web/vercel.json` keeps Git deployment disabled.

Merging `main` must not be described as production deployment.

Phase 45 code is repository-complete but requires explicit environment activation before it can perform real GitHub reads:

1. migration 17 applied to the actual BuildMap DB,
2. GitHub App registered/configured according to the Phase45 runbook,
3. server-only GitHub App environment variables configured in the target runtime.

None of those live-environment facts were inferred merely from repository merge.

---

## Current roadmap position

Completed through **Phase 45 — GitHub App Read Access Bootstrap**.

P3 GitHub state:

```text
Phase 43: repository pointer foundation ✅
Phase 44: read/auth/sync/provenance architecture ✅
Phase 45: verified read-only GitHub App bootstrap ✅
```

Current bounded flow:

```text
Repository pointer
→ verified GitHub App binding
→ Builder-triggered Refresh
→ ephemeral merged PR / Release observations
```

The observation does not yet enter BuildMap Capture.

V2 P3 order remains:

1. GitHub integration
2. Notion integration
3. Figma / Slack intake
4. automatic Decision candidate detection

### Recommended next phase

**Phase 46 — GitHub Observation → Explicit Capture Provenance**

Goal:

Allow a Builder to explicitly select one ephemeral GitHub observation and create a private BuildMap Capture while preserving normalized source provenance.

Phase 46 must begin with a focused provenance audit before schema/runtime expansion.

Required decisions:

1. whether existing Rough Note fields can preserve provider source provenance safely or an additive provider-neutral source-reference table/field is necessary,
2. minimum stable source identity for merged PR and Release captures,
3. idempotency / duplicate explicit Capture behavior,
4. what normalized GitHub text is copied into the Rough Note versus kept as metadata,
5. how provenance survives AI Draft → Change Card conversion,
6. how Evidence UI should trace a resulting Decision back to GitHub without exposing provider credentials or raw private payloads.

Hard invariants:

- Builder explicitly clicks Capture; no auto-Capture.
- GitHub observation remains external source context, not Decision authority.
- no webhook/polling/background sync.
- no Issues intake.
- no automatic Decision candidate detection merely because an observation exists.
- no public raw GitHub activity.
- PIE/Factory Intelligence remain out of scope.

---

## Safety boundary

- do not modify historical migrations `00–10`
- additive migrations only when actually required
- do not claim live DB deployment without environment evidence
- do not commit secrets/private keys/tokens/service-role credentials
- do not enable production deployment implicitly
- preserve Builder approval authority over Decisions
- preserve Scout/public safe-read boundaries
- preserve BuildMap core independence from GitHub and PIE
- preserve provider identities as external/additive rather than replacing BuildMap identities
- Factory Intelligence remains out of scope
