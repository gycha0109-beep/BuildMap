# Change Card 접근 테스트 케이스

## 1. 문서 목적

Change Card의 내부/공개 접근과 공개 Timeline 노출 조건을 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/change-card-access-policy.md`
- `docs/access-policy/visibility-model.md`
- `docs/decisions/phase7-auth-visibility-access-policy-scope.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CC-READ-001 | Owner가 내부 전용 Change Card를 읽는다 | Project Owner Builder | 소유 Project, Change Card 내부 전용 | Change Card read | 허용 | Owner는 내부 Timeline을 볼 수 있다. | 포함 |
| CC-READ-002 | 비로그인 방문자의 내부 전용 Card 접근 차단 | 비로그인 방문자 | Project 공개 여부와 무관, Card 내부 전용 | Change Card read | 차단 | 내부 전용은 외부 노출 금지다. | 포함 |
| CC-READ-003 | 로그인 사용자의 내부 전용 Card 접근 차단 | 로그인 사용자 | Owner 아님, Card 내부 전용 | Change Card read | 차단 | 로그인만으로 내부 기록 접근 권한이 생기지 않는다. | 포함 |
| CC-PUBLIC-001 | 전체 공개 Project의 승인+공개+일반 Card 읽기 허용 | 비로그인 방문자 | Project 전체 공개, Card 승인됨+공개됨+민감도 일반 | Change Card read | 허용 | 공개 Timeline 조건을 모두 만족한다. | 포함 |
| CC-PUBLIC-002 | 초안+공개됨 Card 노출 차단 | 비로그인 방문자 | Project 전체 공개, Card 초안+공개됨+일반 | Change Card read | 차단 | 승인 전 Card는 공개 Timeline에 노출하지 않는다. | 포함 |
| CC-PUBLIC-003 | 승인됨+공개 가능 Card 노출 차단 | 비로그인 방문자 | Project 전체 공개, Card 승인됨+공개 가능+일반 | Change Card read | 차단 | 공개 가능은 공개됨이 아니다. | 포함 |
| CC-PUBLIC-004 | 민감 정보 포함 Card 노출 차단 | 비로그인 방문자 | Project 전체 공개, Card 승인됨+공개됨+민감 정보 포함 | Change Card read | 차단 | 민감도 일반 조건을 만족하지 않는다. | 포함 |
| CC-PUBLIC-005 | 비공개 Project의 공개 Card 노출 차단 | 비로그인 방문자 | Project 비공개, Card 승인됨+공개됨+일반 | Change Card read | 차단 | Project 공개 조건이 우선한다. | 포함 |
| CC-LINK-001 | 링크 공개+유효 token+공개 조건 충족 Card 읽기 | 비로그인 방문자 | Project 링크 공개+유효 token, Card 승인됨+공개됨+일반 | Change Card read | 조건부 허용 | Project 접근 조건과 Card 조건을 모두 만족한다. | 포함 |
| CC-LINK-002 | 링크 공개 Project에서 token 없이 공개 Card 접근 차단 | 비로그인 방문자 | Project 링크 공개+token 없음, Card 승인됨+공개됨+일반 | Change Card read | 차단 | Project 공개 정책을 만족하지 않는다. | 포함 |
| CC-UPD-001 | 작성 Builder가 자신의 초안 Card 수정 | Change Card 작성 Builder | 접근 가능한 Project, Card 초안, 작성자 일치 | Change Card update | 조건부 허용 | 1차에서는 Owner 중심이나 작성자 초안 수정은 후보로 검토한다. | 포함 |
| CC-APP-001 | Project Owner가 Change Card 승인 | Project Owner Builder | 소유 Project, Card 초안/수정 중 | approve | 허용 | 1차 승인 권한은 Owner 중심이다. | 포함 |
| CC-APP-002 | Owner가 아닌 사용자의 승인 차단 | 로그인 사용자 | Owner 아님 | approve | 차단 | 승인 권한은 1차에서 Owner만 갖는다. | 포함 |
| CC-PUB-001 | Owner가 아닌 작성 Builder의 공개됨 변경 차단 | Change Card 작성 Builder | Owner 아님, 작성자 일치 | publish | 차단 | 작성자와 공개 권한은 다르다. | 포함 |
| CC-SENS-001 | 민감도 설정 후 공개 Timeline 노출 차단 확인 | Project Owner Builder | Card 승인됨+공개됨+민감 정보 포함 | 공개 Timeline 표시 | 차단 | 민감 정보 포함은 공개 차단 조건이다. | 포함 |
| CC-STATUS-001 | 보류됨 Card 공개 Timeline 노출 차단 | 비로그인 방문자 | Project 전체 공개, Card 보류됨+공개됨+일반 | Change Card read | 차단 | 작업 상태가 승인됨이 아니다. | 포함 |
| CC-STATUS-002 | 승인됨+내부 전용 Card 공개 Timeline 차단 | 비로그인 방문자 | Project 전체 공개, Card 승인됨+내부 전용+일반 | Change Card read | 차단 | 공개 상태가 공개됨이 아니다. | 포함 |
| CC-STATUS-003 | 공개 가능 Card 공개 Timeline 차단 | 비로그인 방문자 | Project 전체 공개, Card 승인됨+공개 가능+일반 | Change Card read | 차단 | 공개 가능은 공개 후보일 뿐이다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.


## 6. 공개 Timeline 노출 조건

공개 Timeline에 Change Card가 노출되려면 다음 조건을 모두 만족해야 한다.

- Project가 링크 공개 또는 전체 공개 상태여야 한다.
- 접근자가 Project 공개 정책을 만족해야 한다.
- Change Card 작업 상태가 승인됨이어야 한다.
- Change Card 공개 상태가 공개됨이어야 한다.
- Change Card 민감도가 일반이어야 한다.
