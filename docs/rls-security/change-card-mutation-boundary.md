# Change Card Mutation Boundary

## 1. 왜 승인된 Change Card 수정 제한이 필요한가

Change Card는 BuildMap의 핵심 원천 기록이다. 승인된 Change Card가 자유롭게 수정되면 Decision Timeline의 신뢰성이 흔들린다.

특히 다음 항목은 승인 이후 사후 변경되면 판단 흐름의 원천성이 약해진다.

- 구조화 요약
- 근거
- 판단
- 변경 내용
- 다음 확인 사항

## 2. Change Card 초안 수정 정책

초안 또는 수정 중 상태에서는 Project Owner가 수정할 수 있는 방향을 기본으로 한다.

- 초안 작성 부담을 낮춘다.
- AI Draft에서 넘어온 내용을 Builder가 고칠 수 있어야 한다.
- 승인 전에는 공식 Timeline 원천으로 취급하지 않는다.

## 3. 승인 전 수정 가능 범위

- 유형
- 제목
- 구조화 요약
- 근거
- 판단
- 변경 내용
- 다음 확인 사항
- 연결된 문제/가설/피드백 후보
- 공개 상태 후보
- 민감도 후보

## 4. 승인 후 수정 제한 필요성

승인 후에는 공식 Decision Timeline에 반영된다. 따라서 본문/근거/판단/변경 내용의 직접 수정은 제한하는 방향을 우선 검토한다.

승인 후 내용 변경이 필요하면 새 Change Card를 작성해 변경 이유를 남기도록 유도한다.

## 5. 승인 후 변경 가능 후보

승인 후에도 다음은 Project Owner가 변경 가능할 수 있다.

- `visibility_status` 성격의 공개 상태
- `sensitivity_status` 성격의 민감도
- 공개 페이지 노출 여부 후보

단, 공개 상태 변경과 민감도 변경은 기록성 측면에서 추적 후보로 남긴다. 이번 단계에서는 별도 audit table을 만들지 않는다.

## 6. 승인 후 본문/판단/근거 수정 제한 후보

| 항목 | 1차 권장 |
|---|---|
| 제목 | 추가 검토 필요 |
| 구조화 요약 | 승인 후 직접 수정 제한 우선 |
| 근거 | 승인 후 직접 수정 제한 우선 |
| 판단 | 승인 후 직접 수정 제한 우선 |
| 변경 내용 | 승인 후 직접 수정 제한 우선 |
| 다음 확인 사항 | 추가 검토 필요 |
| 공개 상태 | Owner 변경 가능 후보 |
| 민감도 | Owner 변경 가능 후보 |

## 7. DB RLS로 막을 수 있는 것

RLS는 행 단위 update 권한을 제한하는 데 적합하다.

- Owner 외 update 차단
- 외부 사용자 update 차단
- 비로그인 update 차단

## 8. RLS만으로 막기 어려운 것

RLS만으로 특정 컬럼만 조건부 수정 제한하는 것은 복잡할 수 있다. 특히 “승인된 카드의 본문 컬럼은 수정 금지, 공개 상태는 수정 허용” 같은 정책은 다음 후보가 필요할 수 있다.

- DB trigger 후보
- constraint 후보
- application validation 후보
- update RPC 후보

## 9. 1차 권장 방향

- 초안/수정 중 상태의 Change Card는 Project Owner가 수정 가능
- 승인된 Change Card의 본문, 근거, 판단, 변경 내용은 직접 수정 제한 우선 검토
- 승인된 Change Card의 공개 상태/민감도는 Project Owner 변경 가능 후보
- 승인 후 내용 변경이 필요하면 새 Change Card 작성 유도
- RLS만으로 컬럼별 수정 제한이 어렵다면 trigger 또는 application validation 후보로 남긴다.

## 10. migration draft 전 결정해야 할 것

- 승인된 Change Card의 수정 제한을 DB trigger/constraint로 둘지
- application validation으로 먼저 둘지
- 승인 후 제목/다음 확인 사항 수정 가능 여부
- 승인 후 공개 상태/민감도 변경 로그가 필요한지
