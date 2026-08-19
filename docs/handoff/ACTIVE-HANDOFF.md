# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase31 closure 당시의 hash-protected historical snapshot으로 유지한다.

## Current main baseline

- repository: `gycha0109-beep/BuildMap`
- current baseline before this documentation hardening PR: `4645d815dad11556253e9956407f9cac82cea3bb`
- implementation state: **Phase 41 — Feedback Outcome Closure merged**
- production deployment: `OUT_OF_SCOPE`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

A PIE compatibility audit handoff referenced `14bb059302d57190f45deb56b21a6c422d790801` / Phase 40. That baseline is historically valid but has been superseded by Phase 41 on current `main`. The architecture verdict remains applicable because Phase 41 did not introduce PIE coupling, external identity, or schema/runtime integration.

## Product definition

BuildMap V2 is an AI-native Capture-first Decision Journal for Builders.

Core question:

> 왜 이 프로젝트가 지금의 모습이 되었는가?

Product positioning:

- GitHub = Build History
- Notion = Knowledge History
- BuildMap = Decision History

Primary user mental model:

```text
Capture → Review → Decision
```

Internal domain objects may remain more detailed, but the product must not expose unnecessary implementation concepts as the user mental model.

## Current application implementation

### Capture / Review / Decision foundation

Implemented:

- authenticated Builder workspace
- Capture-first Rough Note flow
- conservative AI decision-worthiness triage for ordinary Capture
- AI Structured Draft generation
- Review surface
- Builder-only edit/approve authority
- approved Change Card as official Decision Record
- Current Direction derived from approved Decisions

AI remains non-authoritative. It may assess or structure a candidate, but it does not approve an official Decision.

### Project Map / Decision Timeline

Implemented:

- internal Project Map / Decision Timeline
- chronological approved Decision history
- Current Direction
- Major Turning Points
- Latest Decision
- first-Decision activation/onboarding guidance

### Public Project Map / publication controls

Implemented:

- Scout-facing `/p/[publicSlug]` Public Project Map
- public-safe Project/Decision reads
- Builder project publication controls
- Builder public Decision selection
- sensitive Decision exclusion
- approved + published + normal boundary for public Decisions

`link_shared` token UX remains intentionally unimplemented.

### External Feedback foundation

Implemented:

- Builder-created public Feedback Requests
- Project-level or public-Decision target
- authenticated Scout response flow
- internal review status
- Builder-selected public Feedback
- Scout/Builder account-role separation
- no automatic public Feedback publication

### Feedback → Decision evidence bridge

Implemented in Phase 39:

```text
External Feedback
→ Builder: Capture as evidence
→ private Rough Note
→ AI structuring
→ Decision Candidate
→ Builder Review
→ Decision
```

Important invariants:

- External Feedback never becomes a Decision automatically.
- Builder explicitly chooses `Capture as evidence`.
- Feedback-origin provenance is preserved through `rough_notes.source_feedback_id` and existing `change_cards.linked_feedback_id`.
- Feedback capture does not automatically mark the Feedback reflected or publish it.

### Decision Evidence Traceability

Implemented in Phase 40:

- Builder-only `Evidence` surface
- Decision → source Capture trace
- Decision/Capture → External Feedback trace
- Feedback Request context trace
- recorded Decision evidence text kept distinct from source-record provenance
- provenance mismatch surfaced rather than silently repaired
- no AI/text inference for historical missing provenance

### Feedback Outcome Closure

Implemented in Phase 41:

- Builder-only `Outcomes` surface
- evidence-path progression shown separately from final Builder outcome
- Feedback path states derived from explicit Rough Note / AI Draft / Change Card records
- explicit Builder closure as `reflected` or `not_reflected`
- reopen as `reviewing`
- Approved Decision does not automatically imply `reflected`
- `feedbacks.review_status` remains the Builder outcome authority

Current loop:

```text
Scout Feedback
→ Capture as evidence
→ Review
→ Decision
→ Outcome closure
```

and reverse traceability:

```text
Decision
→ Capture
→ External Feedback
→ Feedback Request
```

## Database / migration contract

Historical migrations `00–10` remain immutable.

Repository additive migrations currently extend through sequence 16:

- 11: app runtime privilege alignment
- 12: least-privilege ACL hardening
- 13: AI draft conversion RPC
- 14: project insert owner-policy alignment
- 15: Rough Note conversion RLS alignment
- 16: External Feedback evidence provenance alignment (`rough_notes.source_feedback_id` and conversion provenance carry-forward)

Repository CI includes:

- Web App CI: exact event SHA checkout, install, lint, typecheck, build
- Database Contract Gate: historical migration integrity + additive migration contract + safety boundary

Do not modify historical migrations. New DB changes, when actually required, must be additive and must satisfy the Database Contract Gate.

### Live database verification boundary

The BuildMap production/staging database is not currently available through the connected Supabase projects in this session. Therefore repository migration contracts are known, but live BuildMap DB application state must not be inferred from connector-visible projects.

Do not claim a migration is deployed to the live BuildMap database without explicit environment verification.

## Public / private authority boundary

Public-safe views and RLS/grants remain the only authority for Scout/public reads.

Never expose through Scout/Public surfaces:

- Rough Note source records
- AI Structured Drafts
- unpublished/internal/sensitive Change Cards
- internal Feedback review/outcome state
- Feedback author auth IDs, user profile IDs, email, or equivalent private identity
- Builder-only provenance state

Builder-side application checks may duplicate DB boundaries as defense in depth, but must not replace RLS/public-safe contracts.

## PIE architecture compatibility boundary

Architecture audit verdict:

```text
PIE integration readiness: STRUCTURALLY COMPATIBLE
Core redesign required now: NO
Schema hardening required now: NO
Runtime integration required now: NO
Authority-boundary documentation required now: YES
Current roadmap conflict: NO
BLOCKER: NONE
```

Authoritative decision:

`docs/decisions/pie-integration-boundary.md`

Operating stance:

> PIE is BuildMap-independent. BuildMap is PIE-aware only at the integration boundary.

> Align now, integrate later.

Hard constraints:

- BuildMap owns Project and Decision identities.
- External IDs never replace `projects.id` or `change_cards.id`.
- Future external references must be additive and provider-neutral.
- `project_links` must not become a PIE evidence registry.
- `change_cards.evidence` is BuildMap decision-context evidence text, not PIE technical Evidence authority.
- BuildMap Decision != PIE Technical Decision.
- PIE evidence may later be referenced without transferring Decision authority.
- BuildMap core must operate normally when PIE is absent or unavailable.
- Future PIE association is owned by BuildMap integration code or an external adapter.
- PIE core remains BuildMap-independent.
- Factory Intelligence remains out of scope.

No PIE runtime/schema/API implementation is authorized by the current roadmap.

## Explicit non-goals / prohibited expansion

Do not add during the current roadmap unless a later explicit architecture decision authorizes it:

- PIE client/API/SDK/auth
- PIE webhook/polling
- PIE IDs on BuildMap core entities
- source revision fields
- external-reference schema solely for PIE
- PIE evidence ingestion
- Factory Intelligence
- cross-project/factory intelligence models
- scoring/gamification
- GitHub/Notion/Jira replacement behavior

## Production / deployment state

Production deployment remains out of scope for the current implementation sequence.

`apps/web/vercel.json` keeps Git deployment disabled. Merging `main` must not be described as a production deployment.

## Current roadmap position

Completed through **Phase 41 — Feedback Outcome Closure**.

The next roadmap step is:

### Phase 42 — P2 Integration & End-to-End Closure Audit

Purpose:

- audit the complete Capture → Review → Decision → Public Map → External Feedback → Evidence → Outcome loop as one system,
- find cross-surface inconsistencies, stale assumptions, broken revalidation paths, and authority leaks,
- validate zero/empty/error states across the completed P2 surfaces,
- verify public/private boundaries remain consistent after Phases 36–41,
- prefer documentation/tests/read-side fixes over new product scope,
- do not introduce PIE integration as part of the audit.

Phase 42 is a BuildMap closure/integration audit, not a new external-integration phase.

## Safety boundary

- do not modify historical migrations `00–10`
- additive migrations only when schema change is actually required
- do not claim live BuildMap DB deployment without environment evidence
- do not commit secrets or service-role credentials
- do not enable production deployment implicitly
- preserve Builder approval authority over Decisions
- preserve Scout/public safe-read boundaries
- preserve BuildMap core independence from PIE
- Factory Intelligence remains out of scope
