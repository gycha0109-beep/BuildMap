# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 historical snapshot으로 유지한다. 상세 설계 근거는 각 Phase decision/access-policy 문서와 git history에 보존한다.

---

## Current implementation baseline

- repository: `gycha0109-beep/BuildMap`
- Phase 50 starting main: `e6a0e426ec9f9f4e2780a87e88e385a8fa1562d6`
- Phase 50 implementation PR: `#63`
- exact final tested implementation head: `b3f877a2a3cddcc82110bf914a1525e5cd677a46`
- exact final tested implementation tree: `cb1010d16cf86bf3e72f9e8172809ef3097c08b9`
- Web App CI: `#106 PASS`
- Phase 50 squash merge commit: `f5444b1c5b014673022eb9063fabd30a88498e7b`
- merged implementation tree: `cb1010d16cf86bf3e72f9e8172809ef3097c08b9`
- implementation state: **Phase 50 — P3 Provider Integration End-to-End Closure Audit CLOSED at repository/application-contract level**
- production deployment: `NOT PERFORMED`
- Vercel Git deployment: disabled by repository configuration

Implementation equality:

```text
CI-TESTED IMPLEMENTATION TREE
cb1010d16cf86bf3e72f9e8172809ef3097c08b9

==

MERGED IMPLEMENTATION TREE
cb1010d16cf86bf3e72f9e8172809ef3097c08b9
```

Phase 50 did not change SQL/schema/migrations. Migrations `00–20` remain unchanged. The latest exact migration-tree validation remains Phase 49 Database Contract Gate `#41 PASS`.

Important activation boundary:

```text
Repository/application contract through Phase 50: CLOSED
Migration 17 live target DB state: NOT VERIFIED
Migration 18 live target DB state: NOT VERIFIED
Migration 19 live target DB state: NOT VERIFIED
Migration 20 live target DB state: NOT VERIFIED
Live GitHub App environment/configuration: NOT VERIFIED
Live Notion Public OAuth registration/configuration: NOT VERIFIED
Live GitHub provider E2E: NOT VERIFIED
Live Notion provider E2E: NOT VERIFIED
Production deployment: NOT PERFORMED
```

Do not infer runtime activation from repository closure.

---

# Product definition and authority

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

Provider authority invariant:

```text
Pointer
!= Authorization / Credential
!= Observation
!= Capture
!= Decision
```

Still authoritative:

- BuildMap owns Project identity.
- BuildMap owns Decision identity.
- Builder owns official Decision approval.
- AI is conservative and non-authoritative.
- external provider identities remain additive references only.
- public-safe views and explicit publication remain Scout/public authority.

---

# P3 provider foundation state

Phase 50 audited GitHub and Notion as one provider-intake layer before adding another provider.

The current provider-neutral model remains valid:

```text
project_links
    ↓
integration_bindings
    ↓
provider observation/read
    ↓
Builder explicit Capture
    ↓
rough_notes
    ↓
capture_source_refs
    ↓
AI Structured Draft
    ↓
Review
    ↓
Builder approval
    ↓
Decision
```

No generalized integration platform or new provider schema was justified.

### `project_links`

User-facing provider pointer and visibility only.

### `integration_bindings`

Private verified Project Link ↔ provider authorization/resource association.

It is not Decision identity and must not become raw provider payload storage.

### `capture_source_refs`

Private immutable provider provenance attached to a Builder Capture.

It is not a synchronized event ledger and is not PIE Evidence authority.

---

# GitHub integration state

Current bounded flow:

```text
canonical repository pointer
→ GitHub App installation + PKCE user verification
→ exact repository association
→ private integration binding
→ Builder-triggered bounded activity read
→ merged PR / Release observation
→ Builder explicit Capture
→ server exact source re-read
→ private Rough Note
→ immutable provider provenance
→ evidence-mode AI structuring
→ Builder Review
→ Builder approval
→ Decision
→ Builder-only Evidence reverse trace
```

Current provider signals:

- merged Pull Requests;
- Releases.

Still excluded:

- Issues stream;
- raw commit stream ingestion;
- workflow/deployment stream ingestion;
- webhook ingestion;
- polling/cron/background sync;
- provider writes;
- automatic Capture;
- automatic Decision detection/approval.

## Phase 50 GitHub remediation

GitHub OAuth/API requests now have an explicit eight-second network timeout.

Covered external calls include:

- OAuth code exchange;
- user installation lookup;
- installation repository verification;
- installation access-token minting;
- merged PR reads;
- Release reads;
- activity list reads.

Timeout/transport failure remains provider-local and does not mutate BuildMap core state.

## GitHub provenance semantics

GitHub source identity remains stable provider-object identity:

```text
merged PR → pr:{number}
Release   → release:{provider release id}
observation_key = NULL
```

The historical GitHub source-proof contract remains unchanged. It verifies provider source/link identity; the Rough Note body is not the GitHub provenance authority under the frozen Phase 46 contract.

This differs intentionally from Notion current-state snapshot proof and must not be silently rewritten without an explicit proof-version migration/compatibility plan.

Historical GitHub proof verification currently remains coupled to the existing GitHub App configuration predicate. Treat proof-secret rotation or a future separation of historical proof verification from live App capability as explicit future hardening work, not an implicit Phase 50 format change.

---

# Notion integration state

Current bounded flow:

```text
canonical Notion page/database pointer
→ Public OAuth
→ exact user / Project / Project Link revalidation
→ exact page/database verification
→ private bot-level sealed credential
→ private resource binding
→ Builder-triggered bounded current-state read
→ signed bounded Capture selection
→ Builder explicit Capture
→ server exact re-read
→ observation fingerprint equality check
→ private Rough Note
→ immutable current-state provenance
→ evidence-mode AI structuring
→ Builder Review
→ Builder approval
→ Decision
→ Builder-only Evidence reverse trace
```

Notion remains bounded to:

### Page

- exact page metadata;
- one top-level block-children request;
- up to 20 top-level blocks;
- up to 4,000 normalized text characters;
- no recursive full-page traversal.

### Database

- exact database metadata;
- up to five bounded data-source labels/IDs;
- no row query;
- no database mirror.

## Notion observation identity

Notion is mutable current knowledge state.

```text
external_source_id = exact provider resource UUID
observation_key = SHA-256 of bounded normalized current observation
```

Same resource + unchanged bounded state cannot be duplicated.

Same resource + changed bounded state may be explicitly captured again.

`observation_key` is a BuildMap observation discriminator, not a Notion revision/version ID.

## Phase 50 Notion remediation — AI retry

Before Phase 50, the common Review retry action recognized provider provenance only for GitHub.

Now a failed Notion evidence AI draft may be retried when stored provenance verifies.

Retry:

- requires `page_current_state` or `database_current_state`;
- requires `observation_key`;
- verifies the persisted Rough Note body with the Notion source proof;
- requires only Notion Capture proof capability;
- does not require a live Notion provider re-read;
- does not require active OAuth client/encryption configuration;
- fails closed if stored proof is invalid;
- uses evidence-mode AI structuring, not ordinary triage.

## Phase 50 Notion remediation — historical Evidence

Builder-only Evidence no longer uses the full live OAuth configuration predicate merely to verify stored Notion provenance.

It now uses the proof-only predicate:

`isNotionCaptureProofConfigured()`

Therefore:

```text
live Notion read disabled
+ proof secret retained
→ historical stored Notion provenance can still verify
```

No provider read occurs from the Evidence screen.

---

# Intentional GitHub / Notion differences

Phase 50 freezes equal BuildMap authority boundaries, not identical provider mechanics.

| Contract | GitHub | Notion |
| --- | --- | --- |
| user pointer | repository root | page/database root |
| durable provider credential | no stored access token | sealed bot OAuth credential |
| observation | merged PR / Release | bounded mutable current state |
| duplicate key | provider object identity | resource + observation key |
| `observation_key` | NULL | required SHA-256 |
| Capture verification | exact source re-read | signed preview + exact re-read + fingerprint equality |
| proof body hash | no, frozen identity proof | yes, snapshot proof |
| pointer removal with active binding | may archive binding + pointer | must disconnect read access first |

These differences are provider lifecycle/semantics requirements and are not provider-neutral model failures.

---

# Failure isolation closure

Must remain true:

```text
provider unavailable before Capture persistence
→ no new BuildMap core state
```

If a new Rough Note succeeds but provider provenance insertion fails:

```text
new unconverted Rough Note
→ archive compensation
→ no successful provider Capture claim
```

If provenance succeeds but AI fails:

```text
Capture + provenance remain
→ explicit Builder AI retry remains available
→ no automatic Decision
```

Provider failures must not mutate unrelated:

- Project state;
- existing Decisions;
- Current Direction;
- publication;
- Feedback;
- Outcomes;
- other provider integrations;
- ordinary Captures.

Notion controlled credential lifecycle changes remain limited to explicit connect/refresh/disconnect boundaries.

---

# Public/private closure

Scout/Public remains based only on public-safe BuildMap views and Builder-selected public pointers.

Public provider display remains pointer-only through `public_project_links`.

Never expose directly to Scout/Public:

- `integration_bindings`;
- `capture_source_refs`;
- Rough Note bodies;
- AI Structured Drafts;
- GitHub installation identity;
- Notion bot/workspace identity;
- source proofs;
- Notion access/refresh token ciphertext;
- bounded provider previews;
- observation keys;
- Capture tokens;
- provider error internals.

Provider-derived information may become public only after it has become a Builder-approved BuildMap Decision and separately satisfies the existing publication/sensitivity boundary.

---

# Decision authority closure

Forbidden:

```text
provider Refresh/read → Rough Note
provider observation → automatic Decision candidate
provider Capture → automatic approval
AI Draft → approved Decision without Builder action
```

Required:

```text
external observation
→ Builder explicit Capture
→ private provenance
→ AI candidate
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Decision approval continues to bind the authenticated Builder profile.

---

# Database / migration authority

Migrations `00–20` remain unchanged by Phase 50.

Provider-related additive migrations remain:

- 17 — `integration_bindings`;
- 18 — `capture_source_refs`;
- 19 — Notion OAuth credential lifecycle + Notion verified resource type;
- 20 — optional bounded observation identity.

Latest exact migration-tree CI authority:

- Phase 49 Database Contract Gate `#41`: `PASS`

Phase 50 did not modify SQL, therefore no new migration or synthetic DB-gate claim was created.

Live target DB state for migrations 17–20 remains `NOT VERIFIED`.

---

# Phase 50 authoritative docs

Decision / audit:

`docs/decisions/phase50-p3-provider-integration-end-to-end-closure-audit.md`

Regression/access contract:

`docs/access-policy-tests/phase50-p3-provider-integration-end-to-end-closure-audit.md`

---

# Phase 50 CI / merge evidence

Implementation PR:

`#63`

Exact final tested implementation head:

`b3f877a2a3cddcc82110bf914a1525e5cd677a46`

Exact final tested implementation tree:

`cb1010d16cf86bf3e72f9e8172809ef3097c08b9`

Web App CI #106:

`PASS`

Validated on that exact head:

- exact event SHA checkout;
- Node 22;
- dependency install;
- lint;
- typecheck;
- production build.

Squash merge commit:

`f5444b1c5b014673022eb9063fabd30a88498e7b`

Merged implementation tree:

`cb1010d16cf86bf3e72f9e8172809ef3097c08b9`

Therefore:

```text
CI-TESTED IMPLEMENTATION TREE == MERGED IMPLEMENTATION TREE
```

Phase 50 repository/application-contract closure is valid.

---

# Runtime / deployment boundary

Repository closure does not prove provider activation.

Still unverified/not performed:

1. target BuildMap DB migration state for 17–20;
2. live GitHub App environment configuration;
3. real GitHub installation/OAuth/repository association;
4. real GitHub merged-PR/Release read;
5. real GitHub explicit provider Capture;
6. live Notion Public connection registration;
7. Notion callback URI/runtime secrets;
8. real Notion OAuth page-picker/code exchange;
9. real Notion page/database bounded read;
10. real Notion explicit current-state Capture;
11. real Notion token refresh/revoke behavior;
12. production deployment.

No production deployment was performed by Phase 50.

---

# PIE / Factory Intelligence boundary

Authoritative stance remains:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Still required:

- BuildMap Project IDs remain authoritative;
- BuildMap Decision IDs remain authoritative;
- provider identities remain external/additive;
- `capture_source_refs` remains BuildMap intake provenance, not PIE Evidence authority;
- no runtime PIE or Factory Intelligence coupling is introduced by provider integration.

---

# Next bounded work

## Phase 51 — P3 Integration Activation Readiness & Controlled Live E2E

Recommended next step before adding Figma/Slack or another provider.

Reason:

GitHub and Notion repository contracts are now structurally closed, but migrations 17–20 and both provider runtimes have not yet been proven against a real target environment. Adding another provider before validating the existing P3 slice would increase unverified integration surface.

Phase 51 should begin audit-first and must not assume production authority.

Expected bounded sequence:

```text
current authoritative main
→ verify target environment identity
→ verify migration 17–20 live state
→ prepare/apply only missing migrations through controlled process if explicitly authorized
→ verify GitHub App runtime configuration
→ one controlled GitHub repository association/read E2E
→ one controlled GitHub explicit Capture → Review path
→ verify Notion Public OAuth registration/runtime configuration
→ one controlled Notion page/database association/read E2E
→ one controlled Notion explicit Capture → Review path
→ disconnect/reconnect failure-isolation checks
→ activation evidence closeout
```

Important:

- do not auto-approve test Captures as Decisions;
- do not deploy production merely because E2E succeeds;
- do not fabricate refresh-token expiry/revision history;
- do not widen provider permissions;
- do not add a third provider in the same Phase;
- stop and report if external credentials/registration are unavailable.

If live activation is intentionally deferred, the alternative next bounded product Phase may be separately chosen, but it must not silently convert `NOT VERIFIED` runtime claims into `COMPLETE`.

---

# Terminal classification

```text
PHASE_50_P3_PROVIDER_INTEGRATION_CLOSURE = CLOSED

GITHUB_REPOSITORY_CONTRACT = CLOSED
NOTION_REPOSITORY_CONTRACT = CLOSED
PROVIDER_NEUTRAL_INTAKE_BOUNDARY = CLOSED
PUBLIC_PRIVATE_PROVIDER_BOUNDARY = CLOSED
BUILDER_DECISION_AUTHORITY = PRESERVED

LIVE_DATABASE_ACTIVATION = NOT VERIFIED
LIVE_GITHUB_E2E = NOT VERIFIED
LIVE_NOTION_E2E = NOT VERIFIED
PRODUCTION_DEPLOYMENT = NOT PERFORMED
```
