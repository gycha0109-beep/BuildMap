# Phase 41 — Feedback Outcome Closure Regression Cases

## Scope

Builder-only Feedback Outcome surface가 evidence path와 최종 outcome을 분리해서 표시하고 기존 Public/Scout boundary를 확장하지 않는지 확인한다.

## Cases

### FOC-001 — new Feedback is unresolved

Given a Feedback with `review_status = new`,
when Builder opens Outcomes,
then Outcome is unresolved and no reflected/not-reflected result is inferred.

### FOC-002 — reviewing remains unresolved

Given `review_status = reviewing`,
then the Feedback remains unresolved even if it has been captured or linked to a Decision.

### FOC-003 — Builder closes reflected

When the Project owner sets Outcome to `reflected`,
then `feedbacks.review_status` becomes `reflected` and Outcomes reports Reflected.

### FOC-004 — Builder closes not reflected

When the Project owner sets Outcome to `not_reflected`,
then `feedbacks.review_status` becomes `not_reflected` and Outcomes reports Not reflected.

### FOC-005 — Decision does not auto-close Outcome

Given a Feedback is linked to an approved Decision but its review status is `new` or `reviewing`,
then Outcomes shows Approved Decision and Unresolved simultaneously.

### FOC-006 — reflected does not require Decision

Given Builder explicitly marks a Feedback reflected without a linked Decision,
then the explicit Builder outcome is preserved and no synthetic Decision link is created.

### FOC-007 — not captured

Given no active Rough Note has `source_feedback_id = feedback.id`,
then Evidence path is Not captured and no Capture is inferred from text similarity.

### FOC-008 — captured / candidate / pending / approved path

The path label must derive only from existing Rough Note, AI Draft, and Change Card records:

- Capture only → Captured
- generating AI Draft → AI structuring
- generated/editing AI Draft → Review candidate
- draft/editing Change Card → Decision pending
- approved Change Card → Approved Decision

### FOC-009 — linked Decision source

A Decision is linked to Feedback only through explicit `linked_feedback_id` or through the Feedback-origin Rough Note referenced by `rough_note_id`. No AI/text matching is allowed.

### FOC-010 — ownership boundary

Outcome mutation must verify the authenticated Builder owns the Project and the Feedback belongs to a Feedback Request in that Project.

### FOC-011 — Scout/public boundary unchanged

Phase 41 must not add `review_status`, Rough Note, AI Draft, internal Change Card state, or outcome provenance to public-safe Feedback views or Scout pages.

### FOC-012 — public selection independent

Changing Outcome must not automatically change `feedbacks.visibility_status`.

### FOC-013 — cross-surface consistency

Feedback, Outcomes, and Evidence surfaces must read the same persisted `feedbacks.review_status`. Outcome writes revalidate all three internal surfaces.

### FOC-014 — no schema expansion

Phase 41 requires no migration, RLS change, grant change, or new outcome state column.
