# RLS Scenario Readiness Checklist Status

## 1. 상태 값 정의

| 상태 | 의미 |
|---|---|
| 확인됨 | 7.5 테스트 케이스와 8단계 RLS 초안이 모두 존재하며 방향이 일치함 |
| 부분 확인 | 테스트 케이스와 초안은 있으나 구현 경계가 추가 검토 필요함 |
| 확인 필요 | 테스트 케이스 또는 RLS 초안이 부족하거나 보안 결정이 남아 있음 |
| 후순위 제외 | 1차 범위에서 제외하기로 한 항목 |

## 2. 체크리스트 상태 보정

| 항목 | 상태 | 관련 7.5 테스트 케이스 문서 | 관련 8단계 RLS 초안 문서 | 보정 필요 여부 | 비고 |
|---|---|---|---|---|---|
| 비공개 Project 접근 차단 테스트 | 확인됨 | `project-access-test-cases.md` | `project-rls-draft.md` | 낮음 | Owner 외 차단 방향 일치 |
| 전체 공개 Project 접근 허용 테스트 | 확인됨 | `project-access-test-cases.md`, `public-project-page-test-cases.md` | `project-rls-draft.md` | 낮음 | public-safe 응답 경계는 별도 필요 |
| 링크 공개 Project의 share_token 접근 테스트 | 부분 확인 | `link-sharing-test-cases.md` | `link-sharing-rls-draft.md` | 높음 | token 검증 위치 미확정 |
| share_token 없음/잘못됨/폐기됨/재발급 시나리오 | 부분 확인 | `link-sharing-test-cases.md` | `link-sharing-rls-draft.md` | 높음 | hash 저장/폐기 방식 결정 필요 |
| public_slug가 보안 토큰으로 사용되지 않는지 테스트 | 확인됨 | `link-sharing-test-cases.md` | `link-sharing-rls-draft.md` | 낮음 | 보안 토큰 아님으로 정리됨 |
| 공개 가능과 공개됨 구분 테스트 | 확인됨 | `change-card-access-test-cases.md` | `change-card-rls-draft.md` | 낮음 | 공개 가능은 외부 노출 아님 |
| Change Card 민감도 일반/민감 정보 포함 구분 테스트 | 확인됨 | `change-card-access-test-cases.md` | `change-card-rls-draft.md` | 낮음 | 민감 정보 포함은 공개 Timeline 차단 |
| Project가 비공개이면 공개 Change Card도 외부 차단되는 테스트 | 확인됨 | `project-access-test-cases.md`, `change-card-access-test-cases.md` | `change-card-rls-draft.md` | 낮음 | Project 공개 조건 우선 |
| Rough Note와 AI Draft 외부 차단 테스트 | 확인됨 | `rough-note-ai-draft-test-cases.md` | `rough-note-ai-draft-rls-draft.md` | 낮음 | 모든 공개 정책에서 제외 |
| Feedback Request 공개와 Feedback 내용 비공개 분리 테스트 | 확인됨 | `feedback-test-cases.md`, `public-project-page-test-cases.md` | `feedback-rls-draft.md` | 중간 | public-safe 응답 경계 필요 |
| Feedback은 Feedback Request를 통해서만 생성되는 테스트 | 확인됨 | `feedback-test-cases.md` | `feedback-rls-draft.md` | 중간 | insert 위조 방지 보정 필요 |
| 비로그인 쓰기 차단 테스트 | 확인됨 | 여러 테스트 문서 | 여러 RLS 초안 | 낮음 | 1차에서 비로그인 쓰기 제외 |
| Project Owner만 Project 수정/공개 상태 변경 가능한 테스트 | 확인됨 | `project-access-test-cases.md`, `owner-approval-test-cases.md` | `project-rls-draft.md` | 낮음 | Owner 중심 정책 유지 |
| Project Owner만 Change Card 승인/공개 가능한 테스트 | 확인됨 | `change-card-access-test-cases.md`, `owner-approval-test-cases.md` | `change-card-rls-draft.md` | 중간 | 승인 후 mutation 제한은 추가 보정 필요 |
| 관리자 후보 권한이 1차 RLS에서 제외되는지 확인 | 확인됨 | `owner-approval-test-cases.md` | `rls-known-limitations.md` | 낮음 | 관리자 권한 제외 유지 |
| Access Policy Matrix 보정안 반영 | 확인됨 | `access-policy-matrix-corrections.md` | `rls-policy-id-mapping.md` | 낮음 | Owner 중심으로 좁힘 |
| RLS SQL 작성 전 허용/차단 시나리오 문서화 | 확인됨 | `rls-scenario-readiness-checklist.md` | `rls-test-case-mapping.md` | 낮음 | 7.5→8 매핑 존재 |

## 3. 8.5단계 기준 남은 차단/확인 필요 항목

현재 완전 차단 상태는 없다. 다만 9단계 migration draft 전에 다음은 반드시 결정해야 한다.

- `share_token` 검증 위치
- token hash 저장 방식
- public-safe 응답 경계
- Feedback insert 작성자 위조 방지 방식
- 승인된 Change Card 수정 제한 방식
