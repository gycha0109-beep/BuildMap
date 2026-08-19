# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase 31 closure 당시의 historical snapshot으로 유지한다. Phase 47의 상세 판단은 해당 decision/access-policy 문서와 git history에 보존되어 있으며, 이 Active Handoff는 Phase 48 이후 현재 authority와 다음 bounded work를 중심으로 정리한다.

## Current implementation baseline

- repository: `gycha0109-beep/BuildMap`
- Phase 48 starting main: `f1ed6db6e54a346f2c1e663fa073e75c44c8f5c7`
- Phase 48 implementation PR: `#59`
- exact final tested implementation head: `a9c3c7dd5cbc8143aae9a0fd09a81415451fae12`
- exact final tested implementation tree: `0660b356f0687e8cd445207aed7c90e28f9585dd`
- Phase 48 squash merge commit: `befa6bcc9a304fcbeb5deab476142af266dd39dc`
- merged implementation tree: `0660b356f0687e8cd445207aed7c90e28f9585dd`
- implementation state: **Phase 48 — Notion OAuth Credential & Read Bootstrap merged**
- P3 GitHub slice: **STRUCTURALLY CLOSED AT REPOSITORY/APPLICATION-CONTRACT LEVEL**
- P3 Notion state: **POINTER + PUBLIC OAUTH CREDENTIAL LIFECYCLE + EXACT RESOURCE VERIFICATION + BOUNDED EPHEMERAL READ COMPLETE AT REPOSITORY/APPLICATION-CONTRACT LEVEL**
- production deployment: `OUT_OF_SCOPE`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

Implementation tree equality:

```text
CI-TESTED TREE
0660b356f0687e8cd445207aed7c90e28f9585dd

==

MERGED IMPLEMENTATION TREE
0660b356f0687e8cd445207aed7c90e28f9585dd
```

Important activation boundary:

```text
Repository implementation through Phase 48: COMPLETE
Migration 17 live BuildMap DB application: NOT VERIFIED
Migration 18 live BuildMap DB application: NOT VERIFIED
Migration 19 live BuildMap DB application: NOT VERIFIED
Live GitHub App environment configuration: NOT VERIFIED
Live Notion public OAuth integration registration: NOT VERIFIED
Live Notion runtime secret configuration: NOT VERIFIED
Real Notion OAuth round trip / refresh / revoke execution: NOT VERIFIED
Production deployment: NOT PERFORMED
```

Do not infer live provider execution or production activation from repository merge alone.

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
- external provider IDs remain additive identities only.
- public-safe views/RLS/grants remain Scout/public read authority.

Phase 48 sharpens the provider boundary to:

```text
Pointer
!= Credential
!= Observation
!= Capture
!= Decision
```

Notion authorization grants BuildMap permission to read selected knowledge context. It does not grant Notion authority over BuildMap Decisions.

---

# GitHub integration state

The bounded GitHub P3 slice remains structurally closed at repository/application-contract level.

Current flow:

```text
Repository pointer
→ GitHub App installation/read authorization
→ exact repository verification
→ private provider-neutral integration binding
→ Builder-triggered merged PR / Release observation
→ Builder explicitly selects Capture as evidence
→ server exact source re-read
→ private Rough Note
→ capture_source_refs provenance
→ evidence-mode AI structuring
→ Builder Review
→ Builder-approved Decision
→ reverse Evidence trace
```

Authoritative migrations:

- 17: `supabase/migrations/20260819002000_buildmap_17_integration_bindings.sql`
- 18: `supabase/migrations/20260819003000_buildmap_18_capture_source_refs.sql`

Still excluded from the current GitHub slice:

- webhook ingestion
- polling/cron/background sync
- Issues intake
- raw commit-stream ingestion
- automatic Capture
- automatic Decision candidate detection
- GitHub write permissions

Phase 48 does not modify or weaken the GitHub security model.

---

# Notion integration state

## Phase 47 — Pointer foundation

Phase 47 established the Notion Knowledge Context pointer through existing `project_links` without schema expansion.

Canonical pointer behavior remains:

```text
Notion page/database URL
→ stable 32-hex resource UUID extraction
→ https://www.notion.so/{32-character-resource-id}
→ project_links(link_type = notion)
```

The pointer remains independent from provider authorization.

Public behavior remains pointer-only through `public_project_links`. A Builder-selected public Notion pointer does not assert that the Notion content itself is public or that BuildMap can read it.

## Phase 48 — OAuth credential & read bootstrap

Audit date: `2026-08-19`

Audited current Notion API version:

`2026-03-11`

Phase 48 implements the following bounded flow:

```text
existing canonical Notion Project Link
→ Builder starts public OAuth
→ signed + time-bounded BuildMap state
→ server-side authorization-code exchange
→ exact current user / Project / Project Link revalidation
→ exact linked Notion resource authenticated verification
→ Notion bot authorization credential persistence
→ provider-neutral Notion resource binding
→ Builder-triggered bounded authenticated read
→ ephemeral current knowledge preview
```

It stops there.

Never in Phase 48:

```text
Notion observation
→ automatic Capture
→ automatic AI Draft
→ automatic Decision Candidate
→ automatic Decision
```

### Credential identity and storage

Notion OAuth credential lifecycle is represented by a dedicated private model:

`private.notion_oauth_credentials`

Migration 19:

`supabase/migrations/20260819043000_buildmap_19_notion_oauth_credentials.sql`

Credential rows are keyed by Notion `bot_id`, the provider authorization identity returned by OAuth.

Project association remains separate:

```text
private.notion_oauth_credentials.bot_id
        ↓
integration_bindings.external_connection_id
        ↓
BuildMap Project Link ↔ exact verified Notion resource
```

`workspace_id` is metadata and must not be used as credential uniqueness.

Provider tokens remain forbidden from:

- `project_links`
- `integration_bindings`
- `capture_source_refs`

### Credential confidentiality boundary

Phase 48 does not introduce a Supabase service-role runtime.

Instead:

- credential table is in `private` schema;
- direct `anon` / `authenticated` table privileges are denied;
- RLS is enabled with no browser table policy path;
- owner-checked SECURITY DEFINER RPCs provide the minimal server-session access boundary;
- credential ownership is additionally tied to the current BuildMap auth user through Builder profile identity.

Raw access/refresh tokens are sealed in the application server before persistence with:

- AES-256-GCM;
- fresh random nonce per token;
- authenticated tag;
- server-only `NOTION_CREDENTIAL_ENCRYPTION_KEY`;
- AEAD context bound to Notion `bot_id`, token kind, and encryption key version.

Stored token material is ciphertext only.

Current key version:

`1`

The current runtime supports one active encryption key. Future key replacement requires an explicit dual-key/reseal or disconnect/reconnect procedure; blind key replacement would make existing ciphertext intentionally unreadable.

### OAuth state / callback security

Server state binds:

- provider = notion
- BuildMap Project ID
- exact Project Link ID
- initiating BuildMap auth user ID
- fixed continuation path
- random nonce
- ten-minute expiry

State is HMAC-SHA256 signed with independent server-only `NOTION_OAUTH_STATE_SECRET`.

Callback revalidates:

- state signature and expiry
- provider literal
- current authenticated user == initiating user
- current Project ownership
- exact active Project Link identity
- `link_type = notion`
- canonical stored pointer
- exact provider resource access with the exchanged credential

OAuth success alone is not a Project binding.

### Resource verification

The exact UUID already owned by the BuildMap Project Link is provider-verified.

Current accepted Project roots:

- `page`
- `database`

A raw `data_source` pointer is rejected as a Phase 48 Project root. For a database pointer, the database remains the Project association; a child data-source ID is not silently substituted.

`integration_bindings.external_resource_type` was added by migration 19 so authenticated provider type can be persisted without inferring type from URL.

For `provider = notion`:

- `external_connection_id` = Notion `bot_id`
- `external_account_id` = Notion `workspace_id`
- `external_account_label` = bounded workspace label
- `external_resource_id` = exact verified page/database ID
- `external_resource_type` = `page` or `database`
- `external_resource_label` = bounded verified title
- `binding_proof` = Notion-specific HMAC integrity proof over Project Link + bot + workspace + resource + resource type

Token material is never stored in the binding.

### Token refresh / rotation

Notion refresh rotates both access and refresh tokens.

Phase 48 uses a bot-authorization-level single-writer boundary:

```text
provider read returns 401
→ claim 30-second refresh lease on bot credential
→ read credential_version N
→ decrypt current refresh token server-side
→ provider refresh
→ require returned bot_id/workspace_id to remain stable
→ seal new access + new refresh token
→ atomic complete only when:
     active Project Link still binds same bot
     refresh lease matches and is live
     credential_version == N
→ replace both ciphertexts together
→ credential_version = N + 1
→ retry bounded read once
```

Concurrent requests sharing the same bot authorization cannot both persist independently rotated refresh tokens.

A refresh `400/401/403`, changed provider identity, disconnected binding, expired lease, or version conflict fails closed/requires reconnect rather than overwriting newer credential state.

### Disconnect / reconnect

Pointer and OAuth disconnect remain separate.

Explicit **Read access 해제**:

1. detaches the selected Notion binding locally;
2. counts remaining same-Builder active bindings to the same `bot_id`;
3. preserves the shared credential if another binding still uses it;
4. when the last binding is removed, immediately nulls both ciphertext fields, increments version, clears refresh lease, and marks the credential disconnected;
5. only for that final reference does the server best-effort call Notion's revoke endpoint using the plaintext access token held only in server memory.

A provider revoke failure does not restore local credential usability.

Pointer removal is blocked while an active Notion read binding exists. The Builder must disconnect read access first, then may independently remove the Knowledge Context pointer.

Reconnect to a different Notion bot authorization replaces the Project binding transactionally and only disconnects/revokes the old bot credential if no other same-Builder active binding still references it.

### Bounded read shape

Builder-triggered only.

Page:

- exact page metadata;
- one top-level block-children request;
- `page_size = 20`;
- at most 4,000 normalized text characters;
- no nested recursive traversal.

Database:

- exact database container metadata;
- at most five child data-source labels/IDs from the container response;
- no row query;
- no database mirror.

All normalized previews are `Cache-Control: no-store` and client-state-only.

Phase 48 does not persist raw Notion payloads or normalized read previews.

### Failure isolation

Notion provider failure remains optional-provider-local.

It must not mutate:

- Project
- Decision
- Current Direction
- publication
- Feedback
- Outcome
- GitHub integration
- ordinary Capture

Controlled credential/binding lifecycle state may change only during Notion connect/refresh/disconnect operations.

### Public/private boundary

Scout/public continues to receive only Builder-selected Notion pointers through `public_project_links`.

Never expose publicly through Phase 48:

- access token
- refresh token
- ciphertext
- OAuth state
- workspace ID
- bot ID
- authorizer user ID
- `integration_bindings`
- authenticated Notion content
- bounded preview
- provider error/source proof internals

---

## Phase 48 authoritative docs

Decision / architecture:

`docs/decisions/phase48-notion-oauth-credential-read-bootstrap.md`

Regression/security contracts:

`docs/access-policy-tests/phase48-notion-oauth-credential-read-bootstrap.md`

Environment/activation runbook:

`docs/runbooks/phase48-notion-oauth-bootstrap.md`

---

## Database / migration contract

Historical migrations `00–10` remain immutable.

Repository additive migrations now extend through sequence 19:

- 11: app runtime privilege alignment
- 12: least-privilege ACL hardening
- 13: AI draft conversion RPC
- 14: project insert owner-policy alignment
- 15: Rough Note conversion RLS alignment
- 16: External Feedback evidence provenance bridge
- 17: private provider-neutral integration bindings
- 18: private provider-neutral Capture source references
- 19: private Notion OAuth credential lifecycle + verified resource type metadata

Current repository claims:

```text
Migration 17 repository state: PRESENT + CONTRACT-VALID
Migration 18 repository state: PRESENT + CONTRACT-VALID
Migration 19 repository state: PRESENT + CONTRACT-VALID

Migration 17 live target DB state: NOT VERIFIED
Migration 18 live target DB state: NOT VERIFIED
Migration 19 live target DB state: NOT VERIFIED
```

Database Contract Gate validates repository migration contracts only. It does not mutate or inspect a live BuildMap target database.

---

## Phase 48 CI / merge evidence

Implementation PR:

`#59`

Exact final tested head:

`a9c3c7dd5cbc8143aae9a0fd09a81415451fae12`

Exact final tested tree:

`0660b356f0687e8cd445207aed7c90e28f9585dd`

Web App CI #99:

`PASS`

Validated on the exact final implementation head:

- exact event SHA checkout
- Node 22
- dependency install
- lint
- typecheck
- production build

Database Contract Gate #36:

`PASS`

Validated on the same exact final implementation head:

- exact SHA checkout / verification
- historical migration integrity
- additive migration sequence/filename contract
- migration safety boundary
- no remote DB mutation

Squash merge commit:

`befa6bcc9a304fcbeb5deab476142af266dd39dc`

Merged implementation tree:

`0660b356f0687e8cd445207aed7c90e28f9585dd`

Therefore:

```text
CI-TESTED TREE == MERGED IMPLEMENTATION TREE
```

Earlier candidate CI runs generated before the final bot-authorization credential redesign are not closure evidence. Phase 48 closure authority is Web App CI #99 + Database Contract Gate #36 on `a9c3c7dd5cbc8143aae9a0fd09a81415451fae12` only.

---

## Runtime / deployment boundary

Repository merge does not prove operational activation.

Still required before real Notion use in an environment:

1. apply migration 19 through the controlled DB process;
2. register/configure a Notion Public connection;
3. register the exact callback URI;
4. configure server-only:
   - `NOTION_CLIENT_ID`
   - `NOTION_CLIENT_SECRET`
   - `NOTION_OAUTH_STATE_SECRET`
   - `NOTION_CREDENTIAL_ENCRYPTION_KEY`
   - optional `NOTION_REDIRECT_URI`;
5. execute a real OAuth page-picker/code-exchange test;
6. verify exact page/database read against live provider data;
7. verify real refresh-token rotation and revoke behavior;
8. separately authorize any production deployment.

No step above was performed or claimed by Phase 48 repository closure.

`apps/web/vercel.json` still keeps Git deployment disabled.

---

## PIE architecture compatibility boundary

Authoritative decision remains:

`docs/decisions/pie-integration-boundary.md`

Operating stance:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Still required:

- BuildMap Project/Decision IDs remain authoritative.
- provider identities/references remain external/additive.
- `project_links`, `integration_bindings`, and `capture_source_refs` must not become PIE Evidence authority.
- BuildMap must work when PIE is absent/unavailable.
- PIE core remains BuildMap-independent.
- Factory Intelligence remains out of scope.

Phase 48 adds no PIE runtime/schema/API/auth/webhook/polling implementation.

---

## Current roadmap position

Completed at repository/application-contract level:

```text
P0 ✅ Capture / AI triage / Review / Current Direction
P1 ✅ Decision Timeline / Project Map / first Decision activation
P2 ✅ Public Project Map / Scout read / External Feedback / evidence + outcome closure
P3 GitHub integration ✅ bounded end-to-end provider observation → explicit Capture provenance path
P3 Notion Phase 47 ✅ pointer foundation
P3 Notion Phase 48 ✅ OAuth credential lifecycle + exact verification + bounded ephemeral read
```

V2 P3 source order remains:

1. GitHub integration ✅
2. Notion integration — active
3. Figma / Slack intake
4. automatic Decision candidate detection

### Recommended next bounded phase

**Phase 49 — Notion Observation → Explicit Capture Provenance**

Expected authority flow:

```text
verified bounded Notion observation
→ Builder explicitly selects Capture
→ server revalidates exact Notion source under current authorization
→ private Rough Note
→ Notion source provenance in provider-neutral capture_source_refs
→ evidence-mode AI structuring
→ Builder Review
→ Builder-approved Decision
```

Phase 49 must remain explicit-Capture-first.

It must not introduce:

- automatic Capture from Refresh
- workspace-wide crawl/mirror
- background sync/polling
- Notion write permission
- revision-history fabrication
- automatic Decision candidate approval
- automatic Decision/publication/Current Direction mutation
- PIE or Factory Intelligence coupling

Before implementing Phase 49, audit the current `capture_source_refs` proof semantics and decide the minimum Notion-specific source identity/proof tuple from the actual bounded read contract. Do not mechanically reuse GitHub proof semantics where provider identity differs.
