# Project Access Scenarios

Project 공개 상태와 owner boundary를 검증한다.

| Scenario ID | 관련 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | 실패 시 심각도 | 관련 SQL draft 파일 |
|---|---|---|---|---|---|---|---|
| PRJ-MAN-001 | PRJ-READ-001 | authenticated_owner | private project, owner 일치 | projects select 후보 | Owner가 자신의 Project read 가능 | high | `05_rls_policies` |
| PRJ-MAN-002 | PRJ-READ-002 | authenticated_non_owner | private project, owner 불일치 | projects select 후보 | Non-owner private Project read 불가 | blocker | `05_rls_policies` |
| PRJ-MAN-003 | PRJ-READ-004 | anon | public project | public_project_cards/pages select 후보 | anon public Project card/page read 가능 후보 | medium | `06_public_safe_views` |
| PRJ-MAN-004 | PRJ-READ-003 | anon | private project | source table/view read 후보 | anon private Project read 불가 | blocker | `05_rls_policies` |
| PRJ-MAN-005 | PRJ-READ-006 | anon | private project + approved/published/normal card | public timeline/view read 후보 | Project가 private이면 published Change Card도 외부 read 불가 | blocker | `06_public_safe_views` |
| PRJ-MAN-006 | PRJ-UPD-001, PRJ-VIS-001 | project_owner_builder | owner project | visibility/lifecycle update 후보 | Project Owner만 update 가능 후보 | high | `05_rls_policies` |
| PRJ-MAN-007 | PRJ-UPD-002 | non_owner_builder | owner 불일치 project | project update 후보 | non-owner update 차단 | blocker | `05_rls_policies` |

## 공통 주의

이번 단계에서는 실행하지 않는다. 17단계에서 local-only manual test로 수행한다.
