# Phase 42 — P2 Integration & End-to-End Closure Audit

## Decision

Phase 42 audits the completed P2 flow as one product loop rather than adding another feature vertical.

Audited loop:

```text
Capture
→ Review
→ Decision
→ Project Map / Publication
→ External Feedback
→ Capture as evidence
→ Evidence traceability
→ Feedback Outcome closure
```

Scout/public reads remain a separate safe-read boundary.

## Audit result

`PASS WITH CONSISTENCY HARDENING`

No schema redesign, RLS change, public-safe view expansion, API addition, or PIE integration is required.

Three cross-surface consistency gaps were identified and fixed.

### 1. Decision approval → Evidence / Outcomes

Before Phase 42, Decision approval revalidated Overview, Capture, Review, and Decisions, but not the Phase 40/41 read-side surfaces.

A newly approved Feedback-origin Decision could therefore leave Evidence or Outcomes behind the mutation that created the authoritative Decision.

Phase 42 adds:

- `/projects/[projectId]/evidence`
- `/projects/[projectId]/feedback/outcomes`

as Decision-finalization revalidation targets.

### 2. Publication mutation → Feedback surfaces

Project publication and Decision publication/sensitivity changes affect whether Feedback Requests and selected Feedback are effectively public.

The DB/public-safe views already enforce the authority boundary, but the publication action did not invalidate every surface derived from that boundary.

Phase 42 additionally revalidates:

- Builder Feedback workspace
- Scout Public Feedback route

when Project/Decision publication state changes.

This is cache/surface consistency hardening only. The public authority remains the existing public-safe view/RLS contract.

### 3. Reopening Feedback Request on private Project

Creating a Feedback Request already requires a public Project, but reopening a previously closed Request did not recheck Project visibility.

That allowed a Request to hold `status = open` while its Project was private, producing a semantically dormant "open" state.

Phase 42 aligns reopen behavior with creation:

```text
status = open
requires Project visibility_status = public
```

Decision-targeted Requests still additionally require the target Decision to be approved + published + normal + non-archived.

Closing a Request remains allowed regardless of Project public state.

## Authority boundaries preserved

Phase 42 does not change authority ownership.

- Builder remains the Decision approval authority.
- `feedbacks.review_status` remains the Builder Feedback Outcome authority.
- Public-safe views/RLS remain Scout/public read authority.
- Public Feedback write actions continue to recheck effective-public state at write time.
- Evidence and Outcomes remain Builder-only internal surfaces.
- No public surface gains Rough Notes, AI Drafts, internal Change Card state, or internal Feedback outcome state.

## PIE boundary

Phase 42 does not implement or prepare runtime PIE integration.

`docs/decisions/pie-integration-boundary.md` remains authoritative:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

No PIE identifiers, source revisions, external-reference schema, evidence ingestion, client/API/SDK/auth, webhook/polling, or Factory Intelligence are introduced.

## Data / runtime impact

```text
DB migration: 0
Schema change: 0
RLS change: 0
Grant change: 0
Public-safe view change: 0
API surface change: 0
Runtime dependency change: 0
```

Phase 42 is an application-level consistency closure over the existing P2 architecture.

## Closure criterion

P2 may be considered structurally closed when:

1. exact-head Web App CI passes,
2. the Phase 42 regression cases are recorded,
3. no mutation in the audited loop is known to leave a directly dependent P2 surface outside its intended revalidation boundary,
4. no public/private authority boundary has been widened to achieve consistency.
