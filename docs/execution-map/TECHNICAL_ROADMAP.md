# Execution Map — Technical Implementation Roadmap (EM v0.1)

- **Status:** TRACK_REGISTERED / EM-0_CLOSED / EM-1A_1B_SOURCE_VERIFIED_IN_PR_96 (FULL_REPOSITORY_REPLAY + LOCAL_AUTH + BROWSER_E2E_PASS; HOSTED_NOT_DEPLOYED)
- **EM-0 audit:** [EM0_BOUNDARY_AUDIT.md](EM0_BOUNDARY_AUDIT.md) (repository/source audit closed)
- **EM-1 source/verification:** [EM1A_IMPLEMENTATION_HANDOFF.md](EM1A_IMPLEMENTATION_HANDOFF.md), [EM1B_IMPLEMENTATION_HANDOFF.md](EM1B_IMPLEMENTATION_HANDOFF.md)
- **EM-2 source preview:** [EM2A_IMPLEMENTATION_HANDOFF.md](EM2A_IMPLEMENTATION_HANDOFF.md) (PR #97, bounded read-only source metadata, no stored evidence)
- **EM-2B implementation:** [EM2B_IMPLEMENTATION_HANDOFF.md](EM2B_IMPLEMENTATION_HANDOFF.md) and [EM2B_EVIDENCE_REGISTRY_CONTRACT.md](EM2B_EVIDENCE_REGISTRY_CONTRACT.md) (PR #101, SQL/Web/Auth/browser CI PASS, not deployed)
- **EM-2C GitHub App source health:** [EM2C_GITHUB_SCOPE_FRESHNESS_HANDOFF.md](EM2C_GITHUB_SCOPE_FRESHNESS_HANDOFF.md) (stacked source implementation, simulated tests, no live installation proof)
- **EM-3A deterministic calculation:** [EM3A_DETERMINISTIC_CORE_HANDOFF.md](EM3A_DETERMINISTIC_CORE_HANDOFF.md) (pure policy implementation, synthetic tests; no live rule adapter or runtime percentage)
- **EM-3B server-only provider recheck:** [EM3B_TRUSTED_SOURCE_ADAPTER_HANDOFF.md](EM3B_TRUSTED_SOURCE_ADAPTER_HANDOFF.md) (approved-revision projection, real-source read path, private diagnostic; no public progress, no provider live smoke)
- **EM-3C-A Builder manual acceptance:** [EM3C_MANUAL_ACCEPTANCE_HANDOFF.md](EM3C_MANUAL_ACCEPTANCE_HANDOFF.md) (PR #109, additive migration 24, immutable approval/revocation, SQL/Web/Auth/browser CI PASS; automated Checks/Deployment still UNKNOWN)
- **EM-3C-B1 GitHub extended rule validators:** [EM3CB_GITHUB_EXTENDED_RULES_HANDOFF.md](EM3CB_GITHUB_EXTENDED_RULES_HANDOFF.md) (scoped Check/Artifact/Deployment validation logic and versioned V3 synthetic contracts; permissions and live runtime wiring still pending)
- **Date:** 2026-10-29
- **Repository:** gycha0109-beep/BuildMap
- **Development mode:** parallel, additive extension inside the existing BuildMap repository
- **Scope owner:** BuildMap; existing Project and Decision authority retained
- **Pilot:** gycha0109-beep/MyeongHa, using real roadmap and GitHub evidence
- **Milestone IDs:** EM-0 through EM-7 (not replacements for existing BuildMap Phase IDs)

> This roadmap is an implementation contract, not proof of deployment. EM-0 is closed; EM-1 SQL/Auth/browser E2E passed in isolated environments, but hosted release is not proven. EM-2A/B implementation remains in stacked Draft PRs without live GitHub App acceptance or hosted migrations. No Execution Map implementation progress percentage is asserted.

## 1. Purpose and product boundary

BuildMap currently records **why a project changed** through Builder-led Capture, Review, Change Card approval, and Decision Timeline.

Execution Map adds a separate question: **to what extent has the approved technical roadmap actually been implemented and verified, and what evidence supports that conclusion?**

Intended trace:

~~~text
BuildMap Project
→ Execution Track
→ Roadmap Revision / Milestone
→ Completion Criterion
→ GitHub Evidence Reference
→ Deterministic Evaluation
→ Explainable Progress
~~~

The MVP must support drilldown from the displayed progress number to criteria, evaluation rules, evidence identifiers, source revisions, and observed times. GitHub activity volume is not a substitute for roadmap completion.

## 2. Relationship to the existing BuildMap roadmap

- **Current BuildMap implementation authority** remains docs/handoff/ACTIVE-HANDOFF.md. Its Phase 53A GitHub ephemeral decision-worthiness triage continues independently.
- Execution Map is an **independent parallel development track**, not a new Phase 53A subtask, and must not defer, replace, or silently reorder the existing roadmap.
- The **repository, authentication, Project identity, application runtime, and existing deployment pipeline** are shared. Execution domain tables, APIs, services, and UI are additive and isolated.
- Existing BuildMap Capture / Review / Decision approval must keep working when Execution Map or an external evidence provider is unavailable.
- Any future PIE / WatchTower integration is optional at the provider boundary. No direct dependency or change to PIE/WatchTower core is required for MVP.
- This extension must not turn BuildMap into an automatic Change Card creator: provider observation, AI triage, completion evaluation, Capture, and approved Decision are separate concepts.

## 3. Technical baseline to reuse (verify again at implementation start)

- Frontend and server: Next.js App Router, React, TypeScript in apps/web.
- Identity and data: existing Supabase SSR integration, projects.id identity, PostgreSQL and RLS.
- GitHub: existing project binding / provider observation and exact source re-read patterns; extend through a separate execution-evidence adapter.
- CI/deployment: existing protected main, PR, required Web App CI, and Vercel Git deployment process.
- Schema policy: immutable historical migrations; **new additive migration only**, with migration sequence checked against the actual latest main and hosted history before implementation.
- Existing docs/decisions/pie-integration-boundary.md remains authoritative for external-reference semantics: external IDs never replace BuildMap Project/Decision IDs, and project_links / change_cards.evidence must not be reused as an execution evidence registry.

## 4. Proposed domain and storage

Conceptual entities (final schema, constraints and naming subject to the EM-0/EM-1 implementation audit):

| Entity | Purpose | Key invariants |
| --- | --- | --- |
| execution_tracks | Per-project technical development track | Owned by BuildMap Project, independently ordered |
| roadmap_revisions | Approved roadmap definition and revision history | Stable historical denominator / change rationale |
| execution_milestones | Milestones within a revision and track | Explicit weight and dependencies |
| completion_criteria | Testable acceptance conditions per milestone | Criterion type, policy, required/optional status |
| execution_evidence | GitHub/source references and observed revision metadata | Provider-neutral IDs, no credentials or copied secret payloads |
| criterion_evidence_links | Criterion-to-evidence trace | Explicit or reviewed association; no title-only auto-approval |
| criterion_evaluations | Evaluation result and explainable provenance | Rule version, source revision, evaluated time and reason |
| decision_execution_links | Optional Change Card-to-milestone references | **EM-6 only**; never changes Change Card authority |

Recommended required fields to evaluate before migration: BuildMap project owner, external repository binding, criterion/evidence identities, source SHA, evaluation timestamp, revision ID, last known valid evaluation, RLS scope, uniqueness keys and foreign keys.

Execution-specific tables must be protected by Builder/project authorization and RLS. Any provider credentials remain in the existing private provider auth boundary; never expose them via a public project view or evidence reference.

## 5. Evaluation and progress rules

### 5.1 Evidence types for MVP

| Rule | Evidence required |
| --- | --- |
| PR_MERGED | Exact repository / PR ID, merged state and merge SHA |
| CHECK_PASSED | Required check(s) passed for the designated **relevant SHA** |
| ARTIFACT_EXISTS | Named artifact and verified version/revision |
| DEPLOY_VERIFIED | Target environment and exact deployed revision |
| MANUAL_ACCEPTANCE | Explicit authorized acceptance with actor/time and reason |

A merged PR is not by itself proof that the product acceptance criteria are satisfied. Evidence must match the target repository, milestone, criterion, branch/SHA and intended deployment environment.

### 5.2 States

- **PASS:** valid, current source evidence satisfies the declared criterion.
- **FAIL:** verified evidence contradicts the criterion (e.g. relevant failed check).
- **PENDING:** no passing result yet, or relevant process is still underway.
- **UNKNOWN:** missing, stale, inaccessible, conflicting or unverifiable evidence.

UNKNOWN is not silently converted into PASS, FAIL or 0%-quality judgment. The UI must display both **progress** and **evidence coverage / unknown count**.

### 5.3 Deterministic weighted computation

A milestone counts as complete only when **all required criteria PASS** under the configured policy. Its completion indicator is then 1; otherwise 0. Optional criteria can be reported separately but cannot silently redefine mandatory acceptance.

~~~text
milestone_complete_i = all(required_criterion_evaluations_i == PASS) ? 1 : 0

roadmap_progress =
    100 * sum(weight_i * milestone_complete_i)
          / sum(weight_i)
~~~

The denominator includes **all applicable milestones in the selected approved roadmap revision** (including blocked, pending and unknown milestones). Never quietly omit unknown or blocked milestones to inflate progress. When weights or criteria are undefined, return **NOT_CALCULABLE**, not a guessed percentage.

Show supplementary information independently: criteria PASS/total, unknown evidence, blockers, and freshness. A 3/4 criterion count does not automatically mean that milestone is 75% implemented.

A roadmap revision change must preserve the former revision, historical evaluation, and original denominator. Display the current revision and distinguish definition/scope changes from actual implementation progress.

Evaluation is a deterministic, versioned function of approved criteria and verified evidence. AI may suggest links, missing criteria or anomalies, but **must not set PASS, approve roadmap changes or author an official Decision autonomously**.

## 6. Ordered roadmap

### EM-0 — Audit and integration boundary

**Implement:** inspect current main Project/schema/RLS, GitHub provider binding and exact re-read path, protected CI/deployment, current migration head, existing routes and module boundaries. Freeze the minimal shared interface between existing BuildMap and Execution Map. Record scope of reuse versus new adapters.

**Exit:** documented boundary, exact repository baseline and selected implementation locations; existing Builder Capture/Decision authority unchanged. No DB migration yet.

### EM-1 — Roadmap storage and revisioned model

**Implement:** additive schema migration(s), project-scoped RLS, Track/Milestone/Criteria/Revision CRUD or import path, immutable historical revision representation, input validation, default weights policy requiring explicit approved totals, safe project binding. No production data backfill assumption.

**Exit:** one project can store two roadmap revisions without losing the prior definition, and unauthorized users cannot read/write private execution data. No guessed percentages.

### EM-2 — GitHub evidence ingestion

**Implement:** use existing authorized GitHub connection where possible; user-triggered Refresh; normalized Issues, PRs, merge SHAs, commits, check runs/actions, deployments and releases; idempotent provider/repository/object keys; source URLs, observed times and relevant SHA; stale/error/permission states; criterion reference association with explicit review where confidence is insufficient.

**Exit:** real GitHub evidence can be fetched twice without duplication, traced back to exact source and revision, and unavailable sources remain UNKNOWN. No mandatory background webhook, polling or PIE dependency.

### EM-3 — Criterion evaluator and progress engine

**Implement:** versioned rule implementations (PR_MERGED, CHECK_PASSED, ARTIFACT_EXISTS, DEPLOY_VERIFIED, MANUAL_ACCEPTANCE), PASS/FAIL/PENDING/UNKNOWN transitions, source-SHA correlation, required criteria conjunction, revision-frozen weighted computation, recalculation on verified new evidence, explicit invalidation on stale evidence.

**Exit:** repeated runs with identical approved roadmap revision and evidence produce identical results; every number supports drilldown; unknown/blocked cases cannot yield false completion; no criterion/weight policy means NOT_CALCULABLE.

### EM-4 — Execution Map UI

**Implement:** project Execution overview, track list and roadmap, milestone/criterion detail, evidence/activity panel, provenance explanation, refresh/freshness state and blockers; connect to existing Project navigation without replacing Decision Timeline. Server-side read access and RLS required.

**Suggested routes (subject to existing router audit):**

~~~text
/projects/[id]/execution
/projects/[id]/execution/tracks/[trackId]
/projects/[id]/execution/milestones/[milestoneId]
/projects/[id]/execution/evidence
~~~

**Exit:** project-level reported progress drills down to an individual criterion and verified GitHub reference without exposing private provider tokens.

### EM-5 — MyeongHa real-data MVP acceptance

**Implement:** map at least one real MyeongHa development track and its actual roadmap revision into Execution Map; bind actual GitHub Issues/PRs/checks/deployment evidence where available; validate changed roadmap revisions, cross-track misattribution, stale or missing evidence, and permission boundaries.

**Exit / MVP gate:** a user can answer “why is this exact progress percentage shown?” using real approved milestones, weights, criteria and verified source links. Evidence coverage and unknowns are visible. No fictional milestone completion, fabricated CI or inferred deployment success.

### EM-6 — Decision/Outcome integration (post-MVP)

**Implement:** optional reviewed references between BuildMap Change Cards and Execution milestones, trace from decision → authorized roadmap revision → implementation → outcome. Keep decision-context evidence text distinct from execution evidence.

**Exit:** association can be navigated both ways, deleted/rebuilt without changing Decision identity or approval authority.

### EM-7 — AI analysis and advanced control (post-MVP)

**Implement:** bounded AI roadmap import/structuring suggestions, criterion/evidence link recommendations, dependency anomalies, roadmap drift, blockers and missing evidence analysis. Preserve user-approved definitions and deterministic evaluator as the sole progress authority.

**Exit:** every AI claim is marked as a suggestion and source-grounded; failure/degradation does not alter verified progress, block existing Builder workflows, or promote external activity into official Decisions.

## 7. Dependencies and parallel delivery

~~~text
Existing BuildMap roadmap: Phase 53A → subsequent approved core product work
                           (continues independently)

Execution Map: EM-0 → EM-1 → EM-2 → EM-3 → EM-4 → EM-5 [MVP]
                                               ↘ EM-6 → EM-7
~~~

EM-4 UI shell may be developed while EM-2/EM-3 mature, but cannot present invented progress. Changes to shared auth, Project identity or core database boundaries require careful integration and no alteration of existing semantics.

One repository and protected main; use isolated execution-map files/modules and separate, reviewable PRs. Do not create a second independent BuildMap product/service or fork the Decision domain. PR/CI/deployment checks must follow the repository's **current** policy at implementation time.

## 8. MVP exclusions

- No automatic Capture, Change Card or Decision approval from GitHub refresh.
- No LLM-generated progress percentages or AI self-approval.
- No assumed release/deployment evidence based solely on merged PRs.
- No mandatory real-time webhook/polling service.
- No initial multi-provider evidence platform, organization-wide ranking, hiring score or Factory Intelligence.
- No destructive migration and no requirement to modify PIE/WatchTower core.
- No required direct production checkout/commerce implementation.

## 9. Risk and evidence policy

1. **Roadmap text ambiguity:** parse/propose structure, then approve a revision; otherwise NOT_CALCULABLE.
2. **Criterion relevance:** exact PR/check SHA and intended environment verification; no title-only matching as final proof.
3. **Stale source / API failure:** record observation freshness and UNKNOWN without retroactively inventing success.
4. **Scope creep:** freeze revision history; progress drop caused by added work is distinguished from implementation regression.
5. **Parallel conflict:** additive schema/service boundaries and current-main rebase before PR; preserve existing Phase 53A contracts.
6. **Privacy:** source references are not public authorization; keep credentials and private data under existing RLS/provider auth boundaries.

## 10. Definition of done and reporting

A phase is DONE only when its listed exit criteria have code/data evidence and the relevant repository CI/verification is confirmed. Documentation alone never closes an implementation phase.

Track state at registration:

| Phase | Status | Verified implementation progress |
| --- | --- | --- |
| EM-0 | REPOSITORY_AUDIT_CLOSED (#95) | Not measured |
| EM-1 | EM-1A/B SOURCE_VERIFIED (#96); SQL_REPLAY + AUTH/POSTGREST + BROWSER_E2E_PASS; HOSTED_RELEASE_PENDING | Not measured |
| EM-2 | EM-2A (#97), EM-2B PRIVATE CACHE (#101), EM-2C LIVE DIAGNOSTIC IN_REVIEW; LIVE_GITHUB_APP_SMOKE_AND_HOSTED_RELEASE_PENDING; NO VERIFIED PROGRESS | Not measured |
| EM-3 | EM-3A/B CORE + EM-3C-A MANUAL SOURCE_VERIFIED_IN_CI; EM-3C-B1 CHECK/ARTIFACT/DEPLOY VERIFIERS IN_REVIEW (NO LIVE APP TOKEN OR PUBLIC PROGRESS) | Not measured |
| EM-4 | NOT_STARTED | Not measured |
| EM-5 | NOT_STARTED | Not measured |
| EM-6 | POST_MVP | Not measured |
| EM-7 | POST_MVP | Not measured |

Implementation work reports should identify **한 것 / 남은 것 / 다음에 할 것 / 블로커 및 승인사항**, show stage status without inventing percentage, and link to relevant PR/CI evidence. External unrelated CI is not a blocker.

## 11. Entry point for future implementation

1. Read docs/handoff/ACTIVE-HANDOFF.md and this roadmap against current main.
2. Re-check the actual implemented GitHub provider routes and active Supabase migration head.
3. Execute **EM-0** first, then implement EM-1 using additive changes.
4. Keep existing BuildMap Phase 53A and subsequent approved roadmap independently moving.
5. Do not mistake roadmap registration or schema proposal for shipped product code.
