# Phase 46 — GitHub Observation → Explicit Capture Provenance Regression Contracts

## Purpose

These contracts define the repository/application expectations for the explicit GitHub observation Capture boundary introduced in Phase 46.

They are not claims of live production execution.

---

## P46C-001 — Refresh remains non-mutating

Given an authenticated Builder with valid GitHub read access,
when the Builder clicks Refresh only,
then merged PR / Release observations are returned ephemerally and no Rough Note, AI Draft, source provenance, Change Card, Feedback, or publication row is created.

## P46C-002 — Capture requires explicit Builder action

A GitHub observation may enter the BuildMap Capture workflow only after the Builder explicitly submits `Capture as evidence` for that observation.

No background or automatic Capture is permitted.

## P46C-003 — Client observation metadata is non-authoritative

The Capture request must not trust client-supplied title, summary, URL, occurrence timestamp, repository label, or branch context.

Only source type/source identity and BuildMap link context may identify the requested observation.

The server must re-read the exact provider object before mutation.

## P46C-004 — Exact merged PR verification

For `merged_pull_request`, the server must re-read the exact Pull Request by PR number and refuse Capture if it is not merged or cannot be read.

## P46C-005 — Exact Release verification

For `release`, the server must re-read the exact Release by provider Release ID and refuse Capture if it is draft or cannot be read.

## P46C-006 — Read binding integrity precedes provider read

Capture must require:

- active Project Link,
- active GitHub integration binding,
- exact repository identity,
- valid binding HMAC proof.

A forged/tampered binding must not be used to mint an installation token.

## P46C-007 — Provider failure is non-mutating before Capture creation

GitHub authorization/provider failures before source verification completes must leave existing BuildMap Project, Capture, Decision, Feedback, publication, and Outcome state unchanged.

## P46C-008 — Provider source provenance is private, explicit, and server-sealed

A successful provider-origin Capture creates an explicit private `capture_source_refs` row linked to the new Rough Note.

The provenance row must preserve provider, source type, external source identity, canonical URL, source title/context, occurrence time, BuildMap observation time, and a server-generated integrity proof.

Application read/retry paths must verify the proof before treating the row as verified GitHub provenance.

## P46C-009 — Source provenance is not a raw event ledger

No complete GitHub API response payload, provider token, private key, OAuth secret, or synchronized observation feed may be stored in `capture_source_refs`.

The source integrity proof is BuildMap server integrity metadata, not a GitHub credential.

## P46C-010 — Source record is immutable to authenticated application users

Authenticated users may SELECT/INSERT owned source references through RLS but must not have UPDATE or DELETE privileges on `capture_source_refs`.

Anonymous users must have no privilege on the table.

A row that exists but fails source-proof verification must not be represented as verified provider provenance.

## P46C-011 — Cross-project provenance is rejected

The source-reference validation trigger must reject a Project Link and Rough Note that belong to different BuildMap Projects.

## P46C-012 — Provider/link mismatch is rejected

The source-reference validation trigger must reject provenance where `provider` does not match the linked `project_links.link_type`.

## P46C-013 — Feedback/provider dual specialized provenance is rejected

A Rough Note with `source_feedback_id` must not also receive a provider observation source reference.

## P46C-014 — Duplicate provider observation Capture is idempotent

The same `(project_link_id, provider, source_type, external_source_id)` must not produce multiple provider source records.

Application pre-check handles the common path and a database unique constraint handles concurrent races.

If an existing source row is found, the application must verify its source proof before treating that row as the previously captured verified observation.

## P46C-015 — Duplicate race does not leave a second active Capture

If a newly-created Rough Note loses a concurrent source-reference uniqueness race, the application must archive that newly-created Rough Note instead of leaving an active orphan Capture.

## P46C-016 — AI failure preserves selected evidence

After Rough Note + verified source provenance are successfully created, an AI generation failure must keep both records intact for later Review retry.

## P46C-017 — Verified provider-origin retry stays evidence-mode

When AI structuring is retried for a Rough Note with a GitHub `capture_source_refs` row, the retry path must verify the stored source proof before using evidence structuring rather than ordinary decision-worthiness triage.

A missing/invalid proof must not be promoted to verified provider evidence based on Rough Note text or row existence alone.

## P46C-018 — Decision identity remains BuildMap-owned

Conversion from AI Draft to Change Card continues to use the existing BuildMap conversion path.

No GitHub source ID is copied into `projects.id` or `change_cards.id`, and no GitHub object becomes an official Decision automatically.

## P46C-019 — Decision provenance follows rough_note_id and verified source proof

For an approved Decision originating from GitHub evidence, the Builder-only Evidence surface must be able to follow:

```text
Change Card
→ rough_note_id
→ capture_source_refs
→ source_proof verification
→ project_link
→ canonical provider source
```

No title/body/AI inference may be used to reconstruct this link.

A source row whose proof cannot be verified must be surfaced as an integrity problem rather than rendered as verified GitHub provenance.

## P46C-020 — Archived repository pointer does not erase history

If the GitHub Project Link is later archived, historical verified provider provenance must remain stored and the Evidence surface may read the archived link record for Builder-only traceability.

## P46C-021 — No public raw provider provenance

`capture_source_refs` must not receive an anonymous/public-safe view or public grant in Phase 46.

Scout/Public Project Map must not expose raw GitHub PR/Release provenance or source-proof state.

## P46C-022 — No background synchronization expansion

Phase 46 must not add webhook, polling, cron, continuous background sync, or persistent GitHub observation queues.

## P46C-023 — No automatic Decision candidate expansion

Phase 46 must not automatically Capture every observed provider event and must not automatically approve or publish any Change Card.

## P46C-024 — Migration contract

Migration 18 must be additive, preserve historical migrations 00–17, match the repository migration naming/sequence contract, and pass Database Contract Gate on the exact PR head.

## P46C-025 — Exact-head application validation

The final PR head must pass Web App CI exact-SHA checkout, dependency install, lint, typecheck, and production build before merge.

## P46C-026 — No live environment claim from repository gates

Repository CI success must not be described as proof that migration 18 or GitHub App environment configuration is active in a live BuildMap database/deployment.

## P46C-027 — PIE boundary unchanged

Phase 46 must not add PIE auth/API/SDK/webhook/polling/evidence ingestion or Factory Intelligence behavior.

GitHub provider provenance remains a BuildMap intake concern only.
