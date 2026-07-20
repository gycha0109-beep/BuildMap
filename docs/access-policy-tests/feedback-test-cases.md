# Feedback Request / Feedback 테스트 케이스

## 1. 문서 목적

Feedback이 일반 댓글이 아니라 요청 기반 판단 근거로 동작하는지 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/feedback-access-policy.md`
- `docs/access-policy/public-project-page-access-policy.md`
- `docs/decisions/phase7-auth-visibility-access-policy-scope.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FB-REQ-001 | Owner가 Project-level Feedback Request 생성 | Project Owner Builder | 소유 Project | Feedback Request create | 허용 | Project 전체 피드백도 Request 단위로 만든다. | 포함 |
| FB-REQ-002 | Owner가 Change Card-level Feedback Request 생성 | Project Owner Builder | 소유 Project, Change Card 존재 | Feedback Request create | 허용 | 특정 판단에 대한 피드백 요청이다. | 포함 |
| FB-REQ-003 | 다른 로그인 사용자의 남의 Project Request 생성 차단 | 로그인 사용자 | Owner 아님 | Feedback Request create | 차단 | 피드백 요청 생성은 Owner 권한이다. | 포함 |
| FB-REQ-004 | 비로그인 방문자의 Request 생성 차단 | 비로그인 방문자 | 로그인 없음 | Feedback Request create | 차단 | 비로그인 쓰기 권한은 1차 제외다. | 포함 |
| FB-REQ-005 | 비로그인 방문자의 공개 Feedback Request 읽기 | 비로그인 방문자 | Project 공개 조건 만족, Request 공개 | Feedback Request read | 허용 | Request 자체는 공개 가능하다. | 포함 |
| FB-REQ-006 | 로그인 사용자의 공개 Feedback Request 읽기 | 로그인 사용자 | Project 공개 조건 만족, Request 공개 | Feedback Request read | 허용 | 공개 요청은 로그인 사용자도 읽을 수 있다. | 포함 |
| FB-CREATE-001 | 로그인 사용자가 공개 Request에 Feedback 작성 | 로그인 사용자 | 공개 Feedback Request, 로그인됨 | Feedback create | 허용 | 1차 Feedback은 로그인 기반이다. | 포함 |
| FB-CREATE-002 | 비로그인 방문자의 Feedback 작성 차단 | 비로그인 방문자 | 공개 Feedback Request | Feedback create | 차단 | 비로그인 Feedback은 1차 보류다. | 포함 |
| FB-CREATE-003 | Feedback Request 없이 Feedback 작성 차단 | 로그인 사용자 | 연결 Request 없음 | Feedback create | 차단 | Feedback은 반드시 Feedback Request를 통해 생성된다. | 포함 |
| FB-READ-001 | Feedback 작성자가 자신의 Feedback 읽기 | Feedback 작성자 | 작성자 일치 | Feedback read | 허용 | 작성자는 자신의 응답을 확인할 수 있다. | 포함 |
| FB-READ-002 | Owner가 자신의 Project Feedback 읽기 | Project Owner Builder | 소유 Project에 달린 Feedback | Feedback read | 허용 | Feedback 내용은 Owner 내부 검토용이다. | 포함 |
| FB-READ-003 | 다른 로그인 사용자의 내부 Feedback 읽기 차단 | 로그인 사용자 | Owner/작성자 아님, Feedback 내부 검토 | Feedback read | 차단 | 내부 검토 Feedback은 공개 댓글이 아니다. | 포함 |
| FB-READ-004 | 비로그인 방문자의 내부 Feedback 읽기 차단 | 비로그인 방문자 | Feedback 내부 검토 | Feedback read | 차단 | Feedback 내용은 기본 공개가 아니다. | 포함 |
| FB-PUB-001 | Owner가 Feedback 공개 선택 | Project Owner Builder | Feedback 내부 검토 | Feedback visibility change | 허용 | Builder가 선택한 Feedback만 공개될 수 있다. | 포함 |
| FB-PUB-002 | 공개 선택 Feedback 공개 페이지 읽기 | 비로그인 방문자 | Project 공개 조건 만족, Feedback 공개 선택됨 | Feedback read | 허용 | 공개 선택된 Feedback만 노출 가능하다. | 포함 |
| FB-PRIV-001 | 공개 Feedback에서 이메일/인증 ID 노출 차단 | 비로그인 방문자 | Feedback 공개 선택됨 | 작성자 정보 read | 차단 | 작성자 개인정보는 최소 노출한다. | 포함 |
| FB-PRIV-002 | Feedback 작성자 표시 방식 제한 | 공개 프로젝트 방문자 | Feedback 공개 선택됨 | 작성자 표시 정보 read | 조건부 허용 | 익명 또는 공개 표시명/역할만 노출한다. | 포함 |
| FB-LINK-001 | 반영됨 Feedback이 새 Change Card 후보로 연결 | Project Owner Builder | Feedback 반영됨 | Change Card 후보 생성 | 조건부 허용 | Feedback은 판단 근거로 Change Card에 연결될 수 있다. | 포함 |
| FB-LINK-002 | 링크 공개+유효 token+로그인 사용자의 Feedback 작성 | 로그인 사용자 | Project 링크 공개, 유효 token, 공개 Request | Feedback create | 조건부 허용 | 유효 링크 접근과 로그인 조건을 모두 만족해야 한다. | 포함 |
| FB-LINK-003 | 링크 공개+token 없음 로그인 사용자의 Feedback 작성 차단 | 로그인 사용자 | Project 링크 공개, token 없음, 공개 Request | Feedback create | 차단 | 링크 공개 Project의 Request에 접근 조건을 만족하지 않는다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.


## 6. Feedback 핵심 원칙

- Feedback은 1차에서 반드시 Feedback Request를 통해서만 생성된다.
- Feedback 내용은 기본 내부 검토용이다.
- Feedback 공개 시 작성자 개인정보는 최소 노출한다.
- 비로그인 Feedback은 1차에서 차단한다.
