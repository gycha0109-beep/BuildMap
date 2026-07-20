# 7.5 Test Case ID와 RLS 정책 초안 매핑

## 1. 문서 목적

이 문서는 7.5단계 자연어 테스트 케이스를 8단계 RLS 정책 후보와 연결한다.

## 2. 매핑 원칙

- 하나의 테스트 케이스는 하나 이상의 RLS 정책 후보와 연결될 수 있다.
- 링크 공개, Feedback 작성, 공개 페이지 조합 정책은 helper function 후보와 함께 부분 반영으로 표시한다.
- 실제 RLS SQL 실행 검증은 후속 단계에서 수행한다.

## 3. Test Case 매핑 표

| Test Case ID | 테스트 케이스 요약 | 기대 결과 | 관련 RLS 정책 후보 | RLS 초안 문서 위치 | 현재 반영 상태 | 비고 |
|---|---|---|---|---|---|---|
| PRJ-READ-001 | Owner가 자신의 비공개 Project를 읽을 수 있는지 확인 | 허용 | `project_select_owner` | `project-rls-draft.md` | 반영됨 | |
| PRJ-READ-002 | 다른 로그인 사용자의 비공개 Project 접근 차단 | 차단 | `project_select_private_block / change_card_select_public` | `project-rls-draft.md` | 반영됨 | |
| PRJ-READ-003 | 비로그인 방문자의 비공개 Project 접근 차단 | 차단 | `project_select_private_block / change_card_select_public` | `project-rls-draft.md` | 반영됨 | |
| PRJ-READ-004 | 비로그인 방문자의 전체 공개 Project 공개 정보 읽기 | 허용 | `project_select_public` | `project-rls-draft.md` | 반영됨 | |
| PRJ-READ-005 | 로그인 사용자의 전체 공개 Project 공개 정보 읽기 | 허용 | `project_select_public` | `project-rls-draft.md` | 반영됨 | |
| PRJ-UPD-001 | Owner의 Project 수정 허용 | 허용 | `project_update_owner` | `project-rls-draft.md` | 반영됨 | |
| PRJ-UPD-002 | 다른 로그인 사용자의 Project 수정 차단 | 차단 | `project_update_owner` | `project-rls-draft.md` | 반영됨 | |
| PRJ-UPD-003 | Owner가 아닌 Change Card 작성 Builder의 Project 수정 차단 | 차단 | `project_update_owner` | `project-rls-draft.md` | 반영됨 | |
| PRJ-UPD-004 | Feedback 작성자의 Project 수정 차단 | 차단 | `project_update_owner` | `project-rls-draft.md` | 반영됨 | |
| PRJ-VIS-001 | Owner의 비공개→전체 공개 전환 허용 | 허용 | `project_update_owner_visibility` | `project-rls-draft.md` | 반영됨 | |
| PRJ-VIS-002 | 다른 로그인 사용자의 공개 상태 변경 차단 | 차단 | `project_update_owner_visibility` | `project-rls-draft.md` | 반영됨 | |
| PRJ-STATUS-001 | Owner의 진행 상태 변경 허용 | 허용 | `project_update_owner_progress` | `project-rls-draft.md` | 반영됨 | |
| PRJ-STATUS-002 | 중요 진행 상태 변경 시 Change Card 생성 유도 | 조건부 허용 | `project_update_owner_progress` | `project-rls-draft.md` | 반영됨 | |
| PRJ-READ-006 | 비공개 Project의 공개 Change Card 외부 노출 차단 | 차단 | `project_select_private_block / change_card_select_public` | `project-rls-draft.md` | 반영됨 | |
| PRJ-ARCH-001 | Owner의 Project 보관/삭제 후보 전환 | 조건부 허용 | `project_archive_owner_candidate` | `project-rls-draft.md` | 추가 검토 필요 | |
| LINK-001 | share_token 없이 링크 공개 Project 접근 차단 | 차단 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-002 | 유효한 share_token으로 링크 공개 Project 접근 허용 | 조건부 허용 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-003 | 로그인 사용자의 유효 token 접근 허용 | 조건부 허용 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-004 | 잘못된 share_token 접근 차단 | 차단 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-005 | 폐기된 share_token 접근 차단 | 차단 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-006 | 비공개 전환 뒤 기존 share_token 접근 차단 | 차단 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-007 | 전체 공개 전환 뒤 public_slug 접근 허용 | 허용 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-008 | 전체 공개→링크 공개 뒤 public_slug만으로 접근 차단 | 차단 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-009 | 링크 공개 Project에 public_slug만 알고 접근 차단 | 차단 | `project_select_link_shared / link_shared_project_read_candidate` | `link-sharing-rls-draft.md` | 추가 검토 필요 | |
| LINK-010 | 비공개 Project에 share_token으로 접근 차단 | 차단 | `project_select_link_shared` | `link-sharing-rls-draft.md` | 부분 반영 | |
| LINK-011 | share_token 재발급 뒤 기존 token 접근 차단 | 차단 | `project_select_link_shared` | `link-sharing-rls-draft.md` | 부분 반영 | |
| LINK-012 | share_token 재발급 뒤 새 token 접근 허용 | 조건부 허용 | `project_select_link_shared` | `link-sharing-rls-draft.md` | 부분 반영 | |
| LINK-013 | 링크 공개 Project에서 공개 조건 미충족 Change Card 차단 | 차단 | `change_card_select_public_link_shared` | `link-sharing-rls-draft.md` | 부분 반영 | |
| LINK-014 | 링크 공개 Project에서 승인+공개+일반 Change Card 허용 | 조건부 허용 | `change_card_select_public_link_shared` | `link-sharing-rls-draft.md` | 부분 반영 | |
| LINK-015 | 링크 공개 Project의 공개 Feedback Request 읽기 | 조건부 허용 | `feedback_request_select_public_link_shared` | `link-sharing-rls-draft.md` | 부분 반영 | |
| LINK-016 | 링크 공개 Project의 내부 검토 Feedback 내용 차단 | 차단 | `feedback_select_public_selected` | `link-sharing-rls-draft.md` | 부분 반영 | |
| CC-READ-001 | Owner가 내부 전용 Change Card를 읽는다 | 허용 | `change_card_select_owner_internal` | `change-card-rls-draft.md` | 반영됨 | |
| CC-READ-002 | 비로그인 방문자의 내부 전용 Card 접근 차단 | 차단 | `change_card_select_owner_internal` | `change-card-rls-draft.md` | 반영됨 | |
| CC-READ-003 | 로그인 사용자의 내부 전용 Card 접근 차단 | 차단 | `change_card_select_owner_internal` | `change-card-rls-draft.md` | 반영됨 | |
| CC-PUBLIC-001 | 전체 공개 Project의 승인+공개+일반 Card 읽기 허용 | 허용 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-PUBLIC-002 | 초안+공개됨 Card 노출 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-PUBLIC-003 | 승인됨+공개 가능 Card 노출 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-PUBLIC-004 | 민감 정보 포함 Card 노출 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-PUBLIC-005 | 비공개 Project의 공개 Card 노출 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-LINK-001 | 링크 공개+유효 token+공개 조건 충족 Card 읽기 | 조건부 허용 | `change_card_select_public_link_shared` | `change-card-rls-draft.md` | 부분 반영 | |
| CC-LINK-002 | 링크 공개 Project에서 token 없이 공개 Card 접근 차단 | 차단 | `change_card_select_public_link_shared` | `change-card-rls-draft.md` | 부분 반영 | |
| CC-UPD-001 | 작성 Builder가 자신의 초안 Card 수정 | 조건부 허용 | `change_card_update_owner_or_draft_author_candidate` | `change-card-rls-draft.md` | 추가 검토 필요 | |
| CC-APP-001 | Project Owner가 Change Card 승인 | 허용 | `change_card_approve_owner` | `change-card-rls-draft.md` | 반영됨 | |
| CC-APP-002 | Owner가 아닌 사용자의 승인 차단 | 차단 | `change_card_approve_owner` | `change-card-rls-draft.md` | 반영됨 | |
| CC-PUB-001 | Owner가 아닌 작성 Builder의 공개됨 변경 차단 | 차단 | `change_card_publish_owner` | `change-card-rls-draft.md` | 반영됨 | |
| CC-SENS-001 | 민감도 설정 후 공개 Timeline 노출 차단 확인 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-STATUS-001 | 보류됨 Card 공개 Timeline 노출 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-STATUS-002 | 승인됨+내부 전용 Card 공개 Timeline 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| CC-STATUS-003 | 공개 가능 Card 공개 Timeline 차단 | 차단 | `change_card_select_public` | `change-card-rls-draft.md` | 반영됨 | |
| RNAI-RN-001 | Owner가 Rough Note 생성 | 허용 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-002 | Owner가 자신의 Rough Note 읽기 | 허용 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-003 | 다른 로그인 사용자의 Rough Note 접근 차단 | 차단 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-004 | 비로그인 방문자의 Rough Note 접근 차단 | 차단 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-005 | Scout 성격 사용자의 Rough Note 접근 차단 | 차단 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-006 | 전체 공개 Project에서도 Rough Note 비노출 | 차단 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-001 | Owner가 Rough Note로 AI Draft 생성 | 허용 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-002 | Owner가 AI Draft 읽기 | 허용 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-003 | 다른 로그인 사용자의 AI Draft 접근 차단 | 차단 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-004 | 비로그인 방문자의 AI Draft 접근 차단 | 차단 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-005 | 전환 전 AI Draft의 Timeline 노출 차단 | 차단 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-006 | 전환 후 AI Draft 자체 공개 페이지 노출 차단 | 차단 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-007 | 전환된 Rough Note 수정 제한 | 조건부 허용 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-RN-008 | 전환 전 Rough Note 수정 허용 | 허용 | `rough_note_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| RNAI-AI-007 | AI Draft 실패 시 Rough Note 보존 | 허용 | `ai_draft_owner_policy` | `rough-note-ai-draft-rls-draft.md` | 반영됨 | |
| PH-PD-001 | Owner가 비공개 Project의 Problem Definition 읽기 | 허용 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-002 | 비로그인 방문자의 비공개 Project Problem 접근 차단 | 차단 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-003 | 전체 공개 Project의 공개 가능한 Problem 읽기 | 허용 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-004 | 링크 공개 Project의 Problem 읽기 | 조건부 허용 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-005 | Owner의 Problem Definition 수정 | 허용 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-006 | 다른 로그인 사용자의 Problem 수정 차단 | 차단 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-007 | 중요 Problem 변경 시 Change Card 생성 유도 | 조건부 허용 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-PD-008 | 과거 Problem 이력은 Change Card 기반 추적 | 조건부 허용 | `problem_definition_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-HY-001 | Owner가 Hypothesis 생성 | 허용 | `hypothesis_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-HY-002 | Owner가 Hypothesis 상태 변경 | 허용 | `hypothesis_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-HY-003 | Hypothesis 상태 변경 시 Change Card 연결 유도 | 조건부 허용 | `hypothesis_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-HY-004 | 비공개 Project Hypothesis 외부 읽기 차단 | 차단 | `hypothesis_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-HY-005 | 전체 공개 Project Hypothesis 읽기 허용 | 허용 | `hypothesis_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| PH-HY-006 | 민감한 Hypothesis 공개 차단 | 차단 | `hypothesis_owner_or_public` | `problem-hypothesis-rls-draft.md` | 반영됨 | |
| FB-REQ-001 | Owner가 Project-level Feedback Request 생성 | 허용 | `feedback_request_owner_or_public` | `feedback-rls-draft.md` | 반영됨 | |
| FB-REQ-002 | Owner가 Change Card-level Feedback Request 생성 | 허용 | `feedback_request_owner_or_public` | `feedback-rls-draft.md` | 반영됨 | |
| FB-REQ-003 | 다른 로그인 사용자의 남의 Project Request 생성 차단 | 차단 | `feedback_request_owner_or_public` | `feedback-rls-draft.md` | 반영됨 | |
| FB-REQ-004 | 비로그인 방문자의 Request 생성 차단 | 차단 | `feedback_request_owner_or_public` | `feedback-rls-draft.md` | 반영됨 | |
| FB-REQ-005 | 비로그인 방문자의 공개 Feedback Request 읽기 | 허용 | `feedback_request_owner_or_public` | `feedback-rls-draft.md` | 반영됨 | |
| FB-REQ-006 | 로그인 사용자의 공개 Feedback Request 읽기 | 허용 | `feedback_request_owner_or_public` | `feedback-rls-draft.md` | 반영됨 | |
| FB-CREATE-001 | 로그인 사용자가 공개 Request에 Feedback 작성 | 허용 | `feedback_insert_logged_in_with_request` | `feedback-rls-draft.md` | 반영됨 | |
| FB-CREATE-002 | 비로그인 방문자의 Feedback 작성 차단 | 차단 | `feedback_insert_logged_in_with_request` | `feedback-rls-draft.md` | 반영됨 | |
| FB-CREATE-003 | Feedback Request 없이 Feedback 작성 차단 | 차단 | `feedback_insert_logged_in_with_request` | `feedback-rls-draft.md` | 반영됨 | |
| FB-READ-001 | Feedback 작성자가 자신의 Feedback 읽기 | 허용 | `feedback_select_owner_author_or_public_selected` | `feedback-rls-draft.md` | 반영됨 | |
| FB-READ-002 | Owner가 자신의 Project Feedback 읽기 | 허용 | `feedback_select_owner_author_or_public_selected` | `feedback-rls-draft.md` | 반영됨 | |
| FB-READ-003 | 다른 로그인 사용자의 내부 Feedback 읽기 차단 | 차단 | `feedback_select_owner_author_or_public_selected` | `feedback-rls-draft.md` | 반영됨 | |
| FB-READ-004 | 비로그인 방문자의 내부 Feedback 읽기 차단 | 차단 | `feedback_select_owner_author_or_public_selected` | `feedback-rls-draft.md` | 반영됨 | |
| FB-PUB-001 | Owner가 Feedback 공개 선택 | 허용 | `feedback_publish_owner` | `feedback-rls-draft.md` | 반영됨 | |
| FB-PUB-002 | 공개 선택 Feedback 공개 페이지 읽기 | 허용 | `feedback_publish_owner` | `feedback-rls-draft.md` | 반영됨 | |
| FB-PRIV-001 | 공개 Feedback에서 이메일/인증 ID 노출 차단 | 차단 | `feedback_public_author_limited` | `feedback-rls-draft.md` | 반영됨 | |
| FB-PRIV-002 | Feedback 작성자 표시 방식 제한 | 조건부 허용 | `feedback_public_author_limited` | `feedback-rls-draft.md` | 반영됨 | |
| FB-LINK-001 | 반영됨 Feedback이 새 Change Card 후보로 연결 | 조건부 허용 | `feedback_link_or_change_card_candidate` | `feedback-rls-draft.md` | 추가 검토 필요 | |
| FB-LINK-002 | 링크 공개+유효 token+로그인 사용자의 Feedback 작성 | 조건부 허용 | `feedback_link_or_change_card_candidate` | `feedback-rls-draft.md` | 추가 검토 필요 | |
| FB-LINK-003 | 링크 공개+token 없음 로그인 사용자의 Feedback 작성 차단 | 차단 | `feedback_link_or_change_card_candidate` | `feedback-rls-draft.md` | 추가 검토 필요 | |
| PP-001 | 비공개 Project 공개 페이지 접근 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-002 | 전체 공개 Project 공개 페이지 접근 허용 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-003 | 링크 공개 Project 유효 token 접근 허용 | 조건부 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-004 | 링크 공개 Project token 없이 접근 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-005 | 공개 페이지에서 Project 공개 정보 노출 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-006 | Builder 공개 Profile 정보 노출 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-007 | 인증 ID/이메일 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-008 | Rough Note 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-009 | AI Draft 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-010 | 내부 전용 Change Card 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-011 | 공개 가능 Change Card 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-012 | 승인+공개+일반 Change Card 노출 허용 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-013 | 민감 정보 포함 Change Card 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-014 | 공개 Feedback Request 노출 허용 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-015 | 내부 검토 Feedback 내용 노출 차단 | 차단 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-016 | Builder가 공개 선택한 Feedback만 노출 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-017 | Project Link 후보 노출 허용 | 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| PP-018 | 공개 페이지 내용이 원천 데이터에서 파생되는지 확인 | 조건부 허용 | `public_project_page_composed_read` | `public-project-page-rls-draft.md` | 반영됨 | |
| OWN-001 | Owner가 Change Card 생성 | 허용 | `change_card_insert_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-002 | Owner가 Change Card 승인 | 허용 | `change_card_approve_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-003 | Owner가 Change Card 공개 상태 변경 | 허용 | `change_card_publish_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-004 | Owner가 Project 공개 상태 변경 | 허용 | `project_update_owner_visibility` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-005 | Owner가 아닌 작성 Builder의 Card 승인 차단 | 차단 | `change_card_approve_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-006 | Owner가 아닌 작성 Builder의 Project 공개 상태 변경 차단 | 차단 | `change_card_publish_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-007 | Feedback 작성자의 Project 수정 차단 | 차단 | `owner_matrix_restriction / feedback_insert_logged_in_with_request` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-008 | Feedback 작성자의 Change Card 승인 차단 | 차단 | `change_card_approve_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-009 | Scout 성격 사용자의 Project 수정 차단 | 차단 | `owner_matrix_restriction / feedback_insert_logged_in_with_request` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-010 | Scout 성격 사용자의 Feedback 작성 허용 | 허용 | `owner_matrix_restriction / feedback_insert_logged_in_with_request` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-011 | 관리자 후보 전체 접근 시나리오 1차 제외 | 후순위 | `excluded_from_phase1` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-012 | 팀/공동 편집 권한 후순위 표시 | 후순위 | `excluded_from_phase1` | `change-card-rls-draft.md / project-rls-draft.md` | 후순위 제외 | |
| OWN-013 | 승인자 후보가 비어 있는 초안 상태 확인 | 허용 | `change_card_approve_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |
| OWN-014 | 승인 상태에서 Project Owner가 승인자로 기록 | 허용 | `change_card_approve_owner` | `change-card-rls-draft.md / project-rls-draft.md` | 반영됨 | |

## 4. Readiness Checklist 반영 상태

7.5단계 `rls-scenario-readiness-checklist.md`의 항목은 대부분 정책 초안에 반영되었다. 다만 다음은 실제 RLS SQL 또는 helper function 설계 전까지 `부분 반영` 또는 `추가 검토 필요`로 유지한다.

- share_token 안전 검증 방식
- token hash 저장 여부
- public_slug 실제 생성/중복 정책
- Feedback 작성자 동의 UX
- 승인된 Change Card 수정 제한 세부 정책
