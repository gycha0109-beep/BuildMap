# Phase 50 — P3 Provider Integration End-to-End Closure Regression Contract

## Purpose

Freeze the cross-provider security, provenance, retry, failure-isolation, public/private, and Decision-authority contracts after the GitHub and Notion P3 slices.

---

## 1. Core authority

Must remain true for every provider:

```text
Pointer != Authorization/Credential != Observation != Capture != Decision
```

Provider association never grants Decision authority.

Only Builder explicit Capture may cross an external observation into the private BuildMap evidence workflow.

Only authenticated Builder Review/approval may create an official Decision.

---

## 2. Provider-neutral storage

`project_links` may store only user-facing external pointers and visibility metadata.

`integration_bindings` may store verified provider association identity/proof, but must not become a generalized credential or raw-payload store.

`capture_source_refs` must remain:

- private;
- owner-readable;
- owner-insertable only through the current RLS/validation boundary;
- immutable to authenticated application users;
- one source row per Rough Note;
- same-Project and same-provider as its Project Link;
- external/additive identity only.

No provider ID may replace `projects.id` or `change_cards.id`.

---

## 3. Intentional source identity differences

### GitHub

Allowed source types:

- `merged_pull_request`
- `release`

GitHub rows must keep `observation_key IS NULL` under the current contract.

Idempotency is stable provider-object identity.

The existing GitHub source-proof version remains unchanged in Phase 50.

### Notion

Allowed source types:

- `page_current_state`
- `database_current_state`

Notion rows require a lowercase 64-hex `observation_key` representing the deterministic bounded observed state.

Same Notion resource + same observation key must deduplicate.

Same resource + changed bounded observation may be explicitly captured again.

Do not call `observation_key` a Notion revision/version identifier.

---

## 4. Browser trust boundary

GitHub Capture must not trust browser-supplied title, URL, summary, occurrence time, or repository metadata. The exact source must be re-read server-side by stable source identity.

Notion Capture must not trust browser-supplied preview content. It must verify the opaque signed selection token and exact re-read the bound resource before persistence.

A changed Notion observation between preview and Capture must fail closed.

---

## 5. Binding verification

Before provider reads/Capture:

- current BuildMap authentication must be present;
- Project ownership must be rechecked;
- exact active Project Link must be rechecked;
- exact active provider binding must be rechecked;
- provider-specific binding proof must verify;
- external resource identity must still match the canonical Project Link.

Invalid binding/proof must not be repaired by inference or title matching.

---

## 6. AI failure and retry

If provider provenance has already been successfully stored but AI generation fails:

- valid Rough Note remains;
- valid `capture_source_refs` remains;
- failed draft remains eligible for explicit Builder retry;
- retry must use evidence-mode structuring, not ordinary triage;
- retry must verify stored provider provenance before treating the Capture as selected evidence.

GitHub retry verifies the existing GitHub source proof.

Notion retry must:

- accept only Notion current-state source types;
- require `observation_key`;
- require `NOTION_OAUTH_STATE_SECRET` proof capability only;
- verify the persisted Rough Note body against the Notion source proof;
- not require active OAuth client/encryption configuration;
- not re-read the provider merely to retry AI structuring.

If stored proof verification fails, retry must fail closed rather than downgrade the row to an ordinary Capture.

---

## 7. Historical Evidence verification

Builder-only Evidence may validate stored provider provenance without performing live provider reads.

GitHub historical proof verification remains gated by the current GitHub proof secret/config contract.

Notion historical proof verification must use `isNotionCaptureProofConfigured()` rather than the full live OAuth configuration predicate.

Therefore these states are distinct:

```text
Notion live read disabled
+ Notion proof secret retained
→ historical Notion source proof remains verifiable
```

and:

```text
Notion proof secret unavailable
→ stored Notion row is not asserted as verified provenance
```

Never infer or substitute another source when proof cannot be verified.

---

## 8. Provider network failure boundary

GitHub and Notion are optional infrastructure.

External provider operations must have bounded network execution.

Current target:

- GitHub external fetch timeout: 8 seconds;
- Notion external fetch timeout: 8 seconds.

Timeout/transport failure must map to provider-unavailable behavior and must not mutate Project, existing Decisions, publication, Feedback, Outcome, or unrelated Capture state.

Provider 401/403/404 and equivalent authorization/resource failures must remain provider-local.

Notion controlled credential lifecycle mutation is allowed only inside its explicit connect/refresh/disconnect contract.

---

## 9. Partial persistence compensation

For both providers:

```text
new Rough Note created
+ source-reference insert fails
→ archive the unconverted new Rough Note
```

A failed source-reference insert must not leave a new active Rough Note represented as a successful provider Capture.

Duplicate-source unique conflicts may redirect to existing Review state only after the current provider contract's integrity rules are respected.

---

## 10. Disconnect / pointer lifecycle

GitHub binding disconnect and pointer removal may be combined where no durable provider credential cleanup is required.

Notion pointer removal must remain blocked while a live Notion binding exists.

Notion explicit read disconnect must detach local binding first and preserve/revoke the shared bot credential according to remaining active references.

A provider revoke failure must not restore locally disconnected Notion credential usability.

Archived provider pointers may remain readable to the Builder for historical Evidence trace if the source reference already exists.

---

## 11. Public boundary

Scout/Public must never gain direct access to:

- `integration_bindings`;
- `capture_source_refs`;
- Rough Note bodies;
- AI Structured Drafts;
- provider installation/bot/workspace identities;
- source proofs;
- Notion ciphertext/tokens;
- bounded provider previews;
- observation keys;
- Capture selection tokens;
- provider error internals.

Public provider display remains canonical `public_project_links` pointers only.

Provider-derived content may be visible through a published BuildMap Decision only after the existing Builder approval + publication + sensitivity boundary.

---

## 12. Decision authority regression

Forbidden:

```text
provider Refresh/read → Rough Note
provider observation → approved Decision
provider Capture → approved Decision
AI Structured Draft → approved Decision without Builder action
```

Required:

```text
Builder explicit Capture
→ private provenance
→ AI candidate
→ Builder Review
→ explicit approval
→ Decision
```

Approval must continue to bind `approved_by_builder_profile_id` to the authenticated Builder context.

---

## 13. Database contract

Phase 50 must not modify migrations `00–20`.

No new migration is expected.

The current schema is sufficient for the two-provider closure.

If a future provider cannot fit the current external-reference model without weakening these rules, that provider requires a new architecture gate rather than opportunistic schema generalization.

---

## 14. Non-goals

Must remain absent:

- Figma/Slack implementation;
- provider write permissions;
- webhooks;
- polling/cron/background sync;
- automatic Capture;
- automatic Decision candidate detection;
- automatic Decision approval;
- raw provider payload mirrors;
- PIE runtime coupling;
- Factory Intelligence runtime coupling;
- production deployment.

---

## 15. Closure validation

The final Phase 50 implementation head must pass exact-head Web App CI:

- exact event SHA checkout;
- Node 22;
- dependency install;
- lint;
- typecheck;
- production build.

Because migrations remain byte-for-byte unchanged, Phase 50 does not manufacture a new Database Contract Gate claim. The latest migration authority remains the Phase 49 exact-head Database Contract Gate #41 for migrations through 20.

After squash merge:

```text
CI-TESTED IMPLEMENTATION TREE == MERGED IMPLEMENTATION TREE
```

must be proven before Active Handoff closeout.
