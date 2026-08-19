# Phase 42 — P2 End-to-End Closure Regression Cases

## Scope

Completed P2 surfaces must remain mutually consistent without widening Builder/Scout/public authority boundaries.

## Cases

### P2C-001 — approved Feedback-origin Decision refreshes Evidence

Given a Feedback-origin candidate is approved,
when Decision finalization succeeds,
then the Builder Evidence surface is revalidated so the new approved Decision can be traced to its explicit Capture/Feedback provenance.

### P2C-002 — approved Feedback-origin Decision refreshes Outcomes

Given a Feedback-origin candidate is approved,
when Decision finalization succeeds,
then Feedback Outcomes is revalidated so the evidence path may advance to `Approved Decision` without changing the Builder's explicit outcome status.

### P2C-003 — Decision approval does not auto-close Feedback outcome

Even after P2C-002, `feedbacks.review_status` remains unchanged unless the Builder explicitly selects an Outcome.

### P2C-004 — Project unpublish refreshes public Feedback

Given a public Project has open public Feedback Requests,
when the Project is made private,
then both Public Project Map and Public Feedback routes are revalidated.

Public-safe views remain the data authority that removes the Project/Requests from anonymous reads.

### P2C-005 — Decision hide refreshes targeted public Feedback

Given an open Feedback Request targets an approved + published + normal Decision,
when that Decision is hidden from publication,
then the Scout Public Feedback route is revalidated and the existing public-safe target guard determines that the Request is no longer public-readable.

### P2C-006 — sensitive Decision refreshes targeted public Feedback

Given a Feedback Request targets a public Decision,
when the Decision becomes sensitive,
then publication mutation revalidates the Public Feedback route and no application-layer bypass is introduced.

### P2C-007 — Decision republish refreshes Builder Feedback targets

When an eligible Decision becomes published/normal again,
then the Builder Feedback workspace is revalidated so current public Decision target choices reflect the new publication state.

### P2C-008 — private Project cannot reopen Request

Given a closed Feedback Request belongs to a private Project,
when Builder attempts to set it to `open`,
then the action is rejected with the existing `project-private` boundary.

### P2C-009 — private Project may close Request

Project privacy must not prevent Builder from changing an already-open Request to `closed`.

### P2C-010 — Decision-target reopen still validates target

Given Project is public but a Request's target Decision is internal, sensitive, archived, or not approved,
when Builder attempts to reopen the Request,
then reopening is rejected.

### P2C-011 — public Feedback page remains public-safe-view only

Scout Feedback reads continue to use:

- `public_project_pages`
- `public_feedback_requests`
- `public_feedbacks`
- `public_decision_timeline`

No source-table Scout read is introduced.

### P2C-012 — internal provenance remains Builder-only

Rough Notes, AI Structured Drafts, `feedbacks.review_status`, internal Change Card status, Evidence traceability, and Outcome provenance are not added to Scout/public reads.

### P2C-013 — no database expansion

Phase 42 introduces no migration, schema change, RLS change, grant change, or public-safe view change.

### P2C-014 — PIE remains outside runtime

Phase 42 introduces no PIE client/API/SDK/auth, webhook/polling, provider IDs, source revisions, external-reference schema, PIE evidence ingestion, or Factory Intelligence.

### P2C-015 — exact-head application validation

The final Phase 42 head must pass Web App CI:

- exact SHA checkout
- dependency install
- lint
- typecheck
- production build
