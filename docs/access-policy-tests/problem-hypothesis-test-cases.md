# Problem / Hypothesis 테스트 케이스

## 1. 문서 목적

Problem Definition과 Hypothesis 현재값, 공개 노출, 이력 원천 정책을 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/problem-hypothesis-access-policy.md`
- `docs/access-policy/public-project-page-access-policy.md`
- `docs/decisions/phase6-5-db-schema-corrections.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PH-PD-001 | Owner가 비공개 Project의 Problem Definition 읽기 | Project Owner Builder | Project 비공개, Owner 일치 | Problem Definition read | 허용 | Owner는 내부 현재 문제 정의를 관리한다. | 포함 |
| PH-PD-002 | 비로그인 방문자의 비공개 Project Problem 접근 차단 | 비로그인 방문자 | Project 비공개 | Problem Definition read | 차단 | 비공개 Project의 현재값은 외부 노출 금지다. | 포함 |
| PH-PD-003 | 전체 공개 Project의 공개 가능한 Problem 읽기 | 비로그인 방문자 | Project 전체 공개, Problem 공개 가능 | Problem Definition read | 허용 | 공개 가능한 현재 문제 정의는 공개 페이지에 노출 가능하다. | 포함 |
| PH-PD-004 | 링크 공개 Project의 Problem 읽기 | 비로그인 방문자 | Project 링크 공개, 유효 share_token, Problem 공개 가능 | Problem Definition read | 조건부 허용 | 링크 공개 접근 조건을 만족해야 한다. | 포함 |
| PH-PD-005 | Owner의 Problem Definition 수정 | Project Owner Builder | Project Owner 일치 | Problem Definition update | 허용 | 현재 문제 정의 수정은 Owner 권한이다. | 포함 |
| PH-PD-006 | 다른 로그인 사용자의 Problem 수정 차단 | 로그인 사용자 | Owner 아님 | Problem Definition update | 차단 | 남의 Project 판단 축을 수정할 수 없다. | 포함 |
| PH-PD-007 | 중요 Problem 변경 시 Change Card 생성 유도 | Project Owner Builder | 문제 정의 핵심 변경 | Change Card 생성 유도 | 조건부 허용 | 이력 원천은 Change Card이므로 중요한 변경은 기록해야 한다. | 포함 |
| PH-PD-008 | 과거 Problem 이력은 Change Card 기반 추적 | 공개 프로젝트 방문자 | 과거 문제 정의 확인 필요 | 이력 read | 조건부 허용 | 별도 이력 테이블이 아니라 공개 가능한 Change Card로 추적한다. | 포함 |
| PH-HY-001 | Owner가 Hypothesis 생성 | Project Owner Builder | 소유 Project | Hypothesis create | 허용 | Owner는 현재 가설을 관리한다. | 포함 |
| PH-HY-002 | Owner가 Hypothesis 상태 변경 | Project Owner Builder | 검증 중→반박됨 | Hypothesis status update | 허용 | 가설 현재 상태는 Owner가 수정할 수 있다. | 포함 |
| PH-HY-003 | Hypothesis 상태 변경 시 Change Card 연결 유도 | Project Owner Builder | 가설 상태 중요 변경 | Change Card 연결 유도 | 조건부 허용 | 가설 판단 흐름의 원천은 Change Card다. | 포함 |
| PH-HY-004 | 비공개 Project Hypothesis 외부 읽기 차단 | 비로그인 방문자 | Project 비공개 | Hypothesis read | 차단 | 비공개 Project의 가설은 외부 노출 금지다. | 포함 |
| PH-HY-005 | 전체 공개 Project Hypothesis 읽기 허용 | 비로그인 방문자 | Project 전체 공개, Hypothesis 공개 가능 | Hypothesis read | 허용 | 공개 가능한 현재 가설은 공개 페이지에 노출 가능하다. | 포함 |
| PH-HY-006 | 민감한 Hypothesis 공개 차단 | 비로그인 방문자 | Project 공개, Hypothesis 민감 정보 포함 후보 | Hypothesis read | 차단 | 민감한 판단 축은 공개하지 않는다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.
