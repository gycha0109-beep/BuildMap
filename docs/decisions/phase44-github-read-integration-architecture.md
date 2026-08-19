# Phase 44 — GitHub Read Integration Architecture & Sync Boundary

## Status

`APPROVED — ARCHITECTURE GATE`

Phase 44 is intentionally architecture-only.

It does **not** add GitHub credentials, OAuth, GitHub App runtime code, API reads, synchronization, webhooks, polling, persistence, or automatic Decision candidates.

The purpose is to define the smallest safe runtime contract for the next implementation phase.

---

## 1. Baseline audited

Repository baseline before this Phase:

- repository: `gycha0109-beep/BuildMap`
- main: `3f31f8262aad14761c38af0fb41656f5612cedeb`
- Phase 43 GitHub repository pointer foundation: merged

Current GitHub-related implementation before Phase 44:

- `project_links` already supports `link_type = 'github'`
- Builder can attach canonical GitHub repository root URLs to a BuildMap Project
- Builder chooses `internal` or `public`
- Scout reads public repository pointers only through `public_project_links`
- no GitHub token or credential environment variables exist
- no GitHub OAuth/GitHub App callback exists
- no GitHub SDK/runtime dependency exists
- no GitHub data is persisted as Capture, Evidence, or Decision

This baseline is structurally sufficient to define a read integration without changing BuildMap Project or Decision identity.

---

## 2. Product authority remains unchanged

BuildMap positioning remains:

```text
GitHub = Build History
Notion = Knowledge History
BuildMap = Decision History
```

Therefore:

```text
GitHub activity
!= BuildMap Decision
!= BuildMap Decision authority
!= BuildMap Evidence authority
```

A GitHub repository association is an external-resource pointer only.

GitHub must never replace:

- `projects.id`
- `change_cards.id`
- Builder approval authority
- BuildMap public/private publication authority

---

## 3. Authentication choice

### Decision

The first authenticated GitHub read integration SHALL use a **GitHub App installation model**, not a classic OAuth App or stored Personal Access Token.

### Why

GitHub Apps provide:

- repository-level installation choice,
- fine-grained repository permissions,
- short-lived installation access tokens,
- an app identity independent from the Builder's BuildMap session,
- a later path to installation lifecycle events without broad user-scoped access.

BuildMap authentication remains Supabase-based.

Installing a GitHub App associates an external GitHub installation with a BuildMap integration; it does **not** make GitHub the BuildMap identity provider.

### Initial permission envelope

The first runtime implementation SHOULD request only:

```text
Repository metadata: read
Contents: read
Pull requests: read
```

Rationale:

- `Contents: read` is sufficient for repository commits and releases.
- `Pull requests: read` is sufficient for merged PR metadata and PR read surfaces.
- Issues are not required for the first signal scope and therefore SHOULD NOT be requested initially.

No write repository permission is authorized.

### Token handling

Installation access tokens SHALL:

- be minted server-side only,
- remain short-lived,
- never be sent to the browser,
- never be stored in BuildMap tables,
- never be written to logs,
- never become `NEXT_PUBLIC_*` environment variables.

The GitHub App private key, App ID, and related server credentials are deployment secrets, not domain data.

---

## 4. Repository association boundary

Phase 43 `project_links(link_type = 'github')` remains the user-facing repository pointer.

It SHALL NOT be expanded into:

- a credential store,
- a GitHub installation registry,
- an event ledger,
- a technical Evidence registry,
- a raw GitHub payload store.

If the next implementation phase requires durable GitHub installation association, that state must be additive and provider-neutral enough to avoid placing GitHub installation IDs directly on `projects` or `change_cards`.

A possible future connection record may associate:

```text
BuildMap Project / project_link
↔ provider connection
↔ provider account/installation
```

but Phase 44 does not authorize or create such schema.

---

## 5. Initial signal scope

The first GitHub read experience SHALL prioritize coherent build-history signals over noisy activity volume.

### Primary signals

1. **Merged Pull Requests**
   - title
   - body/summary when available
   - PR number
   - merged timestamp
   - canonical URL
   - head/base context when useful

2. **Releases**
   - release/tag identity
   - title/name
   - body/notes when available
   - published timestamp
   - canonical URL

### Supporting signal

3. **Commits**
   - used for explicit drill-down or supporting context
   - not treated as a default Decision-candidate stream

Raw commit volume is too noisy to become the initial BuildMap intake boundary.

### Deferred signals

Not authorized in the first read implementation:

- Issues
- issue comments
- PR review comments as an independent stream
- workflow runs
- deployments
- discussions
- repository files/content ingestion
- arbitrary Git history crawling

These require separate product justification and permission review.

---

## 6. Sync strategy

### First implementation: explicit on-demand read

The first runtime implementation SHALL use Builder-triggered refresh/read.

Example:

```text
Builder opens Integrations
→ Refresh GitHub activity
→ BuildMap requests current read-only provider data
→ normalized observation list is displayed
```

This phase order is deliberate.

It avoids hidden background state before:

- installation lifecycle is implemented,
- idempotency rules are proven,
- provenance persistence is defined,
- failure recovery is observable.

### Not yet authorized

- periodic polling
- cron refresh
- webhook ingestion
- background synchronization
- continuous event stream processing

GitHub Apps provide a future webhook path, but BuildMap SHALL NOT enable it until the read contract and provenance/idempotency boundary have been validated in production-like execution.

---

## 7. Observation → Decision boundary

GitHub data is an **observation**, not a Decision.

Initial intended flow:

```text
GitHub repository
→ read-only GitHub observation
→ Builder inspects activity
→ Builder explicitly chooses Capture
→ private BuildMap Capture / Rough Note
→ AI structures conservatively
→ Review
→ Builder approves
→ official BuildMap Decision
```

The Builder's explicit `Capture` choice is the authority transition from external build history into BuildMap's private decision workflow.

No GitHub event may directly:

- create an approved Change Card,
- change Current Direction,
- mark a Major Turning Point,
- close Feedback Outcome,
- publish a Decision.

Automatic Decision candidate detection remains a later P3 capability and must preserve Builder approval.

---

## 8. Provenance contract

Phase 44 does not add a provenance table, but future persisted GitHub observations MUST preserve explicit source identity.

A future normalized observation must be able to answer:

```text
Which BuildMap Project did this observation belong to?
Which linked repository produced it?
Which provider produced it?
What provider object was observed?
What stable provider source key identifies that object?
What canonical provider URL points to it?
When did the provider object occur/update?
When did BuildMap observe it?
```

Provider object examples:

- Pull Request: repository + PR number / provider object identity
- Release: repository + release identity/tag
- Commit: repository + commit SHA

These are external source identities only.

They never replace BuildMap IDs.

### No inference

BuildMap MUST NOT reconstruct provenance by title similarity, body similarity, commit-message matching, or AI guesswork when explicit source identity is missing.

---

## 9. Persistence boundary

### Phase 44

No GitHub observation persistence.

### First runtime read

Prefer ephemeral normalized reads until the connection and source-key contract is proven.

If persistence becomes necessary for:

- idempotency,
- unread/new activity tracking,
- retry/failure recovery,
- Capture provenance,

then a separate additive schema decision is required.

Do not store entire GitHub API payloads by default.

Persist only the minimum normalized source/provenance fields required by the product contract.

---

## 10. Failure isolation

GitHub is optional infrastructure.

BuildMap SHALL operate normally when GitHub is:

- not connected,
- uninstalled,
- permission-revoked,
- rate-limited,
- temporarily unavailable,
- returning 401/403/404/5xx.

A GitHub read failure must not mutate:

- Project state,
- Decision state,
- publication state,
- Feedback state,
- existing Captures.

The repository pointer may remain visible to the Builder while runtime read status reports that provider access is unavailable.

---

## 11. Public/private boundary

Phase 43 publication behavior remains authoritative:

- `project_links.visibility_status = 'public'` controls whether the repository pointer may appear through `public_project_links`.

GitHub read activity itself remains Builder-private by default.

The first read integration SHALL NOT expose raw PR/release/commit activity on the Scout Public Project Map.

If a GitHub observation later contributes to an approved and published BuildMap Decision, the public artifact is the Builder-approved BuildMap Decision — not the raw provider payload.

---

## 12. PIE / Factory Intelligence boundary

Phase 44 does not change the PIE compatibility decision.

Still prohibited:

- PIE client/API/SDK/auth
- PIE webhook/polling
- PIE IDs on BuildMap core entities
- PIE Evidence ingestion
- Factory Intelligence
- cross-project/factory intelligence models

The GitHub read adapter is a BuildMap P3 integration concern only.

It must not be generalized into PIE core.

---

## 13. Phase 44 implementation impact

```text
DB migration: 0
Schema change: 0
RLS/grant change: 0
Public-safe view change: 0
API/runtime integration: 0
Dependency change: 0
GitHub credential state: 0
GitHub sync state: 0
Production deployment: 0
```

---

## 14. Next implementation gate

Recommended next phase:

**Phase 45 — GitHub App Read Access Bootstrap**

Phase 45 may implement only the contract approved here:

1. server-only GitHub App configuration boundary,
2. installation/connection association design,
3. selected-repository verification against the Phase 43 repository pointer,
4. short-lived installation token minting,
5. Builder-triggered read-only refresh,
6. normalized merged-PR + release preview,
7. non-blocking provider error states.

Phase 45 must not yet add:

- webhooks,
- polling,
- automatic Decision candidates,
- issue ingestion,
- public raw GitHub activity,
- PIE integration.

If Phase 45 determines a database connection record is necessary, it must be separately justified as an additive provider-neutral integration binding rather than silently overloading `project_links`.

---

## 15. External verification basis

Architecture choices were checked against current GitHub documentation on 2026-08-19:

- GitHub Apps are generally preferred over OAuth Apps for fine-grained permissions, repository-level control, and short-lived tokens.
- GitHub App installation access tokens can be constrained to granted repositories and permissions and expire after one hour.
- listing commits requires `Contents: read` for private resources.
- listing releases requires `Contents: read` for private resources.
- Pull Request REST reads use `Pull requests: read` fine-grained permission.

These provider facts support the permission and authentication decisions above; BuildMap's signal prioritization and Capture/Decision boundary are BuildMap product architecture decisions.