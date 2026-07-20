# Test Case / Policy / SQL File Mapping

## 목적

7.5 Test Case ID, 8단계 Policy ID, 11단계 SQL draft 파일을 연결한다.

| Test Case ID | 테스트 요약 | 기대 결과 | 8단계 Policy ID | SQL draft 파일 | 후보 | 상태 |
|---|---|---|---|---|---|---|
| PRJ-001 | Owner가 비공개 Project 읽기 | 허용 | `project_select_owner` | `05_rls_policies` | `projects_select_owner_draft` | 반영 |
| PRJ-002 | 다른 로그인 사용자가 비공개 Project 읽기 | 차단 | `project_select_private` | `05_rls_policies` | owner select만 허용 | 반영 |
| PRJ-004 | 비로그인 방문자가 전체 공개 Project 읽기 | 허용 | `project_select_public` | `05_rls_policies`, `06_public_safe_views` | public view | 반영 |
| PRJ-014 | 비공개 Project의 공개 Change Card 외부 읽기 | 차단 | `change_card_select_public` | `05_rls_policies` | project public 조건 필요 | 반영 |
| LINK-001 | share_token 없이 link_shared 접근 | 차단 | `link_shared_project_read` | `07_link_sharing_rpc` | token hash 필수 | 반영 |
| LINK-002 | 유효 share_token으로 link_shared 접근 | 조건부 허용 | `link_shared_project_read` | `07_link_sharing_rpc` | `get_link_shared_project_page` | 반영 |
| LINK-004 | 잘못된 share_token 접근 | 차단 | `link_shared_project_read` | `07_link_sharing_rpc` | 통일 실패 응답 | 반영 |
| LINK-006 | 비공개 전환 후 token 접근 | 차단 | `link_shared_private_transition` | `07_link_sharing_rpc` | `visibility_status='link_shared'` 조건 | 반영 |
| LINK-011 | token 재발급 후 기존 token 접근 | 차단 | `link_shared_token_rotation` | `07_link_sharing_rpc` | hash 교체 | 부분 반영 |
| CC-004 | 공개 Change Card 읽기 | 허용 | `change_card_select_public` | `05_rls_policies`, `06_public_safe_views` | approved/published/normal | 반영 |
| CC-005 | 초안 Change Card 공개 읽기 | 차단 | `change_card_select_public` | `05_rls_policies` | approved 조건 | 반영 |
| CC-006 | publishable 상태 읽기 | 차단 | `change_card_select_public` | `05_rls_policies` | published 조건 | 반영 |
| CC-007 | 민감 Change Card 읽기 | 차단 | `change_card_sensitive_block` | `05_rls_policies` | normal 조건 | 반영 |
| RNAI-006 | 공개 Project에서도 Rough Note 비노출 | 차단 | `rough_note_public_block` | `05_rls_policies`, `06_public_safe_views` | public view 제외 | 반영 |
| FB-007 | 로그인 사용자가 공개 Feedback Request에 Feedback 작성 | 허용 | `feedback_insert_logged_in_with_request` | `05_rls_policies` | `can_insert_feedback` | 반영 |
| FB-008 | 비로그인 Feedback 작성 | 차단 | `feedback_insert_no_anon` | `05_rls_policies` | authenticated only | 반영 |
| FB-009 | Feedback Request 없이 Feedback 작성 | 차단 | `feedback_insert_request_required` | `03_feedback_and_links_schema` | FK not null | 반영 |
| FB-016 | 공개 Feedback 내부 식별자 노출 확인 | 차단 | `feedback_public_safe_read` | `06_public_safe_views` | author_user_profile_id 제외 | 반영 |
| FB-019 | link_shared Feedback 작성 | 조건부 허용 | `link_shared_feedback_insert` | `07_link_sharing_rpc` | token + login + request | 반영 |
| PP-007 | 공개 페이지 auth/email 노출 차단 | 차단 | `public_project_page_safe_read` | `06_public_safe_views` | 컬럼 제외 | 반영 |
| OWN-002 | Project Owner가 Change Card 승인 | 허용 | `change_card_approve_owner` | `05_rls_policies`, `04_helpers_and_triggers` | owner update | 부분 반영 |
| OWN-005 | Owner 아닌 작성자가 승인 | 차단 | `change_card_approve_owner` | `05_rls_policies` | owner update 제한 | 반영 |

## 보강 필요

- `LINK-005`, `LINK-012`: 폐기/재발급 token 세부 수동 검증
- approved Change Card mutation trigger 전용 Test Case 세분화
- public-safe view 컬럼 단위 검증표 보강


## 13단계 Patch 보강 매핑

| Test Case ID | 테스트 요약 | 기대 결과 | 8단계 Policy ID | SQL draft 파일 | 13단계 patch 후보 | dry-run 검증 | 상태 |
|---|---|---|---|---|---|---|---|
| LINK-001 | share_token 없이 link_shared Project 접근 | 차단 | `link_shared_project_read` | `07_link_sharing_rpc`, `08_grants` | secure RPC token 필수 조건, public_slug-only 차단 | 필요 | 반영 |
| LINK-004 | 잘못된 share_token 접근 | 차단 | `link_shared_project_read` | `07_link_sharing_rpc` | 통일 실패 응답, 상세 원인 비노출 | 필요 | 반영 |
| LINK-005 | 폐기된 share_token 접근 | 차단 | `link_shared_revoked_token_block` | `07_link_sharing_rpc` | `share_token_revoked_at is null` 조건 | 필요 | 반영 |
| LINK-011 | token 재발급 뒤 기존 token 접근 | 차단 | `link_shared_token_rotation` | `07_link_sharing_rpc` | hash 교체/rotated_at 후보 | 필요 | 부분 반영 |
| LINK-012 | token 재발급 뒤 새 token 접근 | 조건부 허용 | `link_shared_token_rotation` | `07_link_sharing_rpc` | 새 hash 비교 후보 | 필요 | 부분 반영 |
| LINK-009 | public_slug만으로 link_shared 접근 | 차단 | `public_slug_not_security_token` | `07_link_sharing_rpc`, `06_public_safe_views` | link_shared는 secure RPC token 필요 | 필요 | 반영 |
| PP-COL-001 | public-safe view에 내부 식별자 노출 여부 | 차단 | `public_project_page_safe_read` | `06_public_safe_views` | email/auth id/internal id/share_token_hash 제외 | 필요 | 반영 |
| PP-COL-002 | public_feedbacks에 `author_user_profile_id` 노출 여부 | 차단 | `feedback_public_safe_read` | `06_public_safe_views` | 익명/맥락 표시만 노출 | 필요 | 반영 |
| CC-MUT-001 | approved Change Card 핵심 본문 수정 | 차단 | `change_card_update_owner` + trigger 후보 | `04_helpers_and_triggers` | mutation trigger 보강 | 필요 | 반영 |
| CC-MUT-002 | approved_at 수정 | 차단 | `change_card_approval_integrity` | `04_helpers_and_triggers` | approved_at 수정 제한 | 필요 | 반영 |
| CC-MUT-003 | approved_by_builder_profile_id 수정 | 차단 | `change_card_approval_integrity` | `04_helpers_and_triggers` | 승인자 수정 제한 | 필요 | 반영 |
| CC-MUT-004 | approved work_status 되돌리기 | 차단 | `change_card_approval_integrity` | `04_helpers_and_triggers` | approved 상태 되돌리기 제한 후보 | 필요 | 반영 |
| FR-CONS-001 | Feedback Request의 change_card/project 불일치 | 차단 | `feedback_request_target_integrity` | `04_helpers_and_triggers` | target project consistency trigger 후보 | 필요 | 반영 |
| FB-AUTH-001 | 다른 사용자의 author_user_profile_id로 Feedback insert | 차단 | `feedback_insert_logged_in_with_request` | `04_helpers_and_triggers`, `05_rls_policies` | helper/RLS/trigger author spoofing 방지 | 필요 | 반영 |
| PRJ-014 | 비공개 Project의 published Change Card 외부 접근 | 차단 | `change_card_select_public` | `05_rls_policies`, `06_public_safe_views` | Project public 조건 유지 | 필요 | 반영 |
| RNAI-006 | 공개 Project에서도 Rough Note / AI Draft 노출 | 차단 | `rough_note_public_block` | `05_rls_policies`, `06_public_safe_views` | public view 제외와 owner-only RLS 유지 | 필요 | 반영 |

## 13단계 이후 남은 매핑 과제

- `LINK-011` / `LINK-012`는 token rotation dry-run에서 실제 hash 교체 동작 확인이 필요하다.
- public-safe view 컬럼 단위 검증은 실제 select 결과 스냅샷으로 확인해야 한다.
- approved Change Card mutation trigger는 OLD/NEW 비교 문법과 오탐 여부를 dry-run에서 확인해야 한다.
