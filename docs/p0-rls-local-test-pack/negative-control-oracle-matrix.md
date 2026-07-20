# Negative-control Oracle Matrix

## 원칙

`EXPECTED_DENY`는 단순히 error가 발생했다는 사실만으로 출력하지 않는다. 의도한 security control의 SQLSTATE, error message 또는 row-count 형태가 일치해야 한다.

| Area | Scenario | Expected oracle | 다른 오류 처리 |
|---|---|---|---|
| anon source direct `projects` | `PRE-051`, `PRJ-P0-002A` | `insufficient_privilege`만 `EXPECTED_DENY` | `SCRIPT_ERROR` |
| anon source direct `rough_notes` | `RNAI-P0-002` | `insufficient_privilege`만 `EXPECTED_DENY` | `SCRIPT_ERROR` |
| anon source direct `ai_structured_drafts` | `RNAI-P0-006` | `insufficient_privilege`만 `EXPECTED_DENY` | `SCRIPT_ERROR` |
| anon source direct `change_cards` | `CC-P0-000` | `insufficient_privilege`만 `EXPECTED_DENY` | `SCRIPT_ERROR` |
| anon feedback insert | `FB-P0-001` | `insufficient_privilege` 또는 RLS 42501 row-level-security message | `SCRIPT_ERROR` |
| feedback author spoofing | `FB-P0-003`, `FB-P0-004` | `SQLSTATE = P0001` and `SQLERRM = Feedback author_user_profile_id must match the current user profile.` | `TRIGGER_FAIL` 또는 `GRANT_FAIL` |
| non-owner project read/update | `PRJ-P0-004`, `PRJ-P0-005` | `SELECT count = 0`, `UPDATE row_count = 0` | `POLICY_FAIL`, `GRANT_FAIL`, `SCRIPT_ERROR` |
| approved Change Card mutation | `TRG-P0-001`~`TRG-P0-007` | `SQLSTATE = P0001` and exact approved mutation trigger message | `TRIGGER_FAIL` 또는 `GRANT_FAIL` |
| allowed Change Card status candidate | `TRG-P0-008`, `TRG-P0-009` | update succeeds and prints `PASS/RECORDED` | `NEEDS_REVIEW`, `UNEXPECTED_DENY`, `GRANT_FAIL` |
| public link view | `VIEW-P0-008` | expected public fixture count = 1 | `UNEXPECTED_DENY`, `VIEW_BOUNDARY_FAIL` |

## approved Change Card exact message

```text
Approved Change Card core/approval fields cannot be modified directly. Create a new Change Card instead.
```

## feedback spoofing exact message

```text
Feedback author_user_profile_id must match the current user profile.
```
