# Project 접근 테스트 케이스

## 1. 문서 목적

Project 공개 상태, 소유자 권한, 수정/공개 전환 정책을 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/project-access-policy.md`
- `docs/access-policy/role-and-ownership-policy.md`
- `docs/decisions/phase7-auth-visibility-access-policy-scope.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PRJ-READ-001 | Owner가 자신의 비공개 Project를 읽을 수 있는지 확인 | Project Owner Builder | Project 비공개, 소유자 일치 | Project read | 허용 | Owner는 자신의 내부 Project를 관리해야 한다. | 포함 |
| PRJ-READ-002 | 다른 로그인 사용자의 비공개 Project 접근 차단 | 로그인 사용자 | Project 비공개, 소유자 불일치 | Project read | 차단 | 비공개 Project는 Owner만 읽는다. | 포함 |
| PRJ-READ-003 | 비로그인 방문자의 비공개 Project 접근 차단 | 비로그인 방문자 | Project 비공개 | Project read | 차단 | 비공개 Project는 외부에 노출하지 않는다. | 포함 |
| PRJ-READ-004 | 비로그인 방문자의 전체 공개 Project 공개 정보 읽기 | 비로그인 방문자 | Project 전체 공개 | 공개 정보 read | 허용 | 전체 공개 Project의 공개 정보는 읽기 가능하다. | 포함 |
| PRJ-READ-005 | 로그인 사용자의 전체 공개 Project 공개 정보 읽기 | 로그인 사용자 | Project 전체 공개 | 공개 정보 read | 허용 | 로그인 여부와 무관하게 공개 정보는 읽기 가능하다. | 포함 |
| PRJ-UPD-001 | Owner의 Project 수정 허용 | Project Owner Builder | 소유자 일치 | Project update | 허용 | 1차 수정 권한은 Project Owner 중심이다. | 포함 |
| PRJ-UPD-002 | 다른 로그인 사용자의 Project 수정 차단 | 로그인 사용자 | 소유자 불일치 | Project update | 차단 | 로그인 사용자는 남의 Project를 수정할 수 없다. | 포함 |
| PRJ-UPD-003 | Owner가 아닌 Change Card 작성 Builder의 Project 수정 차단 | Change Card 작성 Builder | 작성자이나 Project Owner 아님 | Project update | 차단 | 작성 권한과 Project 수정 권한은 다르다. | 포함 |
| PRJ-UPD-004 | Feedback 작성자의 Project 수정 차단 | Feedback 작성자 | Feedback 작성 이력 있음, Owner 아님 | Project update | 차단 | Feedback 작성은 Project 권한을 부여하지 않는다. | 포함 |
| PRJ-VIS-001 | Owner의 비공개→전체 공개 전환 허용 | Project Owner Builder | Project 비공개, 소유자 일치 | visibility change | 허용 | 공개 상태 변경은 Owner 권한이다. | 포함 |
| PRJ-VIS-002 | 다른 로그인 사용자의 공개 상태 변경 차단 | 로그인 사용자 | 소유자 불일치 | visibility change | 차단 | 남의 Project 공개 상태를 바꿀 수 없다. | 포함 |
| PRJ-STATUS-001 | Owner의 진행 상태 변경 허용 | Project Owner Builder | Project 소유자 일치 | progress status change | 허용 | Project 진행 상태는 Owner가 관리한다. | 포함 |
| PRJ-STATUS-002 | 중요 진행 상태 변경 시 Change Card 생성 유도 | Project Owner Builder | 제작 중→테스트 중 등 중요한 변경 | progress status change | 조건부 허용 | 상태 변경은 허용하되 중요한 변경은 Change Card 생성을 유도한다. | 포함 |
| PRJ-READ-006 | 비공개 Project의 공개 Change Card 외부 노출 차단 | 비로그인 방문자 | Project 비공개, Change Card 승인됨+공개됨+민감도 일반 | Project/Timeline read | 차단 | Project가 비공개이면 공개 Change Card도 외부 노출하지 않는다. | 포함 |
| PRJ-ARCH-001 | Owner의 Project 보관/삭제 후보 전환 | Project Owner Builder | 소유자 일치 | delete/archive | 조건부 허용 | 삭제보다는 보관을 우선 검토하며 세부 정책은 후순위다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.
