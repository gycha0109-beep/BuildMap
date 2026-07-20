# RLS SQL 초안 리뷰 체크리스트

## 1. 문서 목적

이 문서는 8단계 RLS SQL 초안을 실제 migration 초안으로 옮기기 전에 확인해야 할 리뷰 항목을 정리한다.

## 2. 체크리스트

| 항목 | 상태 |
|---|---|
| 7.5단계 테스트 케이스와 정책 ID가 매핑되었는가 | 확인 필요 |
| 공개 가능과 공개됨을 구분했는가 | 확인 필요 |
| 민감도와 공개 상태를 분리했는가 | 확인 필요 |
| Project 비공개 시 공개 Change Card도 차단되는가 | 확인 필요 |
| Rough Note와 AI Draft가 외부에 노출되지 않는가 | 확인 필요 |
| Feedback은 Feedback Request를 통해서만 생성되는가 | 확인 필요 |
| 비로그인 쓰기 권한이 없는가 | 확인 필요 |
| Feedback 작성 조건에 Project 접근 조건이 포함되어 있는가 | 확인 필요 |
| 링크 공개 Feedback 작성 조건에 유효 share_token 조건이 포함되어 있는가 | 확인 필요 |
| 공개 선택 Feedback 작성자 정보가 익명/역할/맥락 표시로 제한되는가 | 확인 필요 |
| public_slug를 보안 토큰으로 사용하지 않는가 | 확인 필요 |
| share_token 정책이 별도로 검토되었는가 | 확인 필요 |
| 관리자 후보 권한이 1차 RLS 초안에서 제외되었는가 | 확인 필요 |
| 팀/공동 편집/조직 권한이 제외되었는가 | 확인 필요 |
| Decision Timeline과 Public Project Page를 별도 원천 테이블로 만들지 않았는가 | 확인 필요 |
| RLS SQL 초안이 실제 migration이 아님을 명시했는가 | 확인 필요 |

## 3. migration 전 필수 통과 기준

실제 migration 작성 전에는 최소한 다음이 해결되어야 한다.

- share_token 검증 방식
- user profile / builder profile 실제 테이블명
- Project Owner 판별 helper 또는 직접 조건
- 공개 컬럼 제한 방식
- Feedback 공개 선택 시 작성자 표시 방식
- 승인된 Change Card 수정 제한 여부
