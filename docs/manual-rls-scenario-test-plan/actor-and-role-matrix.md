# Actor and Role Matrix

| Actor | 읽을 수 있는 것 | 쓸 수 있는 것 | 수정할 수 있는 것 | 읽으면 안 되는 것 | 쓰면 안 되는 것 | 관련 RLS policy | 관련 helper/RPC/view | 관련 Test Case ID |
|---|---|---|---|---|---|---|---|---|
| anon | public-safe view의 공개 row, public project card/page 후보 | 없음 | 없음 | private project, rough_notes, ai_structured_drafts, internal feedback, source table broad read | feedback insert, project write, change card mutation | public view/RPC 제한 | public_* views, get_link_shared_* RPC | PRJ-READ-003, PRJ-READ-004, LINK-* |
| authenticated_owner | 자신의 projects, change_cards, rough_notes, ai_drafts, feedback_requests, feedbacks | 자신 project 범위의 create/update 후보 | 자신 project visibility/lifecycle/change card approval 후보 | 타 owner private data | 남의 project/update/approve | owner RLS, is_project_owner helper | current_user_profile_id, is_project_owner | PRJ-READ-001, PRJ-UPD-001 |
| authenticated_non_owner | public-safe view 공개 row, 자신의 feedback | 공개 Feedback Request에 feedback insert 후보 | 자신 feedback 일부 수정 후보 | 남의 private/internal data | project/update/approve, author spoofing | non-owner deny policy | can_insert_feedback, can_read_feedback | PRJ-READ-002, FB-* |
| feedback_author | 자신이 작성한 feedback | 조건 충족 feedback insert | 자신 feedback 제한 수정 후보 | 다른 feedback internal detail | author_user_profile_id spoofing | feedback author RLS/trigger | prevent_feedback_author_spoofing | FB-READ-001, FB-AUTH-* |
| link_shared_authenticated_user | valid token으로 link_shared 공개 가능 데이터 | valid token + authenticated feedback insert 후보 | 없음 | token 없는 link_shared data, private 전환 data | anon feedback insert, invalid token insert | secure RPC boundary | create_link_shared_feedback | LINK-*, FB-LINK-* |
| project_owner_builder | 소유 project 전체 내부 기록 | project/change_card/feedback_request 생성 후보 | approve/publish/archive 후보 | 남의 project 내부 기록 | 남의 project mutation | builder ownership policy | is_project_owner_by_builder | CC-MUT-*, FB-REQ-* |
| non_owner_builder | public data, 자신의 builder profile 후보 | 자신 builder profile 일부 후보 | 자신 profile 일부 후보 | 남의 project 내부 기록 | 남의 project approve/publish/update | non-owner deny | public_builder_profiles | PRJ-UPD-002, CC-* |

## 원칙

- 권한은 owner 중심으로 좁게 시작한다.
- public read는 public-safe view 또는 secure RPC 후보로 제한한다.
- source table broad anon select는 피한다.
- 비로그인 쓰기 권한은 허용하지 않는다.
