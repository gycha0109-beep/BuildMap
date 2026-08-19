# Phase 40 — Decision ↔ Evidence Traceability Regression Cases

## Scope

Builder-only Evidence read-side가 provenance를 정확히 표시하고 Public/Scout boundary를 확장하지 않는지 확인한다.

## Cases

### EVD-001 — ordinary Builder Capture

Given an approved Decision with `rough_note_id` and no Feedback provenance,
when Builder opens Evidence,
then the source Capture body is shown and External Feedback is reported as not linked.

### EVD-002 — Feedback-origin Decision

Given an approved Decision whose `linked_feedback_id` matches the source Rough Note `source_feedback_id`,
when Builder opens Evidence,
then Decision → Capture → External Feedback → Feedback Request context is traceable.

### EVD-003 — no source relationship

Given a historical approved Decision with no `rough_note_id` and no `linked_feedback_id`,
then Evidence must not infer a source from text similarity or AI.

### EVD-004 — linked Capture unavailable

Given `rough_note_id` exists on the Decision but the current Builder read cannot return that Rough Note,
then Evidence reports the source as unavailable and does not substitute another Capture.

### EVD-005 — linked Feedback unavailable

Given a Feedback id is preserved but the source Feedback cannot be read,
then Evidence reports the Feedback source as unavailable and does not substitute another response.

### EVD-006 — provenance mismatch

Given `change_cards.linked_feedback_id` and `rough_notes.source_feedback_id` are both non-null and different,
then Evidence shows an integrity warning and does not silently reconcile the values.

### EVD-007 — identity privacy

Evidence queries must not select Feedback author auth ids, `author_user_profile_id`, email, or other private Scout identity fields.

### EVD-008 — public contract unchanged

Phase 40 must not modify public-safe views, Public Project Map queries, anonymous grants, or Scout RLS/write boundaries.

### EVD-009 — read-only trace

Evidence UI must not expose actions that mutate Decision, Rough Note, Feedback, or Feedback Request records.

### EVD-010 — historical Decision compatibility

Approved Decisions created before Phase 39 remain readable even when they have no Feedback provenance.
