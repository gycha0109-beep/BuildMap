# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase 31 closure 당시 historical snapshot으로 유지한다. 세부 설계와 보안 계약은 각 Phase decision/access-policy 문서와 git history가 authority다.

## Current implementation baseline

- repository: `gycha0109-beep/BuildMap`
- Phase 49 starting main: `a95005f32681ada3e0882baee0d8ceda5d03ab7e`
- Phase 49 implementation PR: `#61`
- exact final tested implementation head: `4fda9b28dda17b3815ba536b99b2ea522d80dbb3`
- exact final tested implementation tree: `a143d43ebce3e55088958c262382fd65cc1327e0`
- Phase 49 squash merge commit: `483f5a14995c80e90809cc1ea3a370d3ad44830f`
- merged implementation tree: `a143d43ebce3e55088958c262382fd65cc1327e0`
- implementation state: **Phase 49 — Notion Observation → Explicit Capture Provenance merged**
- production deployment: `NOT PERFORMED`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

Implementation tree equality:

```text
CI-TESTED TREE
 a143d43ebce3e55088958c262382fd65cc1327e0

==

MERGED IMPLEMENTATION TREE
 a143d43ebce3e55088958c262382fd65cc1327e0
```

Therefore:

```text
PHASE_49_REPOSITORY_APPLICATION_CONTRACT = CLOSED
```

Do not infer live provider execution, live database migration, secret configuration, or production activation from repository closure.

---

## Product definition and authority

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

Authority invariants:

- BuildMap owns Project identity.
- BuildMap owns Decision identity.
- Builder owns official Decision approval.
- AI is conservative and non-authoritative.
- external provider identities remain additive only.
- provider content never becomes a Decision merely because BuildMap can read it.

Provider boundary remains:

```text
Pointer
!= Credential
!= Observation
!= Capture
!= Decision
```

---

# GitHub integration state

The bounded GitHub P3 slice remains structurally closed at repository/application-contract level.

Current flow:

```text
Repository pointer
→ GitHub App read authorization
→ exact repository verification
→ provider-neutral integration binding
→ Builder-triggered merged PR / Release observation
→ Builder explicitly selects Capture
→ server exact source re-read
→ private Rough Note
→ capture_source_refs provenance
→ AI structuring
→ Builder Review
→ Builder-approved Decision
→ private Evidence reverse trace
```

Still excluded:

- webhook ingestion
- polling/cron/background sync
- raw commit-stream ingestion
- automatic Capture
- automatic Decision approval
- GitHub write permissions

---

# Notion integration state

## Phase 47 — pointer foundation

Notion page/database URLs remain Project-owned pointers through `project_links(link_type = notion)`.

Public behavior is pointer-only through existing public-safe authority. A public pointer does not expose authenticated Notion content.

## Phase 48 — OAuth credential and bounded read

Phase 48 established:

```text
Notion pointer
→ Public OAuth authorization
→ exact resource verification
→ private bot-level credential lifecycle
→ provider-neutral binding
→ Builder-triggered bounded authenticated read
→ ephemeral preview
```

Credentials remain private, encrypted, and separate from Project Link/provider source records.

## Phase 49 — explicit Capture provenance

Phase 49 extends the bounded read into Builder-controlled evidence intake.

Current flow:

```text
verified bounded Notion observation
→ short-lived signed observation token
→ Builder explicitly selects Capture as evidence
→ server re-reads exact Project-linked Notion resource
→ resource/type/fingerprint equality required
→ private Rough Note
→ Notion capture_source_refs provenance
→ AI Structured Draft
→ Builder Review
→ Builder-approved Decision only if Builder explicitly approves
```

There is no automatic Capture or automatic Decision authority.

### Resource identity vs observation identity

Notion resources are mutable. Phase 49 therefore does not misuse the page/database UUID as a revision identity.

```text
external_source_id
= exact Notion page/database provider resource UUID

observation_key
= BuildMap SHA-256 identity of the exact bounded normalized current-state observation
```

`last_edited_time` is provider current-state metadata only. It is not represented as a Notion revision/history ID.

For database observations, child data-source metadata is canonicalized by normalized ID order before fingerprinting so provider response ordering alone does not create a false changed-state identity.

Canonical observation and source-proof payloads use deterministic JSON serialization rather than delimiter-dependent text concatenation.

### Capture token and stale-observation protection

The preview endpoint returns a server-signed, short-lived Capture token bound to:

- Project ID
- Project Link ID
- exact Notion resource ID
- resource type
- bounded observation key
- nonce
- expiry

At Capture time the browser token is not trusted as provider evidence. The server performs an exact Notion re-read and requires the newly calculated resource/type/observation identity to equal the signed preview identity.

If the resource changed between preview and Capture, the Capture fails closed and the Builder must refresh the observation.

### Provenance integrity

Notion provenance uses a server HMAC proof bound to:

- Rough Note ID
- Project Link ID
- source type
- provider resource ID
- observation key
- canonical URL
- source title
- provider current-state timestamp when present
- BuildMap observed timestamp
- SHA-256 of the exact persisted Rough Note body

Evidence reverse trace independently verifies this proof. A changed Rough Note body or forged source row cannot silently become verified Notion provenance.

### Migration 20

Authoritative migration:

`supabase/migrations/20260819060000_buildmap_20_capture_observation_keys.sql`

It adds nullable:

`capture_source_refs.observation_key`

Uniqueness semantics:

- existing GitHub rows keep `observation_key IS NULL` and remain unique by provider source identity;
- mutable provider observations with an observation key are unique by provider resource identity + exact bounded observation identity;
- the same Notion resource may be captured again only after its bounded observed state actually changes.

Historical migrations remain immutable.

---

## Phase 49 authoritative docs

Decision / architecture:

`docs/decisions/phase49-notion-observation-explicit-capture-provenance.md`

Regression/security contracts:

`docs/access-policy-tests/phase49-notion-observation-explicit-capture-provenance.md`

---

## Phase 49 CI / merge evidence

Implementation PR:

`#61`

Exact final tested head:

`4fda9b28dda17b3815ba536b99b2ea522d80dbb3`

Exact final tested tree:

`a143d43ebce3e55088958c262382fd65cc1327e0`

The final head is a no-tree-change CI retrigger commit after GitHub Actions runner queue delay. Its tree is identical to the hardened implementation candidate.

Web App CI #104:

`PASS`

Database Contract Gate #41:

`PASS`

Both required workflows completed successfully on the same exact final head.

Squash merge commit:

`483f5a14995c80e90809cc1ea3a370d3ad44830f`

Merged implementation tree:

`a143d43ebce3e55088958c262382fd65cc1327e0`

Closure invariant:

```text
CI-TESTED TREE == MERGED IMPLEMENTATION TREE
```

Earlier queued/retrigger candidate runs are not Phase 49 closure authority. Closure authority is Web App CI #104 + Database Contract Gate #41 on `4fda9b28dda17b3815ba536b99b2ea522d80dbb3`.

---

## Runtime / deployment boundary

Repository closure does not prove operational activation.

Current unverified/not-performed boundaries include:

```text
Migration 17 live target DB state: NOT VERIFIED
Migration 18 live target DB state: NOT VERIFIED
Migration 19 live target DB state: NOT VERIFIED
Migration 20 live target DB state: NOT VERIFIED

Live GitHub App environment configuration: NOT VERIFIED
Live Notion Public connection registration: NOT VERIFIED
Live Notion callback registration: NOT VERIFIED
Live Notion runtime secret configuration: NOT VERIFIED
Real Notion OAuth round trip: NOT VERIFIED
Real provider page/database read: NOT VERIFIED
Real token refresh/revoke concurrency: NOT VERIFIED
Real Notion explicit Capture against live provider data: NOT VERIFIED
Production deployment: NOT PERFORMED
```

No production deployment is authorized or implied by this handoff.

---

## Public / private boundary

Public/Scout authority remains unchanged.

Public surfaces may expose only explicitly Builder-published/public-safe records and Builder-selected provider pointers through existing public-safe views/RLS/grants.

Never expose through the public Project Map merely because provider integration exists:

- provider credentials or ciphertext
- OAuth state
- workspace/bot/authorizer identity internals
- integration bindings
- authenticated Notion content
- bounded Notion preview
- Capture token
- observation key/source proof internals
- private Rough Notes
- AI Structured Drafts
- private Evidence trace metadata

---

## PIE compatibility boundary

Authoritative decision remains:

`docs/decisions/pie-integration-boundary.md`

Operating stance:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Phase 49 does not add PIE runtime, Factory Intelligence runtime, schema ownership transfer, provider-to-PIE authority, or automatic Decision generation.

BuildMap Project and Decision IDs remain authoritative. Provider resource/observation identities remain external/additive evidence identities.

---

# Next bounded work

## Phase 50 — P3 Provider Integration End-to-End Closure Audit

Recommended next phase is an audit-first closure of the GitHub + Notion provider foundation before adding another provider.

Primary objective:

> Verify that the complete GitHub and Notion integration paths preserve one coherent provider-neutral security, provenance, public/private, failure-isolation, and Decision-authority model end to end.

Required audit areas:

1. GitHub / Notion contract parity
   - pointer
   - authorization/credential
   - exact provider association
   - bounded observation
   - Builder-explicit Capture
   - provenance
   - Evidence reverse trace
   - disconnect/archive behavior

2. Cross-provider provenance consistency
   - `integration_bindings`
   - `capture_source_refs`
   - source proof semantics
   - resource identity vs observation identity
   - archived pointer behavior

3. Failure isolation
   - provider unavailable
   - revoked/invalid authorization
   - invalid binding/proof
   - stale observation
   - Capture persistence failure
   - AI structuring failure

4. Public/private regression
   - no authenticated provider content or credential/provenance internals leak to Scout/public surfaces

5. Decision authority

```text
Provider observation → automatic Decision       NO
Provider Capture     → automatic approval       NO
Builder Review       → explicit approval        YES
```

6. P3 foundation closure recommendation
   - identify only concrete structural debt required before another provider
   - do not generalize abstractions without an actual cross-provider need

Phase 50 should not implement Figma, Slack, provider writes, webhook/polling sync, automatic Decision detection, PIE runtime, Factory Intelligence, or production deployment unless a separate explicit phase authorizes them.

---

## Terminal state

```text
PHASE_49_REPOSITORY_APPLICATION_CONTRACT = CLOSED

LIVE_DATABASE_ACTIVATION = NOT VERIFIED
LIVE_NOTION_OAUTH_REGISTRATION = NOT VERIFIED
LIVE_SECRET_CONFIGURATION = NOT VERIFIED
LIVE_PROVIDER_E2E = NOT VERIFIED
PRODUCTION_DEPLOYMENT = NOT PERFORMED

NEXT = PHASE_50_P3_PROVIDER_INTEGRATION_END_TO_END_CLOSURE_AUDIT
```
