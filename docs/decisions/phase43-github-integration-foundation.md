# Phase 43 — GitHub Integration Foundation

## Status

IMPLEMENTED CANDIDATE — pending exact-head CI and merge.

## Context

P2 closed the core BuildMap loop through Capture → Review → Decision → Public Map → External Feedback → Evidence → Outcome.

P3 begins with GitHub integration. Before implementation, the repository was audited for an existing provider-neutral integration primitive.

The audit found that `project_links` already provides the correct first boundary:

- owned by a BuildMap Project,
- created and mutated by the Project owner,
- generic `label` + `url` representation,
- `link_type = github` already supported,
- independent `internal` / `public` visibility,
- `public_project_links` already provides a public-safe read boundary.

Therefore Phase 43 does not create a GitHub-specific schema or runtime credential model.

## Decision

Phase 43 activates the existing `project_links` model as the first GitHub integration foundation.

```text
BuildMap Project
    ↓ explicit Builder association
project_links(link_type = github)
    ↓ optional Builder publication
public_project_links
    ↓
Scout Public Project Map
```

This is a repository pointer, not a synchronized GitHub connection.

## Repository identity boundary

Accepted repository identity is a canonical GitHub repository root URL:

```text
https://github.com/{owner}/{repository}
```

Input may use `http`, `https`, `www.github.com`, or a trailing `.git`; BuildMap normalizes accepted input to the canonical HTTPS GitHub root.

The integration rejects:

- non-GitHub hosts,
- URLs containing credentials or ports,
- query strings or fragments,
- commit URLs,
- branch/tree/blob URLs,
- PR URLs,
- issue URLs,
- any path other than `{owner}/{repository}`.

Phase 43 stores no GitHub repository numeric ID. BuildMap Project identity remains `projects.id`.

## Builder surface

A new Project `Integrations` surface allows the Builder to:

- add a GitHub repository pointer,
- assign an optional display label,
- keep it internal or select it for Public Map display,
- change visibility later,
- remove the association by archiving the `project_links` row.

Adding the same canonical repository URL again updates the existing active association rather than intentionally creating another row.

Multiple different repositories may be associated with one BuildMap Project. Phase 43 does not assume a one-repository-per-project model.

## Public boundary

Public GitHub repositories are read through the existing `public_project_links` view only.

The Public Project Map does not read `project_links` directly.

A repository is Scout-visible only when the existing public-safe contract allows it, including:

- Project is public,
- Project is non-archived,
- Project Link is public,
- Project Link is non-archived.

Phase 43 does not widen source-table grants or RLS.

## Authority boundary

GitHub is Build History. BuildMap remains Decision History.

A repository association does not create, approve, modify, or publish a BuildMap Decision.

```text
GitHub commit / PR / issue
≠ BuildMap Decision
```

An official BuildMap Decision still requires the existing Builder Review and approval path.

`project_links` must remain an external-resource pointer collection. It is not an Evidence registry and does not acquire Decision authority.

## No credential or synchronization layer

Phase 43 intentionally adds none of the following:

- GitHub OAuth,
- GitHub App installation,
- personal access tokens,
- GitHub SDK/runtime client,
- webhook endpoint,
- polling,
- commit/PR/issue ingestion,
- repository metadata synchronization,
- source revision fields,
- GitHub external IDs on `projects` or `change_cards`,
- automatic Decision candidate detection.

No GitHub secret or access token is required to run BuildMap after Phase 43.

## PIE boundary

The existing PIE integration boundary remains unchanged.

Phase 43 is GitHub ↔ BuildMap P3 work only. It introduces no PIE API/client/schema, PIE evidence ingestion, Factory Intelligence, or cross-project intelligence.

## Database decision

No migration is required.

Existing `project_links`, its owner-centered RLS policies, and `public_project_links` are sufficient for Phase 43.

## Runtime independence

BuildMap continues to operate normally when GitHub is unavailable because Phase 43 performs no runtime GitHub request.

A saved repository pointer is optional Project context, not a required dependency for Capture, Review, Decision, Public Map, Feedback, Evidence, or Outcome flows.

## Follow-up boundary

Any later phase that reads GitHub repository state must first decide the authentication and synchronization architecture separately.

That later decision must preserve:

- BuildMap-owned Project/Decision identities,
- provider-neutral external association semantics where practical,
- explicit provenance for imported observations,
- Builder authority over Decision creation,
- graceful operation when GitHub is unavailable.

Phase 43 does not pre-select OAuth App vs GitHub App vs another read mechanism.
