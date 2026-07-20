# Change Card 접근 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 BuildMap의 핵심 원천 기록인 Change Card의 접근 정책을 정리한다.

Change Card는 단순 로그가 아니라 프로젝트에서 발생한 의사결정 단위다. Decision Timeline은 승인된 Change Card를 표현하는 구조다.

## 2. Change Card 생성 정책

- Project Owner 또는 해당 Project의 작성 권한이 있는 Builder만 Change Card를 생성할 수 있다.
- 1차에서는 Project Owner가 작성자와 승인자를 겸할 수 있다.
- AI Draft에서 전환된 Change Card도 Builder 검토를 거쳐 생성된다.
- Change Card 초안 생성 시 필수 정보와 승인 시 권장/필수 정보는 분리한다.

## 3. Change Card 초안 읽기 정책

- Change Card 초안은 Project Owner 또는 작성 Builder만 읽을 수 있다.
- 외부 방문자, Scout 성격 사용자, 비로그인 방문자는 초안을 읽을 수 없다.
- 초안은 공식 Decision Timeline에 반영되지 않는다.

## 4. Change Card 수정 정책

- 승인 전 Change Card는 Project Owner 또는 작성 Builder가 수정할 수 있다.
- 승인 후 수정 정책은 추가 검토 필요다. 승인된 기록은 판단 흐름의 신뢰성을 위해 수정 이력 또는 제한 정책이 필요할 수 있다.
- 1차에서는 승인 후 직접 수정보다 새 Change Card로 판단 변경을 남기는 방향을 우선 검토한다.

## 5. Change Card 승인 정책

- Change Card가 승인되기 전에는 공식 Decision Timeline에 반영되지 않는다.
- 1차에서 승인자는 Project Owner 또는 해당 Builder로 제한하는 방향을 우선 검토한다.
- 승인 시점에는 근거, 판단, 다음 확인 사항을 강력 권장 또는 필수 후보로 둔다.

## 6. Change Card 공개 상태 변경 정책

- Change Card 공개 상태는 `내부 전용`, `공개 가능`, `공개됨` 축으로 관리한다.
- 공개 상태 변경은 Project Owner가 수행하는 방향을 우선 검토한다.
- `공개 가능`은 외부 공개가 아니라 공개 후보 상태다.
- `공개됨`이어도 Project가 비공개이면 외부에는 노출하지 않는다.

## 7. Change Card 민감도 설정 정책

- 민감도 후보는 `일반`, `민감 정보 포함`이다.
- 민감 정보 포함은 공개 상태가 아니라 별도 플래그다.
- 민감 정보 포함 Change Card는 공개 전 재검토가 필요하다.
- 공개 Timeline에서는 기본적으로 민감 정보 없음 조건을 요구한다.

## 8. Change Card 삭제 또는 보관 정책

- 초안은 삭제 가능 후보로 둔다.
- 승인된 Change Card는 물리 삭제보다 보관 또는 공개 제외를 우선 검토한다.
- 삭제 정책은 판단 흐름 신뢰성과 연결되므로 추가 검토 필요다.

## 9. 내부 Timeline 노출 조건

내부 Timeline에는 Project Owner가 접근 가능한 승인 Change Card가 표시된다.

- Project Owner가 접근 가능한 Project여야 한다.
- Change Card 작업 상태가 승인됨이어야 한다.
- 공개 상태와 민감도는 내부 표시에서는 필터 조건이 될 수 있으나, 외부 공개 차단 조건과는 다르게 다룬다.

## 10. 공개 Timeline 노출 조건

공개 Timeline에 Change Card가 노출되려면 다음 조건을 모두 만족해야 한다.

- Project가 링크 공개 또는 전체 공개 상태여야 한다.
- Change Card 작업 상태가 승인됨이어야 한다.
- Change Card 공개 상태가 공개됨이어야 한다.
- Change Card 민감도가 일반이어야 한다.
- 접근자가 Project 공개 정책을 만족해야 한다.

이는 SQL이 아니라 문서용 자연어 pseudo-policy다.

## 11. Project 공개 상태와의 관계

- Project가 비공개이면 Change Card가 공개됨이어도 외부에는 노출하지 않는다.
- Project가 링크 공개이면 링크 접근 조건을 만족한 사용자에게만 공개 가능한 Change Card를 노출한다.
- Project가 전체 공개이면 누구나 공개 가능한 Change Card를 볼 수 있다.

## 12. 작성 Builder와 승인 Builder의 관계

- 1인 Builder 흐름에서는 작성자와 승인자가 같을 수 있다.
- 팀/협업 기능이 도입되면 작성자와 승인자가 달라질 수 있다.
- 1차에서는 복잡한 승인 워크플로우를 만들지 않는다.
