# RLS 명명 규칙 초안

## 1. 문서 목적

이 문서는 8단계 RLS SQL 초안에서 사용할 정책명, Policy ID, helper function 후보 이름의 규칙을 정리한다.

## 2. Policy ID 규칙

문서용 Policy ID는 다음 구조를 따른다.

```text
[OBJECT]_[ACTION]_[SCOPE]_[NUMBER]
```

예시:

```text
PROJECT_READ_PUBLIC_01
CHANGE_CARD_READ_PUBLIC_01
FEEDBACK_CREATE_LOGIN_01
LINK_SHARE_READ_01
```

Policy ID는 7단계 자연어 정책과 7.5단계 테스트 케이스를 연결하는 문서용 식별자다.

## 3. RLS 정책명 후보 규칙

실제 PostgreSQL 정책명 후보는 snake_case를 사용한다.

```text
<object>_<operation>_<scope>
```

예시:

- `project_select_owner`
- `project_select_public`
- `project_select_link_shared`
- `project_insert_builder`
- `project_update_owner`
- `change_card_select_owner`
- `change_card_select_public`
- `change_card_insert_owner`
- `change_card_update_owner`
- `rough_note_select_owner`
- `ai_draft_select_owner`
- `feedback_request_select_public`
- `feedback_insert_logged_in_with_request`
- `feedback_select_owner_or_author`
- `profile_select_public`
- `profile_update_self`

## 4. helper function 후보 이름 규칙

helper function 후보는 동사형으로 작성한다.

```text
is_project_owner(project_id, user_id)
can_read_project(project_id, user_id, share_token 후보)
can_read_link_shared_project(project_id, share_token 후보)
can_read_public_change_card(change_card_id, user_id 또는 접근 context)
can_create_feedback(feedback_request_id, user_id, share_token 후보)
```

실제 함수 생성은 8단계에서 하지 않는다.

## 5. Test Case ID와 Policy ID 연결 규칙

- Test Case ID는 7.5단계 문서의 ID를 그대로 사용한다.
- Policy ID는 정책 단위로 묶는다.
- 하나의 Policy ID가 여러 Test Case ID를 커버할 수 있다.
- 하나의 Test Case ID가 여러 Policy 후보를 필요로 할 수 있다.

예시:

```text
CC-PUBLIC-001 → CHANGE_CARD_READ_PUBLIC_01 → change_card_select_public
LINK-002 → PROJECT_READ_LINK_01 → project_select_link_shared
FB-CREATE-001 → FEEDBACK_CREATE_LOGIN_01 → feedback_insert_logged_in_with_request
```

## 6. read/insert/update/delete 정책 구분

| 행위 | 정책명 접두 후보 |
|---|---|
| read | `select` |
| create | `insert` |
| update | `update` |
| delete/archive | `delete` 또는 `archive` 후보 |

삭제는 1차에서 물리 삭제보다 보관을 우선 검토한다.

## 7. 공개 읽기와 내부 읽기 구분

- 내부 읽기: `*_select_owner`, `*_select_author`, `*_select_internal`
- 공개 읽기: `*_select_public`
- 링크 공개 읽기: `*_select_link_shared`

## 8. 금지된 이름 패턴

다음 이름은 의미가 넓거나 위험하므로 피한다.

- `select_all`
- `admin_all`
- `public_read_any`
- `user_can_update_any`
- `shared_read_without_token`

정책명만 봐도 공개 조건, 소유자 조건, 링크 공개 조건이 구분되어야 한다.
