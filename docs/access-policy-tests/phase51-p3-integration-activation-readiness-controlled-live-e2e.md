# Phase 51 — P3 Integration Activation Readiness & Controlled Live E2E Access Contract

## Purpose

Freeze the access, provenance, isolation, and authority conditions proven during the controlled hosted GitHub + Notion E2E.

This document is a regression contract. It does not grant new provider authority.

## Environment boundary

Phase 51 validation used the configured Vercel Preview branch and hosted Supabase target.

Required invariant:

```text
Preview validation success != production deployment authority
```

Repository Git deployment lock must be restored after controlled Preview validation.

## Migration authority tests

### P51-DB-01 — Provider migration history exists

Hosted migration history must contain migrations 17, 18, 19, and 20.

Expected:

```text
17 integration_bindings          APPLIED
18 capture_source_refs           APPLIED
19 notion_oauth_credentials      APPLIED
20 capture_observation_keys      APPLIED
```

### P51-DB-02 — No Phase 51 schema widening

Expected:

- no new migration;
- no edit of migrations 00–20;
- no provider raw-payload/event-ledger table;
- no provider credential material in `project_links`, `integration_bindings`, or `capture_source_refs`.

## GitHub connection tests

### P51-GH-01 — Pointer is not authorization

Saving a GitHub repository pointer alone must not create an active integration binding.

### P51-GH-02 — Exact installation/repository verification

A connection is valid only after:

- authenticated BuildMap Project ownership check;
- GitHub user OAuth verification;
- installation belongs to the configured GitHub App;
- exact repository is present in that installation;
- stored binding proof matches Project Link + installation + repository identity.

### P51-GH-03 — Provider read is bounded and read-only

Expected provider permissions remain:

```text
Contents: read
Pull requests: read
Metadata: implicit/read
```

No provider write permission is required.

### P51-GH-04 — Refresh is ephemeral

`Refresh GitHub activity` may show bounded merged PR / Release observations.

It must not create:

- Rough Note;
- Capture provenance;
- Change Card;
- approved Decision.

### P51-GH-05 — Explicit Capture re-verifies source

`Capture as evidence` must cause a server-side exact provider re-read before persistence.

Successful result:

- one private Rough Note;
- one immutable GitHub `capture_source_refs` row;
- evidence-mode AI draft may be generated;
- no automatic approved Decision.

### P51-GH-06 — Disconnect isolation

After read disconnect:

- active binding disappears;
- disconnected binding history remains;
- Project Link remains;
- historical GitHub Capture/provenance remains;
- Notion state is unchanged;
- no existing Decision is mutated.

### P51-GH-07 — Existing installation reconnect

If the latest disconnected binding has a valid proof and the old installation can still mint a repository-scoped token for the exact stored repository, reconnect must skip forced new installation and proceed to user OAuth.

If either proof verification or live installation verification fails, reconnect must fall back to the fresh-install path.

Stored installation identity alone is insufficient authority.

### P51-GH-08 — Reconnect does not duplicate Capture

Reconnect must create/recover only connection authority. It must not generate a provider observation Capture.

## Notion connection tests

### P51-NO-01 — Current copied-link compatibility

The resource parser must accept current Notion copied links including:

```text
https://app.notion.com/p/<resource-id>...
```

The stored pointer may be canonicalized, but exact resource UUID identity must remain unchanged.

### P51-NO-02 — Private resource does not require web publication

A Notion page/database may remain private in the Notion workspace.

BuildMap read authority comes from Public OAuth resource authorization, not from enabling `Anyone with the link` web publication.

### P51-NO-03 — Token exchange is not sufficient

OAuth code exchange success alone must not create a valid binding.

The exact Project resource must also be verified with the issued access token.

### P51-NO-04 — Page/database endpoint-type miss is not authorization denial

Notion may return `400 validation_error` when a valid database ID is tested against the page endpoint or vice versa.

For this narrow endpoint-type mismatch only, the verifier may continue to the alternate exact-resource endpoint.

It must not downgrade actual 401/403/provider failures into type misses.

### P51-NO-05 — Credential storage remains sealed and private

Active authorization must store access/refresh token material only as application-sealed ciphertext in `private.notion_oauth_credentials`.

Direct browser role access to that credential table remains denied.

### P51-NO-06 — Refresh is bounded and ephemeral

For a database, bounded Preview remains metadata/data-source oriented and must not become row synchronization.

Refresh alone must create no Capture or Decision.

### P51-NO-07 — Explicit current-state Capture

Successful Capture requires:

- signed short-lived Capture selection;
- exact Project/Link ownership;
- exact server-side resource re-read;
- same resource identity/type;
- same bounded observation fingerprint;
- immutable provenance with `observation_key`;
- private Rough Note;
- no automatic approved Decision.

### P51-NO-08 — Disconnect isolation

After Notion read disconnect:

- active Notion binding disappears;
- local credential becomes disconnected and token ciphertext is cleared under the migration 19 lifecycle contract when no active binding remains;
- Project Link remains;
- historical Notion Capture/provenance remains;
- GitHub state is unchanged;
- no existing Decision is mutated.

### P51-NO-09 — Reconnect restores exact resource authority only

Reconnect may reactivate/upsert the same provider bot authorization.

It must re-run OAuth and exact resource verification before an active binding is restored.

Reconnect must not duplicate the existing Notion Capture.

## Cross-provider isolation tests

### P51-XP-01 — Provider disconnect cannot damage the other provider

GitHub disconnect/reconnect must leave Notion binding/Capture unchanged.

Notion disconnect/reconnect must leave GitHub binding/Capture unchanged.

### P51-XP-02 — Provider failures do not mutate unrelated BuildMap core state

Failure before successful Capture persistence must not mutate:

- Project identity/state;
- Problem Definition;
- Hypothesis;
- existing Rough Notes;
- existing Change Cards;
- Current Direction;
- Feedback/Outcome state;
- public publication state;
- other provider bindings.

## Public/private leakage tests

### P51-PUB-01 — Private provider internals never enter public-safe views

Never expose through Scout/Public surfaces:

- `integration_bindings`;
- `capture_source_refs` internals;
- binding/source proofs;
- observation keys;
- GitHub installation IDs;
- Notion bot/workspace authorization identity;
- access/refresh token ciphertext;
- Rough Note bodies;
- AI draft internals;
- provider Capture tokens;
- provider error diagnostics.

### P51-PUB-02 — Public provider link requires explicit BuildMap visibility

Provider OAuth/read authority does not imply that its Project Link is public.

### P51-PUB-03 — Provider Capture does not publish itself

Provider-derived information becomes public only after Builder-approved BuildMap Decision creation and the existing explicit publication/sensitivity boundary.

## Decision authority tests

### P51-AUTH-01 — Refresh cannot create Decision candidate state

Forbidden:

```text
Provider refresh/read → Rough Note or Change Card
```

### P51-AUTH-02 — Capture stops at private provenance + AI candidate

Expected:

```text
Provider observation
→ Builder explicit Capture
→ private provenance
→ AI Candidate / Builder 확인 필요
```

### P51-AUTH-03 — Official Decision requires explicit Builder action

Only:

```text
Builder Review
→ explicit `Decision으로 기록` / approval action
→ official Decision
```

may cross the official Decision boundary.

## Phase 51 observed regression evidence

Controlled live observations demonstrated:

```text
GitHub association/read/Capture                         PASS
Notion association/read/Capture                         PASS
GitHub disconnect isolation                             PASS
GitHub reconnect using existing verified installation  PASS
Notion disconnect isolation                             PASS
Notion reconnect + exact database verification          PASS
GitHub Capture count after reconnect                    unchanged
Notion Capture count after reconnect                    unchanged
Other-provider active binding during each disconnect    preserved
```

## Out of scope

Phase 51 does not authorize:

- production deployment;
- Figma or Slack integration;
- third-provider implementation;
- webhook ingestion;
- polling/cron/background sync;
- provider writes;
- automatic Capture;
- automatic Decision detection/approval;
- PIE runtime;
- Factory Intelligence runtime.
