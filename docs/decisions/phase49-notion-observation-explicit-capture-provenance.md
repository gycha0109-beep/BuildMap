# Phase 49 — Notion Observation → Explicit Capture Provenance

## Status

Repository implementation target.

Phase 49 begins from authoritative main:

`a95005f32681ada3e0882baee0d8ceda5d03ab7e`

Phase 48 is already closed at repository/application-contract level.

Production deployment, live migration application, live Notion registration/secrets, and live provider execution remain separate activation work.

---

## Product authority

BuildMap remains an AI-native Capture-first Decision Journal for Builders.

```text
GitHub = Build History
Notion = Knowledge History / Knowledge Context
BuildMap = Decision History
```

Authority boundary:

```text
Pointer
!= Credential
!= Observation
!= Capture
!= Decision
```

Notion authorization permits a bounded knowledge-context read. It does not make a Notion object a BuildMap Decision.

Phase 49 adds only the explicit transition:

```text
verified bounded Notion observation
→ Builder explicitly selects Capture as evidence
→ server exact re-read
→ private Rough Note
→ immutable provider provenance
→ AI Structured Draft
→ Review
```

Official Decision still requires Builder approval.

---

## Repository audit

### Existing provider-neutral provenance

Migration 18 already provides `capture_source_refs` with:

- `rough_note_id`
- `project_link_id`
- `provider`
- `source_type`
- `external_source_id`
- canonical URL/title/context
- provider occurrence timestamp
- BuildMap observation timestamp
- server integrity proof

The trigger already requires the Project Link and Rough Note to belong to the same Project and requires `project_links.link_type == provider`.

This table remains the provenance authority for explicit external-provider Captures.

### Existing uniqueness problem

Migration 18 originally enforces uniqueness over:

```text
project_link_id
+ provider
+ source_type
+ external_source_id
```

That is correct for immutable/stable GitHub observations such as one merged PR or one Release.

It is not sufficient for mutable Notion roots. A Notion page/database retains the same provider resource UUID while its bounded current state may change over time.

Using only the resource UUID would incorrectly make the first Capture permanent and block every later changed state.

Using a synthetic hash as `external_source_id` would also violate the existing contract that `external_source_id` is the provider-side source identity.

### Decision

Migration 20 adds nullable `capture_source_refs.observation_key`.

For GitHub rows:

```text
observation_key = NULL
```

Existing source uniqueness remains unchanged.

For Notion rows:

```text
external_source_id = exact provider resource UUID
observation_key = SHA-256(bounded normalized current observation)
```

A separate partial unique index allows the same Notion resource to be captured again only when its bounded normalized observed state changes.

`observation_key` is explicitly **not** a Notion revision ID and must never be presented as revision history.

---

## Official Notion API audit

Audit date: `2026-08-19`.

Current official API version remains:

`2026-03-11`

Official contracts used by Phase 49:

- page objects expose the current page identity and `last_edited_time`;
- page content is read separately through block children;
- block objects also expose their own current `last_edited_time`;
- read content capability is required;
- the public API documentation does not provide a revision-history identity used by this phase.

Therefore Phase 49 treats `last_edited_time` only as provider-supplied current-state metadata.

It does not use that timestamp as an authoritative revision identifier.

---

## Observation identity

Phase 48's bounded observation remains the source material.

Page fingerprint inputs:

- canonical resource UUID
- object type
- verified title
- root `last_edited_time` when returned
- canonical BuildMap Notion pointer URL
- bounded page text
- top-level block count read
- truncation flag

Database fingerprint inputs:

- canonical resource UUID
- object type
- verified title
- root `last_edited_time` when returned
- canonical BuildMap Notion pointer URL
- ordered bounded child data-source IDs/names
- truncation flag

The fingerprint deliberately excludes `observedAt`, because two reads of an unchanged bounded observation must resolve to the same observation identity.

Changes outside the Phase 48 bounded read are outside this identity contract and are not claimed to be captured.

---

## Explicit selection / stale-preview defense

Refresh remains ephemeral.

When the server returns a preview it also returns a signed, time-bounded capture token binding:

- provider = notion
- BuildMap Project ID
- Project Link ID
- exact resource UUID
- resource type
- bounded observation key
- random nonce
- ten-minute expiry

The token is HMAC authenticated with the existing server-only Notion integrity secret under a Notion Capture-specific domain.

The browser never supplies provider content as Capture authority.

On `Capture as evidence`:

1. verify capture-token signature and expiry;
2. verify Project ID and Project Link ID;
3. reauthenticate current BuildMap user;
4. reverify Project ownership;
5. execute the same Phase 48 exact binding/credential/resource read boundary;
6. recompute the current bounded observation key;
7. require resource ID, resource type, and observation key to equal the signed preview selection;
8. if any differ, abort and require a fresh Refresh;
9. only then create the Rough Note and provider provenance.

This prevents a Notion resource changed between Refresh and Capture from silently becoming evidence the Builder did not inspect.

---

## Notion source types

Phase 49 uses:

- `page_current_state`
- `database_current_state`

These names intentionally say **current state**, not revision/version/history.

`occurred_at` stores the provider root `last_edited_time` when available.

`observed_at` stores the exact BuildMap server read time used for the Capture.

Neither field is promoted to Decision identity.

---

## Capture body

The Rough Note stores a bounded normalized evidence record, not a raw Notion payload.

Page Capture includes:

- verified resource title/type/UUID
- provider `last_edited_time` when available
- BuildMap observation time
- canonical pointer URL
- bounded current text
- explicit top-level block/truncation boundary
- explicit no-recursive-traversal statement

Database Capture includes:

- verified resource title/type/UUID
- provider `last_edited_time` when available
- BuildMap observation time
- canonical pointer URL
- bounded child data-source labels
- explicit no-row-query/no-mirror boundary

No raw provider JSON is persisted.

---

## Notion source proof

A readable `capture_source_refs` row is not automatically verified provider provenance.

Phase 49 defines a separate Notion source-proof tuple:

- Rough Note ID
- Project Link ID
- Notion current-state source type
- exact provider resource UUID
- bounded observation key
- canonical URL
- verified source title
- provider `last_edited_time` when present
- BuildMap `observed_at`
- SHA-256 of the exact Rough Note body

The tuple is HMAC-SHA256 sealed server-side under a Notion-specific proof domain.

This differs from GitHub intentionally. Mutable Notion current-state evidence needs the observation discriminator and exact Capture-body integrity in addition to provider resource identity.

Owner-readable source metadata without a valid proof must not be presented as verified Notion provenance.

---

## Duplicate behavior

If the exact same bounded Notion observation has already been captured for the Project Link:

- no second Rough Note is created;
- the existing source proof and existing Rough Note body are verified;
- valid existing provenance redirects to Review;
- invalid existing provenance fails closed.

If the bounded observation changes, the observation key changes and a new explicit Capture is allowed.

This is not revision history. It is a history of Builder-selected bounded observations.

---

## AI / Review boundary

After a successful explicit Capture, Phase 49 follows the existing evidence path:

```text
private Rough Note
→ AI Structured Draft
→ Review
→ Builder approval
→ Decision
```

AI remains non-authoritative.

If AI generation fails, the Rough Note and verified provenance remain preserved and Review reports the generation failure using existing behavior.

No provider observation automatically becomes a Decision Candidate or approved Decision.

---

## Evidence reverse trace

Builder-only Evidence reads now verify either:

- the existing GitHub source proof contract, or
- the new Notion current-state source proof contract.

Notion proof verification also hashes the current persisted Rough Note body. If that body no longer matches the captured evidence body, the Notion source row is not treated as verified provenance.

The Evidence surface may show the canonical Notion source link and normalized private source metadata.

None of this is added to Scout/Public surfaces.

---

## Public/private boundary

Phase 49 does not change `public_project_links`.

Public Notion behavior remains pointer-only.

Never expose through Scout/Public because of Phase 49:

- authenticated Notion content
- Capture body
- observation key
- capture token
- source proof
- `capture_source_refs`
- workspace ID
- bot ID
- OAuth credential metadata
- AI draft
- internal Evidence trace

---

## Failure isolation

Provider/binding/credential/read failures before the explicit Capture must create no Rough Note and no source row.

If provider provenance insert fails after Rough Note creation, the new Rough Note is archived before returning failure, matching the established provider Capture rollback boundary.

Notion failure must not mutate:

- Project
- existing Decisions
- Current Direction
- publication
- Feedback/Outcome
- GitHub integration
- unrelated Capture

---

## Schema

Migration 20:

`supabase/migrations/20260819060000_buildmap_20_capture_observation_keys.sql`

Changes:

- adds nullable `capture_source_refs.observation_key`;
- constrains non-null observation keys to lowercase SHA-256 hex;
- preserves source-only uniqueness when `observation_key IS NULL`;
- adds observation-aware uniqueness when `observation_key IS NOT NULL`.

Historical migrations 00-19 are not edited.

No credential table is changed.

No environment variable is added.

---

## Explicit non-goals

Phase 49 does not add:

- Notion writes
- workspace search ingest
- workspace/page-tree mirror
- full database row ingest
- recursive block crawling
- polling/cron/background sync
- webhooks
- revision-history fabrication
- automatic Capture
- automatic Decision candidate detection
- automatic Decision approval
- public Notion content rendering
- PIE
- Factory Intelligence
- production deployment

---

## Terminal authority flow

```text
Notion pointer
→ Notion authorization
→ bounded ephemeral observation
→ Builder explicitly selects Capture as evidence
→ signed observation selection
→ server exact re-read
→ same-observation verification
→ private Rough Note
→ verified Notion provenance
→ AI Structured Draft
→ Review
→ Builder-approved Decision
```

The phase stops at the established Review/Decision boundary and does not grant Notion authority over BuildMap Decisions.
