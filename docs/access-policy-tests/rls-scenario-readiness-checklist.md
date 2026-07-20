# RLS Scenario Readiness 체크리스트

## 1. 문서 목적

이 문서는 실제 RLS SQL 작성 전에 7.5단계 테스트 케이스 문서가 충분히 준비되었는지 확인하기 위한 체크리스트다.

이번 문서는 SQL 작성 지시서가 아니다. SQL 작성 전 허용/차단 시나리오가 문서화되었는지 확인하는 문서다.

## 2. 체크리스트

| 체크 항목 | 확인 문서 | 상태 |
| --- | --- | --- |
| 비공개 Project 접근 차단 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| 전체 공개 Project 접근 허용 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| 링크 공개 Project의 share_token 접근 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| share_token 없음/잘못됨/폐기됨/재발급 시나리오가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| public_slug가 보안 토큰으로 사용되지 않는지 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| 공개 가능과 공개됨을 구분하는 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Change Card 민감도 일반/민감 정보 포함을 구분하는 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Project가 비공개이면 공개 Change Card도 외부 차단되는 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Rough Note와 AI Draft 외부 차단 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Feedback Request 공개와 Feedback 내용 비공개 분리 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Feedback은 Feedback Request를 통해서만 생성되는 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| 비로그인 쓰기 차단 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Project Owner만 Project 수정/공개 상태 변경이 가능한 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| Project Owner만 Change Card 승인/공개가 가능한 테스트가 있는가 | docs/access-policy-tests/ | 확인 필요 |
| 관리자 후보 권한이 1차 RLS에서 제외되는지 확인했는가 | docs/access-policy-tests/ | 확인 필요 |
| Access Policy Matrix 보정안이 반영되었는가 | docs/access-policy-tests/ | 확인 필요 |
| RLS SQL 작성 전 허용/차단 시나리오가 문서화되었는가 | docs/access-policy-tests/ | 확인 필요 |

## 3. RLS SQL 작성 전 통과 기준

다음이 모두 정리되어야 실제 RLS SQL 초안으로 넘어갈 수 있다.

- 공개 Project 읽기 정책과 비공개 Project 차단 정책이 모두 있다.
- 링크 공개 Project의 `share_token` 성공/실패/폐기/재발급 시나리오가 있다.
- 공개 Timeline 조건을 만족하는 허용 케이스와 조건을 하나라도 만족하지 않는 차단 케이스가 모두 있다.
- Rough Note와 AI Draft가 모든 공개 정책에서 제외되는 테스트가 있다.
- Feedback Request와 Feedback 공개 정책이 분리되어 있다.
- 비로그인 쓰기 권한 차단 시나리오가 있다.
- Project Owner 중심 권한 모델이 테스트 케이스에 반영되어 있다.
- 관리자 후보 권한을 1차 RLS SQL에서 제외하는 결정이 문서화되어 있다.

## 4. 추가 검토 필요

- 테스트 케이스 ID와 실제 RLS 정책 ID를 어떻게 매핑할지
- RLS SQL 작성 후 수동 검증 체크리스트를 별도로 만들지 여부
- 정책별 허용/차단 케이스를 자동화 테스트로 전환할 시점
