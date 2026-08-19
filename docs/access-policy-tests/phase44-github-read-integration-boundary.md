# Phase 44 — GitHub Read Integration Boundary Regression Cases

## Scope

Phase 44 defines the architecture contract for future GitHub read access without adding runtime integration.

These cases are normative requirements for Phase 45 and later GitHub work.

## Cases

### GRA-001 — BuildMap identity remains authoritative

Given a Project is associated with a GitHub repository,
then GitHub owner/repository identity must not replace `projects.id`, and GitHub objects must not replace `change_cards.id`.

### GRA-002 — GitHub App is the authenticated read model

The first private-repository read integration must use a GitHub App installation model rather than stored PAT credentials or a broad classic OAuth App authorization.

### GRA-003 — BuildMap auth remains independent

GitHub installation/authorization must not replace Supabase/BuildMap user authentication or create a second Builder identity authority.

### GRA-004 — minimal repository permissions

Initial GitHub App repository permissions are limited to the read envelope required by the approved signal scope:

- repository metadata: read
- contents: read
- pull requests: read

No repository write permission is allowed.

Issues permission is not requested until issue ingestion is separately approved.

### GRA-005 — installation tokens are ephemeral

GitHub App installation access tokens must be minted server-side, remain short-lived, and must not be persisted in BuildMap tables, browser storage, client props, or logs.

### GRA-006 — project_links stays a pointer collection

`project_links` may identify the linked GitHub repository but must not become:

- a credential store,
- installation token store,
- sync ledger,
- raw event table,
- technical Evidence registry.

### GRA-007 — merged PR is a primary signal

The first read integration may surface merged Pull Requests as coherent Build History observations.

A merged PR remains an observation until Builder explicitly Captures it.

### GRA-008 — release is a primary signal

The first read integration may surface Releases as coherent Build History observations.

A Release remains an observation until Builder explicitly Captures it.

### GRA-009 — commits are supporting context

Raw commits may be fetched for drill-down/supporting context but must not become the default automatic Decision-candidate stream.

### GRA-010 — issues are deferred

Issues, issue comments, and issue-derived candidate ingestion are outside the initial read scope.

### GRA-011 — first synchronization is Builder-triggered

The first runtime read must be an explicit Builder-triggered refresh/read operation.

No periodic polling, cron, webhook ingestion, or background continuous sync is authorized by Phase 44.

### GRA-012 — read results do not mutate Decision state

Refreshing GitHub activity must not directly:

- create an approved Change Card,
- update Current Direction,
- mark a Major Turning Point,
- publish a Decision,
- close a Feedback Outcome.

### GRA-013 — explicit Capture is the authority transition

The intended authority path is:

```text
GitHub observation
→ Builder explicit Capture
→ private BuildMap workflow
→ AI structuring
→ Review
→ Builder approval
→ Decision
```

No provider event bypasses Builder Capture/Review authority.

### GRA-014 — provenance must be explicit

If GitHub observations are later persisted or converted to Capture, explicit provider provenance must identify the linked repository and source provider object.

AI/text similarity must not be used to infer missing provenance.

### GRA-015 — external source keys never become BuildMap IDs

PR numbers, GitHub object IDs, release IDs/tags, and commit SHAs are external source identity only.

They must not replace BuildMap Project, Capture, or Decision IDs.

### GRA-016 — no raw payload persistence by default

Future persistence must store only the minimum normalized fields needed for source identity, idempotency, display, and provenance.

Entire GitHub API payloads are not persisted by default.

### GRA-017 — provider failure is non-blocking

401, 403, 404, rate limit, timeout, or GitHub 5xx responses must not corrupt or mutate existing BuildMap domain state.

BuildMap remains usable without GitHub.

### GRA-018 — uninstall/revocation is isolated

If GitHub App access is removed or revoked, existing BuildMap Projects, Captures, Decisions, Feedback, and publication state remain intact.

### GRA-019 — private provider activity stays private

GitHub activity read by the integration is Builder-private by default.

It must not be added directly to Scout/public read surfaces.

### GRA-020 — public repository pointer boundary remains Phase 43 behavior

The existing `public_project_links` boundary remains the only Phase 44 GitHub-related public surface.

Public raw PR/release/commit feeds are not authorized.

### GRA-021 — future connection state is additive

If durable GitHub installation association becomes necessary, it must be introduced through an additive integration-binding decision.

Do not add GitHub installation IDs to `projects` or `change_cards` and do not silently overload `project_links` with credential semantics.

### GRA-022 — no GitHub runtime change in Phase 44

Phase 44 itself adds no:

- GitHub App registration/runtime code
- OAuth callback
- private key handling
- installation token minting
- REST/GraphQL provider calls
- SDK dependency
- webhook handler
- polling job
- database migration

### GRA-023 — PIE boundary remains unchanged

No PIE API, provider identity, Evidence ingestion, Factory Intelligence, or cross-project intelligence work is introduced as part of GitHub read architecture.

### GRA-024 — Phase 45 must revalidate this contract

Before Phase 45 merges, its implementation must be checked against GRA-001 through GRA-023 and any newly required schema must receive a separate explicit decision and Database Contract Gate validation.