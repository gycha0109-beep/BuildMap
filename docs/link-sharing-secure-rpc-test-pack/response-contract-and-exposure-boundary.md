# Response Contract and Exposure Boundary

## Read failure

```json
{"ok": false, "error": "not_found"}
```

missing, malformed, wrong, revoked, private, public, archived, unknown Project에서 동일해야 한다.

## Project page success

허용 키:

- `ok`
- `project.project_id`
- `title`
- `one_line_description`
- `current_need_summary`
- `lifecycle_status`
- `last_activity_at`

## Timeline success

approved + published + normal Change Card의 공개 내용만 반환한다. 다음은 금지한다.

- `rough_note_id`
- `ai_draft_id`
- `author_builder_profile_id`
- `approved_by_builder_profile_id`
- sensitive/draft/internal card

## Feedback Request success

public + open request만 반환하며 linked card도 public-safe 조건을 만족해야 한다. 다음은 금지한다.

- `created_by_builder_profile_id`
- auth/profile internal identifiers
- token/hash
- sensitive/internal/closed request

## Write success

`create_link_shared_feedback`은 `ok`, `feedback_id`만 반환하고 author는 현재 로그인 user profile로 강제한다. 생성 row는 기본 `internal_review`다.


## 현재 응답 계약에서 보류한 공개 데이터

이번 Phase24 contract는 security boundary를 좁게 고정한다. 다음 데이터는 공개 가능성 자체를 부정하는 것이 아니라, 현재 link-sharing RPC response에는 아직 포함하지 않는다.

- Builder public display/bio enrichment
- `public_selected` Feedback read collection
- public Project Links collection

이 항목을 추가할 때는 별도 allowlist, row predicate, response exposure matrix를 작성한다.
