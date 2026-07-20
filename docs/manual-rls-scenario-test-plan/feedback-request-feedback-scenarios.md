# Feedback Request / Feedback Scenarios

Feedback이 요청 기반 판단 근거로만 작동하고 author spoofing이 차단되는지 검증한다.

| Scenario ID | 관련 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | 실패 시 심각도 | 관련 SQL draft 파일 |
|---|---|---|---|---|---|---|---|
| FB-MAN-001 | FB-REQ-005 | anon | public project + public Feedback Request | public_feedback_requests select 후보 | public Feedback Request read 가능 후보 | medium | `06_public_safe_views` |
| FB-MAN-002 | FB-REQ-* | anon | internal Feedback Request | public_feedback_requests select 후보 | internal Feedback Request external read 차단 | blocker | `06_public_safe_views` |
| FB-MAN-003 | FB-CREATE-001, FB-CREATE-002 | authenticated_non_owner / anon | public Feedback Request | feedback insert 후보 | feedback insert requires authenticated | blocker | `05_rls_policies` |
| FB-MAN-004 | FB-CREATE-003 | authenticated_non_owner | feedback_request_id 없음 | feedback insert 후보 | feedback insert requires feedback_request_id | high | `05_rls_policies` |
| FB-MAN-005 | FB-AUTH-* | feedback_author | author_user_profile_id spoofing 시도 | feedback insert 후보 | author_user_profile_id = current_user_profile_id 강제 | blocker | `04_helpers_and_triggers` |
| FB-MAN-006 | FB-AUTH-* | authenticated_non_owner | 다른 author_user_profile_id 사용 | feedback insert 후보 | author spoofing 차단 | blocker | `04_helpers_and_triggers` |
| FB-MAN-007 | FB-* | authenticated_owner | feedback row 확인 | column 확인 후보 | feedbacks.project_id 미저장 검증 | medium | `03_feedback_and_links_schema` |
| FB-MAN-008 | FR-CONS-* | project_owner_builder | change_card/project mismatch | feedback_request insert/update 후보 | feedback_requests.change_card_id project consistency 검증 | blocker | `04_helpers_and_triggers` |
| FB-MAN-009 | FB-PUB-001 | project_owner_builder | owner project feedback | review_status update 후보 | owner review status update 가능 후보 | high | `05_rls_policies` |
| FB-MAN-010 | FB-PUB-* | authenticated_non_owner | non-owner feedback | review_status update 후보 | non-owner review status update 차단 | blocker | `05_rls_policies` |
| FB-MAN-011 | FB-PUB-002 | anon | public selected Feedback | public_feedbacks select 후보 | public selected Feedback만 public-safe view 노출 | high | `06_public_safe_views` |
| FB-MAN-012 | FB-PRIV-001 | anon | public selected Feedback | public_feedbacks column 확인 | public Feedback view에 author_user_profile_id 미포함 | blocker | `06_public_safe_views` |

## 공통 주의

이번 단계에서는 실행하지 않는다. 17단계에서 local-only manual test로 수행한다.
