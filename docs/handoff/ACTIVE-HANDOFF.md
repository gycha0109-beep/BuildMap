# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 historical snapshot으로 유지한다. 상세 설계 근거는 각 Phase decision/access-policy 문서와 git history에 보존한다.

---

# Current implementation baseline

- repository: `gycha0109-beep/BuildMap`
- Phase 52 starting main: `d977d024f1dc6aadb016cf449492637464cf633b`
- Phase 52 implementation PR: `#67`
- exact final tested implementation head: `06af9ee5cfcee99567f350fcb32c53c6e070c24d`
- exact final tested implementation tree: `5e2bd11bbf47853b1cd4698b86f0381f7aa8a23c`
- Web App CI: `#123 PASS`
- Database Contract Gate: `#56 PASS`
- Phase 52 squash merge commit: `e5263b66743b3b824c39ce715e7a26eebfd4ae05`
- merged implementation tree: `5e2bd11bbf47853b1cd4698b86f0381f7aa8a23c`
- migration added by Phase 52: `20260820190000_buildmap_21_figma_oauth_credentials.sql`
- migrations `00–20`: unchanged
- hosted migration 21: verified applied under repository timestamp `20260820190000`
- production deployment: `NOT PERFORMED`
- repository Vercel Git deployment: `deploymentEnabled = false`

Implementation equality:

```text
CI-TESTED IMPLEMENTATION TREE
 5e2bd11bbf47853b1cd4698b86f0381f7aa8a23c

==

MERGED IMPLEMENTATION TREE
 5e2bd11bbf47853b1cd4698b86f0381f7aa8a23c
```

Phase 52 classification:

```text
PHASE_52_FIGMA_INTEGRATION_FOUNDATION_REPOSITORY = CLOSED
PHASE_52_HOSTED_MIGRATION_21 = CLOSED
PHASE_52_CONTROLLED_LIVE_E2E = PARTIALLY_CLOSED_PROVIDER_QUOTA_BLOCKED
```

Do **not** rewrite the last line as full live-E2E closure. The successful association/read/Capture path, duplicate behavior, disconnect preservation, rate-limit isolation, and cross-provider isolation were verified live, but stale-observation rejection and reconnect completion could not be re-run to completion after the Figma Starter API quota was exhausted.

---

# Product definition and authority

BuildMap V2 remains an AI-native **Capture-first Decision Journal for Builders**.

Core question:

> 왜 이 프로젝트가 지금의 모습이 되었는가?

Provider roles:

- GitHub = Build History
- Notion = Knowledge Context / History
- Figma = Design Context
- BuildMap = Decision History

Primary mental model:

```text
Capture → Review → Decision
```

Provider authority invariant:

```text
Pointer
!= Authorization / Credential
!= Verified Binding
!= Observation
!= Capture
!= Decision
```

Still authoritative:

- BuildMap owns Project identity.
- BuildMap owns Decision identity.
- Builder owns official Decision approval.
- AI is conservative and non-authoritative.
- provider objects and provider identities remain additive external references only.
- Provider Refresh never authorizes Capture or Decision by itself.

Allowed path:

```text
Provider Observation
→ Builder explicit Capture
→ private provenance
→ AI Candidate
→ Builder Review
→ explicit Builder approval
→ official Decision
```

Forbidden:

```text
Provider Observation → automatic Decision
Provider Refresh → automatic Capture
Provider Capture → automatic approval
```

---

# Hosted database activation state

Hosted target:

`fuzwuotlbodlpkwcqygj`

Phase 52 added only migration 21:

`20260820190000_buildmap_21_figma_oauth_credentials.sql`

Migration 21 provides:

- `private.figma_oauth_credentials`;
- Builder + Figma-user composite credential identity;
- AES-256-GCM application-sealed access/refresh token ciphertext;
- access-token expiry tracking;
- monotonic credential version;
- 30-second serialized refresh lock;
- active/disconnected lifecycle;
- direct browser/private-schema table access denial;
- SECURITY DEFINER RPC boundaries for save/read/refresh/disconnect.

Existing provider-neutral tables remain authoritative and unchanged:

- `project_links` = pointer + visibility;
- `integration_bindings` = private verified provider/resource association;
- `capture_source_refs` = private immutable Capture provenance.

## Migration-history correction

The connector used for the first hosted application recorded the already-applied migration 21 SQL under its execution-time version `20260821010703` rather than the repository filename timestamp.

No schema rollback/re-application was required. Migration history was repaired so hosted authority now records:

```text
20260820190000 | buildmap_21_figma_oauth_credentials
```

The transient `20260821010703` history entry is no longer authoritative.

Current hosted migration authority:

```text
MIGRATIONS_00_20 = PRESERVED
MIGRATION_21_SCHEMA = VERIFIED PRESENT
MIGRATION_21_HISTORY_VERSION = VERIFIED 20260820190000
```

---

# Figma Integration Foundation

Controlled flow implemented:

```text
Figma file / selected-node pointer
→ separate OAuth read authorization
→ PKCE S256 authorization-code exchange
→ exact file/resource verification
→ private verified binding
→ Builder-triggered bounded Design Context observation
→ ephemeral no-store preview
→ Builder explicit Capture
→ server exact re-read
→ observation identity equality
→ private Rough Note
→ immutable Figma provenance
→ AI Structured Draft
→ Builder Review
→ explicit approval required for Decision
```

Minimal Figma OAuth scopes:

```text
file_metadata:read
file_content:read
```

Not requested by Phase 52:

- deprecated broad `files:read`;
- `file_versions:read`;
- project/team enumeration;
- comments/write;
- webhooks;
- polling/background sync;
- provider writes.

OAuth state and PKCE session are server-controlled. Tokens are never exposed through `NEXT_PUBLIC_*` configuration.

---

# Pointer / authorization separation

Live validation confirmed the intended separation:

```text
Figma pointer saved
!= OAuth credential
!= active verified binding
```

The Integrations UI may show a provider pointer count even when provider read access is disconnected. Phase 52 added explicit UI clarification that top-level provider counts are pointer counts, while `Read connected` / `Connect ... read access` represents authorization state.

Public visibility means only the safe canonical Figma URL + label pointer may appear on the Public Project Map. It does not publish:

- OAuth credentials;
- verified binding internals;
- observation fingerprint;
- private preview content;
- Capture provenance;
- Rough Notes;
- AI Drafts.

---

# Controlled live Figma E2E evidence

A real Figma file/node pointer was used in the controlled Preview environment.

Verified success path:

```text
pointer
→ Figma OAuth approval
→ exact resource verification
→ active private binding
→ bounded Refresh
→ explicit Capture as evidence
→ server exact re-read
→ private Rough Note
→ capture_source_ref provenance
→ AI Structured Draft
→ no automatic Change Card/Decision
```

Observed post-Capture state during validation:

```text
Figma Capture     = 1
Figma Rough Note  = 1
Figma AI Draft    = 1
new Decision      = 0
```

Refresh itself did not create a Rough Note or Decision.

The first successful Capture therefore proves the main authority path through real Figma OAuth and provider reads.

---

# Live defect remediation — duplicate Capture provenance proof

The first duplicate-Capture attempt exposed a real provenance-proof bug.

Root cause:

- original proof signed a timestamp formatted with UTC `Z`;
- PostgreSQL `timestamptz` round-trip returned the same instant formatted as `+00:00`;
- the timestamp represented the same time but the signed string differed;
- duplicate provenance HMAC verification therefore failed.

Remediation:

- proof timestamps are canonicalized before HMAC input;
- Phase 52 static regression coverage freezes that behavior.

Live re-test after the fix:

```text
Figma Capture     = 1 unchanged
Rough Note        = 1 unchanged
AI Draft          = 1 unchanged
Decision          = 0 unchanged
```

Therefore:

```text
FIGMA_DUPLICATE_CAPTURE = PASS
```

---

# Live provider rate-limit behavior

Repeated controlled node-pointer reads exhausted the available Figma Starter API quota during the live validation sequence.

The implementation correctly surfaced provider rate limiting without mutating BuildMap data.

A second live defect was found in the UI retry guidance: BuildMap previously capped the provider `Retry-After` value at 300 seconds, which could falsely imply that every limit would clear after five minutes.

Remediation:

- the artificial 300-second cap was removed;
- provider retry duration is preserved rather than shortened by BuildMap.

While rate-limited, BuildMap retained:

```text
Figma Capture     = 1
Rough Note        = 1
AI Draft          = 1
Decision          = 0
```

Therefore:

```text
FIGMA_RATE_LIMIT_FAILURE_ISOLATION = PASS
```

---

# Disconnect preservation and cross-provider isolation

Explicit Figma `Read access 해제` was validated live.

Post-disconnect hosted state:

```text
Figma active binding      = 0
Figma disconnected binding history = retained
Figma credential status   = disconnected
access token ciphertext   = cleared
refresh token ciphertext  = cleared
Figma pointer              = retained
Figma Capture              = retained
Figma Rough Note           = retained
Figma AI Draft             = retained
GitHub active binding      = preserved
Notion active binding      = preserved
Decision mutation          = 0
```

Therefore:

```text
FIGMA_DISCONNECT_HISTORY_PRESERVATION = PASS
FIGMA_CROSS_PROVIDER_ISOLATION = PASS
```

Disconnect does not remove the pointer and does not delete historical evidence.

---

# Reconnect and stale-observation live status

## Reconnect

A reconnect attempt reached the real Figma OAuth approval callback, but the callback intentionally requires a fresh exact provider verification before restoring credential/binding authority.

By that time the provider quota was exhausted. The final exact file/node read was rate-limited, so BuildMap did **not** recreate an active binding or persist a new active credential.

This is the correct fail-closed behavior.

Classification:

```text
FIGMA_RECONNECT_OAUTH_CALLBACK_REACHED = VERIFIED
FIGMA_RECONNECT_BINDING_RESTORED = BLOCKED_BY_PROVIDER_QUOTA
```

Do not mark reconnect as PASS until a future controlled provider read completes after quota becomes available.

## Stale observation

The intended contract is implemented and statically covered:

```text
Refresh observation A
→ provider changes to B
→ Capture with A
→ server exact re-read B
→ observation mismatch
→ no Rough Note/provenance/AI Draft persistence
```

A live stale-mismatch re-test could not be completed after provider quota exhaustion.

Classification:

```text
FIGMA_STALE_MISMATCH_CONTRACT = IMPLEMENTED + CI COVERED
FIGMA_STALE_MISMATCH_LIVE = BLOCKED_BY_PROVIDER_QUOTA
```

---

# Public / private boundary

Public Project Map may render public Figma pointer URL/label only after canonical Figma URL validation.

Never expose directly to Scout/Public:

- `integration_bindings`;
- `capture_source_refs` internals;
- `private.figma_oauth_credentials`;
- access/refresh token ciphertext;
- binding/source proofs;
- observation keys;
- provider Capture tokens;
- Rough Note bodies;
- AI Structured Draft internals;
- bounded private provider preview contents;
- provider diagnostics.

Provider-derived content may become official/public Decision material only through existing Builder Review, approval, publication, and sensitivity boundaries.

---

# Phase 52 authoritative docs

Decision / implementation record:

`docs/decisions/phase52-figma-integration-foundation.md`

Regression/access contract:

`docs/access-policy-tests/phase52-figma-integration-foundation.md`

Implementation PR:

`#67`

---

# Phase 52 CI / merge evidence

Exact final tested implementation head:

`06af9ee5cfcee99567f350fcb32c53c6e070c24d`

Exact final tested implementation tree:

`5e2bd11bbf47853b1cd4698b86f0381f7aa8a23c`

Exact-head checks:

```text
Web App CI #123          = PASS
Database Contract #56   = PASS
```

Squash merge commit:

`e5263b66743b3b824c39ce715e7a26eebfd4ae05`

Merged implementation tree:

`5e2bd11bbf47853b1cd4698b86f0381f7aa8a23c`

Therefore:

```text
CI-TESTED IMPLEMENTATION TREE == MERGED IMPLEMENTATION TREE
```

---

# Deployment boundary

Phase 52 used controlled non-production Preview deployments for Figma OAuth/live validation.

Temporary Preview branch deployment allowances were removed after validation.

Repository state at implementation merge:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

Important:

```text
PHASE_52_CONTROLLED_PREVIEW = USED FOR LIVE VALIDATION
CURRENT_MAIN_PRODUCTION_DEPLOYMENT = NOT PERFORMED
```

Do not infer production deployment from hosted Supabase migration activation or Preview E2E.

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
- no runtime PIE or Factory Intelligence coupling is introduced by Figma integration.

---

# Next bounded work

Do **not** start Phase 53 merely to hide the two provider-quota-blocked live checks.

The immediate bounded follow-up is:

## Phase 52 live quota follow-up

When Figma Tier-1 read quota becomes available again, perform only the missing controlled checks:

1. reconnect the existing Figma pointer and prove the active binding is restored only after fresh exact verification;
2. verify Capture count remains unchanged after reconnect;
3. perform one stale-observation mismatch test and prove zero persistence;
4. re-check GitHub/Notion isolation;
5. do not add new provider scope or background synchronization.

If those checks pass, Phase 52 controlled live E2E may be reclassified from `PARTIALLY_CLOSED_PROVIDER_QUOTA_BLOCKED` to `CLOSED` in a docs-only update.

Until then the implementation is merged and usable within its current authority contract, but the blocked live checks must remain explicit.

---

# Terminal classification

```text
PHASE_52_FIGMA_INTEGRATION_FOUNDATION_REPOSITORY = CLOSED
PHASE_52_HOSTED_MIGRATION_21 = CLOSED
PHASE_52_CONTROLLED_LIVE_E2E = PARTIALLY_CLOSED_PROVIDER_QUOTA_BLOCKED

MIGRATION_21_HOSTED_TARGET = VERIFIED APPLIED AS 20260820190000
FIGMA_LIVE_ASSOCIATION_READ_CAPTURE = PASS
FIGMA_REFRESH_ZERO_PERSISTENCE = PASS
FIGMA_DUPLICATE_CAPTURE = PASS
FIGMA_RATE_LIMIT_FAILURE_ISOLATION = PASS
FIGMA_DISCONNECT_HISTORY_PRESERVATION = PASS
FIGMA_CROSS_PROVIDER_ISOLATION = PASS
FIGMA_RECONNECT_BINDING_RESTORED = BLOCKED_BY_PROVIDER_QUOTA
FIGMA_STALE_MISMATCH_LIVE = BLOCKED_BY_PROVIDER_QUOTA
PUBLIC_PRIVATE_PROVIDER_BOUNDARY = PRESERVED
BUILDER_DECISION_AUTHORITY = PRESERVED
CI_TESTED_TREE_EQUALS_MERGED_TREE = PASS

CURRENT_MAIN_PRODUCTION_DEPLOYMENT = NOT PERFORMED
NEXT_BOUNDED_WORK = PHASE_52_LIVE_QUOTA_FOLLOWUP
```
