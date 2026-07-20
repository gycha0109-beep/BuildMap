# Test Data Setup Plan

> 주의: 이번 16단계에서는 실제 insert를 실행하지 않는다. 이 문서는 17단계 수동 테스트용 데이터 준비 계획만 정의한다.

| 데이터 후보 | 목적 | 필요한 테이블 | 최소 필드 | 관련 Test Case ID | 생성 방법 후보 | 주의 사항 |
|---|---|---|---|---|---|---|
| owner user profile | owner actor 식별 | `user_profiles` | `id, auth_user_id, display_name` | PRJ-READ-001 | local insert 후보 | auth.uid() mapping 주의 |
| non-owner user profile | 소유자 불일치 검증 | `user_profiles` | `id, auth_user_id, display_name` | PRJ-READ-002 | local insert 후보 | owner와 auth_user_id 분리 |
| owner builder profile | Project owner builder 검증 | `builder_profiles` | `id, user_profile_id, handle` | PRJ-UPD-001 | local insert 후보 | owner profile에 연결 |
| non-owner builder profile | non-owner builder 차단 | `builder_profiles` | `id, user_profile_id, handle` | PRJ-UPD-002 | local insert 후보 | owner와 다른 profile |
| private project | private read 차단 | `projects` | `id, owner_builder_profile_id, visibility` | PRJ-READ-002 | local insert 후보 | visibility=private |
| public project | public-safe view read | `projects` | `id, owner_builder_profile_id, visibility, public_slug` | PRJ-READ-004 | local insert 후보 | public_slug는 token 아님 |
| link_shared project | token 기반 접근 | `projects, project_links` | `project visibility, share_token_hash` | LINK-002 | local insert/RPC 후보 | share_token 원문 저장 금지 |
| project with public_slug | slug 접근 검증 | `projects` | `public_slug, visibility` | LINK-008 | local insert 후보 | link_shared 접근 조건으로 사용 금지 |
| project with share_token_hash | secure RPC 검증 | `project_links` | `share_token_hash, revoked_at` | LINK-004 | local insert/RPC 후보 | hash만 저장 |
| approved published normal Change Card | public timeline 후보 | `change_cards` | `status, visibility, sensitivity` | CC-READ-* | local insert 후보 | Project visibility 조건도 필요 |
| approved published sensitive Change Card | sensitive public block | `change_cards` | `status, visibility, sensitivity` | CC-READ-* | local insert 후보 | public view 제외 |
| draft Change Card | draft 외부 차단 | `change_cards` | `work_status, visibility` | CC-READ-* | local insert 후보 | owner만 read |
| internal Change Card | internal 외부 차단 | `change_cards` | `visibility` | CC-READ-* | local insert 후보 | public view 제외 |
| rough note | 원문 내부 기록 보호 | `rough_notes` | `project_id, owner, body` | RNAI-RN-* | local insert 후보 | public project에서도 외부 차단 |
| AI structured draft | AI 초안 보호 | `ai_structured_drafts` | `rough_note_id, project_id, content` | RNAI-AI-* | local insert 후보 | public view 미포함 |
| public Feedback Request | 공개 요청 read/write 조건 | `feedback_requests` | `project_id, visibility, target` | FB-REQ-005 | local insert 후보 | Project 공개 조건 필요 |
| internal Feedback Request | 내부 요청 외부 차단 | `feedback_requests` | `visibility` | FB-REQ-* | local insert 후보 | external read 차단 |
| Feedback by owner | owner feedback read/update | `feedbacks` | `feedback_request_id, author_user_profile_id` | FB-READ-002 | local insert 후보 | project owner read |
| Feedback by non-owner | author read/spoofing | `feedbacks` | `author_user_profile_id` | FB-READ-001 | local insert 후보 | current user와 author 일치 |
| public selected Feedback | public feedback view | `feedbacks` | `is_public_selected, display fields` | FB-PUB-002 | local insert/update 후보 | author_user_profile_id 미노출 |
| internal Feedback | feedback internal block | `feedbacks` | `review_status, visibility` | FB-READ-003 | local insert 후보 | public view 제외 |
| project link public | valid token path | `project_links` | `project_id, share_token_hash, revoked_at` | LINK-002 | local insert/RPC 후보 | token failure response 검증 |
| project link internal | revoked/internal link | `project_links` | `revoked_at, rotated_at` | LINK-005 | local insert/RPC 후보 | old/revoked token 차단 |

## 공통 주의 사항

- test data는 local DB에만 생성한다.
- remote Supabase 프로젝트에 연결하지 않는다.
- secret 또는 token 원문을 문서에 남기지 않는다.
- share_token은 원문 저장 금지이며, DB에는 `share_token_hash` 후보만 둔다.
- `public_slug`는 보안 토큰이 아니다.
- 비로그인 feedback write는 계속 차단 대상이다.
