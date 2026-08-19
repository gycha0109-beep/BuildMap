# Phase 45 — GitHub App Read Access Bootstrap

## Status

`IMPLEMENTED — REPOSITORY RUNTIME BOOTSTRAP`

Phase 45 implements the Phase 44 read-integration contract without transferring Project, Decision, or Evidence authority to GitHub.

## Baseline

- repository baseline: `638797bcdd99788dbdd22e3f340c7c954e2d6989`
- Phase 43: canonical GitHub repository pointers through `project_links`
- Phase 44: GitHub App / least-privilege / on-demand / ephemeral observation contract
- migrations before Phase 45: through sequence 16

## Runtime flow

```text
BuildMap Project
→ canonical GitHub project_link
→ Builder starts GitHub App connection
→ signed installation state
→ GitHub App installation
→ BuildMap setup route receives installation_id + state
→ BuildMap validates signed state and current Builder
→ explicit GitHub App user authorization with PKCE
→ BuildMap exchanges code server-side
→ user access token verifies exact installation + exact linked repository
→ private provider-neutral integration_binding is written
→ user token is discarded
→ Builder clicks Refresh GitHub activity
→ binding integrity proof is verified
→ repository-scoped installation token is minted server-side
→ merged PR + Release observations are normalized
→ response is displayed ephemerally
→ installation token is discarded
```

No step above creates a Rough Note, AI Draft, Change Card, publication change, Feedback outcome, or public GitHub activity record.

## Provider-neutral durable binding

Phase 45 determined that durable connection association is necessary: a repository pointer alone cannot safely identify which GitHub App installation is authorized to read a private repository.

Migration 17 adds `integration_bindings` rather than overloading `project_links` or adding GitHub IDs to `projects` / `change_cards`.

The binding stores only normalized external association identity:

- `project_link_id`
- `provider`
- external connection identity
- optional external account identity/label
- external resource identity/label
- server-generated binding integrity proof
- connection status

It explicitly does not store:

- GitHub App private key
- GitHub client secret
- GitHub user access token
- GitHub installation access token
- webhook secret
- raw GitHub API payload
- synchronized PR/release records

The table is Builder-private and has no public-safe view.

## Binding integrity proof

`integration_bindings` uses ordinary authenticated RLS rather than introducing a new Supabase service-role runtime.

Because an authenticated Project owner can call the source-table API directly, provider identifiers from a row are not trusted by themselves.

After GitHub OAuth verification succeeds, the server computes an HMAC proof over:

```text
provider = github
project_link_id
installation_id
repository_id
canonical repository full name
```

The Refresh endpoint re-computes and verifies this proof before it may mint an installation token.

Consequences:

- a forged installation ID cannot authorize a read,
- a forged repository ID cannot authorize a read,
- copying a proof to another Project Link fails,
- changing the repository pointer invalidates the binding,
- the proof is tamper evidence, not a provider credential.

The HMAC secret remains a server environment secret.

## Installation ID is not trusted from redirect input

The GitHub setup response contains `installation_id`, but Phase 45 does not treat it as verified authority.

The setup route first validates BuildMap-owned signed state and the current Builder session. It then starts an explicit GitHub App user authorization flow with PKCE.

The resulting GitHub App user access token is used only in callback memory to verify:

1. the installation is accessible to that authenticated GitHub user,
2. the installation belongs to this GitHub App,
3. the exact repository represented by the BuildMap Project Link is accessible through that installation.

Only after all three checks pass is the private binding saved.

The GitHub user access token is never persisted.

## Server-only credential boundary

Runtime secrets are environment configuration only:

- `GITHUB_APP_ID`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_STATE_SECRET`
- optional `GITHUB_APP_CALLBACK_URL`

None are `NEXT_PUBLIC_*` values.

The App JWT and installation token are generated server-side only.

## Read scope

Phase 45 reads only the Phase 44 primary signals:

### Merged Pull Requests

Normalized fields include:

- PR identity
- title
- compact body summary when present
- merged timestamp
- canonical URL
- head/base context when present

Closed but unmerged PRs are discarded.

### Releases

Normalized fields include:

- release identity
- release/tag title
- compact release notes when present
- publish/create timestamp
- canonical URL

Draft releases are discarded.

### Still excluded

- Issues
- comments
- workflow runs
- deployments
- discussions
- arbitrary file ingestion
- default raw commit stream

## On-demand and ephemeral

There is no sync daemon.

A GitHub read occurs only when the Builder presses `Refresh GitHub activity`.

The activity response is `no-store` and exists only in request/browser state. Phase 45 creates no PR/release observation table and no sync cursor.

## Failure isolation

GitHub failures are non-authoritative and non-mutating.

A missing configuration, invalid binding, revoked installation, repository removal, permission error, rate/provider failure, or other read error must not mutate:

- Project
- repository pointer visibility
- Capture
- AI Draft
- Decision
- publication
- Feedback
- Outcome

The UI reports reconnect/provider errors while the rest of BuildMap remains usable.

## Public boundary

Public behavior remains Phase 43 behavior:

```text
public_project_links
→ optional public repository pointer only
```

`integration_bindings` has no anonymous privilege and no public-safe view.

Raw GitHub activity is never exposed on the Scout Public Project Map in Phase 45.

## Authority boundary

```text
GitHub repository identity
!= BuildMap Project identity

GitHub observation
!= BuildMap Evidence authority
!= BuildMap Decision

GitHub App authorization
!= BuildMap authentication authority
```

BuildMap's Supabase session, Project ownership, Capture workflow, Review, and Builder approval remain authoritative.

## Migration impact

New additive migration:

`20260819002000_buildmap_17_integration_bindings.sql`

Historical migrations `00–16` remain unchanged.

The repository Database Contract Gate must pass on the exact PR head. Passing that gate verifies repository migration integrity; it does not prove migration 17 is deployed to a live BuildMap database.

## Explicit non-goals

Phase 45 does not add:

- webhook ingestion
- polling
- cron/background synchronization
- persistent GitHub observation ledger
- automatic Capture
- automatic Decision candidates
- Issues ingestion
- public raw provider activity
- Supabase service-role credential
- PIE integration
- Factory Intelligence
- production deployment

## Next gate

The next GitHub step should be a bounded **GitHub Observation → explicit Capture provenance** phase.

It must preserve the Phase 44/45 rule that the Builder explicitly chooses which observation enters BuildMap Capture. If durable observation provenance is required, it must be justified as additive normalized source identity rather than by storing raw GitHub payloads or making provider objects authoritative.
