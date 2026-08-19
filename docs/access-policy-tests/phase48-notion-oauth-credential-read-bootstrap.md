# Phase 48 — Notion OAuth Credential & Read Bootstrap Regression Contracts

## Purpose

These contracts define the security, authority, persistence, and bounded-read expectations for Phase 48.

They are repository/application contracts. They are not evidence that migration 19 is applied to a live database, that a Notion public connection is registered, that secrets are configured, or that a production OAuth round trip has succeeded.

## P48C-001 — Pointer remains separate from authorization

`project_links.link_type = notion` remains the Project Knowledge Context pointer. Adding a pointer alone must not imply authenticated API access.

## P48C-002 — Existing provider-neutral tables remain credential-free

No Notion access token, refresh token, OAuth code, client secret, or token ciphertext may be stored in `project_links`, `integration_bindings`, or `capture_source_refs`.

## P48C-003 — Credential identity is provider authorization identity

`private.notion_oauth_credentials.bot_id` is the primary key for the Notion OAuth credential lifecycle.

The credential must not be keyed only by `workspace_id`, authorizing user ID, or BuildMap Project Link.

## P48C-004 — Project association is separate from credential identity

`integration_bindings.external_connection_id` references the Notion `bot_id` authorization identity while `project_link_id` and `external_resource_id` define the BuildMap Project ↔ exact provider resource association.

## P48C-005 — Credential storage is Notion-specific and private

Persistent Notion OAuth credential state lives only in `private.notion_oauth_credentials` for Phase 48.

`anon` and `authenticated` must not have direct schema/table privileges that permit credential-table reads or writes.

## P48C-006 — No plaintext token persistence

The application must seal access and refresh tokens before invoking persistence RPCs. Postgres stores only AES-256-GCM envelopes.

Migration 19 must reject values that do not match the sealed envelope shape.

## P48C-007 — Encryption is authenticated and authorization-bound

Credential sealing must use authenticated encryption with a fresh nonce and AAD that binds ciphertext to the exact Notion `bot_id`, token kind, and key version.

HMAC proof is not token encryption.

## P48C-008 — Encryption key is server-only

`NOTION_CREDENTIAL_ENCRYPTION_KEY` must not use `NEXT_PUBLIC_*`, browser storage, URL parameters, provider binding metadata, or database plaintext storage.

## P48C-009 — OAuth state key is distinct from encryption key

OAuth state/binding integrity uses `NOTION_OAUTH_STATE_SECRET`. Token confidentiality uses `NOTION_CREDENTIAL_ENCRYPTION_KEY`. These roles must not be collapsed.

## P48C-010 — OAuth state is signed and time-bounded

State must bind `provider=notion`, Project ID, Project Link ID, initiating BuildMap user ID, fixed continuation path, random nonce, and expiry.

Unsigned browser state or a DB row alone must not authorize callback binding.

## P48C-011 — Callback revalidates current BuildMap authority

Before any provider credential is persisted, callback processing must verify:

- valid/active signed state;
- current authenticated user;
- initiating user equality;
- current Project ownership;
- exact active Notion Project Link identity;
- canonical stored Notion pointer.

## P48C-012 — Authorization code exchange is server-only

Authorization code exchange must occur only in the server callback with server-only Notion client credentials.

Token responses must never be returned to the browser.

## P48C-013 — OAuth success is not resource verification

A successful token exchange alone must not create an active Project binding.

The exact canonical Project Link UUID must be retrieved from Notion using the exchanged token.

## P48C-014 — URL does not determine object type

The application must not infer `page`, `database`, or `data_source` from the Notion URL.

Object type must come from an authenticated exact-ID provider read.

## P48C-015 — Phase 48 Project roots are page or database only

A provider-verified `page` or `database` may become the Project association. A raw `data_source` pointer must be rejected rather than silently promoted to a database root.

## P48C-016 — Database remains the Project root

For a database pointer, `integration_bindings.external_resource_id` remains the database ID. Child data-source IDs may appear only in bounded preview metadata and must not replace Project association identity.

## P48C-017 — Notion binding semantics are explicit

For provider `notion`:

- `external_connection_id` = `bot_id`;
- `external_account_id` = `workspace_id`;
- `external_account_label` = bounded workspace display label;
- `external_resource_id` = exact verified page/database ID;
- `external_resource_type` = verified `page` or `database`;
- `external_resource_label` = bounded provider title;
- `binding_proof` = Notion-specific integrity proof over Project Link + bot + workspace + resource + type.

## P48C-018 — Binding save and credential save are atomic

The callback must use a single database RPC transaction to persist/update the sealed Notion bot authorization and corresponding active `integration_bindings` metadata.

## P48C-019 — Existing bot authorization cannot be taken over by another Builder

If a `bot_id` credential already exists for another Builder profile, the save RPC must reject an attempted overwrite.

## P48C-020 — Authenticated clients cannot obtain usable credentials

An authenticated owner may receive sealed ciphertext through an owner-checked RPC because the current server uses the same authenticated session, but must not receive provider-usable plaintext without the server encryption key.

Credential RPCs must additionally prove that the credential's Builder profile belongs to the current `auth.uid()`; forging or guessing a foreign `bot_id` in an owned binding must not cross this boundary.

## P48C-021 — Refresh is bot-level single-writer

A refresh attempt must claim a short-lived database lease on the Notion `bot_id` credential before sending the rotating refresh token to Notion.

Two concurrent reads, including reads through different Project Links sharing one bot authorization, must not both persist independently rotated refresh tokens.

## P48C-022 — Refresh completion is compare-and-swap

New access and refresh token ciphertext may replace old ciphertext only when:

- the requesting Project Link is still actively bound to the same bot;
- refresh lease still matches and has not expired;
- observed `credential_version` still matches.

Reconnect/disconnect during refresh must invalidate a late completion.

## P48C-023 — Both rotated tokens replace atomically

A successful refresh must persist the new access token and new refresh token in one atomic update. Updating only one token is forbidden.

## P48C-024 — Refresh does not assume undocumented TTL

Phase 48 must not invent an access-token expiration interval or `expires_in` value that is not in the audited public OAuth contract.

The runtime refresh trigger is a provider `401` only.

## P48C-025 — Refresh identity is stable

A refresh response whose `bot_id` or `workspace_id` differs from the claimed authorization must not be persisted as a transparent rotation.

## P48C-026 — Refresh invalid-token responses require reconnect

A refresh `400`, `401`, or `403` must terminate the refresh lease and return a bounded reconnect requirement rather than looping or treating stale refresh credentials as usable.

## P48C-027 — Reconnect cleans an unreferenced old credential

When a Project Link reconnects to a different `bot_id`, the old credential must be locally disconnected only if no other active binding owned by that Builder references it.

The callback may best-effort revoke the old provider token only after the new credential+binding transaction succeeds.

## P48C-028 — Disconnect is binding-aware

The explicit Builder disconnect action must detach the selected Project Link binding first.

If other active bindings owned by the same Builder still reference that `bot_id`, the shared credential remains active and must not be revoked.

## P48C-029 — Last disconnect disables local credential immediately

When the last active binding to a bot authorization is removed, the local transaction must null both stored ciphertext fields, increment credential version, clear the refresh lease, and mark the credential disconnected before relying on provider revocation.

## P48C-030 — Provider revoke is last-reference only

Only when local disconnect establishes that the selected binding was the last reference may the server call Notion's official revoke endpoint for that authorization.

A failed provider revoke must not restore local credential usability.

## P48C-031 — Pointer removal and OAuth disconnect remain distinct

Pointer visibility/removal remains a Project Knowledge Context concern. Provider authorization remains a read-access concern.

A Notion pointer with an active read binding must not be archived directly; the Builder must disconnect read access first so credential lifecycle cleanup is not bypassed.

## P48C-032 — Page read is bounded

A page refresh may retrieve exact page metadata and at most one top-level block-children page with `page_size=20`, then normalize at most 4,000 characters.

No recursive child traversal is allowed in Phase 48.

## P48C-033 — Database read is bounded

A database refresh may retrieve exact database metadata and return at most five child data-source names/IDs from the container response.

It must not query or mirror database rows in Phase 48.

## P48C-034 — No workspace-wide search

OAuth authorization must not trigger Notion workspace search, workspace crawling, recursive mirrors, polling, or background synchronization.

## P48C-035 — Read preview is ephemeral

A Notion refresh response must use `Cache-Control: no-store` and remain client-state-only.

Raw Notion payloads or normalized previews must not be persisted by Phase 48.

## P48C-036 — Refresh does not create Capture

Notion Refresh must not create Rough Notes, AI Drafts, Change Cards, `capture_source_refs`, or any other Capture provenance row.

## P48C-037 — Provider observation is not Decision authority

Notion current-state content must never automatically create, approve, publish, or alter a Decision or Current Direction.

## P48C-038 — Public views remain pointer-only

The Scout/public route must continue to use `public_project_links` and must not expose Notion credentials, ciphertext, OAuth state, workspace/bot IDs, `integration_bindings`, authenticated content, read preview, or provider errors.

## P48C-039 — Public pointer is not content-public assertion

A Builder-selected public Notion pointer must not be interpreted as proof that the Notion page/database content is publicly readable.

## P48C-040 — Provider failures are isolated

Notion 401/403/404/409/429/5xx/timeout/revocation failures must not mutate Project, Decision, Current Direction, publication, Feedback, Outcome, GitHub integration, or ordinary Capture state.

Only controlled Notion authorization/binding lifecycle metadata may change during connect/refresh/disconnect.

## P48C-041 — 429 is bounded

A Notion `429` must not start an unbounded retry loop. A normalized Retry-After value may be surfaced to the Builder.

## P48C-042 — GitHub security remains unchanged

Phase 48 must not weaken GitHub canonical repository validation, signed state/cookie handling, binding proof checks, repository-scoped read, explicit GitHub Capture, or GitHub provenance.

## P48C-043 — No service-role expansion

Phase 48 must not add a service-role runtime merely for Notion convenience. The chosen private-schema + owner-checked SECURITY DEFINER RPC boundary is the least-privilege repository contract.

## P48C-044 — Migration history remains additive

Migrations 00-18 remain unchanged. Phase 48 schema work is migration sequence 19 only and must satisfy the additive filename/sequence gate.

## P48C-045 — Environment secrets are server-only

Notion client secret, state secret, and encryption key must not be committed with values and must not be `NEXT_PUBLIC_*`.

## P48C-046 — No Notion writes

Phase 48 must not insert, update, archive/trash, or otherwise mutate Notion content.

## P48C-047 — No revision-history fabrication

Current page/database metadata and current top-level page content are current-state signals only. They must not be described as a Notion revision-history feed.

## P48C-048 — PIE boundary unchanged

Phase 48 must not add PIE auth, IDs, APIs, SDKs, evidence ingestion, runtime coupling, or Factory Intelligence behavior.

## P48C-049 — Production remains out of scope

Merge to `main` is repository work only. It must not be described as live database migration, Notion public connection registration, secret configuration, production deployment, or live OAuth verification.

## P48C-050 — Exact-head application validation

The final implementation PR head must pass Web App CI using exact event SHA checkout, Node 22, dependency install, lint, typecheck, and production build.

## P48C-051 — Exact-head database validation

Because migration 19 exists, the same final implementation PR head must pass Database Contract Gate with exact SHA verification, historical migration integrity, additive migration contract, and no remote DB mutation.

## P48C-052 — Merge only the final tested implementation head

Any change to the PR head after successful CI invalidates that evidence. The final tested head must be the implementation head merged by squash.

The tested implementation tree must equal the merged implementation tree before any optional docs-only handoff closeout changes main again.
