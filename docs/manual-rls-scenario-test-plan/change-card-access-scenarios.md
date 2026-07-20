# Change Card Access Scenarios

Change Card 공개/승인/민감도/Project visibility boundary를 검증한다.

| Scenario ID | 관련 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | 실패 시 심각도 | 관련 SQL draft 파일 |
|---|---|---|---|---|---|---|---|
| CC-MAN-001 | CC-READ-* | project_owner_builder | owner project change cards | change_cards select 후보 | owner read all project change cards | high | `05_rls_policies` |
| CC-MAN-002 | CC-READ-* | authenticated_non_owner | private project cards | change_cards select 후보 | non-owner private project change cards read 차단 | blocker | `05_rls_policies` |
| CC-MAN-003 | CC-READ-* | anon | public project + approved + published + normal card | public_change_cards select 후보 | public read 가능 | high | `06_public_safe_views` |
| CC-MAN-004 | CC-READ-* | anon | sensitive card | public_change_cards select 후보 | sensitive card public read 차단 | blocker | `06_public_safe_views` |
| CC-MAN-005 | CC-READ-* | anon | internal card | public_change_cards select 후보 | internal card public read 차단 | blocker | `06_public_safe_views` |
| CC-MAN-006 | CC-READ-* | anon | draft card | public_change_cards select 후보 | draft card public read 차단 | blocker | `06_public_safe_views` |
| CC-MAN-007 | PRJ-READ-006 | anon | private project + published normal card | public_decision_timeline select 후보 | Project private이면 external read 차단 | blocker | `06_public_safe_views` |
| CC-MAN-008 | CC-MUT-* | project_owner_builder | owner draft/ready card | approve update 후보 | owner approve 가능 후보 | high | `05_rls_policies` |
| CC-MAN-009 | CC-MUT-* | non_owner_builder | non-owner card | approve update 후보 | non-owner approve 차단 | blocker | `05_rls_policies` |
| CC-MAN-010 | CC-MUT-* | project_owner_builder | approved card | publish update 후보 | owner publish 가능 후보 | high | `05_rls_policies` |
| CC-MAN-011 | CC-MUT-* | non_owner_builder | non-owner card | publish update 후보 | non-owner publish 차단 | blocker | `05_rls_policies` |

## 공통 주의

이번 단계에서는 실행하지 않는다. 17단계에서 local-only manual test로 수행한다.
