# Phase 47 — Notion Integration Foundation Regression Contracts

## Purpose

These contracts define the repository/application expectations for the Phase 47 Notion pointer and architecture foundation.

They are not claims that Notion OAuth/read access is live.

---

## P47C-001 — Existing schema is reused

Phase 47 must use existing `project_links.link_type = notion`.

No migration is required merely to create a Notion resource pointer.

## P47C-002 — Project association is explicit and bounded

The Builder must explicitly submit a Notion page/database URL for the current BuildMap Project.

Phase 47 must not associate an entire Notion workspace automatically.

## P47C-003 — Official Notion resource host only

Accepted pointer input must use HTTPS and an official `notion.so` / `www.notion.so` host.

Lookalike hosts, HTTP URLs, credentials, and explicit ports must be rejected.

## P47C-004 — Stable UUID is required

Accepted Notion URLs must expose a 32-hex resource UUID at the end of the resource path, with or without standard UUID hyphens.

Human-readable unique-ID shortcuts without a resource UUID are not Phase 47 resource identity.

## P47C-005 — Canonical pointer strips view/navigation state

Stored pointer identity must normalize to:

```text
https://www.notion.so/{32-character-resource-id}
```

Database view query parameters, unrelated query parameters, fragments, title slugs, and workspace path decoration must not become Project resource identity.

## P47C-006 — URL alone does not assert Notion object type

Phase 47 must not persist or display a page/database/data-source classification derived only from the pasted URL.

Exact object type requires a later authenticated provider read.

## P47C-007 — Duplicate canonical pointer is idempotent

Re-adding the same active canonical Notion resource to the same Project must update the existing label/visibility rather than create an additional active pointer in the ordinary application path.

## P47C-008 — Builder ownership is required

Notion pointer create/update/remove actions must operate only after authenticated Builder context and current Project ownership are verified through the existing application/RLS boundary.

## P47C-009 — Default visibility is internal

A newly submitted Notion resource defaults to `internal` unless the Builder explicitly selects public visibility.

## P47C-010 — Public pointer requires existing public-safe authority

Scout rendering must source Notion links only from `public_project_links`.

The raw `project_links` table must not be queried by the public route.

## P47C-011 — Public read-side validates canonical Notion URL

Even after `public_project_links` returns a `link_type = notion` row, Scout rendering must reject non-canonical Notion resource URLs.

## P47C-012 — Public pointer is not public-content assertion

Displaying a public Notion pointer must not claim that the Notion resource itself is publicly readable or that BuildMap has authenticated access to its contents.

## P47C-013 — Pointer removal archives association

Removing a Notion pointer must archive the active Project Link and reset its visibility to internal rather than physically deleting history.

If a later/experimental active `integration_bindings` row for provider `notion` exists on that pointer, pointer removal must disconnect/archive that binding before the pointer is archived.

## P47C-014 — GitHub behavior is preserved

Phase 47 must not weaken GitHub repository URL validation, GitHub binding proof verification, GitHub read authorization, explicit GitHub Capture, or GitHub Evidence provenance.

## P47C-015 — No OAuth runtime in Phase 47

Phase 47 must not add:

- Notion authorization redirect,
- OAuth callback,
- authorization-code exchange,
- refresh-token exchange,
- Notion API authenticated read route.

## P47C-016 — No token storage in existing provider-neutral tables

No Notion access token or refresh token may be stored in:

- `project_links`,
- `integration_bindings`,
- `capture_source_refs`.

## P47C-017 — `integration_bindings` remains association metadata

Phase 47 must preserve Migration 17's no-provider-credential contract.

Future Notion binding metadata may reuse that table only after a separate credential-lifecycle design exists.

## P47C-018 — No environment secret expansion

Phase 47 must not add Notion client secret, access token, refresh token, or encryption key environment variables because no Notion OAuth runtime is implemented yet.

## P47C-019 — No provider observation persistence

Adding a Notion pointer must not create Rough Notes, AI Drafts, Change Cards, `capture_source_refs`, or provider observation/event rows.

## P47C-020 — No automatic Decision behavior

A Notion pointer must never automatically create, approve, publish, or alter a BuildMap Decision or Current Direction.

## P47C-021 — No workspace mirror

Phase 47 must not add workspace-wide search/indexing, page mirroring, block mirroring, polling, webhook ingestion, cron, or background synchronization.

## P47C-022 — Current-state terminology only

Future-facing Phase 47 documentation may describe page `last_edited_time` and current page/content reads as candidate knowledge signals.

It must not call the audited public Notion API an authoritative revision-history feed.

## P47C-023 — Database/data-source distinction is preserved

Documentation must recognize that current Notion databases are containers that may hold one or more data sources.

A Project-level database pointer must not be silently rewritten into one child data-source identity during Phase 47.

## P47C-024 — Read capability planning remains least privilege

The planned future public Notion connection should begin from read-only content requirements.

Phase 47 does not authorize insert/update content capabilities.

## P47C-025 — Provider failure isolation is preserved

Because Phase 47 pointer behavior has no Notion API dependency, Notion provider availability cannot block ordinary BuildMap Capture, Review, Decision, Feedback, GitHub, or public Decision reads.

## P47C-026 — No public provider internals

Phase 47 must not expose future Notion workspace IDs, bot IDs, OAuth tokens, refresh tokens, integration binding state, provider source proofs, or raw content through Scout/public views.

## P47C-027 — PIE boundary unchanged

Phase 47 must not add PIE runtime/schema/auth/API/webhook/polling/evidence ingestion or Factory Intelligence behavior.

## P47C-028 — Production remains out of scope

Merge to `main` is repository work only and must not be described as production deployment.

## P47C-029 — Application validation

The final implementation PR head must pass Web App CI exact-SHA checkout, dependency install, lint, typecheck, and production build before merge.

## P47C-030 — Database gate expectation

Because Phase 47 adds no migration, Database Contract Gate is not expected to run from a docs/application-only diff unless repository workflow path rules independently trigger it.

No live database state may be inferred from Phase 47 CI.
