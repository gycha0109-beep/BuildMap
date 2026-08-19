# PIE Integration Boundary

## Status

Architecture compatibility hardening only.

Current determination:

```text
PIE integration readiness: STRUCTURALLY COMPATIBLE
Core redesign required now: NO
Schema hardening required now: NO
Runtime integration required now: NO
Authority-boundary documentation required now: YES
Current roadmap conflict: NO
BLOCKER: NONE
```

The operating stance is:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

## Authority ownership

### BuildMap identities remain authoritative

BuildMap owns its own Project and Decision identities.

- `projects.id` is the authoritative BuildMap Project identity.
- `change_cards.id` is the authoritative BuildMap Decision/Change Card identity.
- External provider IDs must never replace, redefine, or become the primary identity for either object.
- A future integration may associate external references with BuildMap records, but the BuildMap record remains independently addressable and valid without the external system.

### BuildMap Decision is not PIE Technical Decision

A BuildMap Decision and a PIE Technical Decision are different domain concepts.

BuildMap records the Builder's product/project judgment history: why the project changed, what was decided, what evidence mattered, and what direction followed.

PIE may own technical execution/evidence concepts in its own domain. A future association between the two must not collapse their semantics or transfer authority from one system to the other.

## External reference rule

Any future external-reference mechanism must be:

- additive rather than identity-replacing,
- provider-neutral rather than PIE-specific,
- optional rather than required for normal BuildMap operation,
- capable of representing a reference without making the provider authoritative over BuildMap state.

No external-reference schema is introduced by this decision.

### `project_links` boundary

`project_links` must not evolve into a PIE evidence registry.

It may continue to represent project-level links under its existing BuildMap purpose, but it must not become the storage authority for PIE evidence, PIE technical decisions, source revisions, provider execution state, or synchronization metadata.

If a future integration requires durable external references, that concern must be modeled explicitly at the integration boundary rather than overloaded into `project_links`.

## Evidence semantics

`change_cards.evidence` is BuildMap decision-context evidence text.

It is not:

- PIE technical Evidence authority,
- a mirrored PIE evidence object,
- an execution log,
- an external source-revision record,
- a synchronization payload.

PIE evidence may later be referenced from BuildMap, but such a reference must preserve the distinction between:

1. the external evidence object owned by PIE, and
2. the Builder-facing evidence context recorded in BuildMap.

Referencing external evidence does not transfer authority for BuildMap Decisions to PIE.

## Availability independence

BuildMap must operate normally when PIE is absent, disabled, unreachable, or unavailable.

Consequences:

- Project creation and identity cannot depend on PIE.
- Capture, Review, Decision approval, Project Map, External Feedback, Evidence traceability, and Feedback Outcome closure cannot require PIE availability.
- Existing BuildMap reads/writes cannot be gated by a PIE API call.
- A future integration failure must degrade only the integration-specific capability, not the BuildMap core workflow.

## Integration ownership

A future PIE association is owned by BuildMap integration code or by an external adapter.

PIE core remains BuildMap-independent.

This means PIE must not be modified to embed BuildMap domain identities, lifecycle assumptions, or product workflow requirements merely to support BuildMap.

Possible future integration shapes may include a BuildMap-owned adapter or a provider-neutral integration layer, but no implementation choice is made now.

## Explicit non-goals

The following remain out of scope:

- PIE client/API/SDK/auth integration,
- PIE webhook or polling integration,
- PIE IDs on `projects` or `change_cards`,
- source revision fields,
- external-reference schema,
- PIE evidence ingestion,
- PIE-backed Decision creation,
- Factory Intelligence,
- cross-project/factory intelligence models,
- changes to PIE core for BuildMap compatibility.

## Compatibility rule for future phases

Future BuildMap phases must preserve these invariants unless a later explicit architecture decision supersedes this document:

1. BuildMap identities remain authoritative inside BuildMap.
2. External references remain additive and provider-neutral.
3. BuildMap core workflows remain functional without PIE.
4. BuildMap Decision authority remains with the Builder/BuildMap workflow.
5. PIE technical evidence/decision authority remains inside PIE.
6. Integration concerns stay at the boundary rather than leaking into current core domain models.
7. Factory Intelligence remains outside the current BuildMap roadmap.

No database migration, schema change, API change, runtime dependency, or current Phase redesign is authorized by this document.
