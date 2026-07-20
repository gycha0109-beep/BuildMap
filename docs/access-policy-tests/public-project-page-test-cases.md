# Public Project Page 테스트 케이스

## 1. 문서 목적

Public Project Page가 Project의 공개 뷰로만 동작하고 내부 기록을 노출하지 않는지 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/public-project-page-access-policy.md`
- `docs/access-policy/change-card-access-policy.md`
- `docs/access-policy/link-sharing-policy.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PP-001 | 비공개 Project 공개 페이지 접근 차단 | 비로그인 방문자 | Project 비공개 | Public Project Page read | 차단 | 비공개 Project는 외부 공개 뷰를 제공하지 않는다. | 포함 |
| PP-002 | 전체 공개 Project 공개 페이지 접근 허용 | 비로그인 방문자 | Project 전체 공개 | Public Project Page read | 허용 | 전체 공개 상태의 공개 정보는 누구나 읽을 수 있다. | 포함 |
| PP-003 | 링크 공개 Project 유효 token 접근 허용 | 비로그인 방문자 | Project 링크 공개, 유효 share_token | Public Project Page read | 조건부 허용 | 링크 공개 접근 조건을 만족한다. | 포함 |
| PP-004 | 링크 공개 Project token 없이 접근 차단 | 비로그인 방문자 | Project 링크 공개, token 없음 | Public Project Page read | 차단 | share_token 조건이 없다. | 포함 |
| PP-005 | 공개 페이지에서 Project 공개 정보 노출 | 공개 프로젝트 방문자 | Project 공개 조건 만족 | Project 공개 정보 read | 허용 | 공개 뷰의 기본 정보다. | 포함 |
| PP-006 | Builder 공개 Profile 정보 노출 | 공개 프로젝트 방문자 | Builder가 공개 설정한 정보 | Builder Profile read | 허용 | 공개 표시명/소개 등만 노출한다. | 포함 |
| PP-007 | 인증 ID/이메일 노출 차단 | 공개 프로젝트 방문자 | Project 공개 조건 만족 | 인증 ID/이메일 read | 차단 | 인증 식별자와 이메일은 공개 정보가 아니다. | 포함 |
| PP-008 | Rough Note 노출 차단 | 공개 프로젝트 방문자 | Project 공개 조건 만족 | Rough Note read | 차단 | Rough Note는 공개 정책에서 제외된다. | 포함 |
| PP-009 | AI Draft 노출 차단 | 공개 프로젝트 방문자 | Project 공개 조건 만족 | AI Draft read | 차단 | AI Draft는 공식 기록이 아니다. | 포함 |
| PP-010 | 내부 전용 Change Card 노출 차단 | 공개 프로젝트 방문자 | Card 내부 전용 | Change Card read | 차단 | 내부 전용 Card는 공개 뷰에 나오지 않는다. | 포함 |
| PP-011 | 공개 가능 Change Card 노출 차단 | 공개 프로젝트 방문자 | Card 승인됨+공개 가능+일반 | Change Card read | 차단 | 공개 가능은 공개됨이 아니다. | 포함 |
| PP-012 | 승인+공개+일반 Change Card 노출 허용 | 공개 프로젝트 방문자 | Card 승인됨+공개됨+일반 | Change Card read | 허용 | 공개 Timeline 조건을 만족한다. | 포함 |
| PP-013 | 민감 정보 포함 Change Card 노출 차단 | 공개 프로젝트 방문자 | Card 승인됨+공개됨+민감 정보 포함 | Change Card read | 차단 | 민감도 일반 조건을 만족하지 않는다. | 포함 |
| PP-014 | 공개 Feedback Request 노출 허용 | 공개 프로젝트 방문자 | Request 공개 요청 | Feedback Request read | 허용 | Feedback Request는 공개 가능하다. | 포함 |
| PP-015 | 내부 검토 Feedback 내용 노출 차단 | 공개 프로젝트 방문자 | Feedback 내부 검토 | Feedback read | 차단 | Feedback 내용은 기본 공개가 아니다. | 포함 |
| PP-016 | Builder가 공개 선택한 Feedback만 노출 | 공개 프로젝트 방문자 | Feedback 공개 선택됨 | Feedback read | 허용 | 선택 공개된 Feedback만 노출 가능하다. | 포함 |
| PP-017 | Project Link 후보 노출 허용 | 공개 프로젝트 방문자 | Project Link 공개 가능 | Project Link read | 허용 | 공개 페이지의 데모/GitHub/Figma 링크 후보는 노출 가능하다. | 포함 |
| PP-018 | 공개 페이지 내용이 원천 데이터에서 파생되는지 확인 | Project Owner Builder | Project/Problem/Hypothesis/Change Card 원천 존재 | Public Page 구성 확인 | 조건부 허용 | 별도 소개글 원천이 아니라 공개 조건을 만족한 원천 데이터로 구성한다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.
