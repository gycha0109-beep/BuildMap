# Feedback Author Integrity Review

## 유지 결정

- `feedbacks.project_id`는 1차 draft에서 저장하지 않는다.
- `feedback_request_id`는 필수다.
- Feedback의 Project는 `feedback_request_id → feedback_requests.project_id`로 추적한다.
- Feedback은 반드시 Feedback Request를 통해 생성된다.
- 비로그인 Feedback은 차단한다.

## 작성자 위조 방지 조건

`feedbacks.author_user_profile_id`는 반드시 `current_user_profile_id()`와 일치해야 한다.

## 검수 대상

| 항목 | 현재 방향 | dry-run 검증 |
|---|---|---|
| `feedbacks INSERT WITH CHECK` | `can_insert_feedback()` 포함 | 다른 사용자 ID로 insert 실패 |
| `prevent_feedback_author_spoofing()` | trigger 후보 | author ID 위조 실패 |
| `create_link_shared_feedback()` | current profile로 강제 | 입력 author ID 받지 않음 또는 무시 |
| public feedback view | author internal ID 제외 | `author_user_profile_id` 미노출 |

## 반드시 검토할 시나리오

1. 다른 사용자의 `author_user_profile_id`로 insert 가능한가.
2. 비로그인 사용자가 Feedback insert 가능한가.
3. 존재하지 않는 Feedback Request에 insert 가능한가.
4. 비공개 Feedback Request에 insert 가능한가.
5. link_shared Project에서 token 없이 insert 가능한가.
6. token이 유효하지만 로그인하지 않으면 insert가 차단되는가.
7. 공개 Feedback 응답에 내부 author ID가 없는가.

## 13단계 dry-run 전 보강

- `can_insert_feedback()` 조건 문서와 SQL draft가 일치하는지 확인한다.
- `prevent_feedback_author_spoofing()` trigger가 insert/update 모두를 막는지 확인한다.
- `create_link_shared_feedback()` 반환 jsonb에 내부 ID가 포함되지 않도록 확인한다.
