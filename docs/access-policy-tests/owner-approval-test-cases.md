# Owner / Approval 테스트 케이스

## 1. 문서 목적

소유자, 작성자, 승인자, Feedback 작성자의 권한 경계를 검증한다.

## 2. 공통 전제

- 이 문서의 테스트 케이스는 실제 자동화 테스트 코드가 아니다.
- SQL, CREATE POLICY, API 테스트 코드는 작성하지 않는다.
- 기대 결과는 `허용`, `차단`, `조건부 허용`, `추가 검토 필요` 중 하나로 쓴다.
- 1차 정책은 권한을 넓히기보다 안전하게 좁히는 방향을 우선한다.

## 3. 관련 정책 문서

- `docs/access-policy/role-and-ownership-policy.md`
- `docs/access-policy/change-card-access-policy.md`
- `docs/decisions/phase7-auth-visibility-access-policy-scope.md`

## 4. 테스트 케이스

| ID | 목적 | 행위자 | 사전 조건 / 대상 상태 | 수행 행위 | 기대 | 이유 | 1차 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OWN-001 | Owner가 Change Card 생성 | Project Owner Builder | 소유 Project | Change Card create | 허용 | Owner는 판단 기록을 생성할 수 있다. | 포함 |
| OWN-002 | Owner가 Change Card 승인 | Project Owner Builder | 소유 Project, Card 초안 | approve | 허용 | 1차 승인 권한은 Owner 중심이다. | 포함 |
| OWN-003 | Owner가 Change Card 공개 상태 변경 | Project Owner Builder | 소유 Project, Card 승인됨 | publish/visibility change | 허용 | 공개 상태 변경은 Owner 권한이다. | 포함 |
| OWN-004 | Owner가 Project 공개 상태 변경 | Project Owner Builder | 소유 Project | Project visibility change | 허용 | Project 공개 상태는 Owner가 관리한다. | 포함 |
| OWN-005 | Owner가 아닌 작성 Builder의 Card 승인 차단 | Change Card 작성 Builder | Project Owner 아님 | approve | 차단 | 작성자와 승인자는 개념상 다르고 1차 승인 권한은 Owner다. | 포함 |
| OWN-006 | Owner가 아닌 작성 Builder의 Project 공개 상태 변경 차단 | Change Card 작성 Builder | Project Owner 아님 | Project visibility change | 차단 | 작성 권한은 Project 공개 권한을 포함하지 않는다. | 포함 |
| OWN-007 | Feedback 작성자의 Project 수정 차단 | Feedback 작성자 | Feedback 작성 이력 있음 | Project update | 차단 | Feedback 작성은 프로젝트 권한을 만들지 않는다. | 포함 |
| OWN-008 | Feedback 작성자의 Change Card 승인 차단 | Feedback 작성자 | Feedback 작성 이력 있음 | approve | 차단 | Feedback 작성자는 승인자가 아니다. | 포함 |
| OWN-009 | Scout 성격 사용자의 Project 수정 차단 | Scout 성격의 로그인 사용자 | 공개 Project 탐색 중 | Project update | 차단 | Scout는 발견/피드백 역할이지 수정 권한자가 아니다. | 포함 |
| OWN-010 | Scout 성격 사용자의 Feedback 작성 허용 | Scout 성격의 로그인 사용자 | 공개 Feedback Request, 로그인됨 | Feedback create | 허용 | 공개 요청에 대한 Feedback 작성은 허용된다. | 포함 |
| OWN-011 | 관리자 후보 전체 접근 시나리오 1차 제외 | 관리자 후보 | 운영자 후보 | 모든 데이터 read/update | 후순위 | 관리자 권한은 1차 RLS SQL에서 제외한다. | 포함 |
| OWN-012 | 팀/공동 편집 권한 후순위 표시 | 로그인 사용자 | 팀 기능 필요 | Project 공동 update | 후순위 | 팀/조직 권한은 이번 단계에서 확장하지 않는다. | 포함 |
| OWN-013 | 승인자 후보가 비어 있는 초안 상태 확인 | Project Owner Builder | Card 초안, 승인 전 | approved_by 확인 | 허용 | 초안에는 승인자가 없을 수 있다. | 포함 |
| OWN-014 | 승인 상태에서 Project Owner가 승인자로 기록 | Project Owner Builder | Card 승인 처리 | approved_by 후보 기록 | 허용 | 1차에서는 승인자 후보가 Project Owner로 기록될 수 있다. | 포함 |

## 5. 잘못 구현될 경우의 공통 위험

- 내부 기록이 공개 페이지나 공개 Timeline에 노출될 수 있다.
- Project Owner가 아닌 사용자가 수정/승인/공개 권한을 가질 수 있다.
- 링크 공개와 전체 공개가 섞여 share token 없이 접근될 수 있다.
- 공개 가능 상태가 공개됨으로 오해될 수 있다.
- 비로그인 사용자에게 쓰기 권한이 열릴 수 있다.


## 6. Owner / Approval 핵심 원칙

- 1차에서는 Project Owner 중심 권한 모델을 우선한다.
- 팀 권한, 공동 편집, 조직 권한은 후순위다.
- 관리자 후보 권한은 1차 RLS SQL에 포함하지 않는 방향을 우선한다.
