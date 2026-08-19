# Phase 46 — GitHub Observation → Explicit Capture Provenance

## Status

`IMPLEMENTED — REPOSITORY CONTRACT`

Phase 46 connects the Phase 45 ephemeral GitHub read experience to BuildMap's private Capture/Review workflow without transferring Decision authority to GitHub.

---

## 1. Product transition

Phase 45 stopped at:

```text
GitHub repository
→ Builder-triggered Refresh
→ ephemeral merged PR / Release observation
```

Phase 46 adds one explicit authority transition:

```text
GitHub observation
→ Builder chooses Capture as evidence
→ server re-verifies exact provider object
→ private Rough Note
→ private source provenance
→ AI evidence structuring
→ Review
→ Builder approval
→ official Decision
```

The Builder click is mandatory.

Refresh alone does not persist an observation and does not create a Capture.

---

## 2. Authority boundary

Still authoritative:

```text
GitHub = Build History source
BuildMap = Decision History
Builder = official Decision authority
```

Therefore:

```text
GitHub PR / Release
!= Rough Note until Builder Capture
!= AI Draft authority
!= Change Card identity
!= approved Decision
!= public Decision
```

No GitHub identifier is added to `projects` or `change_cards`.

---

## 3. Source verification before Capture

The browser never supplies trusted title, URL, summary, timestamp, or repository metadata for persistence.

The Capture form submits only:

- BuildMap Project context,
- Project Link ID,
- source type,
- stable provider source ID.

Before mutation, the server revalidates:

1. authenticated BuildMap Builder,
2. Project ownership,
3. active canonical GitHub `project_links` row,
4. active `integration_bindings` row,
5. binding HMAC proof,
6. repository identity,
7. exact provider source from GitHub.

Exact source reads are:

- merged Pull Request by PR number,
- Release by Release ID.

A Pull Request must still be merged.

A Release must still be non-draft.

Provider metadata used for the Capture comes from this server-side exact read, not from hidden form fields or client state.

---

## 4. Provider-neutral provenance model

Migration 18 adds:

`public.capture_source_refs`

This is a private source-reference table, not an observation/event ledger.

Each row links:

```text
Rough Note
↔ Project Link
↔ provider
↔ provider source type
↔ stable external source identity
```

Normalized fields:

- `rough_note_id`
- `project_link_id`
- `created_by_builder_profile_id`
- `provider`
- `source_type`
- `external_source_id`
- `canonical_url`
- `source_title`
- `source_context`
- `occurred_at`
- `observed_at`

It does not store:

- GitHub access tokens,
- GitHub App private keys,
- OAuth tokens,
- raw API payloads,
- synchronized activity feeds,
- AI interpretation authority.

The schema is provider-neutral so later Notion/Figma/Slack intake may reuse the source-reference concept if their own product audits justify it.

It is not a generalized integration platform.

---

## 5. Immutability and consistency

`capture_source_refs` is insert-only for authenticated application users.

No authenticated UPDATE or DELETE privilege is granted.

Insert validation requires:

- active Rough Note,
- active Project Link,
- same BuildMap Project,
- source creator == Rough Note author,
- provider == Project Link type.

A Feedback-sourced Rough Note cannot also claim provider observation provenance.

One Rough Note may have at most one provider source reference.

One provider source identity may be captured at most once for a given Project Link/provider/source type.

This is idempotency for explicit Capture, not background sync deduplication.

---

## 6. Capture body vs provenance

The private Rough Note body stores a human-readable context snapshot used by AI Review, including:

- repository,
- source type,
- stable source identity,
- title,
- source context,
- occurred timestamp,
- BuildMap observation timestamp,
- canonical source URL,
- compact provider summary/context when available.

The body is not the provenance authority.

The provenance authority is the explicit `capture_source_refs` row.

BuildMap must not reconstruct provider provenance later by matching Rough Note text, PR titles, release titles, URLs, or AI similarity.

---

## 7. AI triage rule

Ordinary Builder Capture continues through conservative decision-worthiness assessment.

Provider-origin Capture does not repeat that triage.

Reason:

The Builder has already made an explicit product judgment by selecting `Capture as evidence` from an external Build History observation.

Therefore provider-origin Captures use the same evidence-structuring mode already used by Builder-selected External Feedback evidence.

This rule also applies when an AI draft previously failed and the Builder retries it from Review.

The retry path checks stored provenance records, not Rough Note text.

---

## 8. Failure behavior

GitHub is optional infrastructure.

Before a Rough Note is created, any of these failures are non-mutating:

- invalid source identity,
- invalid/missing read binding,
- HMAC integrity failure,
- authorization loss,
- provider 401/403/404,
- provider outage.

If Rough Note creation succeeds but source-reference insertion fails, the newly-created Rough Note is immediately archived and the Capture is not treated as completed.

If source provenance succeeds but AI generation fails, the private Capture and source provenance remain intact so Review can retry AI structuring later.

AI failure does not delete the Builder's selected evidence.

---

## 9. Duplicate behavior

A repeated Capture request for the same linked GitHub source does not create another active source identity.

The application checks existing provenance first, and the database unique constraint remains the concurrency backstop.

A race that creates a temporary second Rough Note is compensated by archiving that new Rough Note when the source unique constraint rejects the duplicate.

---

## 10. Decision trace

No GitHub source column is added to `change_cards`.

The existing BuildMap source chain is sufficient:

```text
Decision.change_cards.rough_note_id
→ Rough Note
→ capture_source_refs
→ project_links
→ canonical provider source
```

This preserves provider identity as external/additive rather than copying provider IDs into Decision identity.

The Builder-only Evidence surface displays this stored trace.

If a Project Link is later archived, the historical source reference remains traceable through the archived link record.

---

## 11. Public boundary

`capture_source_refs` has:

- RLS enabled,
- authenticated owner-only SELECT,
- authenticated owner-only INSERT,
- no anonymous privileges,
- no public-safe view.

Raw GitHub PR/Release provenance is not added to the Scout Public Project Map.

A future public artifact remains the Builder-approved/public BuildMap Decision, not the raw provider observation.

---

## 12. What Phase 46 does not add

- webhook ingestion
- polling / cron / background synchronization
- persistent GitHub observation ledger
- Issue intake
- raw commit stream intake
- automatic Capture
- automatic Decision candidate detection
- automatic Decision approval
- GitHub IDs on Project/Change Card
- public raw GitHub activity
- PIE runtime integration
- Factory Intelligence
- production deployment

---

## 13. Database impact

Migration:

`20260819003000_buildmap_18_capture_source_refs.sql`

Impact:

```text
New private table: capture_source_refs
New private validation trigger: yes
New public-safe view: no
GitHub-specific core columns: no
Credential storage: no
Historical migration modification: no
```

Passing Database Contract Gate proves repository migration integrity only.

It does not prove migration 18 is applied to a live BuildMap database.

---

## 14. Architectural compatibility

Phase 46 preserves the PIE boundary:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

`capture_source_refs` is BuildMap intake provenance and does not become PIE Evidence authority.

GitHub source identity remains an external reference.

BuildMap Project and Decision identities remain authoritative.
