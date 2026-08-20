# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 historical snapshot으로 유지한다. 상세 설계 근거는 각 Phase decision/access-policy 문서와 git history에 보존한다.

---

# Current implementation baseline

- repository: `gycha0109-beep/BuildMap`
- Phase 51 starting main: `2289070c51f38f135b38e192178cccdb5264fa6c`
- Phase 51 implementation PR: `#65`
- exact final tested implementation head: `3d36bd7f64fd770c52f749836043b29390b05f77`
- exact final tested implementation tree: `a8b092cd00c62efd45182f26a7aa30662e0ac30a`
- Web App CI: `#108 PASS`
- Phase 51 squash merge commit: `1e2418896ce556931492c4afab32e17c0a4c315f`
- merged implementation tree: `a8b092cd00c62efd45182f26a7aa30662e0ac30a`
- migration files changed by Phase 51: `NO`
- migrations `00–20`: unchanged
- current Phase 51 production deployment: `NOT PERFORMED`
- repository Vercel Git deployment: disabled again after controlled Preview validation

Implementation equality:

```text
CI-TESTED IMPLEMENTATION TREE
 a8b092cd00c62efd45182f26a7aa30662e0ac30a

==

MERGED IMPLEMENTATION TREE
 a8b092cd00c62efd45182f26a7aa30662e0ac30a
```

Phase 51 state:

```text
PHASE_51_P3_INTEGRATION_ACTIVATION_READINESS_CONTROLLED_LIVE_E2E = CLOSED
```

---

# Product definition and authority

BuildMap V2 remains an AI-native **Capture-first Decision Journal for Builders**.

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

# Hosted database activation state

Phase 51 directly verified the configured hosted Supabase migration history.

Applied provider migrations:

- migration 17 — `integration_bindings`
- migration 18 — `capture_source_refs`
- migration 19 — Notion OAuth credential lifecycle + verified resource type
- migration 20 — optional bounded observation identity

Current authority:

```text
LIVE_MIGRATION_17 = VERIFIED APPLIED
LIVE_MIGRATION_18 = VERIFIED APPLIED
LIVE_MIGRATION_19 = VERIFIED APPLIED
LIVE_MIGRATION_20 = VERIFIED APPLIED
```

No migration was applied, edited, reordered, or manufactured by Phase 51.

Repository migration authority remains the unchanged `00–20` set.

---

# GitHub integration — controlled live state

Phase 51 completed one controlled real GitHub E2E against:

`gycha0109-beep/BuildMap`

Validated path:

```text
internal repository pointer
→ GitHub App installation restricted to exact repository
→ user OAuth
→ exact installation/repository verification
→ active private binding
→ Builder-triggered bounded merged PR / Release read
→ explicit Builder Capture
→ exact server re-read
→ private Rough Note
→ immutable GitHub provenance
→ evidence-mode AI Structured Draft
→ Builder Review candidate
→ no automatic approved Decision
```

Observed provider identity during the controlled E2E:

- repository ID: `1306433852`
- installation ID: `155131457`

One real merged-PR Capture was preserved as private provider provenance.

## GitHub disconnect / reconnect closure

Explicit `Read access 해제` was verified to:

- remove the active binding;
- retain disconnected binding history;
- retain the Project Link;
- retain historical Capture/provenance;
- leave Notion state unchanged;
- create no Decision mutation.

A live defect was found: reconnect always forced `/installations/new` even when the GitHub App was still installed for the exact repository.

Phase 51 remediation now:

1. reads the latest disconnected binding for the exact Project Link;
2. verifies its binding proof against the current exact repository pointer;
3. proves the stored installation is still live by minting a repository-scoped installation token;
4. if valid, skips new installation and proceeds to the existing PKCE user OAuth path;
5. if invalid/unavailable, falls back to the original fresh-install flow.

The repaired reconnect was then validated live.

Post-reconnect:

```text
GitHub active binding       = restored
historical disconnected row = retained
GitHub Capture count        = unchanged
Notion active binding       = preserved
```

Stored installation identity alone is never accepted as reconnect authority.

---

# Notion integration — controlled live state

Phase 51 completed one controlled real Notion E2E against:

- workspace: `make 자동화`
- resource: `사업 과제`
- type: `database`
- exact resource ID: `10538de5-a5db-4002-a52c-01b82e2cd097`

Validated path:

```text
internal Notion pointer
→ Public OAuth resource selection
→ code exchange
→ sealed bot-level credential persistence
→ exact database verification
→ private resource binding
→ Builder-triggered bounded current-state read
→ ephemeral preview
→ explicit Builder Capture
→ exact server re-read
→ observation fingerprint equality
→ private Rough Note
→ immutable provenance + observation_key
→ evidence-mode AI Structured Draft
→ Builder Review candidate
→ no automatic approved Decision
```

Refresh alone created no Capture.

One real bounded database current-state Capture was preserved as private provider provenance.

## Notion copied-link compatibility remediation

Current Notion UI produced copied links in the form:

```text
https://app.notion.com/p/<resource-id>...
```

The pre-Phase-51 parser accepted only `notion.so` / `www.notion.so`.

Phase 51 now accepts the current `app.notion.com` host while preserving canonical stored resource identity.

A Notion resource does **not** need to be publicly published to the web. BuildMap read authority comes from OAuth resource authorization.

## Notion page/database verification remediation

For a valid database ID tested against the page endpoint, Notion returned:

```text
HTTP 400
provider code: validation_error
```

The pre-Phase-51 verifier treated only `404` as an endpoint-type miss and therefore converted this into a fatal authorization failure.

Phase 51 now treats only the narrow `400 validation_error` endpoint-type mismatch as a safe lookup miss and continues exact verification against the alternate page/database endpoint.

Actual authorization/provider failures remain fatal.

## Notion disconnect / reconnect closure

Explicit `Read access 해제` was verified to:

- remove the active Notion binding;
- transition the credential lifecycle to disconnected when no active binding remained;
- retain Project Link;
- retain historical Notion Capture/provenance;
- leave GitHub state unchanged;
- create no Decision mutation.

Reconnect then re-ran OAuth and exact resource verification.

Post-reconnect authority:

```text
Notion active binding       = restored
credential status           = active
credential_version          = 3
encryption_key_version      = 1
exact database ID           = unchanged
Notion Capture count        = unchanged
GitHub active binding       = preserved
```

The same provider `bot_id` credential row is reactivated/upserted by design rather than creating a second permanent credential row.

---

# Provider-neutral intake model

The Phase 50 provider-neutral model is now proven against real hosted GitHub + Notion flows:

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

No generalized integration platform or new provider schema is justified by Phase 51.

Provider-specific differences remain intentional:

| Contract | GitHub | Notion |
| --- | --- | --- |
| pointer | repository root | page/database root |
| durable provider credential | no stored access token | sealed bot OAuth credential |
| observation | merged PR / Release | bounded mutable current state |
| duplicate identity | provider source identity | resource + observation key |
| `observation_key` | NULL | deterministic SHA-256 |
| Capture verification | exact source re-read | signed preview + exact re-read + fingerprint equality |
| disconnect lifecycle | binding archive; provider App may remain installed | binding disconnect + credential lifecycle/revoke boundary |

Do not erase these provider semantic differences merely to make the implementation look uniform.

---

# Public / private boundary

The controlled E2E Project remained private and had zero public provider pointers during validation.

Never expose directly to Scout/Public:

- `integration_bindings`;
- `capture_source_refs` internals;
- Rough Note bodies;
- AI Structured Draft internals;
- binding/source proofs;
- observation keys;
- GitHub installation identity;
- Notion bot/workspace authorization identity;
- access/refresh token ciphertext;
- provider Capture tokens;
- provider error diagnostics.

Provider-derived information may become public only after it becomes a Builder-approved BuildMap Decision and separately satisfies existing publication/sensitivity rules.

---

# Decision authority closure

Both real provider Captures reached:

```text
AI Candidate
+ Builder 확인 필요
```

and stopped there.

No provider E2E test candidate was auto-approved.

Required invariant:

```text
Provider Observation
→ Builder explicit Capture
→ private provenance
→ AI candidate
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Forbidden:

```text
Provider Refresh → automatic Capture
Provider Observation → automatic Decision candidate persistence
Provider Capture → automatic approval
AI Draft → approved Decision without Builder action
```

---

# Phase 51 authoritative docs

Decision / activation record:

`docs/decisions/phase51-p3-integration-activation-readiness-controlled-live-e2e.md`

Regression/access contract:

`docs/access-policy-tests/phase51-p3-integration-activation-readiness-controlled-live-e2e.md`

---

# Phase 51 CI / merge evidence

Implementation PR:

`#65`

Exact final tested implementation head:

`3d36bd7f64fd770c52f749836043b29390b05f77`

Exact final tested implementation tree:

`a8b092cd00c62efd45182f26a7aa30662e0ac30a`

Web App CI #108:

`PASS`

Squash merge commit:

`1e2418896ce556931492c4afab32e17c0a4c315f`

Merged implementation tree:

`a8b092cd00c62efd45182f26a7aa30662e0ac30a`

Therefore:

```text
CI-TESTED IMPLEMENTATION TREE == MERGED IMPLEMENTATION TREE
```

No SQL/schema/migration file changed in PR #65.

---

# Deployment boundary

Phase 51 used a controlled Vercel Preview to validate provider secrets/configuration and real E2E behavior.

The temporary branch-only Preview deployment allowance was removed before PR #65.

Current repository setting again disables Git deployment.

Important:

```text
PHASE_51_PREVIEW_E2E = VERIFIED
CURRENT_MAIN_PRODUCTION_DEPLOYMENT = NOT PERFORMED
```

Do not infer that the Phase 51 implementation is deployed to production merely because the hosted DB and Preview provider E2E succeeded.

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

Phase 51 closes the GitHub + Notion P3 provider foundation at repository/application-contract **and controlled hosted E2E** level.

Do not add GitHub/Notion background synchronization merely because activation is now proven.

Recommended next bounded product Phase:

## Phase 52 — Figma Integration Foundation

Why Figma next:

- GitHub already covers Build History;
- Notion already covers Knowledge Context;
- Figma can add bounded Design Context without duplicating those two providers;
- it can reuse the now-proven provider-neutral pointer/binding/observation/Capture/provenance authority model;
- design artifacts are strongly relevant to explaining why a product changed.

Phase 52 should begin audit-first and add **one provider only**.

Expected bounded scope:

```text
Figma Project/File pointer
→ exact read authorization
→ bounded design observation
→ Builder explicit Capture
→ private provenance
→ AI candidate
→ Builder Review
→ explicit Decision approval
```

Still out of scope by default:

- Slack in the same Phase;
- webhook/polling/background sync;
- broad workspace crawling;
- provider writes;
- automatic Decision detection;
- PIE runtime;
- Factory Intelligence runtime;
- production deployment unless separately authorized.

---

# Terminal classification

```text
PHASE_51_P3_INTEGRATION_ACTIVATION_READINESS_CONTROLLED_LIVE_E2E = CLOSED

MIGRATIONS_17_20_HOSTED_TARGET = VERIFIED APPLIED
GITHUB_LIVE_ASSOCIATION_READ_CAPTURE = PASS
NOTION_LIVE_ASSOCIATION_READ_CAPTURE = PASS
GITHUB_DISCONNECT_RECONNECT_ISOLATION = PASS
NOTION_DISCONNECT_RECONNECT_ISOLATION = PASS
PROVIDER_NEUTRAL_INTAKE_BOUNDARY = PRESERVED
PUBLIC_PRIVATE_PROVIDER_BOUNDARY = PRESERVED
BUILDER_DECISION_AUTHORITY = PRESERVED

CURRENT_MAIN_PRODUCTION_DEPLOYMENT = NOT PERFORMED
NEXT_RECOMMENDED_BOUNDED_PHASE = PHASE_52_FIGMA_INTEGRATION_FOUNDATION
```
