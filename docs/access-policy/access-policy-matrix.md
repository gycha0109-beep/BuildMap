# Access Policy Matrix

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 행위자와 객체별 접근 권한을 표로 정리한다. 각 칸의 값은 `허용`, `조건부 허용`, `차단`, `후순위`, `추가 검토 필요` 중 하나를 사용한다.

## 2. 행위자 정의

- 비로그인 방문자: 로그인하지 않은 사용자
- 로그인 사용자: 인증된 일반 사용자
- Project Owner Builder: Project의 최종 관리 권한을 가진 Builder
- Change Card 작성 Builder: 특정 Change Card를 작성한 Builder
- Change Card 승인 Builder: Change Card를 공식 기록으로 승인하는 Builder 후보
- Feedback 작성자: 특정 Feedback을 작성한 로그인 사용자
- Scout 성격의 로그인 사용자: 프로젝트 발견/피드백/테스터/협업 목적 사용자
- 관리자 후보: 후순위 운영 대응 권한 후보

## 3. 접근 정책 매트릭스

| 객체 / 행위자 | 비로그인 방문자 | 로그인 사용자 | Project Owner Builder | Change Card 작성 Builder | Change Card 승인 Builder | Feedback 작성자 | Scout 성격 로그인 사용자 | 관리자 후보 |
|---|---|---|---|---|---|---|---|---|
| Project read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Project create | 차단 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Project update | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Project delete/archive | 차단 | 차단 | 조건부 허용 | 차단 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Project visibility change | 차단 | 차단 | 허용 | 차단 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Problem Definition read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Problem Definition update | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Hypothesis read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Hypothesis update | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Rough Note read | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Rough Note create | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 차단 |
| Rough Note update | 차단 | 차단 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| AI Draft read | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| AI Draft create | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 차단 |
| Change Card read internal | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Change Card read public | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 허용 후보 |
| Change Card create | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 차단 |
| Change Card update | 차단 | 차단 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Change Card approve | 차단 | 차단 | 허용 | 조건부 허용 | 허용 | 차단 | 차단 | 후순위 |
| Change Card publish | 차단 | 차단 | 허용 | 차단 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Feedback Request read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Feedback Request create | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Feedback create | 차단 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 차단 |
| Feedback read internal | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 차단 | 후순위 |
| Feedback publish | 차단 | 차단 | 허용 | 차단 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Public Project Page read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 허용 후보 |
| Project Link read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Project Link update | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |
| Builder Profile read | 조건부 허용 | 조건부 허용 | 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 조건부 허용 | 후순위 |
| Builder Profile update | 차단 | 차단 | 허용 | 조건부 허용 | 조건부 허용 | 차단 | 차단 | 후순위 |

## 4. 조건부 허용 조건 설명

### Project read 조건

- 전체 공개 Project는 공개 정보만 읽을 수 있다.
- 링크 공개 Project는 유효한 share_token 성격 조건을 만족해야 한다.
- 비공개 Project는 Project Owner만 읽을 수 있다.

### Change Card public read 조건

- Project가 링크 공개 또는 전체 공개 상태다.
- Change Card가 승인됨 상태다.
- Change Card 공개 상태가 공개됨이다.
- Change Card 민감도가 일반이다.
- 접근자가 Project 공개 정책을 만족한다.

### Feedback create 조건

- 로그인 사용자여야 한다.
- Feedback Request가 공개 요청이어야 한다.
- 대상 Project 또는 Change Card에 대한 공개 접근 조건을 만족해야 한다.
- 비로그인 작성은 1차에서 차단한다.

### Rough Note / AI Draft 조건

- Project Owner 또는 작성 Builder만 접근한다.
- 공개 페이지와 Scout 탐색 화면에는 노출하지 않는다.

### 관리자 후보

관리자 후보 권한은 악성 콘텐츠, 신고, 민감 정보 대응을 위한 후순위다. 1차 정책에서 세부 구현하지 않는다.
