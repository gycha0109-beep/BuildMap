# Phase 50 — P3 Provider Integration End-to-End Closure Audit

## Status

`IMPLEMENTED — CLOSURE REMEDIATION CANDIDATE`

Phase 50 audits the completed GitHub and Notion P3 slices as one BuildMap intake system before any third provider is added.

Starting repository authority:

- repository: `gycha0109-beep/BuildMap`
- starting `main`: `e6a0e426ec9f9f4e2780a87e88e385a8fa1562d6`
- starting tree: `3e2d6537349c6eef06da14ff661d46e7672ee824`
- Phase 49 implementation merge: `483f5a14995c80e90809cc1ea3a370d3ad44830f`
- migrations present: `00–20`

Phase 50 does not add a provider, schema, migration, credential type, background worker, webhook, polling loop, or Decision authority.

---

## 1. Closure question

The audit asks one bounded question:

> Can GitHub Build History and Notion Knowledge Context enter the same BuildMap Capture → Review → Decision system without provider identity replacing BuildMap authority, without public leakage, and without provider failure breaking the core Decision Journal?

The answer after the remediation in this Phase is:

`YES — AT REPOSITORY / APPLICATION-CONTRACT LEVEL`

Live provider execution remains a separate activation claim.

---

## 2. Provider-neutral model that remains valid

The current schema is sufficient and remains unchanged.

```text
project_links
    ↓
integration_bindings
    ↓
provider read / observation
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

Responsibilities remain distinct:

### `project_links`

User-facing provider pointer and Builder-selected visibility.

It is not:

- a credential store;
- an observation ledger;
- provenance authority;
- Decision identity.

### `integration_bindings`

Private verified association between one Project Link and one provider authorization/resource identity.

It is not:

- a token store for GitHub;
- raw provider payload storage;
- Decision identity.

Notion durable OAuth credential material remains separately isolated in `private.notion_oauth_credentials`.

### `capture_source_refs`

Private, immutable provider provenance associated with a Builder-created Rough Note.

It is not:

- a synchronized provider event feed;
- a public artifact;
- PIE Evidence authority;
- a substitute for Builder Decision approval.

No additional generalized provider platform is justified by the current two-provider audit.

---

## 3. Intentional provider differences

Phase 50 does not force GitHub and Notion into identical semantics.

Parity means equal BuildMap authority boundaries, not identical provider mechanics.

### GitHub

GitHub observations are bounded immutable-ish build-history objects for the current product contract:

- merged Pull Request identified by repository + PR number;
- Release identified by repository + provider Release ID.

Existing GitHub provenance keeps:

```text
observation_key = NULL
```

and remains unique by provider source identity.

The existing GitHub source proof is an identity/link integrity proof. The human-readable Rough Note body is not the GitHub provenance authority.

Phase 49 explicitly required this historical GitHub proof contract to remain unchanged. Phase 50 therefore does not silently version or reinterpret existing GitHub proofs.

### Notion

A Notion page/database is mutable current knowledge state.

Therefore:

```text
external_source_id = exact provider resource UUID
observation_key = SHA-256 of the bounded normalized current observation
```

The same resource may be captured again only after the bounded observed state changes.

Notion source proof additionally seals the exact Rough Note body hash and bounded observation metadata.

This asymmetry is deliberate and remains compatible with the provider-neutral `capture_source_refs` model.

---

## 4. Audit finding A — Notion evidence retry was not provider-neutral

### Finding

`assessExistingCaptureAction` is the Review retry path after AI generation failure.

Before Phase 50 it recognized a stored `capture_source_refs` row only when:

```text
provider = github
source_type = merged_pull_request | release
```

A valid Notion Capture whose initial AI structuring failed therefore remained safely persisted, but the Builder could not use the existing Review retry action.

This contradicted the Phase 49 failure contract that valid Capture/provenance survives AI failure and can continue through Review.

### Remediation

The retry path now verifies either provider according to that provider's own stored proof contract.

GitHub retry:

- requires GitHub proof configuration;
- accepts only merged PR / Release source types;
- verifies the existing GitHub source proof.

Notion retry:

- requires only the Notion Capture proof secret;
- requires `observation_key`;
- accepts only `page_current_state` / `database_current_state`;
- verifies the stored Notion source proof against the current persisted Rough Note body;
- does not re-read Notion;
- does not require active OAuth credentials;
- does not silently downgrade invalid provenance to an ordinary Capture.

After verified provenance, both provider-origin Captures use evidence-mode AI structuring, not ordinary Decision-worthiness triage.

---

## 5. Audit finding B — historical Notion Evidence was coupled to live OAuth configuration

### Finding

The Builder-only Evidence page previously used `isNotionOAuthConfigured()` as the gate for validating stored Notion source proofs.

That full runtime predicate covers OAuth/client/encryption configuration required for live provider access.

Historical provenance verification requires only the server HMAC proof secret.

Consequently a deployment could lose or intentionally disable live Notion OAuth configuration while retaining the proof secret, and valid stored historical provenance would be incorrectly classified as unverified.

### Remediation

Evidence now uses:

`isNotionCaptureProofConfigured()`

This preserves the intended separation:

```text
live provider authorization capability
!= historical stored provenance verification capability
```

No provider read is performed by the Evidence surface.

---

## 6. Audit finding C — GitHub provider reads had no bounded network timeout

### Finding

Notion requests already fail within a bounded eight-second provider window.

GitHub API and OAuth token requests previously relied on the underlying platform/network timeout.

GitHub is optional infrastructure. An unbounded external request could therefore occupy a request path longer than the explicit optional-provider failure contract intends.

### Remediation

GitHub provider calls now use an eight-second `AbortSignal.timeout` boundary for:

- OAuth code exchange;
- installation enumeration;
- installation repository verification;
- installation-token minting;
- merged PR reads;
- Release reads;
- activity list reads.

Transport/timeout failure is normalized to `GitHubProviderError(status = 0)` and existing callers map it to provider-unavailable behavior.

The timeout does not mutate BuildMap core state.

---

## 7. Association and disconnect audit

### GitHub

```text
canonical repository pointer
→ signed installation state
→ GitHub App installation
→ PKCE user OAuth
→ current user + Project + Project Link revalidation
→ exact user-visible installation repository verification
→ HMAC-protected integration binding
```

GitHub credentials are not persisted.

Disconnect archives the GitHub integration binding and leaves the pointer independently controllable.

Removing the GitHub pointer also disconnects an active GitHub binding because no durable provider credential lifecycle must be reclaimed.

### Notion

```text
canonical page/database pointer
→ signed OAuth state
→ authorization-code exchange
→ current user + Project + Project Link revalidation
→ exact resource verification
→ bot-level sealed OAuth credential
→ HMAC-protected resource binding
```

Notion disconnect is intentionally different because credentials can be shared by multiple same-Builder bindings to one bot authorization.

The selected binding is detached first. The bot credential is locally invalidated only after its final active binding disappears, followed by best-effort provider revocation.

Notion pointer removal is blocked while an active read binding exists so credential cleanup cannot be bypassed by deleting the pointer first.

These differences are provider lifecycle requirements, not provider-neutral model violations.

---

## 8. Observation and explicit Capture audit

### GitHub

Builder sees an ephemeral on-demand merged PR / Release list.

Capture submits only stable source identity and the server:

1. revalidates Builder ownership;
2. revalidates the active binding proof;
3. exact-reads the selected provider object again;
4. creates a private Rough Note;
5. creates immutable source provenance;
6. starts evidence-mode AI structuring.

### Notion

Builder sees a bounded current-state preview plus opaque signed Capture token.

Capture:

1. verifies token signature/expiry;
2. revalidates Builder ownership;
3. exact-reads the bound Notion resource again;
4. recomputes the bounded observation key;
5. requires the re-read to equal the signed selection;
6. creates a private Rough Note;
7. creates immutable current-state provenance;
8. starts evidence-mode AI structuring.

Neither provider creates a Rough Note merely because a Refresh/read occurred.

---

## 9. Persistence failure audit

Both providers preserve the same core invariant:

```text
provider read failure before Capture persistence
→ no new core BuildMap state
```

If a new Rough Note succeeds but `capture_source_refs` insertion fails:

```text
new unconverted Rough Note
→ archive compensation
→ no completed provider Capture claim
```

If source provenance succeeds but AI structuring fails:

```text
valid Capture + provenance remain
→ failed AI draft remains retryable
→ no automatic Decision
```

Phase 50 repairs Notion parity in this final retry step.

---

## 10. Public/private closure audit

Public Project Map remains based only on public-safe views:

- `public_project_pages`
- `public_decision_timeline`
- `public_project_links`

Public provider integration behavior is limited to Builder-selected canonical pointers.

The following remain private and absent from public-safe views:

- `integration_bindings`;
- `capture_source_refs`;
- Rough Note bodies;
- AI Structured Drafts;
- GitHub installation IDs;
- source proofs;
- Notion bot/workspace IDs;
- Notion OAuth token ciphertext;
- Notion bounded preview content;
- Notion observation keys;
- Capture tokens;
- provider error internals.

A provider-sourced idea may appear publicly only after it has become a BuildMap Decision through Builder approval and the existing publication/sensitivity boundary.

That is Decision publication, not raw provider observation publication.

---

## 11. Decision authority closure audit

Still forbidden:

```text
provider read
→ automatic Rough Note

provider observation
→ automatic Decision candidate

provider Capture
→ automatic approval

provider ID
→ BuildMap Project/Decision identity
```

Still required:

```text
external observation
→ Builder explicitly selects Capture
→ private Rough Note + verified provenance
→ AI candidate
→ Builder Review action
→ Builder approval
→ official Decision
```

The approval action writes `approved_by_builder_profile_id` from the authenticated current Builder context.

AI remains non-authoritative.

---

## 12. Database impact

None.

Phase 50 does not modify migrations `00–20`.

The current provider storage contract remains:

- migration 17 — `integration_bindings`;
- migration 18 — `capture_source_refs`;
- migration 19 — Notion OAuth credential lifecycle + Notion resource type;
- migration 20 — optional bounded observation identity.

Because Phase 50 changes no SQL/schema/migration file, a new migration is neither required nor justified.

The Phase 49 Database Contract Gate #41 remains the latest exact migration-tree validation for the unchanged migration set through 20. Phase 50 closure requires exact-head Web App CI for its application changes.

Live target DB migration state remains unverified and must not be inferred from repository contract validation.

---

## 13. Non-goals preserved

Phase 50 does not add:

- Figma integration;
- Slack integration;
- provider writes;
- webhook ingestion;
- polling;
- cron;
- background synchronization;
- workspace mirror/search ingest;
- raw commit stream ingestion;
- automatic Capture;
- automatic Decision candidate detection;
- automatic Decision approval;
- PIE runtime;
- Factory Intelligence;
- production deployment.

---

## 14. PIE compatibility

Existing authority remains:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

Provider identities remain external/additive references.

`capture_source_refs` remains BuildMap intake provenance and does not become PIE Evidence authority.

BuildMap Project and Decision IDs remain authoritative.

---

## 15. Closure condition

Phase 50 may close only when the final implementation head proves:

- Web App lint PASS;
- typecheck PASS;
- production build PASS;
- final branch remains based on the audited authoritative main without unrelated drift;
- merged implementation tree equals the exact tested implementation tree.

No live provider or production claim is created by that closure.
