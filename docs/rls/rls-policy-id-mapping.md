# Policy ID 매핑

## 1. 문서 목적

이 문서는 7단계 자연어 Policy ID와 8단계 RLS 초안 문서의 위치를 연결한다.

## 2. 매핑 표

| 7단계 Policy ID | 관련 객체 | 행위 | 8단계 RLS 초안 위치 | 관련 7.5 Test Case ID | 상태 |
|---|---|---|---|---|---|
| PROJECT_READ_PRIVATE_01 | Project | read | `project-rls-draft.md` | PRJ-READ-001, PRJ-READ-002, PRJ-READ-003 | 초안 작성됨 |
| PROJECT_READ_PUBLIC_01 | Project | read | `project-rls-draft.md` | PRJ-READ-004, PRJ-READ-005, PP-002 | 초안 작성됨 |
| PROJECT_READ_LINK_01 | Project | read | `project-rls-draft.md, link-sharing-rls-draft.md` | LINK-001~LINK-016, PP-003, PP-004 | 부분 작성 |
| PROJECT_CREATE_01 | Project | insert | `project-rls-draft.md` | OWN-001 계열 일부, PRJ 관련 생성 후보 | 초안 작성됨 |
| PROJECT_UPDATE_OWNER_01 | Project | update | `project-rls-draft.md` | PRJ-UPD-001~004, OWN-004, OWN-006, OWN-007, OWN-009 | 초안 작성됨 |
| CHANGE_CARD_READ_INTERNAL_01 | Change Card | read | `change-card-rls-draft.md` | CC-READ-001~003 | 초안 작성됨 |
| CHANGE_CARD_READ_PUBLIC_01 | Change Card | read | `change-card-rls-draft.md` | CC-PUBLIC-001~005, CC-STATUS-001~003, PP-010~013 | 초안 작성됨 |
| CHANGE_CARD_CREATE_01 | Change Card | insert | `change-card-rls-draft.md` | OWN-001 | 초안 작성됨 |
| CHANGE_CARD_APPROVE_OWNER_01 | Change Card | update/approve | `change-card-rls-draft.md` | CC-APP-001~002, OWN-002, OWN-005, OWN-008 | 초안 작성됨 |
| CHANGE_CARD_PUBLISH_OWNER_01 | Change Card | update/publish | `change-card-rls-draft.md` | CC-PUB-001, OWN-003, OWN-006 | 초안 작성됨 |
| ROUGH_NOTE_INTERNAL_01 | Rough Note | select/insert/update | `rough-note-ai-draft-rls-draft.md` | RNAI-RN-001~008 | 초안 작성됨 |
| AI_DRAFT_INTERNAL_01 | AI Draft | select/insert/update | `rough-note-ai-draft-rls-draft.md` | RNAI-AI-001~007 | 초안 작성됨 |
| PROBLEM_HYPOTHESIS_OWNER_PUBLIC_01 | Problem/Hypothesis | select/update | `problem-hypothesis-rls-draft.md` | PH-PD-001~008, PH-HY-001~006 | 부분 작성 |
| FEEDBACK_REQUEST_PUBLIC_01 | Feedback Request | select/insert | `feedback-rls-draft.md` | FB-REQ-001~006, PP-014 | 초안 작성됨 |
| FEEDBACK_CREATE_WITH_REQUEST_01 | Feedback | insert | `feedback-rls-draft.md` | FB-CREATE-001~003, FB-LINK-002~003 | 부분 작성 |
| FEEDBACK_READ_INTERNAL_PUBLIC_01 | Feedback | select/update | `feedback-rls-draft.md` | FB-READ-001~004, FB-PUB-001~002, FB-PRIV-001~002, PP-015~016 | 초안 작성됨 |
| PROFILE_PUBLIC_PRIVATE_01 | Profile | select/update | `profile-rls-draft.md` | PP-006, PP-007, FB-PRIV-001~002 | 초안 작성됨 |
| LINK_SHARE_READ_01 | Link Sharing | read | `link-sharing-rls-draft.md` | LINK-001~016 | 부분 작성 |

## 3. 상태 정의

- 초안 작성됨: 8단계 문서에 SQL 초안 또는 명확한 후보 정책이 작성됨.
- 부분 작성: 정책 방향은 작성했으나 helper function, token 검증, 필드명 확정 등이 필요함.
- 추가 검토 필요: RLS SQL로 직접 표현하기 어렵거나 보안 설계가 더 필요함.
- 후순위 제외: 1차 RLS 초안에서 제외함.

## 4. 핵심 매핑 결론

- 공개 Timeline은 `CHANGE_CARD_READ_PUBLIC_01`과 Project 공개 읽기 정책의 결합으로 처리한다.
- 링크 공개는 `LINK_SHARE_READ_01`과 helper function 후보를 통해 추가 검토한다.
- Feedback 작성은 `FEEDBACK_CREATE_WITH_REQUEST_01`로 묶되, Project 접근 조건과 Feedback Request 공개 상태를 동시에 확인해야 한다.
