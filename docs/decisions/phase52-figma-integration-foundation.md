# Phase 52 — Figma Integration Foundation

## Status

Phase 52 adds one bounded provider foundation: Figma Design Context.

This Phase does not turn Figma into a synchronization source or Decision authority. It implements the minimum contract required for:

```text
Figma pointer
→ separate OAuth read authorization
→ exact file/branch + optional node verification
→ Builder-triggered bounded Design Context observation
→ ephemeral preview
→ Builder explicit Capture
→ server exact provider re-read
→ immutable private provenance
→ AI Candidate
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Forbidden remains:

```text
Figma Refresh → automatic Capture
Figma Capture → automatic Decision
Provider Observation → automatic Decision
```

## Starting authority

- repository: `gycha0109-beep/BuildMap`
- starting authoritative `main`: `d977d024f1dc6aadb016cf449492637464cf633b`
- starting tree: `8d0eb8ff36a692574051536218287c6aa5706766`
- Phase 51: CLOSED
- migrations 17–20: verified applied on the Phase 51 hosted target
- production deployment: not part of this Phase

The Phase 52 branch was created from the exact starting `main` SHA.

## Product authority

BuildMap V2 remains a Capture-first Decision Journal:

```text
Capture
→ Review
→ Decision
```

Figma is Design Context only. Provider IDs are additive external identity and never replace BuildMap Project ID or Decision identity.

## Official Figma API audit

The Phase 52 contract was derived from current official Figma developer documentation rather than older examples.

### Authentication

Selected authorization model:

- OAuth 2 authorization-code flow;
- PKCE `S256`;
- exact registered redirect URI;
- server-side code exchange;
- server-side access/refresh token storage;
- proactive token refresh before provider expiry.

Personal Access Tokens are not used because BuildMap is a multi-user application acting on behalf of an individual Builder. Plan access tokens are not used because Phase 52 is not organization automation.

Figma currently allows one access token per app/user at a time. BuildMap therefore serializes refresh with a short lease plus monotonically increasing credential version. Local credential rows are additionally scoped by BuildMap Builder profile so two BuildMap accounts cannot overwrite each other's encrypted credential row.

### Scopes

Phase 52 requests only:

```text
file_metadata:read
file_content:read
```

Not requested:

- deprecated broad `files:read`;
- `file_versions:read`;
- project/team listing scope;
- comments/write scopes;
- webhook scopes.

### Resource identity

The minimum BuildMap pointer is:

```text
exact Figma file/branch key
+ optional selected node ID
```

Team and Project are intentionally not pointer authority for this Phase.

The parser accepts current Figma file URL path shapes without hardcoding only one historical file-type segment. It still requires:

- HTTPS;
- `figma.com` / `www.figma.com` host;
- valid file key;
- optional bounded node identity;
- canonical stored URL.

This preserves the Phase 51 lesson: provider URL presentation may evolve while canonical provider identity remains strict.

### File / branch / node semantics

Figma's `GET /v1/files/:key` accepts a file or branch key. When reading a branch with `branch_data=true`, Figma exposes its main file key. BuildMap stores verified resource type as `file` or `branch` in the existing provider-neutral binding.

An optional node pointer is verified by reading that exact node from the exact linked file/branch. Node identity does not independently authorize a different file.

### Version semantics

Figma exposes a provider `version` identity and supports reads of a specific version ID. This is a real provider revision identity, not merely a BuildMap-generated timestamp.

Phase 52 does **not** request version-history listing and does not generalize Figma versions into a universal provider revision model.

Instead, two separate concepts are preserved:

```text
providerVersionId = Figma provider metadata
observation_key   = SHA-256 identity of BuildMap's bounded normalized observation
```

`observation_key` remains the duplicate/staleness identity for the exact bounded context the Builder reviewed.

## Pointer / authorization / binding separation

Existing provider-neutral boundaries remain authoritative:

```text
project_links
= Builder-chosen pointer + visibility

integration_bindings
= private verified Project Link ↔ provider authorization/resource association

capture_source_refs
= private immutable provenance created only by explicit Builder Capture
```

Saving a Figma pointer does not create:

- OAuth credential;
- integration binding;
- observation;
- Capture;
- Decision.

## Why migration 21 is justified

Existing migrations 17, 18, and 20 already support Figma binding/provenance semantics without modification.

The missing contract is OAuth credential persistence. Migration 19 is intentionally Notion-specific and cannot safely store Figma credential lifecycle data.

Figma requires server-side long-lived OAuth material with access-token expiry and refresh-token rotation. Therefore Phase 52 adds exactly one additive migration:

`20260820190000_buildmap_21_figma_oauth_credentials.sql`

Migration 21 adds:

- `private.figma_oauth_credentials`;
- AES-256-GCM ciphertext only, never plaintext token storage;
- BuildMap Builder + Figma user credential scope;
- provider access-token expiry;
- credential version;
- 30-second refresh lease;
- owner-checked SECURITY DEFINER RPCs for save/load/claim/complete/release/disconnect;
- direct browser/private-schema privilege denial.

It does **not** alter migrations 00–20 or add Figma-specific columns to provider-neutral pointer/binding/provenance tables.

## Exact association contract

OAuth success alone is insufficient.

Connection completion requires:

```text
signed BuildMap OAuth state
+ HttpOnly short-lived PKCE session
+ same authenticated BuildMap user
+ owned BuildMap Project
+ exact Figma project_link
+ OAuth token exchange
+ GET exact file metadata
+ bounded exact file/branch read
+ optional exact node verification
+ tamper-evident binding proof
+ encrypted credential persistence
+ active integration_binding
```

Binding proof covers:

- Project Link ID;
- Figma user ID;
- exact file/branch key;
- verified resource type;
- optional node ID.

A stored URL string by itself is never treated as authorization.

## Bounded observation contract

### File-level pointer

BuildMap reads:

- file/branch title;
- editor type when provided;
- provider version ID when provided;
- provider last-modified metadata when provided;
- branch main-file key when applicable;
- depth-1 page/canvas identity/name/type, capped at 30 entries.

### Selected-node pointer

BuildMap additionally reads only the exact selected node with a bounded depth and normalizes:

- node ID/name/type;
- direct child count;
- up to 24 child identity/name/type entries;
- up to 20 bounded text excerpts of at most 160 characters each;
- small layout metadata whitelist.

BuildMap does not persist a raw Figma response or full-file JSON mirror.

## Refresh contract

`Refresh Figma context`:

- is an authenticated server read;
- requires the exact Project + Link + verified binding + sealed credential;
- returns `Cache-Control: no-store`;
- returns a signed, ten-minute Capture selection token;
- does not insert/update `rough_notes`;
- does not insert/update `capture_source_refs`;
- does not create `change_cards`;
- does not create an approved Decision.

## Explicit Capture contract

Builder `Capture as evidence` performs:

1. validate signed Project/Link/file/node/observation selection;
2. authenticate and re-check owned Project;
3. re-read the exact Figma source server-side;
4. recompute the bounded normalized `observation_key`;
5. reject persistence if file/resource type/node/observation hash changed;
6. check duplicate provenance by Project Link + provider + source + `observation_key`;
7. create a private Rough Note;
8. create immutable Figma provenance with tamper-evident source proof;
9. only then create/generate the AI Structured Draft;
10. stop at Builder Review candidate.

If AI generation fails after source persistence, the Rough Note and Figma provenance remain recoverable; the AI draft becomes failed. Provider provenance is not rolled back merely because AI failed.

No code path in the Figma Capture action inserts or approves a Change Card/Decision.

## Duplicate semantics

Duplicate identity is deliberately bounded-observation based:

```text
project_link_id
+ provider = figma
+ source_type
+ external_source_id
+ observation_key
```

For a file-level pointer, `external_source_id` is the exact file/branch key.

For a selected-node pointer, `external_source_id` is the selected node ID; exact file identity remains fixed by the Project Link/binding/source proof.

A duplicate Capture returns the existing verified provenance rather than creating another Capture.

Reconnect alone cannot create a duplicate because OAuth/binding flows never write `capture_source_refs`.

## Disconnect semantics

Disconnect:

- archives the active Figma binding;
- clears local sealed credential material when that Builder has no other active Figma binding for the same provider user;
- preserves Project Link pointer;
- preserves historical Rough Notes;
- preserves historical `capture_source_refs`;
- does not alter GitHub/Notion binding or credential state.

Figma documentation does not provide a Phase 52-required provider revoke operation used by this implementation. Local BuildMap authorization becomes unusable immediately on disconnect; provider-account authorization management remains provider-side.

## Public/private boundary

Private-only:

- access token;
- refresh token;
- encrypted credential ciphertext;
- Figma user authorization identity in binding/credential records;
- binding proof;
- source proof;
- observation key;
- raw provider response;
- bounded private node content;
- Rough Note;
- AI draft internals;
- provider error internals.

A `public` Figma pointer setting is publication authority only for the public-safe Project Link URL/label layer. It does not publish authorization, preview, Capture, or provenance.

The existing public Project Map reads from `public_project_links` and does not query integration bindings, credential tables, or provenance.

## Provider failure isolation

Figma server failures are mapped to Figma-specific read/capture errors. Refresh is read-only and Capture writes only after exact re-verification.

The Figma implementation does not mutate:

- GitHub installation/binding state;
- Notion OAuth/binding state;
- existing provider Captures;
- approved Decision state.

## PIE / Factory boundary

Phase 52 preserves:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

Figma provenance is BuildMap provider provenance, not PIE Evidence authority.

No PIE runtime, Factory Intelligence runtime, generalized provider event ledger, or automatic Decision detection is introduced.

## Repository regression gate

Web App CI runs `npm run test:phase52` before lint/typecheck/build.

The Phase 52 static authority contract asserts at minimum:

- pointer save does not create authorization/binding;
- OAuth scopes remain minimal;
- PKCE S256 remains present;
- provider token config is not `NEXT_PUBLIC_*`;
- Refresh route is no-store and persistence-free;
- Capture exact re-read and stale hash comparison occur before Rough Note persistence;
- provenance precedes AI generation;
- Figma Capture cannot write Change Card/Decision authority;
- private credential boundary exists;
- migrations 17/18/20 are not altered for Figma;
- `apps/web/vercel.json` keeps production deployment disabled;
- public Project Map does not read private integration/credential/provenance tables.

## Activation state

Repository implementation and CI establish the application contract only.

Until the hosted migration is applied and a real Figma OAuth app/file are used:

```text
LIVE_MIGRATION_21 = NOT YET VERIFIED
LIVE_FIGMA_OAUTH = NOT YET VERIFIED
LIVE_FIGMA_EXACT_FILE_READ = NOT YET VERIFIED
LIVE_FIGMA_REFRESH_CAPTURE = NOT YET VERIFIED
PRODUCTION_DEPLOYMENT = NOT PERFORMED
```

These states must be updated only from direct hosted/provider evidence, never inferred from repository merge.
