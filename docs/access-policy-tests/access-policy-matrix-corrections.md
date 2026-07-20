# Access Policy Matrix 보정안

## 1. 문서 목적

이 문서는 7단계 `access-policy-matrix.md`에서 조건부 허용으로 넓게 보일 수 있는 항목을 1차 정책 기준으로 더 보수적으로 정리한다.

7.5단계의 방향은 권한을 넓히는 것이 아니라, 실제 RLS SQL 작성 전에 1차 구현에서 안전하게 차단해야 할 경계를 분명히 하는 것이다.

## 2. 보정 원칙

- Project update는 1차에서 Project Owner만 허용한다.
- Project visibility change는 1차에서 Project Owner만 허용한다.
- Project progress status change는 1차에서 Project Owner만 허용한다.
- Change Card approve는 1차에서 Project Owner만 허용한다.
- Change Card publish는 1차에서 Project Owner만 허용한다.
- Change Card 작성 Builder는 Project Owner가 아닌 경우 Project update 권한을 갖지 않는다.
- Feedback 작성자는 Project create/update 권한과 무관하다.
- Scout 성격의 로그인 사용자는 공개 Project를 읽고, 공개 Feedback Request에 Feedback을 작성할 수 있지만 Project를 수정할 수 없다.
- 관리자 후보 권한은 1차 RLS SQL에서 제외한다.
- 비로그인 방문자는 읽기 조건만 가질 수 있고 쓰기 권한은 없다.

## 3. 보정 매트릭스

| 객체 | 행위 | 1차 판단 | 조건/이유 |
| --- | --- | --- | --- |
| Project | read | 조건부 허용 | Owner는 내부 접근 가능. 외부는 비공개 차단, 링크 공개는 유효 share_token, 전체 공개는 공개 정보만 허용. |
| Project | create | 조건부 허용 | 로그인 Builder만 생성 가능. 비로그인 차단. |
| Project | update | 허용 범위 제한 | 1차에서는 Project Owner만 허용. |
| Project | visibility change | 허용 범위 제한 | 1차에서는 Project Owner만 허용. |
| Project | progress status change | 허용 범위 제한 | 1차에서는 Project Owner만 허용. 중요한 변경은 Change Card 생성 유도. |
| Problem Definition | read | 조건부 허용 | Owner 내부 접근. 외부는 Project 공개 조건과 공개 가능한 현재값만. |
| Problem Definition | update | 허용 범위 제한 | Project Owner만 허용. |
| Hypothesis | read | 조건부 허용 | Owner 내부 접근. 외부는 Project 공개 조건과 공개 가능한 현재값만. |
| Hypothesis | update | 허용 범위 제한 | Project Owner만 허용. 중요한 상태 변경은 Change Card 연결 유도. |
| Rough Note | read/create/update | Owner 중심 | Owner 내부 기록. 외부 차단. 전환 후 수정 제한 우선. |
| AI Draft | read/create/convert | Owner 중심 | 공식 기록 아님. Owner만 접근. 공개 정책에서 제외. |
| Change Card | create | Owner 중심 | 1차는 Project Owner 생성 우선. 작성 Builder 확장은 후순위 검토. |
| Change Card | update | 조건부 허용 | Owner 또는 접근 가능한 작성자 초안 수정 후보. 공개/승인은 Owner만. |
| Change Card | approve | 허용 범위 제한 | 1차에서는 Project Owner만 허용. |
| Change Card | publish | 허용 범위 제한 | 1차에서는 Project Owner만 허용. |
| Feedback Request | create/update/archive | Owner 중심 | Project Owner만 생성/관리. |
| Feedback Request | read | 조건부 허용 | 공개 요청은 공개 조건에 따라 읽기 가능. 내부 요청은 Owner만. |
| Feedback | create | 조건부 허용 | 로그인 사용자 + 공개 Feedback Request + Project 접근 조건 필요. |
| Feedback | read | 조건부 허용 | 작성자 자기 Feedback, Owner 내부 검토, 공개 선택 Feedback만 외부 노출. |
| Public Project Page | read | 조건부 허용 | Project 전체 공개 또는 링크 공개+유효 share_token. 비공개 차단. |
| Project Link | read/update | 조건부 허용 | 공개 Link는 공개 페이지에 노출 가능. 수정은 Owner만. |
| Builder Profile | read/update | 조건부 허용 | 공개 정보만 외부 노출. 수정은 본인. |

## 4. 행위자별 1차 제한

| 행위자 | 1차 권한 보정 |
|---|---|
| 비로그인 방문자 | 전체 공개 또는 링크 공개 조건을 만족한 읽기만 가능. 쓰기 차단. |
| 로그인 사용자 | 공개 정보 읽기와 공개 Feedback Request에 Feedback 작성 가능. Project 수정 차단. |
| Project Owner Builder | Project 수정, 공개 상태 변경, Change Card 승인/공개 가능. |
| Change Card 작성 Builder | Owner가 아니면 Project 수정/승인/공개 권한 없음. |
| Feedback 작성자 | 자신의 Feedback 읽기 가능. Project 권한 없음. |
| Scout 성격 사용자 | 공개 탐색과 Feedback 작성 가능. 수정/승인 권한 없음. |
| 관리자 후보 | 1차 RLS SQL에서 제외. |

## 5. 추가 검토 필요

- 팀 권한 도입 시 Change Card 작성 Builder의 수정 범위
- Project Owner 외 승인 Builder 실제 도입 여부
- 관리자 권한을 별도 운영 정책으로 분리하는 시점
- 공개 선택 Feedback의 작성자 표시 동의 정책
