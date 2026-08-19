# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase31 closure 당시의 historical snapshot으로 유지한다.

## Current main baseline

- repository: `gycha0109-beep/BuildMap`
- implementation baseline: `c6ff1dfcb3eabc2a6ae5b064c9ebcbecfcf630f6`
- implementation tree: `2522581b22e4758f0f772c46d99a3d420def2af1`
- implementation state: **Phase 47 — Notion Integration Foundation merged**
- P2 closure verdict: `PASS WITH CONSISTENCY HARDENING`
- P3 GitHub slice: **STRUCTURALLY CLOSED AT REPOSITORY/APPLICATION-CONTRACT LEVEL**
- P3 Notion state: **POINTER + ARCHITECTURE FOUNDATION COMPLETE; OAUTH/READ NOT IMPLEMENTED**
- production deployment: `OUT_OF_SCOPE`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

Important activation boundary:

```text
Repository implementation through Phase 47: COMPLETE
Migration 17 live BuildMap DB application: NOT VERIFIED
Migration 18 live BuildMap DB application: NOT VERIFIED
Live GitHub App environment configuration: NOT VERIFIED
Notion OAuth/read runtime: NOT IMPLEMENTED
Production deployment: NOT PERFORMED
```

Do not infer live GitHub or Notion provider execution from repository merge alone.

### Phase 47 starting-main history note

Immediately before the Phase 47 branch was created, an accidental empty `__noop__` file was created on `main` and immediately removed.

The restored `main` was:

`7f6f255a23ca056b95e4fab335b9aec814511062`

with tree:

`5c062f3d1305941c6bede1935a40cd14f90814fc`

That tree exactly matched the prior Phase 46 closeout tree. Therefore the two no-op history commits introduced **zero repository-content drift**, and Phase 47 branched from the restored tree.

---

## Product definition

BuildMap V2 is an AI-native Capture-first Decision Journal for Builders.

Core question:

> 왜 이 프로젝트가 지금의 모습이 되었는가?

Positioning:

- GitHub = Build History
- Notion = Knowledge History / Knowledge Context
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

Feedback never automatically becomes a Decision or a `reflected` outcome.

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

## Phase 44 — Read Integration Architecture & Sync Boundary

Approved:

- GitHub App installation model
- Metadata read + Contents read + Pull Requests read
- primary signals: merged Pull Requests + Releases
- commits only as supporting drill-down
- Issues deferred
- Builder-triggered on-demand read
- no webhook / polling / cron / continuous background sync
- observation must cross explicit Builder Capture before Decision workflow

Decision:

`docs/decisions/phase44-github-read-integration-architecture.md`

## Phase 45 — GitHub App Read Access Bootstrap

Implemented:

```text
Project Link
→ signed installation state
→ GitHub App installation
→ GitHub App user authorization + PKCE
→ exact installation/repository verification
→ private integration binding
→ Builder Refresh
→ binding proof verification
→ request-local installation token
→ merged PR / non-draft Release read
→ ephemeral normalized preview
```

Migration 17:

`supabase/migrations/20260819002000_buildmap_17_integration_bindings.sql`

Security invariants:

- no persisted GitHub user access token
- no persisted installation token
- no provider secret in browser
- repository-scoped read permissions only
- `integration_bindings` is private association metadata
- provider failure does not mutate BuildMap core state

## Phase 46 — GitHub Observation → Explicit Capture Provenance

Implemented:

```text
Builder Refresh
→ ephemeral merged PR / Release observation
→ Builder explicitly selects Capture as evidence
→ server exact-re-reads provider object
→ private Rough Note
→ private provider source reference
→ evidence-mode AI structuring
→ Builder Review
→ Builder-approved Decision
→ Builder-only Evidence trace
```

Migration 18:

`supabase/migrations/20260819003000_buildmap_18_capture_source_refs.sql`

Important provenance invariant:

```text
owner-readable capture_source_refs row
≠ provider-verified GitHub provenance
```

GitHub source rows use server HMAC `source_proof`, and current application paths verify it before treating a row as provider-verified provenance.

No GitHub source ID is copied into BuildMap Project or Decision identity.

Decision trace:

```text
Change Card
→ rough_note_id
→ capture_source_refs
→ source_proof verification
→ project_link
→ canonical GitHub source
```

Decisions:

- `docs/decisions/phase46-github-observation-explicit-capture-provenance.md`
- `docs/decisions/phase46-github-source-integrity-hardening.md`

## GitHub P3 closure verdict

At repository/application-contract level the bounded GitHub slice covers:

```text
Repository association
→ read authorization
→ Builder-triggered observation read
→ explicit Capture
→ durable provenance
→ AI Review path
→ Decision
→ reverse Evidence trace
```

The current GitHub P3 slice is structurally closed.

Still excluded:

- webhook ingestion
- polling/cron/background sync
- Issues intake
- raw commit-stream ingestion
- automatic Capture
- automatic Decision candidate detection
- GitHub write permissions

---

# Notion integration state

## Phase 47 — Notion Integration Foundation

Phase 47 began with an audit of both the current BuildMap provider-neutral boundaries and the current official Notion API model.

### External API architecture findings

Audit date: `2026-08-19`

Notion API version observed during the audit:

`2026-03-11`

Current architecture facts used for the phase decision:

- public Notion connections use OAuth 2.0,
- the standard authorization flow includes user page/database selection,
- token exchange provides access + refresh tokens,
- public connections must persist those credentials for later calls,
- token refresh rotates both access and refresh tokens,
- read access is capability- and content-access-scoped,
- current Notion databases are containers that may contain data sources,
- current page APIs expose current metadata/content such as `last_edited_time`,
- the audited public API must not be described as an authoritative revision-history feed.

### Resource association decision

A BuildMap Project associates initially with an explicit Notion **page/database root pointer**.

Not authorized as the default Project association:

- entire workspace
- inferred child data source
- workspace-wide index

The user-facing pointer deliberately does not infer page versus database solely from a pasted URL. Exact provider object type belongs to a later authenticated read.

### Pointer implementation

Existing schema already supports:

```text
project_links.link_type = notion
```

Therefore Phase 47 adds **no migration**.

Implemented:

- Notion resource URL normalization
- official HTTPS `notion.so` / `www.notion.so` only
- stable 32-hex resource UUID extraction
- canonical storage:
  `https://www.notion.so/{32-character-resource-id}`
- Builder add/list/update-visibility/remove actions
- default internal visibility
- canonical duplicate update behavior in application path
- archive-on-remove
- `Integrations` UI separation:
  - GitHub · Build History
  - Notion · Knowledge Context

Phase 47 accepts explicit resource URLs whose path exposes the stable UUID. Human-readable unique-ID shortcuts without that UUID are intentionally excluded until authenticated resolution exists.

### Public pointer boundary

No new public view is introduced.

Scout/Public rendering continues through:

`public_project_links`

A Notion pointer is shown publicly only when:

- the existing public-safe view returns it,
- `link_type = notion`,
- the application read-side confirms the stored URL is canonical.

Scout label:

`Knowledge context → Notion resources`

A public pointer means only that the Builder selected the external link for display.

It does **not** mean:

- the Notion page/database is public,
- BuildMap has Notion OAuth/read authorization,
- BuildMap mirrored the content,
- the Notion object is Decision authority.

### OAuth / credential boundary

Phase 47 does **not** implement Notion OAuth or reads.

No new Notion environment variables are added.

No Notion access or refresh token is stored.

Migration 17 remains authoritative:

`integration_bindings` is credential-free provider association metadata.

Do not add OAuth credentials to:

- `project_links`
- `integration_bindings`
- `capture_source_refs`

The reason for separating Phase 48 is structural: unlike the GitHub request-local installation-token model, a Notion public connection requires persistent OAuth credential lifecycle and refresh-token rotation.

A later phase must first define a dedicated server-only credential persistence boundary before authenticated Notion reads are authorized.

### Knowledge signal boundary

Phase 47 does not create Notion observations.

Future bounded read primitives may include:

- exact linked page/database metadata
- page `last_edited_time`
- current title/properties
- current page Markdown/content
- database data-source discovery where required

But the integration must not become a Notion workspace mirror.

Not authorized:

- workspace-wide indexing
- persistent page/block mirror
- background crawling
- webhook ingestion
- periodic polling/cron
- raw provider payload persistence
- automatic AI scan of an entire workspace

### Future Capture path

Phase 47 fixes the intended authority flow but does not implement it yet:

```text
Authorized Notion resource read
→ bounded normalized observation
→ Builder explicitly selects Capture as evidence
→ server exact source verification
→ private Rough Note
→ provider provenance
→ evidence-mode AI structuring
→ Builder Review
→ Builder-approved Decision
```

Never:

```text
Notion object
→ automatic approved Decision
```

### Provider-neutral reuse verdict

`project_links`:
- reused now for pointer identity ✅

`integration_bindings`:
- reusable later for association metadata ✅
- credential vault ❌

`capture_source_refs`:
- data shape suitable for later Notion provenance ✅
- current GitHub-specific proof path cannot be assumed for Notion ❌

The same provenance invariant will apply:

```text
owner-readable source row
≠ provider-verified provider provenance
```

### Phase 47 authoritative docs

Decision:

`docs/decisions/phase47-notion-integration-foundation.md`

Regression contract:

`docs/access-policy-tests/phase47-notion-integration-foundation.md`

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

Phase 47 adds no migration 19.

Current claims:

```text
Migration 17 repository state: PRESENT + CONTRACT-VALID
Migration 18 repository state: PRESENT + CONTRACT-VALID
Migration 17 live target DB state: NOT VERIFIED
Migration 18 live target DB state: NOT VERIFIED
```

No live database state is inferred from Phase 47.

---

## Phase 47 CI / merge evidence

Implementation PR:

`#57`

Exact final tested head:

`d6f981c4a8398e32a7c06fe5c9a53828ff2a54be`

Exact tested tree:

`2522581b22e4758f0f772c46d99a3d420def2af1`

Web App CI #86 passed:

- exact event SHA checkout
- Node 22
- install
- lint
- typecheck
- production build

No Database Contract Gate run was expected because Phase 47 introduced no migration.

Squash merge commit:

`c6ff1dfcb3eabc2a6ae5b064c9ebcbecfcf630f6`

Merged implementation tree:

`2522581b22e4758f0f772c46d99a3d420def2af1`

Therefore:

```text
CI-TESTED TREE == MERGED IMPLEMENTATION TREE
```

---

## Public / private authority boundary

Public-safe views/RLS/grants remain authority for Scout/public reads.

Never expose through Scout/Public surfaces unless a specific public-safe contract authorizes it:

- Rough Notes
- AI Structured Drafts
- internal/unpublished/sensitive Change Cards
- private Feedback review/outcome state
- Builder-only provenance
- integration bindings
- provider credentials/tokens
- source proofs
- raw GitHub observations
- future raw Notion content or OAuth state

Current public provider pointer behavior:

- GitHub repository pointer: Builder-selected public `project_links` through `public_project_links`
- Notion resource pointer: Builder-selected public `project_links` through `public_project_links`

Neither provider pointer grants provider Decision authority.

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
- BuildMap must work when PIE is absent/unavailable.
- PIE core remains BuildMap-independent.
- Factory Intelligence remains out of scope.

No PIE runtime/schema/API/auth/webhook/polling implementation is authorized by the current roadmap.

---

## Production / deployment state

Production deployment remains out of scope.

`apps/web/vercel.json` keeps Git deployment disabled.

Merging Phase 47 to `main` is not production deployment.

Real GitHub execution still requires explicit target-environment activation of migrations 17/18 and GitHub App configuration.

Notion authenticated execution does not exist yet because Phase 47 intentionally stops before OAuth/token/read implementation.

---

## Current roadmap position

Completed:

```text
P0 ✅ Capture / AI triage / Review / Current Direction
P1 ✅ Decision Timeline / Project Map / first Decision activation
P2 ✅ Public Project Map / Scout read / External Feedback / evidence + outcome closure
P3 GitHub integration ✅ structurally closed at repository/application-contract level
P3 Notion Phase 47 ✅ pointer + architecture foundation
```

V2 P3 source order:

1. GitHub integration ✅
2. Notion integration — active
3. Figma / Slack intake
4. automatic Decision candidate detection

### Recommended next phase

**Phase 48 — Notion OAuth Credential & Read Bootstrap**

Phase 48 must remain audit-first around credential security before provider API implementation.

Required design/implementation questions:

1. dedicated encrypted/sealed server-only credential persistence model,
2. token read/write authority from Next.js server runtime,
3. access/refresh token atomic rotation and concurrent refresh behavior,
4. OAuth state / CSRF protection,
5. exact linked resource verification after page-picker authorization,
6. workspace/bot/resource association in `integration_bindings`,
7. least-privilege `read content` capability,
8. first bounded Builder-triggered Notion read shape,
9. explicit disconnect/revocation behavior,
10. failure isolation from ordinary BuildMap workflows.

Phase 48 must not automatically add Notion Capture or Decision creation merely because authenticated reads become possible. Observation → explicit Capture should remain a later bounded step if not safely included after the read bootstrap.

---

## Safety boundary

- do not modify historical migrations `00–10`
- additive migrations only when actually required
- do not claim live DB deployment without explicit environment evidence
- do not commit provider secrets/tokens/service-role credentials
- do not turn `integration_bindings` into a plaintext token store
- do not enable production deployment implicitly
- preserve Builder approval authority over Decisions
- preserve Scout/public safe-read boundaries
- preserve provider source identity as external/additive
- do not infer provenance from text/AI similarity
- keep GitHub/Notion optional to BuildMap core operation
- automatic Decision candidate detection remains a separate later capability
- PIE / Factory Intelligence remain out of scope
