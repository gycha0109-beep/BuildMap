# Expected Results

| Scenario ID | Actor | Action | Expected Result | Failure if | Severity | Script |
|---|---|---|---|---|---|---|
| PRJ-P0-001 | anon | public Project read | PASS | public project invisible | P1 | `phase20_02_project_access_p0.sql` |
| PRJ-P0-002 | anon | private Project read | EXPECTED_DENY | private project visible | P0 | `phase20_02_project_access_p0.sql` |
| PRJ-P0-003 | owner | own private Project read | PASS | owner cannot read | P1 | `phase20_02_project_access_p0.sql` |
| PRJ-P0-004 | non-owner | owner private Project read | EXPECTED_DENY | private project visible | P0 | `phase20_02_project_access_p0.sql` |
| RNAI-P0-002 | anon | rough note read | EXPECTED_DENY | rough note visible | P0 | `phase20_03_rough_note_ai_draft_p0.sql` |
| RNAI-P0-006 | anon | AI Draft read | EXPECTED_DENY | AI Draft visible | P0 | `phase20_03_rough_note_ai_draft_p0.sql` |
| CC-P0-001 | anon | approved+published+normal card | PASS | public card invisible | P1 | `phase20_04_change_card_public_boundary_p0.sql` |
| CC-P0-002 | anon | sensitive card read | EXPECTED_DENY | sensitive card visible | P0 | `phase20_04_change_card_public_boundary_p0.sql` |
| CC-P0-005 | anon | private project published card read | EXPECTED_DENY | private project card visible | P0 | `phase20_04_change_card_public_boundary_p0.sql` |
| FB-P0-002 | feedback_author | own Feedback insert | PASS | insert denied | P1 | `phase20_05_feedback_author_spoofing_p0.sql` |
| FB-P0-003 | feedback_author | spoof owner author id | EXPECTED_DENY | spoof insert allowed | P0 | `phase20_05_feedback_author_spoofing_p0.sql` |
| VIEW-P0-001 | anon | public-safe view column check | PASS | sensitive column visible | P0 | `phase20_06_public_safe_view_p0.sql` |
| TRG-P0-001 | owner | approved card summary mutation | EXPECTED_DENY | mutation allowed | P0 | `phase20_07_approved_change_card_trigger_p0.sql` |
| TRG-P0-007 | owner | approved work_status rollback | EXPECTED_DENY | rollback allowed | P0 | `phase20_07_approved_change_card_trigger_p0.sql` |

## PATCH 21 expected path

- anon public Project read: `public_project_cards` 또는 `public_project_pages`에서만 PASS.
- anon source `projects` direct read: `EXPECTED_DENY`.
- authenticated owner/non-owner source read: table privilege 이후 RLS 결과로 PASS 또는 `EXPECTED_DENY`.

## Phase22 note

Phase22 기대 결과: `PRE-050 PASS`, anon source table direct SELECT `EXPECTED_DENY`, public-safe view actual SELECT PASS, private/sensitive/internal/draft fixture는 view에서 0건이어야 한다.

## Phase22.5 public_builder_profiles expected results

| Scenario ID | Actor | Query/Action | Expected Result | Failure if | Severity |
|---|---|---|---|---|---|
| `VIEW-P0-BP-001` | `anon` | `select count(*) from public.public_builder_profiles` | query succeeds | `VIEW_ACCESS_ERROR` | P0 execution blocker |
| `VIEW-P0-BP-002` | `anon` | owner public builder fixture count | count = 1 | count != 1 | P1 coverage failure |
| `VIEW-P0-BP-003` | `anon` | non-owner public builder fixture count | count = 1 | count != 1 | P1 coverage failure |
| `VIEW-P0-BP-004` | `anon` | non-public builder fixture count | count = 0 | count > 0 | P0 `VIEW_BOUNDARY_FAIL` |
| `VIEW-P0-BP-005` | `anon` | `user_profile_id` column check | column absent | column exists | P0 `VIEW_BOUNDARY_FAIL` |
| `VIEW-P0-BP-006` | `anon` | `auth_user_id` / internal owner column check | columns absent | any column exists | P0 `VIEW_BOUNDARY_FAIL` |

## Phase23 expected final wrapper result

사용자 Phase20 네 번째 실행과 동일하게 SQL이 정상 종료되고 실제 failure signal이 없다면 wrapper의 최종 기대값은 다음이다.

```text
OverallResult: PASS
UnexpectedAllowDetected: False
GrantFailDetected: False
AccessPathMismatchDetected: False
ViewAccessErrorDetected: False
ViewBoundaryFailDetected: False
ViewOptionMismatchDetected: False
ViewExecutionModelMismatchDetected: False
FailDetected: False
UncaughtErrorDetected: False
ExpectedDenyDetected: True
PassDetected: True
```

`EXPECTED_DENY`는 정상 deny 결과이므로 `OverallResult: PASS`와 양립한다.


## Phase23.5 expected result 보강

`EXPECTED_DENY`는 단순 error 발생이 아니라 exact oracle이 일치할 때만 인정한다. Feedback spoofing은 `SQLSTATE = P0001` 및 `Feedback author_user_profile_id must match the current user profile.` message를 요구한다. Approved Change Card mutation은 `SQLSTATE = P0001` 및 `Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.` message를 요구한다. `VIEW-P0-008`은 `public_project_links` fixture count가 정확히 1이어야 `PASS`다.
## Phase23.6 preflight expected results

| Scenario | Expected | Failure classification |
|---|---|---|
| `PRE-005`~`PRE-010` | required table/view exists → `PASS` | missing → `ENV_ERROR` |
| `PRE-011`~`PRE-013` | required helper exists → `PASS` | missing → `ENV_ERROR` |
| `PRE-014-projects` | RLS enabled → `PASS` | missing/disabled → `POLICY_FAIL` |
| `PRE-014-rough_notes` | RLS enabled → `PASS` | missing/disabled → `POLICY_FAIL` |
| `PRE-014-ai_structured_drafts` | RLS enabled → `PASS` | missing/disabled → `POLICY_FAIL` |
| `PRE-014-change_cards` | RLS enabled → `PASS` | missing/disabled → `POLICY_FAIL` |
| `PRE-014-feedback_requests` | RLS enabled → `PASS` | missing/disabled → `POLICY_FAIL` |
| `PRE-014-feedbacks` | RLS enabled → `PASS` | missing/disabled → `POLICY_FAIL` |
| `SUMMARY-020` | public/private/card/builder/link fixture counts all exact → `PASS` | row boundary mismatch → `VIEW_BOUNDARY_FAIL`; access failure → `VIEW_ACCESS_ERROR`; unrelated error → `SCRIPT_ERROR` |
