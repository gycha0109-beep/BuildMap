# Trigger Behavior Scenarios

## 검증 대상

- `set_updated_at`
- `prevent_approved_change_card_content_mutation`
- `prevent_feedback_author_spoofing`
- `validate_feedback_request_target_project`

| Trigger / Function | 전제 데이터 | 허용되어야 하는 변경 | 차단되어야 하는 변경 | 기대 에러 | 오탐 가능성 | 누락 가능성 | 다음 patch 후보 |
|---|---|---|---|---|---|---|---|
| `set_updated_at` | update 가능한 row | 정상 update 시 `updated_at` 갱신 | 없음 | 없음 | updated_at만 바뀌어 diff noise 발생 | 일부 table에 trigger 누락 | trigger attach 대상 보정 |
| `prevent_approved_change_card_content_mutation` | approved Change Card | 공개 상태 등 허용 필드 후보만 변경 | content, approved_at, approved_by_builder_profile_id, work_status 사후 조작 | mutation blocked 후보 | owner의 정당한 metadata 수정까지 차단 | 핵심 본문 변경을 놓침 | 차단 필드 목록 조정 |
| `prevent_feedback_author_spoofing` | authenticated feedback insert | current user profile과 author 일치 | 다른 `author_user_profile_id`로 insert/update | author spoofing blocked 후보 | service role seed까지 차단 | spoofing insert 허용 | trigger 조건/role 예외 보정 |
| `validate_feedback_request_target_project` | feedback_request + optional change_card | 같은 project의 request 생성 | 다른 project의 change_card_id 연결 | project mismatch blocked 후보 | project-level request까지 차단 | mismatch 허용 | trigger 조건 분기 보정 |

## 공통 판정

- 내부 기록 노출이나 author spoofing 허용은 blocker다.
- trigger 오탐은 `UNEXPECTED_DENY` 또는 `TRIGGER_ERROR`로 기록한다.
- trigger 누락은 `UNEXPECTED_ALLOW` 또는 `TRIGGER_ERROR`로 기록한다.
