# Phase 49 — Notion Observation → Explicit Capture Provenance Regression Contract

## Purpose

Define the security, provenance, authority, duplicate, and failure-isolation contracts for explicit Notion Capture.

---

## 1. Authority boundary

Must remain true:

```text
Pointer != Credential != Observation != Capture != Decision
```

A Notion current-state observation is external context only.

Only a Builder explicit action may create the provider-sourced Rough Note.

Only the existing Review + Builder approval path may create an official Decision.

Forbidden:

- Refresh creating a Rough Note
- Refresh creating `capture_source_refs`
- provider observation auto-generating a Decision
- provider source identity replacing BuildMap Project/Decision identity

---

## 2. Browser trust boundary

The browser may receive:

- normalized bounded preview
- opaque signed Capture token

The browser must not become provider-content authority.

Capture must not accept raw preview text, provider title, last-edited time, source proof, observation key, or canonical URL from ordinary form fields as authoritative values.

Server Capture must:

1. verify signed token;
2. verify token expiry;
3. bind it to exact Project and Project Link;
4. reauthenticate current user;
5. reverify Project ownership;
6. re-read the exact provider resource through the verified Phase 48 authorization path;
7. recompute the observation key;
8. require the current observation to match the signed preview selection.

A stale or changed observation must abort without creating Capture/provenance.

---

## 3. Resource identity vs observation identity

For Notion:

```text
external_source_id = provider resource UUID
observation_key = deterministic SHA-256 of bounded normalized state
```

Do not concatenate a BuildMap hash into `external_source_id`.

Do not call `observation_key` a Notion revision ID.

`last_edited_time` is current provider metadata only.

---

## 4. Migration 20 contract

Expected file:

`supabase/migrations/20260819060000_buildmap_20_capture_observation_keys.sql`

Must:

- leave migrations 00-19 untouched;
- add nullable `capture_source_refs.observation_key`;
- accept only lowercase 64-character SHA-256 hex when non-null;
- preserve existing GitHub source uniqueness for NULL observation keys;
- allow changed bounded observations of the same mutable source through non-null observation-key uniqueness;
- perform no remote DB mutation in CI.

Migration 20 does not change OAuth credentials or `integration_bindings` token rules.

---

## 5. Bounded observation fingerprint

Page fingerprint must be deterministic over the exact Phase 48 bounded read, including:

- resource UUID/type
- title
- root last-edited metadata when returned
- canonical URL
- bounded text
- top-level block count
- truncation flag

Database fingerprint must include:

- resource UUID/type
- title
- root last-edited metadata when returned
- canonical URL
- ordered bounded data-source IDs/names
- truncation flag

`observedAt` must not participate in the fingerprint.

Two unchanged bounded reads must produce the same key.

A changed bounded preview must produce a different key.

---

## 6. Signed selection token

Token must bind:

- provider = notion
- Project ID
- Project Link ID
- resource UUID
- resource type
- observation key
- nonce
- expiry

Token must be integrity protected by server-only HMAC secret material and use a Notion Capture-specific domain/payload version.

Tampered, expired, cross-Project, cross-Link, resource-mismatched, type-mismatched, or changed-observation tokens must fail closed.

---

## 7. Provider exact re-read

Capture must reuse the Phase 48 verified read boundary:

- exact active Notion Project Link
- provider-neutral active binding
- binding proof verification
- matching bot/workspace credential
- server-only token decryption
- controlled 401 refresh path
- shared bot refresh lease/version CAS
- exact page/database ID read
- bounded read only

Capture must not trust the resource ID solely because it was present in the browser token.

---

## 8. Explicit Capture persistence

A successful Capture may create only:

- one private Rough Note;
- one immutable `capture_source_refs` row;
- one AI Structured Draft request/result through existing Review workflow.

Notion source row:

```text
provider = notion
source_type = page_current_state | database_current_state
external_source_id = exact Notion resource UUID
observation_key = bounded observation SHA-256
canonical_url = canonical BuildMap Notion pointer
occurred_at = root last_edited_time when available
observed_at = exact server re-read time
```

Raw Notion JSON must not be persisted.

---

## 9. Source proof integrity

Notion source proof must bind at least:

- Rough Note ID
- Project Link ID
- source type
- exact resource UUID
- observation key
- canonical URL
- source title
- occurred timestamp
- observed timestamp
- hash of exact Rough Note body

An owner-created arbitrary source row without a valid HMAC must not become verified provenance.

If the captured Rough Note body changes after source creation, proof verification must fail.

GitHub's existing proof contract must remain unchanged.

---

## 10. Duplicate handling

Exact same bounded Notion observation:

- must not create another Rough Note;
- must resolve to existing provenance through unique observation identity;
- existing proof/body must be verified before reuse.

Same resource with changed bounded observation:

- may create a new explicit Capture;
- must retain the same provider resource ID;
- must use a different observation key.

This is Builder-selected observation history, not Notion revision history.

---

## 11. AI/Decision boundary

After successful explicit Capture:

```text
Rough Note
→ AI Structured Draft
→ Review
```

AI failure may mark the draft failed but must not erase valid Capture provenance.

No automatic approval or Current Direction mutation is allowed.

---

## 12. Evidence reverse trace

Builder-only Evidence must:

- continue verifying GitHub proof rows;
- verify Notion proof rows independently;
- require the Notion observation key;
- include the persisted Rough Note body in Notion proof verification;
- treat invalid proof rows as integrity failures, not verified provenance;
- never infer a replacement source.

Safe provider links may include canonical GitHub or Notion HTTPS URLs only.

---

## 13. Public boundary

Scout/Public must remain unchanged.

Never expose because of Phase 49:

- Notion preview content
- Rough Note body
- observation key
- Capture token
- source proof
- `capture_source_refs`
- integration binding
- workspace/bot identity
- provider errors
- AI draft

Public Notion remains a Builder-selected pointer only.

---

## 14. Failure isolation

Before successful provenance creation, failures must not mutate BuildMap core.

Provider 401/403/404/409/429/5xx/timeout or stale-observation mismatch must not change:

- Project
- existing Decision
- Current Direction
- publication
- Feedback
- Outcome
- GitHub integration
- unrelated Capture

If a new Rough Note is created but source insertion fails, the unconverted Rough Note must be archived before failure is returned.

---

## 15. Non-goals regression

Must remain absent:

- Notion write
- workspace-wide search ingest
- recursive full page-tree crawl
- database row mirror
- polling
- cron
- background sync
- webhook ingestion
- fabricated revision history
- automatic Capture
- automatic Decision candidate detection
- automatic Decision approval
- PIE coupling
- Factory Intelligence
- production deployment

---

## 16. CI closure

Final implementation head must pass on the exact same SHA:

### Web App CI

- exact event SHA checkout
- Node 22
- install
- lint
- typecheck
- production build

### Database Contract Gate

Required because migration 20 exists:

- exact SHA checkout
- historical migration integrity
- additive sequence/filename contract
- safety boundary
- no remote DB mutation

After squash merge:

```text
CI-TESTED TREE == MERGED IMPLEMENTATION TREE
```

must be proved before Phase 49 closeout.
