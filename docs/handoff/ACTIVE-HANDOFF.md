# BuildMap Active Handoff

## Current authority

이 문서는 현재 BuildMap 구현 단계의 authoritative handoff다.

`docs/handoff/CURRENT-HANDOFF.md`는 Phase31 closure 당시의 historical snapshot으로 유지한다.

## Current main baseline

- repository: `gycha0109-beep/BuildMap`
- baseline entering this closeout: `567d2eae2aba1c7fb3c3d0744e4b992d5e77870e`
- implementation state: **Phase 44 — GitHub Read Integration Architecture & Sync Boundary merged**
- P2 closure verdict: `PASS WITH CONSISTENCY HARDENING`
- P3 state: GitHub repository pointer + read architecture contract complete
- GitHub runtime authorization/read/sync: **NOT IMPLEMENTED YET**
- production deployment: `OUT_OF_SCOPE`
- Vercel Git deployment: disabled in `apps/web/vercel.json`

The earlier PIE compatibility audit referenced `14bb059302d57190f45deb56b21a6c422d790801` / Phase 40. That baseline is historical. Its authority-boundary verdict remains active because Phases 41–44 did not transfer BuildMap Project/Decision authority to PIE, GitHub, or another external provider.

---

## Product definition

BuildMap V2 is an AI-native Capture-first Decision Journal for Builders.

Core question:

> 왜 이 프로젝트가 지금의 모습이 되었는가?

Positioning:

- GitHub = Build History
- Notion = Knowledge History
- BuildMap = Decision History

Primary user mental model:

```text
Capture → Review → Decision
```

AI remains non-authoritative. Builder owns official judgment and approval.

Problem/Hypothesis remain optional context, not mandatory workflow steps.

---

## Completed application foundation

### Capture / Review / Decision

Implemented:

- authenticated Builder workspace
- Capture-first Rough Notes
- conservative AI decision-worthiness triage for ordinary Capture
- AI Structured Draft generation
- Review surface
- Builder-only edit/approve authority
- approved Change Card as official Decision Record
- Current Direction derived from approved Decisions

### Project Map / Decision Timeline

Implemented:

- internal Decision Timeline / Project Map
- chronological approved Decision history
- Current Direction
- Major Turning Points
- Latest Decision
- first-Decision onboarding/activation guidance

### Public Project Map / publication

Implemented:

- Scout-facing `/p/[publicSlug]`
- public-safe Project/Decision reads
- Project public/private controls
- Builder-selected public Decisions
- sensitive Decision exclusion
- approved + published + normal boundary

`link_shared` token UX remains intentionally unimplemented.

### External Feedback

Implemented:

- Builder-created public Feedback Requests
- Project-level or public-Decision target
- authenticated Scout response
- internal review state
- Builder-selected public Feedback
- Scout/Builder role separation
- no automatic public Feedback publication

### Feedback → Decision evidence bridge

Implemented flow:

```text
External Feedback
→ Builder Capture as evidence
→ private Rough Note
→ AI structuring
→ Decision Candidate
→ Builder Review
→ Decision
```

Important invariants:

- Feedback never becomes a Decision automatically.
- Builder explicitly chooses `Capture as evidence`.
- provenance is preserved through explicit links.
- Feedback capture does not automatically mark Feedback reflected.

### Decision Evidence Traceability

Implemented:

- Builder-only Evidence surface
- Decision → source Capture trace
- Decision/Capture → External Feedback trace
- Feedback Request context
- provenance mismatch surfaced rather than silently repaired
- no text/AI inference for missing historical provenance

### Feedback Outcome Closure

Implemented:

- Builder-only Outcomes surface
- evidence-path progression separate from Builder outcome
- explicit `reflected` / `not_reflected`
- reopen as `reviewing`
- approved Decision does not imply reflected
- `feedbacks.review_status` remains outcome authority

### P2 end-to-end closure

Phase 42 closed cross-surface consistency gaps without schema expansion:

1. Decision approval revalidates Evidence and Outcomes.
2. Project/Decision publication mutations revalidate affected Feedback/Public Feedback surfaces.
3. Feedback Requests cannot be reopened while Project is private; Decision-target reopen still requires eligible public target.

P2 is structurally closed at repository/application-contract level.

---

## GitHub integration state

### Phase 43 — Repository Pointer Foundation

Implemented:

- Builder-only `Integrations` Project tab
- explicit GitHub repository root association via existing `project_links`
- `link_type = github`
- canonical `https://github.com/{owner}/{repository}` normalization
- nested commit/branch/PR/issue URLs rejected as repository identity
- internal/public repository visibility
- archive-on-remove
- public repository pointer displayed through `public_project_links`
- canonical GitHub URL filtering before Scout rendering

Authority rule:

```text
GitHub repository pointer
≠ BuildMap Project identity
≠ BuildMap Decision
≠ BuildMap Evidence authority
```

Phase 43 added no credential, API read, sync, webhook, or GitHub-specific schema.

Authoritative decision:

`docs/decisions/phase43-github-integration-foundation.md`

### Phase 44 — Read Integration Architecture & Sync Boundary

Phase 44 is an architecture gate. It intentionally adds **no GitHub runtime integration**.

Authoritative decision:

`docs/decisions/phase44-github-read-integration-architecture.md`

Regression contract:

`docs/access-policy-tests/phase44-github-read-integration-boundary.md`

Approved authentication model:

```text
GitHub App installation
NOT stored PAT
NOT classic OAuth App as the primary repository integration model
```

BuildMap user authentication remains Supabase-based. GitHub installation is an external provider connection, not a second Builder identity authority.

Initial GitHub repository permission envelope:

```text
Repository metadata: read
Contents: read
Pull requests: read
```

No repository write permission is authorized.

Issues permission is intentionally deferred until issue ingestion is separately justified.

Initial signal priority:

1. merged Pull Requests
2. Releases
3. Commits only as supporting/drill-down context

Deferred:

- Issues
- issue comments
- PR review comments as an independent stream
- workflow runs
- deployments
- discussions
- arbitrary repository file ingestion
- broad Git history crawling

Initial sync model:

```text
Builder-triggered on-demand refresh
```

Not yet authorized:

- webhook ingestion
- periodic polling
- cron refresh
- continuous background synchronization

GitHub App installation access tokens must be:

- minted server-side only,
- short-lived,
- never sent to browser,
- never persisted in BuildMap tables,
- never logged,
- never exposed through `NEXT_PUBLIC_*` variables.

`project_links` remains a user-facing external-resource pointer collection. It must not become a credential store, event ledger, sync registry, or technical Evidence registry.

If durable provider installation/connection state becomes necessary, it requires a separate additive provider-neutral integration-binding decision.

### GitHub observation authority path

Approved future flow:

```text
GitHub repository
→ read-only GitHub observation
→ Builder inspects activity
→ Builder explicitly chooses Capture
→ private BuildMap Capture / Rough Note
→ AI structuring
→ Review
→ Builder approval
→ official Decision
```

GitHub observation must never directly:

- create an approved Change Card,
- change Current Direction,
- mark a Major Turning Point,
- publish a Decision,
- close Feedback Outcome.

Automatic Decision candidate detection remains a later P3 capability.

### GitHub provenance rule

If GitHub observations are later persisted or converted to Capture, explicit provenance must identify:

- BuildMap Project
- linked repository
- provider (`github`)
- provider object kind
- stable provider source identity
- canonical provider URL
- provider timestamps as required
- BuildMap observation timestamp

PR numbers, release IDs/tags, GitHub object IDs, and commit SHAs remain **external source identities only**. They do not replace BuildMap IDs.

Do not infer missing provenance using title similarity, body similarity, commit-message matching, or AI guesswork.

### Failure isolation

BuildMap must operate normally when GitHub is:

- unconnected,
- uninstalled,
- permission-revoked,
- rate-limited,
- unavailable,
- returning provider errors.

A GitHub read failure must not mutate existing Project, Capture, Decision, Feedback, or publication state.

### Public boundary

The current public GitHub surface remains only the Builder-selected repository pointer through `public_project_links`.

Raw GitHub PR/release/commit activity remains Builder-private by default.

If GitHub activity later contributes to a public BuildMap Decision, the public artifact is the Builder-approved BuildMap Decision, not the raw provider payload.

---

## Database / migration contract

Historical migrations `00–10` remain immutable.

Repository additive migrations currently extend through sequence 16:

- 11: app runtime privilege alignment
- 12: least-privilege ACL hardening
- 13: AI draft conversion RPC
- 14: project insert owner-policy alignment
- 15: Rough Note conversion RLS alignment
- 16: External Feedback evidence provenance alignment

Repository CI includes:

- Web App CI: exact event SHA checkout, install, lint, typecheck, build
- Database Contract Gate: historical migration integrity + additive migration contract + safety boundary

Do not modify historical migrations.

New DB changes must be additive and must satisfy Database Contract Gate.

### Live DB verification boundary

The BuildMap production/staging database is not currently available through the connected Supabase projects in this session.

Repository migration contracts are known; live migration application state must not be inferred.

Do not claim a migration is deployed without explicit target-environment evidence.

---

## Public / private authority boundary

Public-safe views and RLS/grants remain the authority for Scout/public reads.

Never expose through Scout/Public surfaces:

- Rough Notes
- AI Structured Drafts
- internal/unpublished/sensitive Change Cards
- internal Feedback review/outcome state
- private author/auth/profile identifiers
- Builder-only provenance
- future GitHub credentials
- future private GitHub synchronization state
- raw private GitHub observations

Current public-safe surfaces include:

- `public_project_pages`
- `public_decision_timeline`
- `public_feedback_requests`
- `public_feedbacks`
- `public_project_links`

---

## PIE architecture compatibility boundary

Current verdict:

```text
PIE integration readiness: STRUCTURALLY COMPATIBLE
Core redesign required now: NO
Schema hardening required now: NO
Runtime integration required now: NO
Authority-boundary documentation required now: COMPLETE
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
- PIE evidence may later be referenced without transferring authority.
- BuildMap must work when PIE is absent/unavailable.
- PIE core remains BuildMap-independent.
- Factory Intelligence remains out of scope.

GitHub P3 integration must not be generalized into PIE core or Factory Intelligence.

---

## Explicit non-goals / prohibited expansion

Unless a later explicit architecture decision authorizes them, do not add:

- PIE client/API/SDK/auth
- PIE webhook/polling
- PIE IDs on BuildMap core entities
- external-reference schema solely for PIE
- PIE evidence ingestion
- Factory Intelligence
- cross-project/factory intelligence models
- scoring/gamification
- GitHub/Notion/Jira replacement behavior

For GitHub specifically, Phase 44 does **not** authorize:

- repository write permissions
- PAT storage
- classic broad OAuth access as primary model
- webhooks
- polling/cron sync
- Issue ingestion
- automatic Decision creation
- public raw activity feed

---

## Production / deployment state

Production deployment remains out of scope.

`apps/web/vercel.json` keeps Git deployment disabled.

Merging `main` must not be described as a production deployment.

---

## Current roadmap position

Completed through **Phase 44 — GitHub Read Integration Architecture & Sync Boundary**.

P2 is structurally closed.

P3 GitHub work now has:

```text
Phase 43: repository pointer foundation ✅
Phase 44: read/auth/sync/provenance architecture ✅
```

V2 P3 order remains:

1. GitHub integration
2. Notion integration
3. Figma / Slack intake
4. automatic Decision candidate detection

### Next phase

**Phase 45 — GitHub App Read Access Bootstrap**

Phase 45 may implement only the Phase 44-approved runtime boundary:

1. server-only GitHub App configuration boundary,
2. installation/connection association design,
3. linked repository verification,
4. short-lived installation access token minting,
5. Builder-triggered read-only Refresh,
6. normalized merged-PR + Release preview,
7. non-blocking provider error states.

Before adding schema, Phase 45 must determine whether installation association can remain runtime-derived or requires a durable provider-neutral connection record.

If schema is required:

- create a separate explicit decision,
- use additive migration only,
- run Database Contract Gate,
- do not place GitHub installation IDs directly on `projects` or `change_cards`,
- do not turn `project_links` into credential state.

Phase 45 must not add:

- webhook ingestion,
- polling/cron synchronization,
- automatic Decision candidates,
- Issue ingestion,
- public raw GitHub activity,
- PIE integration.

---

## Safety boundary

- do not modify historical migrations `00–10`
- additive migrations only when actually required
- do not claim live DB deployment without environment evidence
- do not commit secrets/private keys/tokens/service-role credentials
- do not enable production deployment implicitly
- preserve Builder approval authority over Decisions
- preserve Scout/public safe-read boundaries
- preserve BuildMap core independence from GitHub and PIE
- preserve external provider identity as additive rather than replacing BuildMap identity
- Factory Intelligence remains out of scope
