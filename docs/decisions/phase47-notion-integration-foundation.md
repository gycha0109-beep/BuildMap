# Phase 47 — Notion Integration Foundation

## Status

`IMPLEMENTATION + ARCHITECTURE FOUNDATION`

Phase 47 establishes the first bounded Notion integration surface without implementing Notion OAuth/read runtime or introducing a credential vault.

The phase is audit-first and preserves the BuildMap authority model:

```text
Notion = Knowledge Context
BuildMap = Decision History
```

A Notion object never becomes a BuildMap Project or Decision identity merely because it is linked.

---

## 1. Starting repository authority

Starting main for Phase 47 work:

`7f6f255a23ca056b95e4fab335b9aec814511062`

Starting tree:

`5c062f3d1305941c6bede1935a40cd14f90814fc`

The tree is identical to the Phase 46 closeout tree. Two accidental no-op history commits occurred before the Phase 47 branch was created: an empty `__noop__` file was added and immediately removed. They changed commit history only; the restored main tree is byte-for-byte the prior authoritative tree.

Phase 47 branch:

`agent/phase47-notion-integration-foundation`

---

## 2. External Notion API facts audited

Audit date: `2026-08-19`

Primary authority: official Notion developer documentation.

Current public API version observed during the audit:

`2026-03-11`

Relevant facts:

1. Public Notion connections use OAuth 2.0.
2. The standard public authorization flow includes a page picker where the user selects pages/databases that the connection may access.
3. OAuth token exchange returns an `access_token` and `refresh_token` plus workspace/bot/user information.
4. Notion explicitly requires the connection to store both tokens for future requests.
5. Refreshing a token returns a new access token and a new refresh token.
6. Read operations require the connection's `read content` capability and access to the target content.
7. As of API versions after `2025-09-03`, a Notion database is a container that may contain one or more data sources.
8. Notion page/database URLs expose the page/database UUID, but a pasted URL alone is not an authenticated statement that BuildMap can read that resource or that the object is a page versus database.
9. The API can retrieve current page metadata, including `last_edited_time`, and can retrieve current page content as enhanced Markdown.

Important inference from the documented API surface:

BuildMap must not describe the current Notion REST API as a provider revision-history feed. The audited API exposes current object metadata/content; Phase 47 found no public revision-history endpoint suitable for reconstructing historical Notion edits.

Therefore future Notion observations must be framed as current knowledge objects / recently edited current state, not as an authoritative edit-history mirror.

---

## 3. Resource association decision

### Decision

A BuildMap Project may associate with an explicit Notion **page or database root pointer**.

Do not associate a Project with an entire Notion workspace by default.

Do not require a data-source pointer as the initial user-facing Project association.

### Why

A Project should receive bounded external context, not implicit access to every knowledge object visible to a user.

The Notion public OAuth picker already centers explicit page/database selection. The Project association should follow the same least-context principle.

Database/data-source distinction is handled later at authenticated read time:

```text
Notion database pointer
→ authenticated retrieve database
→ discover child data_sources if needed
```

A data source remains a Notion structured-content identity; it does not replace the Project-level page/database root association.

---

## 4. Pointer implementation

Existing schema already supports:

```text
project_links.link_type = notion
```

Phase 47 therefore adds no migration.

New Builder behavior:

- add Notion page/database URL,
- canonicalize official `notion.so` resource links by stable UUID,
- optional display label,
- default `internal` visibility,
- explicit `public` pointer selection,
- toggle visibility,
- archive/remove pointer.

Canonical stored form:

```text
https://www.notion.so/{32-character-resource-id}
```

Accepted input remains intentionally narrow:

- HTTPS only,
- `notion.so` / `www.notion.so`,
- URL must end in a 32-hex resource UUID, with or without UUID hyphens,
- credentials/ports rejected,
- view/query/hash state is not preserved as resource identity.

Unique-ID shortcut URLs such as human-readable database row IDs are not accepted in Phase 47 because they do not directly expose the stable UUID needed for later exact resource verification.

---

## 5. Public pointer boundary

Existing `public_project_links` remains public authority.

Phase 47 does not create a new public view.

Builder may explicitly mark a Notion pointer public. Scout rendering then additionally requires:

- `link_type = notion`,
- row already eligible through `public_project_links`,
- canonical Notion resource URL validation in the application read-side.

Public rendering label:

`Knowledge context → Notion resources`

A public pointer means only:

> Builder chose to expose this external link on the Public Project Map.

It does not mean:

- the Notion page itself is publicly readable,
- BuildMap has authenticated Notion read access,
- BuildMap copied the Notion content,
- Notion approved or authored a BuildMap Decision.

---

## 6. OAuth architecture decision

### Selected future model

For a multi-user BuildMap product, use a **Notion public connection OAuth flow** rather than:

- a BuildMap-wide internal connection token,
- user-pasted static integration tokens,
- personal access tokens as the primary product model.

Initial connection capability should be limited to what future read behavior actually requires, with `read content` as the expected baseline.

No Notion insert/update capability is authorized by Phase 47.

### Phase 47 runtime boundary

Notion OAuth is **not implemented yet**.

No new environment variables are added in this phase.

No Notion access token or refresh token is stored.

---

## 7. Why `integration_bindings` is not a credential vault

Migration 17 intentionally defines `integration_bindings` as provider-neutral association metadata and explicitly excludes provider access/OAuth tokens.

That contract remains valid.

Future Notion OAuth may reuse `integration_bindings` for normalized association facts such as:

- provider = notion,
- workspace/bot connection identity,
- selected Project Link,
- exact external resource identity/label,
- connection status,
- server integrity proof.

But OAuth credentials must not be added to `integration_bindings` merely because Notion requires persistent tokens.

A later phase must design an explicit server-only credential-storage boundary before Notion OAuth runtime is authorized.

Required credential properties include:

- no browser-readable plaintext token,
- no token in `project_links`,
- no token in `integration_bindings`,
- no token in `capture_source_refs`,
- encrypted/sealed storage if persisted in the BuildMap database,
- refresh-token rotation handled atomically,
- provider disconnect/revocation handling,
- Builder/project authorization separated from provider token possession.

Phase 47 does not speculate the final vault schema.

---

## 8. Initial knowledge signal strategy

Notion must not become a workspace mirror.

Future first read should be Builder-triggered and bounded to explicitly linked/authorized resources.

Potential read primitives supported by the current Notion API include:

- exact page/database metadata,
- page `last_edited_time`,
- current page title/properties,
- current page Markdown/content,
- database child data-source discovery,
- data-source rows when explicitly required.

Phase 47 does not authorize:

- workspace-wide persistent indexing,
- mirroring every authorized page,
- polling all content,
- webhook ingestion,
- background synchronization,
- raw page/block payload persistence,
- AI scanning of the entire workspace.

The first useful product question is not "what exists in this workspace?" but:

> What explicitly linked knowledge object is relevant enough for the Builder to bring into the Decision workflow?

---

## 9. Capture boundary

Phase 47 does not yet create Notion observations or Notion-origin Rough Notes.

Future intended flow remains:

```text
Authorized Notion resource read
→ bounded normalized observation
→ Builder explicitly selects Capture as evidence
→ server exact-re-reads source
→ private Rough Note
→ explicit provider provenance
→ AI evidence structuring
→ Builder Review
→ Builder-approved Decision
```

Never:

```text
Notion page/database
→ automatic approved Decision
```

---

## 10. `capture_source_refs` reuse decision

Migration 18 is sufficiently provider-neutral for future normalized Notion provenance at the data-shape level:

- Project Link
- provider
- source type
- external source ID
- canonical URL
- title/context
- occurred/observed time
- source proof

No schema change is authorized in Phase 47.

However the current source-proof implementation is GitHub-specific application logic. Future Notion Capture must add a provider-appropriate server proof path and must not treat arbitrary owner-inserted source rows as verified provenance.

The same invariant remains:

```text
owner-readable source row
!= provider-verified source provenance
```

---

## 11. Failure isolation

Notion remains optional to BuildMap core operation.

Future Notion auth/read failure must not break:

- ordinary Capture,
- Feedback evidence Capture,
- GitHub integration,
- Review,
- Decision approval,
- Current Direction,
- Public Project Map.

Phase 47 pointer operations themselves contain no Notion API dependency.

---

## 12. PIE boundary

Unchanged.

Phase 47 adds no:

- PIE IDs,
- PIE auth/API/SDK,
- PIE Evidence ingestion,
- PIE webhook/polling,
- Factory Intelligence,
- cross-project intelligence.

`project_links`, future Notion `integration_bindings`, and future Notion `capture_source_refs` remain BuildMap intake/integration records rather than PIE authority.

---

## 13. Phase 47 implementation scope

Repository changes authorized:

1. Notion resource URL normalization boundary.
2. Builder Notion page/database pointer add/list/visibility/remove UI.
3. Public Project Map rendering of explicitly public canonical Notion pointers.
4. Decision documentation.
5. Access/regression contract documentation.

Not authorized:

- migration 19,
- Notion OAuth callback,
- token exchange,
- token storage,
- Notion API read runtime,
- Notion observation normalization,
- Notion Capture,
- Notion source provenance rows,
- webhook/polling/background sync,
- production deployment.

---

## 14. Next bounded phase

Recommended next phase:

**Phase 48 — Notion OAuth Credential & Read Bootstrap**

It must begin by solving the server-only credential lifecycle before implementing provider reads.

Required questions:

1. exact encrypted/sealed credential persistence model,
2. token read/write authority from Next.js server code,
3. refresh-token rotation and concurrent refresh behavior,
4. OAuth state / CSRF protection,
5. exact linked resource verification after page-picker authorization,
6. workspace/bot/resource association in `integration_bindings`,
7. first bounded on-demand Notion read shape,
8. explicit disconnect/revocation behavior,
9. no provider failure impact on BuildMap core.
