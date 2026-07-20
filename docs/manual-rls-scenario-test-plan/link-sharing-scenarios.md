# Link Sharing Scenarios

share_token 기반 링크 공개 접근을 검증한다.

| Scenario ID | 관련 Test Case ID | actor | 전제 데이터 | 실행 후보 | 기대 결과 | 실패 시 심각도 | 관련 SQL draft 파일 |
|---|---|---|---|---|---|---|---|
| LINK-MAN-001 | LINK-001 | anon | link_shared project, token 없음 | get_link_shared_project_page 호출 후보 | missing token 차단 | blocker | `07_link_sharing_rpc` |
| LINK-MAN-002 | LINK-004 | anon | link_shared project, wrong token | secure RPC 호출 후보 | wrong token 차단 | blocker | `07_link_sharing_rpc` |
| LINK-MAN-003 | LINK-005 | anon | revoked project link | secure RPC 호출 후보 | revoked token 차단 | blocker | `07_link_sharing_rpc` |
| LINK-MAN-004 | LINK-011 | anon | rotated token old value | secure RPC 호출 후보 | old token after rotation 차단 | blocker | `07_link_sharing_rpc` |
| LINK-MAN-005 | LINK-002 | anon/authenticated | valid token | get_link_shared_project_page 호출 후보 | valid token 허용 | high | `07_link_sharing_rpc` |
| LINK-MAN-006 | LINK-006 | anon | private 전환 + valid old token | secure RPC 호출 후보 | private 전환 후 valid token 차단 | blocker | `07_link_sharing_rpc` |
| LINK-MAN-007 | LINK-008, LINK-009 | anon | link_shared project + public_slug only | public_slug 접근 후보 | public_slug만으로 link_shared 접근 차단 | blocker | `07_link_sharing_rpc` |
| LINK-MAN-008 | FB-LINK-* | link_shared_authenticated_user | valid token + public feedback request | get_link_shared_feedback_requests 후보 | link_shared project feedback request 조회 | high | `07_link_sharing_rpc` |
| LINK-MAN-009 | FB-LINK-001 | link_shared_authenticated_user | valid token + public request | create_link_shared_feedback 후보 | authenticated + valid token 필요 | high | `07_link_sharing_rpc` |
| LINK-MAN-010 | FB-CREATE-002 | anon | valid token + public request | create_link_shared_feedback 후보 | anon + valid token feedback insert 차단 | blocker | `07_link_sharing_rpc` |

## 공통 주의

이번 단계에서는 실행하지 않는다. 17단계에서 local-only manual test로 수행한다.
