# Phase 45 — GitHub App Read Access Bootstrap Regression Contract

## Purpose

This contract defines repository/application boundaries that must remain true after Phase 45.

## P45G-001 — Repository pointer remains the BuildMap association root

Given a Project has a GitHub `project_link`, when GitHub App read access is connected, the Project/Decision IDs remain BuildMap IDs and no GitHub ID is written to `projects` or `change_cards`.

Expected: PASS.

## P45G-002 — Installation redirect input alone is insufficient

Given a caller supplies an arbitrary `installation_id`, when setup state is missing, expired, forged, or belongs to another BuildMap user, no integration binding is created.

Expected: PASS.

## P45G-003 — Exact repository authorization is required

Given a valid GitHub App installation exists but does not include the exact repository represented by the Project Link, callback verification rejects the binding.

Expected: PASS.

## P45G-004 — GitHub user access token is transient

Given OAuth code exchange succeeds, the returned GitHub App user access token is used only to verify installation/repository access during the callback.

Expected:
- no DB column stores it,
- no cookie stores it,
- no browser response exposes it,
- no log statement writes it.

## P45G-005 — Installation token is transient and repository-scoped

Given a valid binding and Builder Refresh, the server mints a GitHub App installation token with `repository_ids` restricted to the bound repository.

Expected:
- token is not stored,
- token is not sent to the browser,
- token is not logged,
- token is used only for the provider reads in that request.

## P45G-006 — Forged binding cannot mint a token

Given an authenticated Project owner directly changes `external_connection_id`, `external_resource_id`, repository label, or copies a binding proof from another Project Link, Refresh verifies the server HMAC binding proof before token minting.

Expected: invalid/tampered binding returns reconnect/integrity failure and makes no provider token request.

## P45G-007 — Pointer change invalidates previous binding

Given a Project Link URL changes to another canonical GitHub repository while an old binding remains, the stored resource label and HMAC proof no longer match the current canonical pointer.

Expected: Read access is treated as invalid until reconnect.

## P45G-008 — Anonymous users cannot read integration bindings

Given an anonymous Scout, direct `integration_bindings` SELECT/INSERT/UPDATE/DELETE is denied by ACL/RLS.

Expected: PASS.

No `public_integration_bindings` view is created.

## P45G-009 — Builder owner isolation

Given Builder A owns Project A and Builder B does not, Builder B cannot select/insert/update Project A's `integration_bindings` through the authenticated source-table surface.

Expected: PASS through Project-owner RLS.

## P45G-010 — Public Project Map exposes pointer only

Given a repository pointer is public and read access is connected, the Scout Public Project Map may continue to expose the repository pointer through `public_project_links`.

Expected: installation/account/binding/proof/activity data is not public.

## P45G-011 — Primary activity scope is bounded

Builder Refresh returns only normalized:
- merged Pull Requests,
- non-draft Releases.

Expected: closed unmerged PRs and draft releases are filtered; Issues/workflows/comments are not fetched.

## P45G-012 — Activity is ephemeral

Given Refresh succeeds, no GitHub PR/release observation record, sync cursor, raw provider payload, Rough Note, AI Draft, or Change Card is written to the database.

Expected: response uses `Cache-Control: no-store` and UI stores results only in component state.

## P45G-013 — Provider failure does not mutate BuildMap

Given GitHub returns 401/403/404/5xx or authorization is revoked, the activity endpoint returns a bounded provider/reconnect error.

Expected: Project, pointer, Capture, Decision, publication, Feedback, and Outcome state are unchanged.

## P45G-014 — GitHub cannot approve Decisions

Given any merged PR or Release appears in Refresh, it does not automatically:
- create a Rough Note,
- invoke AI structuring,
- create/approve a Change Card,
- modify Current Direction,
- mark a Major Turning Point,
- publish a Decision.

Expected: PASS.

## P45G-015 — Server secrets remain server-only

Expected GitHub App secrets are non-public environment variables. No secret uses a `NEXT_PUBLIC_` prefix and no secret value is committed.

## P45G-016 — No service-role expansion

Phase 45 must not introduce a Supabase service-role key into the web runtime.

Expected: authenticated RLS remains the DB user boundary; HMAC proof prevents provider-binding forgery from becoming token-mint authority.

## P45G-017 — Migration contract

Expected:
- migrations 00–16 byte/history remain unchanged,
- sequence 17 is additive,
- filename matches repository migration contract,
- Database Contract Gate passes exact PR head,
- no remote DB access occurs in the gate.

## P45G-018 — Exact-head Web App CI

Expected exact PR head passes:
- install,
- lint,
- typecheck,
- production build.

## P45G-019 — GitHub App absence is nonblocking

Given required GitHub App environment configuration is absent, BuildMap core and existing repository pointer management still render and operate.

Expected: read-connect control is unavailable/config-missing, not an application-wide failure.

## P45G-020 — Deferred automation remains absent

Expected Phase 45 contains no:
- webhook receiver,
- cron/polling scheduler,
- background sync worker,
- automatic Decision candidate detector,
- Issue intake,
- PIE/Factory Intelligence integration.
