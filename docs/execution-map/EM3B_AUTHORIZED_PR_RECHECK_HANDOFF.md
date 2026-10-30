# EM-3B — Server-only GitHub PR Verification Adapter

- Date: 2026-10-30
- Status: SOURCE IMPLEMENTED IN STACKED DRAFT / STATIC + SYNTHETIC TEST ONLY / NO LIVE PROVIDER ACCEPTANCE / NOT DEPLOYED
- Parent: EM-3A Draft PR #104; preceding EM-2C #103, EM-2B #101, EM-2A #97, EM-1 #96
- Roadmap: Execution Map EM-3, bounded to PR_MERGED only

## Implementation

The server-only entrypoint is apps/web/lib/execution/em3b-authorized-pr-recheck.ts. It exposes no HTTP route or client-configurable proof endpoint. Before constructing a proof it rechecks all of:

1. Supabase authenticated user; read-only user and Builder identities (no first-login profile INSERT).
2. Active Project ownership, exact project-scoped PR_MERGED criterion and approved roadmap revision.
3. Builder-reviewed, same-project criterion-to-evidence link with review actor and time.
4. Active, unarchived GitHub Project link, canonical repository name, numeric repository identity, active binding, and HMAC proof.
5. Exact GitHub App installation identity and repository identity under the existing narrow repository-scoped token.
6. Latest cached source observation only as a comparison target, followed by a NEW exact GitHub PR detail reread. Unmerged, missing SHA, permission issue, changed SHA, timeout, stale proof or provider outage => null/UNKNOWN.
7. Final guarded composition of a bounded 5-minute PR recheck for EM-3A. No progress calculation, Decision approval or persistence is performed in the adapter.

The separate em3b-proof-guard.ts checks source ID, evidence UUID, repository ID, 40-hex SHA, source match and time validity. This helper alone does NOT establish authentication: only the server-owned path can create an authoritative proof following real authenticated provider reads. Cached SOURCE_CONFIRMED rows, reviewed links, browser JSON or user-provided FreshProviderRecheck values remain untrusted.

## Test and security scope

- Synthetic tests cover SHA A/B conflicts, incorrect PR ID, identity conflicts, stale/future clock, missing source and equivalence to existing EM-3A evaluation contract.
- Source contract also asserts that the server adapter retains Auth/Project/RLS/revision/review/HMAC/App installation/repository gates and contains no write method or HTTP endpoint.
- Uses existing GitHub App permissions. It neither requests Checks/Actions/Issues/Deployments scopes nor claims to implement their evaluators.
- No schema/migration changes, server writes, new provider tokens in a table, background sync or production deployment.
- Existing BuildMap Capture/Review/Decision remain outside this feature.

## Release hold

This is a STACKED DRAFT only. The hosted BuildMap database still requires the separately approved, fully tested migrations 22 and 23; no real GitHub App read or owner/non-owner Auth/PostgREST E2E has been conducted for this adapter. An independent server-entrypoint integration, malicious input tests and real scoped installation smoke are required before release. Synthetic PASS does not validate a live GitHub installation or prove roadmap completion.

No merges to main are authorized by this pre-release slice. Preserve the full upstream PR chain and do not silently bypass controlled schema release.
