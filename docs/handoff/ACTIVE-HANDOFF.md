# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase31 closure 당시의 historical snapshot으로 유지한다.

## Current main baseline

- repository: `gycha0109-beep/BuildMap`
- implementation baseline: `8b66e24c4b20509aa7d8cf38873f126810733ad5`
- implementation tree: `15ff9c8a37eff3622511a3133766242b886dbc75`
- implementation state: **Phase 46 — GitHub Observation → Explicit Capture Provenance merged**
- P2 closure verdict: `PASS WITH CONSISTENCY HARDENING`
- P3 GitHub slice: **STRUCTURALLY CLOSED AT REPOSITORY/APPLICATION-CONTRACT LEVEL**
- production deployment: `OUT_OF_SCOPE`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

Important activation boundary:

```text
Repository implementation through Phase 46: COMPLETE
Migration 17 live BuildMap DB application: NOT VERIFIED
Migration 18 live BuildMap DB application: NOT VERIFIED
Live GitHub App environment configuration: NOT VERIFIED
Production deployment: NOT PERFORMED
```

Do not infer live GitHub read/Capture behavior from repository merge alone.

---

## Product definition

BuildMap V2 is an AI-native Capture-first Decision Journal for Builders.

Core question:

> 왜 이 프로젝트가 지금의 모습이 되었는가?

Positioning:

- GitHub = Build History
- Notion = Knowledge History
- BuildMap = Decision History

Primary mental model:

```text
Capture → Review → Decision
```

Authority:

- BuildMap owns Project and Decision identities.
- Builder owns official Decision approval.
- AI is conservative/non-authoritative.
- external provider IDs remain additive source identities only.
- public-safe views/RLS/grants remain Scout/public read authority.

---

## Completed core product state

### P0 / P1

Implemented:

- authenticated Builder workspace
- Capture-first Rough Notes
- conservative AI triage for ordinary Capture
- AI Structured Draft generation
- Review + Builder approval
- approved Change Card as official Decision
- Current Direction
- Decision Timeline / Project Map
- Major Turning Points / Latest Decision
- first-Decision activation guidance

### P2

Implemented and structurally closed:

- Scout Public Project Map
- publication controls
- public-safe Decision timeline
- External Feedback Requests / Scout Feedback
- Builder `Capture as evidence`
- Feedback → Rough Note → AI Draft → Review → Decision
- Decision ↔ Evidence traceability
- Feedback Outcome closure
- Phase 42 cross-surface consistency hardening

Closed Feedback evidence path:

```text
Scout Feedback
→ Builder Capture as evidence
→ private Rough Note
→ AI structuring
→ Review
→ Builder-approved Decision
→ Evidence trace
→ explicit Feedback Outcome
```

Feedback never automatically becomes a Decision or `reflected` outcome.

---

# GitHub integration state

## Phase 43 — Repository Pointer Foundation

Implemented:

- Builder Project `Integrations` surface
- canonical GitHub repository root pointer through `project_links`
- `link_type = github`
- internal/public pointer visibility
- Scout public pointer through `public_project_links` only
- archive-on-remove

Authority:

```text
GitHub repository pointer
≠ BuildMap Project identity
≠ BuildMap Decision
≠ BuildMap Evidence authority
```

Decision:

`docs/decisions/phase43-github-integration-foundation.md`

---

## Phase 44 — Read Integration Architecture & Sync Boundary

Approved architecture:

- GitHub App installation model
- initial read envelope: Metadata read + Contents read + Pull Requests read
- primary signals: merged Pull Requests + Releases
- commits only as supporting drill-down
- Issues deferred
- Builder-triggered on-demand read
- no webhook / polling / cron / continuous background sync
- GitHub observation must cross an explicit Builder Capture boundary before entering BuildMap workflow

Decision:

`docs/decisions/phase44-github-read-integration-architecture.md`

---

## Phase 45 — GitHub App Read Access Bootstrap

Implemented:

```text
Project Link
→ signed installation state
→ GitHub App installation
→ explicit GitHub App user authorization + PKCE
→ exact installation + exact repository verification
→ private integration binding
→ Builder Refresh
→ binding proof verification
→ request-local installation token
→ merged PR / non-draft Release read
→ ephemeral normalized preview
```

Security:

- `installation_id` redirect value is never trusted alone.
- GitHub user token is callback-local and never persisted.
- installation token is request-local and never persisted/sent to browser.
- installation token is restricted to one repository plus `contents: read` and `pull_requests: read`.
- no service-role web runtime was introduced.
- `integration_bindings` is private and has no public-safe view.
- provider failure does not mutate Project/Decision/Feedback/publication state.

Migration 17:

`supabase/migrations/20260819002000_buildmap_17_integration_bindings.sql`

Decision:

`docs/decisions/phase45-github-app-read-bootstrap.md`

Runbook:

`docs/runbooks/phase45-github-app-bootstrap.md`

---

## Phase 46 — GitHub Observation → Explicit Capture Provenance

Implemented end-to-end repository flow:

```text
Builder Refresh
→ ephemeral merged PR / Release observations
→ Builder explicitly selects Capture as evidence
→ server re-validates BuildMap Project + GitHub binding
→ server exact-re-reads the selected provider object
→ private Rough Note
→ immutable private provider source reference
→ evidence-mode AI structuring
→ Builder Review
→ Builder-approved Decision
→ Builder-only Evidence trace back to provider source
```

### Explicit Capture boundary

The browser supplies only source identity/context needed to request Capture:

- Project Link ID
- source type
- stable source ID

The browser does not become authority for provider title, URL, summary, occurrence timestamp, or repository metadata.

Before mutation, server code re-reads:

- exact Pull Request by PR number and requires `merged_at`, or
- exact Release by Release ID and rejects draft releases.

Refresh by itself remains non-mutating and ephemeral.

### Provider-neutral Capture provenance

Migration 18 adds private:

`capture_source_refs`

It stores normalized external source provenance linked to a Rough Note:

- `rough_note_id`
- `project_link_id`
- creator Builder profile
- provider
- source type
- external source ID
- canonical URL
- source title/context
- provider occurrence time
- BuildMap observation time
- server integrity proof

It does not store:

- provider access tokens
- GitHub App private keys/client secrets
- raw GitHub API payloads
- synchronized event feeds
- provider Decision authority

`capture_source_refs` is insert-only from the authenticated application privilege surface; authenticated UPDATE/DELETE and all anonymous privileges are denied.

No public-safe source-reference view was added.

### Source integrity hardening

Important distinction:

```text
owner-readable capture_source_refs row
≠ provider-verified GitHub provenance
```

After exact GitHub re-read, BuildMap server creates an HMAC `source_proof` sealing:

```text
rough_note_id
project_link_id
source_type
external_source_id
canonical_url
```

Current application paths verify this proof before treating a source row as verified GitHub provenance:

- duplicate explicit-Capture handling
- failed AI Draft retry mode selection
- Builder Evidence trace

If proof is unavailable/invalid, the application fails closed for GitHub-specific provenance rather than inferring or repairing source identity by title, URL, Rough Note text, or AI similarity.

Decision addendum:

`docs/decisions/phase46-github-source-integrity-hardening.md`

### AI boundary

Ordinary Builder Capture continues through conservative decision-worthiness triage.

A Builder-selected External Feedback or verified GitHub observation has already crossed an explicit evidence-selection boundary, so its AI path performs evidence structuring rather than repeating ordinary worthiness triage.

Failed provider-origin AI Draft retry stays evidence-mode only when stored provider provenance is verifiable.

### Idempotency / failure behavior

- same `(project_link_id, provider, source_type, external_source_id)` cannot create multiple provider source records.
- application pre-check handles normal duplicates; DB uniqueness handles races.
- a race-losing newly-created Rough Note is archived if source provenance insertion fails.
- provider/binding/source verification failure before Capture creation is non-mutating.
- AI failure after successful Capture/provenance preserves the Builder-selected evidence for retry.

### Decision trace

No GitHub source ID is added to `change_cards`.

Trace remains:

```text
Change Card
→ rough_note_id
→ capture_source_refs
→ source_proof verification
→ project_link
→ canonical GitHub source
```

The Builder-only Evidence surface displays this explicit stored trace.

Archived repository pointers do not erase historical Capture provenance.

### Public boundary

Scout/Public Map continues to expose only Builder-selected repository pointers/approved BuildMap Decisions through existing public-safe boundaries.

Raw PR/Release observations, `capture_source_refs`, `source_proof`, integration bindings, and GitHub authorization state remain Builder-private.

Decision:

`docs/decisions/phase46-github-observation-explicit-capture-provenance.md`

Regression contract:

`docs/access-policy-tests/phase46-github-observation-explicit-capture-provenance.md`

---

## GitHub P3 slice closure verdict

At repository/application-contract level, the bounded GitHub integration now covers:

```text
Repository association
→ read authorization
→ explicit on-demand observation read
→ Builder-selected Capture
→ durable source provenance
→ AI Review path
→ Decision
→ reverse Evidence trace
```

Therefore the current **GitHub integration slice is structurally closed** for the V2 roadmap scope.

This does not authorize or require:

- webhook ingestion
- polling/cron/background sync
- Issues intake
- raw commit-stream ingestion
- automatic Capture
- automatic Decision candidate detection
- GitHub write permissions

Automatic Decision candidate detection remains a later distinct P3 capability and must preserve Builder approval.

---

## Database / migration contract

Historical migrations `00–10` remain immutable.

Repository additive migrations currently extend through sequence 18:

- 11: app runtime privilege alignment
- 12: least-privilege ACL hardening
- 13: AI draft conversion RPC
- 14: project insert owner-policy alignment
- 15: Rough Note conversion RLS alignment
- 16: External Feedback evidence provenance bridge
- 17: private provider-neutral integration bindings
- 18: private provider-neutral Capture source references

Phase 46 migration:

`supabase/migrations/20260819003000_buildmap_18_capture_source_refs.sql`

Database Contract Gate validates repository migration integrity only. It does not apply migrations to a BuildMap database.

### Live DB boundary

Current claims:

```text
Migration 17 repository state: PRESENT + CONTRACT-VALID
Migration 18 repository state: PRESENT + CONTRACT-VALID
Migration 17 live target DB state: NOT VERIFIED
Migration 18 live target DB state: NOT VERIFIED
```

Do not claim either migration is live without target-environment evidence.

---

## Phase 46 CI / merge evidence

Implementation PR: `#55`

Exact final tested head:

`85c94ab64798f27e4d8e9dda4b35152b1366e027`

Exact tested tree:

`15ff9c8a37eff3622511a3133766242b886dbc75`

Web App CI #84 passed:

- exact event SHA checkout
- Node 22
- install
- lint
- typecheck
- production build

Database Contract Gate #23 passed:

- exact event SHA checkout
- exact SHA verification
- historical integrity + additive migration contract
- safety boundary / no remote DB mutation

Squash merge commit:

`8b66e24c4b20509aa7d8cf38873f126810733ad5`

Merged implementation tree:

`15ff9c8a37eff3622511a3133766242b886dbc75`

Therefore:

```text
CI-TESTED TREE == MERGED IMPLEMENTATION TREE
```

---

## PIE architecture compatibility boundary

Authoritative decision:

`docs/decisions/pie-integration-boundary.md`

Operating stance:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Still required:

- BuildMap Project/Decision IDs remain authoritative.
- provider identities/references remain external/additive.
- `project_links`, `integration_bindings`, and `capture_source_refs` must not become PIE Evidence authority.
- `change_cards.evidence` remains BuildMap decision-context evidence text.
- BuildMap must work when PIE is absent/unavailable.
- PIE core remains BuildMap-independent.
- Factory Intelligence remains out of scope.

No PIE runtime/schema/API/auth/webhook/polling implementation is authorized by the current roadmap.

---

## Production / deployment state

Production deployment remains out of scope.

`apps/web/vercel.json` keeps Git deployment disabled.

Real GitHub execution additionally requires explicit target-environment activation:

1. migration 17 applied to the actual BuildMap database,
2. migration 18 applied to the actual BuildMap database,
3. GitHub App registered/configured according to the Phase45 runbook,
4. server-only GitHub App environment values configured in that runtime.

These live facts were not inferred from CI or merge.

---

## Current roadmap position

Completed:

```text
P0 ✅ Capture / AI triage / Review / Current Direction
P1 ✅ Decision Timeline / Project Map / first Decision activation
P2 ✅ Public Project Map / Scout read / External Feedback / evidence + outcome closure
P3 GitHub integration ✅ structurally closed at repository/application-contract level
```

V2 P3 source roadmap order remains:

1. GitHub integration ✅
2. Notion integration ← NEXT
3. Figma / Slack intake
4. automatic Decision candidate detection

### Recommended next phase

**Phase 47 — Notion Integration Foundation**

Phase 47 must begin audit-first before auth/API/schema implementation.

Required audit questions:

1. What Notion resource is a BuildMap Project associated with: page, database/data source, workspace selection, or a smaller explicit pointer?
2. Which knowledge-history signals are useful to BuildMap without turning BuildMap into a Notion mirror?
3. What authorization model and least-privilege scopes are currently appropriate for Notion?
4. Should initial read be Builder-triggered/on-demand, preserving the GitHub integration's optional-provider failure isolation without mechanically copying GitHub-specific auth semantics?
5. Can `project_links`, `integration_bindings`, and `capture_source_refs` be reused as genuinely provider-neutral boundaries, and where would Notion-specific fields actually be required?
6. What Notion observation must be explicitly selected by Builder before entering Capture?
7. How will source provenance remain explicit without raw page/workspace mirroring or provider authority transfer?

Hard invariants for Phase 47:

- audit before implementation,
- do not assume GitHub App concepts map directly to Notion,
- Notion knowledge objects never become official Decisions automatically,
- Builder approval remains mandatory,
- BuildMap core remains usable when Notion is absent/unavailable,
- no speculative generalized integration platform,
- no PIE / Factory Intelligence expansion,
- schema only if the audit proves it necessary.

---

## Safety boundary

- do not modify historical migrations `00–10`
- additive migrations only when actually required
- do not claim live DB deployment without explicit environment evidence
- do not commit provider secrets/tokens/service-role credentials
- do not enable production deployment implicitly
- preserve Builder approval authority over Decisions
- preserve Scout/public safe-read boundaries
- preserve provider source identity as external/additive
- do not infer provenance from text/AI similarity
- keep GitHub/Notion optional to BuildMap core operation
- automatic Decision candidate detection remains a separate later capability
- PIE / Factory Intelligence remain out of scope
