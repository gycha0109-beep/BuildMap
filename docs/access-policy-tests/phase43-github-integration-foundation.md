# Phase 43 — GitHub Integration Foundation Regression Cases

## Scope

Verify that GitHub repository association uses the existing provider-link boundary without transferring Project, Decision, Evidence, or public-read authority to GitHub.

## Cases

### GHF-001 — Project owner may add canonical repository link

Given an authenticated Builder owns Project A,
when the Builder submits `https://github.com/example/repository`,
then an active `project_links` row may be created for Project A with `link_type = github`.

### GHF-002 — accepted repository URL is canonicalized

Accepted root forms such as:

- `http://github.com/example/repository`
- `https://www.github.com/example/repository`
- `https://github.com/example/repository.git`

must persist as:

`https://github.com/example/repository`

### GHF-003 — non-GitHub host rejected

A URL whose host is not `github.com` / `www.github.com` must not be stored as a GitHub integration pointer.

### GHF-004 — nested GitHub resources rejected

Commit, branch, blob, PR, issue, release, action, or other nested paths must not be accepted as repository identity.

Repository identity is the repository root only.

### GHF-005 — query, fragment, credentials, and port rejected

Repository URLs containing query strings, fragments, embedded credentials, or explicit ports must be rejected.

### GHF-006 — duplicate canonical pointer updates existing association

Given an active Project Link already has the submitted canonical GitHub URL,
when the Builder submits the same repository again,
then Phase 43 updates that active association's display label / visibility rather than intentionally creating a second row.

### GHF-007 — multiple different repositories allowed

A BuildMap Project may contain multiple active `link_type = github` rows for different repository root URLs.

Phase 43 must not introduce a one-repository-per-project assumption.

### GHF-008 — non-owner mutation rejected

A Builder who does not own Project A must not be able to add, change visibility, or archive Project A's repository pointers.

Application ownership checks and existing `project_links` RLS remain aligned.

### GHF-009 — removal archives instead of deleting

Removing a GitHub repository association must set `archived_at` and force `visibility_status = internal` rather than requiring a source-row DELETE policy.

### GHF-010 — internal repository not public

Given a repository pointer has `visibility_status = internal`,
then it must not be returned by `public_project_links` and must not appear on the Scout Public Project Map.

### GHF-011 — public repository still requires public Project

Given a repository pointer is `public` but its Project is private or archived,
then it must not appear on the Scout Public Project Map.

### GHF-012 — public read uses public-safe view only

The Scout Public Project Map must read repository pointers through `public_project_links`, not the `project_links` source table.

### GHF-013 — public link contains no credential state

Public repository rendering may use only the existing public-safe fields:

- Project Link ID,
- Project ID,
- label,
- URL,
- link type,
- sort order.

No GitHub access token, installation ID, repository numeric ID, account credential, Builder auth identity, or internal synchronization state exists in Phase 43.

### GHF-014 — repository link does not create Decision

Adding, publishing, hiding, or removing a GitHub repository association must not create or modify a Rough Note, AI Structured Draft, Change Card, Feedback Outcome, or official Decision.

### GHF-015 — GitHub unavailability does not block BuildMap

Capture, Review, Decision, Public Map, Feedback, Evidence, and Outcome flows must not require a live GitHub request in Phase 43.

### GHF-016 — no GitHub runtime credential dependency

Phase 43 must not add GitHub OAuth credentials, GitHub App secrets, PATs, SDK dependencies, webhook endpoints, or polling configuration.

### GHF-017 — no database expansion

Phase 43 must add no migration, schema field, RLS change, grant change, or public-safe view change.

The existing `project_links` and `public_project_links` contracts are reused.

### GHF-018 — BuildMap identity authority unchanged

GitHub owner/repository names and URLs must not replace or mutate `projects.id` or `change_cards.id`.

### GHF-019 — project_links is not Evidence authority

A GitHub repository pointer must not be interpreted as technical Evidence authority or as PIE Evidence. It remains an external resource pointer.

### GHF-020 — PIE boundary unchanged

Phase 43 introduces no PIE client/API/SDK/auth/webhook/polling, PIE IDs, PIE evidence ingestion, Factory Intelligence, or cross-project/factory model.

### GHF-021 — exact-head application validation

The final Phase 43 head must pass Web App CI:

- exact event SHA checkout,
- dependency install,
- lint,
- typecheck,
- production build.
