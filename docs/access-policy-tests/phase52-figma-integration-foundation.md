# Phase 52 — Figma Integration Foundation Access-Policy Matrix

## Purpose

This document freezes the minimum access/authority regression matrix for Figma Design Context.

Phase 52 must preserve:

```text
Pointer
!= Authorization / Credential
!= Verified Binding
!= Observation
!= Capture
!= Decision
```

## 1. Pointer save does not authorize

Setup:

- owned BuildMap Project;
- no Figma binding;
- no Figma credential for the Project Link.

Action:

- save a canonical Figma file/node URL.

Expected:

```text
project_links          +1 or safe update
integration_bindings    0
Figma credential        0
rough_notes             0
capture_source_refs     0
approved Decision       0
```

## 2. Wrong Project / wrong Link fails closed

The Figma pointer/read/capture boundary must require:

- authenticated Builder;
- owned Project;
- exact `project_links.id` under that Project;
- `link_type = figma`;
- active verified binding for the same Link.

A Link from another Project cannot be substituted into OAuth, Refresh, or Capture.

## 3. Exact provider resource verification

OAuth success is insufficient.

Expected successful association:

```text
OAuth token
→ exact file metadata read
→ exact file/branch content read
→ optional exact node read
→ binding proof
→ encrypted credential + active binding
```

Failure to read the exact file/branch/node must not create a binding.

## 4. Browser token exposure is forbidden

Required:

- access/refresh token handled only server-side;
- encrypted before database persistence;
- no `NEXT_PUBLIC_FIGMA_*` credential variables;
- no token fields in preview JSON;
- no direct authenticated/anon privilege on `private.figma_oauth_credentials`.

## 5. Refresh is ephemeral

`GET /api/projects/:projectId/integrations/figma/context?linkId=...`

Expected:

```text
provider read          yes
bounded normalized UI  yes
signed Capture token   yes
Cache-Control no-store yes
rough_notes write      no
capture_source_refs    no
change_cards write     no
approved Decision      no
```

## 6. Refresh → Rough Note = 0

Regression check:

Refresh route must contain no Rough Note insert/update.

Hosted/live E2E must compare counts immediately before/after Refresh when activation becomes available.

## 7. Refresh → Decision = 0

Regression check:

Refresh route has no Change Card/Decision mutation.

Hosted/live E2E must compare approved Decision state before/after Refresh.

## 8. Explicit Capture is the persistence gate

Only `Capture as evidence` may create provider-derived persistence.

Expected flow:

```text
Builder click
→ signed selection verify
→ server provider re-read
→ observation match
→ Rough Note
→ provenance
→ AI Candidate
```

## 9. Capture exact re-read

The Capture action must call the same verified server-side Figma read boundary used by Refresh before any Rough Note persistence.

The browser preview is not trusted as source authority.

## 10. Stale/mismatched source blocks persistence

Capture selection covers:

- Project ID;
- Project Link ID;
- file/branch key;
- verified resource type;
- optional node ID;
- bounded `observation_key`.

Capture must reject if the server re-read differs on any covered identity/hash.

Expected on mismatch:

```text
new rough_notes         0
new capture_source_refs 0
new Decision            0
```

## 11. Duplicate bounded observation

Duplicate key:

```text
project_link_id
+ provider=figma
+ source_type
+ external_source_id
+ observation_key
```

Expected:

- existing provenance integrity proof is re-verified;
- no duplicate Rough Note/provenance created;
- reconnect itself does not alter duplicate counts.

## 12. AI failure recovery semantics

Persistence order:

```text
Rough Note
→ immutable Figma provenance
→ AI draft request/generation
```

If AI fails after provenance was stored:

- Rough Note remains;
- Figma provenance remains;
- AI draft becomes `failed` or draft creation failure is surfaced;
- official Decision remains absent.

This preserves source truth even when AI is unavailable.

## 13. Capture does not automatically decide

Figma Capture code must not:

- insert a Change Card;
- approve a Change Card;
- write official Decision authority.

The next authority remains Builder Review.

## 14. Disconnect preserves historical provenance

Expected after Figma read disconnect:

```text
active Figma binding        0 for the Link
local usable credential     disabled when no sibling binding remains
Figma Project Link          preserved
historical Rough Note       preserved
historical Figma provenance preserved
approved Decision state     unchanged
```

## 15. Reconnect does not duplicate Capture

Reconnect may create a new active binding/credential lifecycle state.

It must not create:

- Rough Note;
- provenance;
- AI draft;
- Decision.

A subsequent Capture of the same bounded observation must resolve to the existing duplicate identity.

## 16. Cross-provider failure isolation

Any Figma OAuth/read/refresh/capture failure must leave unchanged:

- GitHub active/disconnected bindings;
- GitHub historical Capture provenance;
- Notion credential/binding lifecycle;
- Notion historical Capture provenance;
- core approved Decisions.

Phase 52 code must not call GitHub/Notion mutation RPCs/actions.

## 17. Public/private leakage boundary

Public-safe layer:

- Builder-authorized public Project Link label/URL only.

Forbidden public reads/exposure:

- `integration_bindings`;
- `capture_source_refs`;
- `private.figma_oauth_credentials`;
- Figma user authorization ID;
- credential ciphertext;
- binding/source proof;
- observation key;
- bounded private node content;
- raw provider response;
- Rough Note;
- AI draft internals.

Existing public Project Map is constrained to public views and must not query private provider tables.

## OAuth/PKCE policy

Required scopes:

```text
file_metadata:read
file_content:read
```

Required:

- authorization code;
- PKCE S256;
- signed state;
- short-lived HttpOnly verifier session;
- same BuildMap authenticated user on callback;
- exact Project/Link re-check on callback.

Forbidden:

- PAT in browser;
- broad deprecated files scope;
- file version-history scope in Phase 52;
- comments/write scopes;
- webhook scope.

## Credential lifecycle policy

Figma's app/user single-access-token behavior requires serialized refresh.

Required:

- Builder + Figma user credential scope;
- encrypted access/refresh token fields;
- provider expiry metadata;
- refresh lease;
- optimistic credential version;
- safe reload on concurrent rotation;
- credential clearing on final local disconnect.

Known provider boundary:

A single Figma provider user may authorize the same OAuth app in more than one BuildMap account. Figma's one-access-token-per-app/user rule means provider-side reauthorization may invalidate a previously issued access token. BuildMap prevents cross-Builder credential overwrites, but cannot override that provider token rule; stale authorization must fail closed and require reconnect.

## Repository regression gate

`npm run test:phase52` is required in Web App CI before lint/typecheck/build.

The static contract is not a substitute for hosted/provider E2E. It protects architecture ordering and forbidden mutation surfaces.

## Hosted/live activation checklist

When a controlled Figma OAuth app and private file are available, live E2E must record exact before/after counts and identities for:

1. pointer-only state;
2. OAuth exact binding;
3. Refresh with Capture 0 / Decision 0;
4. explicit Capture + provenance;
5. no automatic Decision;
6. duplicate Capture attempt;
7. disconnect preserving provenance;
8. reconnect preserving provenance and duplicate count;
9. GitHub/Notion active state unchanged;
10. public/private boundary unchanged.

Until direct provider evidence exists, these must remain `NOT VERIFIED` rather than inferred from repository code.
