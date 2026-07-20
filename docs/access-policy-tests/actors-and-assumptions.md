# 행위자와 기본 전제

## 1. 문서 목적

이 문서는 7.5단계 정책 테스트 케이스에서 사용할 행위자와 기본 전제를 정의한다. 권한을 넓히는 방향이 아니라, 1차 구현에서 안전하게 좁히는 방향을 기준으로 한다.

## 2. 행위자 정의

| 행위자 | 정의 | 1차에서 가능한 행위 | 1차에서 불가능한 행위 | 후순위 행위 | 주의할 점 |
|---|---|---|---|---|---|
| 비로그인 방문자 | 로그인하지 않고 공개 페이지를 보는 사용자 | 전체 공개 Project의 공개 정보 읽기, 유효한 share_token이 있는 링크 공개 Project의 공개 정보 읽기 | 쓰기, Feedback 작성, 내부 데이터 읽기 | 제한적 비로그인 피드백 | 쓰기 권한은 1차에서 전부 차단한다. |
| 로그인 사용자 | 인증된 일반 사용자 | 공개 Project 읽기, 공개 Feedback Request에 Feedback 작성 | 남의 Project 수정, 남의 내부 기록 읽기 | Scout Profile 확장 | 인증되었다고 Builder 권한을 갖는 것은 아니다. |
| Builder | 프로젝트를 성장시키는 사용자 역할 | Project 생성 후보, 자신의 Builder Profile 관리 | 남의 Project 수정 | 팀 Builder 확장 | Builder와 Project Owner는 구분된다. |
| Project Owner Builder | 특정 Project의 소유 Builder | Project 읽기/수정/공개 상태 변경, Change Card 승인/공개, Feedback 검토 | 다른 Project 수정 | 팀 소유권 | 1차 권한 모델의 중심이다. |
| Change Card 작성 Builder | Change Card를 작성한 Builder | 자신이 접근 가능한 Project 내 초안 작성/수정 후보 | Project Owner가 아니면 Project 공개 상태 변경, 승인, publish | 공동 편집 | 1차에서는 Owner와 동일인인 경우가 기본이다. |
| Change Card 승인 Builder | Change Card를 공식 Timeline에 반영하는 승인자 | 1차에서는 Project Owner가 승인 | Owner가 아니면 승인 불가 | 별도 승인자 권한 | 개념은 분리하되 권한은 Owner 중심으로 좁힌다. |
| Feedback 작성자 | Feedback Request에 응답한 로그인 사용자 | 자신의 Feedback 읽기, 공개 Feedback Request에 Feedback 작성 | Feedback Request 없이 Feedback 작성, Project 수정 | 작성자 동의/익명 표시 정책 | Feedback 작성은 Project 권한과 무관하다. |
| Scout 성격의 로그인 사용자 | 프로젝트 발견, 피드백, 테스터, 협업 탐색 목적 사용자 | 공개 Project 읽기, 공개 Feedback Request에 Feedback 작성 | Project 수정, Change Card 승인 | Scout Profile, 저장, 테스터 신청 | 채용 담당자 권한으로 확장하지 않는다. |
| 관리자 후보 | 신고/악성 콘텐츠 대응을 위한 운영 후보 | 1차 RLS SQL에서는 제외 | 모든 데이터 접근 권한 구현 | 운영 정책 수립 뒤 도입 | 이번 단계에서는 정책 리스크만 문서화한다. |

## 3. 기본 전제

- 1차에서는 Project Owner Builder가 Project 수정, 공개 상태 변경, Change Card 승인 권한을 갖는다.
- Change Card 작성 Builder와 승인 Builder는 개념상 분리하지만, 1차 승인 권한은 Project Owner 중심으로 둔다.
- Change Card 작성 Builder가 Project Owner가 아닌 경우 Project 수정 권한을 갖지 않는 방향을 우선한다.
- Feedback 작성자는 Project 생성, 수정, 승인, 공개 상태 변경 권한과 무관하다.
- 비로그인 방문자는 읽기 조건만 가질 수 있고 쓰기 권한은 없다.
- 관리자 후보 권한은 1차 RLS SQL에 포함하지 않는 방향을 우선한다.
- 링크 공개는 전체 공개가 아니며, `share_token` 조건을 별도로 검증해야 한다.
- 공개 Timeline은 Project 공개 조건과 Change Card 공개 조건을 모두 만족해야 한다.

## 4. 상태 전제

Project 공개 상태 후보:

- 비공개
- 링크 공개
- 전체 공개

Change Card 작업 상태 후보:

- 초안
- 수정 중
- 승인됨
- 보류됨

Change Card 공개 상태 후보:

- 내부 전용
- 공개 가능
- 공개됨

Change Card 민감도 후보:

- 일반
- 민감 정보 포함

Feedback 공개 상태 후보:

- 내부 검토
- 공개 선택됨

## 5. 추가 검토 필요

- Project Owner 외 별도 승인 Builder를 실제 1차에 둘지 여부
- Change Card 작성 Builder의 초안 수정 범위
- Feedback 공개 선택 시 작성자 동의 UX
- 링크 공개 Project에서 로그인 사용자의 Feedback 작성 조건
- 관리자 후보 권한을 운영 정책 문서로 언제 분리할지 여부
