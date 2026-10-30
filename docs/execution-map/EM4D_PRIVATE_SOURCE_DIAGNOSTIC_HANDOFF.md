# EM-4C — On-demand Private Source Diagnostics (Unpublished)

- Date: 2026-10-30
- State: **PRE-RELEASE STACKED DRAFT / NOT AN OFFICIAL PROGRESS OR COMPLETION VIEW**
- Parent: EM-4A/B integration PR #110, which is based on EM-3C #109 → EM-3B #107 → EM-3A #104 → EM-2C #103 → EM-2B #101 → EM-2A #97 → EM-1 #96.
- Parallel EM-3C-B1 provider validators #111 are NOT part of this stack; no permission expansion, no runtime switch.

## Why

EM-4B already shows approved revision evidence association counts and all-UNKNOWN completion, but had no user-facing path to request the existing EM-3B server-only source diagnostic. EM-3B has an owner-scoped GET verification-readiness endpoint, intentionally returning progress and criterion evaluation as NOT_PUBLISHED. It may perform a real provider reread when source grants allow but is not an official evaluator publication.

This patch adds an **explicit user-triggered** read-only private diagnostic to the approved revision coverage page. A first page load does not query GitHub or auto-refresh. The client fetches the existing same-origin endpoint only after a Builder clicks the button, with no-store, same-origin credentials and a bounded timeout.

## Fail-closed preview contract

- The client accepts only the exact selected approved revision UUID, expected criterion IDs, bounded rule records, recognized rule types and diagnostic statuses, and the literal response fields `progress: NOT_PUBLISHED` and `criterionEvaluation: NOT_PUBLISHED`.
- A source recheck marked `FRESH_SOURCE_MATCHED_NOT_APPROVED_FOR_PUBLICATION` displays **원본 일치 관측 · 공식 완료 아님**. It must never display official PASS, a completion percentage, or an approved Decision.
- Invalid, conflicting, unknown, cross-revision, numerically published, excessive, or malformed JSON responses suppress the entire diagnostic. Auth/permission/404/provider 503 or network failures display unavailable/UNKNOWN without leaking provider secrets or partial results.
- If the EM-4B revision/criterion read is incomplete or over its limit, this button does not render. Auth checks, repository token brokering and source attestation remain entirely on the server-owned EM-3B code path.
- Per-rule code is displayed as a diagnostic reason, not evidence of acceptance. The existing approved revision and cached SHA drilldown remain independent; neither can create official progress.

## Tests

- EM-4C parser unit contract: foreign revision, unknown/duplicate criterion, numeric progress injection, fake PASS, bad provider state, invalid timestamps/reason strings, unbounded diagnostics, mismatch of verificationAvailable and reason, no numeric output.
- EM-4B local Playwright owner-browser test: no automatic request on page load; on-demand private diagnostic with a stubbed same-origin endpoint, matched-source result explicitly labeled unpublished; numeric response and 503 fail closed. The owner/anonymous/non-owner SSR/RLS tests remain.
- Exact-head CI: EM-4A/4B contracts, EM-4C parser, lint/typecheck/build, disposable local GoTrue/PostgREST and browser E2E, PIE and GitGuardian.

## Unfulfilled release gates

Migrations 22/23/24 remain pending hosted controlled release and Auth/RLS verification. The current GitHub App's limited scopes cannot verify Checks/Artifacts/Deployments; PR #111 provides only isolated B1 validators, not approved broader permissions or live installation smoke. The existing readiness API does not publish official evaluated progress, and this patch does not change that.

Future EM-4 verified progress requires actual authorized source proofs across the approved criterion rule types, revision-locked versioned evaluations, freshness/UNKNOWN invalidation, safe persistence and explicit hosted release approval. EM-5 real-project pilot is not proven by mock browser responses.

**Disposition:** keep PR #110 Draft; no merge to main, no hosted migrations, no automatic provider calls or Decision transitions.
