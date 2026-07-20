# 역할과 소유권 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 BuildMap에서 역할과 소유권이 권한 정책에 어떤 영향을 주는지 정리한다.

## 2. User와 Builder의 차이

User는 인증된 앱 사용자다. Builder는 프로젝트를 성장시키는 역할을 가진 사용자다.

모든 Builder는 User이지만, 모든 User가 Builder일 필요는 없다. 다만 1차에서는 프로젝트 생성과 기록을 위해 Builder Profile을 필수로 둔다.

## 3. Project Owner Builder

Project Owner Builder는 Project의 최종 관리 권한을 가진 Builder다.

### 권한 후보

- Project 읽기/수정
- Project 공개 상태 변경
- Project 진행 상태 변경
- Rough Note 읽기/작성
- AI Draft 생성/검토
- Change Card 작성/수정/승인
- Feedback Request 생성/수정/종료
- Feedback 검토
- 공개 페이지에 노출할 정보 선택

### 1차 원칙

1차에서는 1인 Builder 흐름을 기본으로 한다. 따라서 Project Owner가 대부분의 승인 권한을 가진다.

## 4. Change Card 작성 Builder

Change Card 작성 Builder는 Change Card 초안 또는 공식 기록을 작성한 Builder다.

### 권한 후보

- 자신이 작성한 Change Card 초안 읽기
- 자신이 작성한 Change Card 수정 후보
- 승인 전 초안 보류 또는 삭제 후보

### 주의점

1차에서는 작성 Builder와 승인 Builder가 같을 수 있다. 그러나 팀 확장 가능성을 위해 작성자와 승인자 개념은 분리해 문서화한다.

## 5. Change Card 승인 Builder

Change Card 승인 Builder는 Change Card를 공식 Decision Timeline에 반영할 수 있는 주체다.

### 1차 권장

- Project Owner 또는 해당 Builder로 제한하는 방향을 우선 검토한다.
- 1인 Builder 흐름에서는 작성자와 승인자가 같아도 된다.
- 승인 후에는 Change Card가 내부 Decision Timeline 표현에 반영된다.
- 외부 공개 Timeline 노출은 별도 공개 상태와 민감도 조건을 추가로 만족해야 한다.

## 6. Feedback 작성자

Feedback 작성자는 공개 Feedback Request에 대해 피드백을 남기는 로그인 사용자다.

### 권한 후보

- 자신이 작성한 Feedback 읽기
- 제출 직후 제한된 수정 후보
- 삭제 또는 철회 후보는 추가 검토 필요

### 제한

- Feedback 내용은 기본적으로 Builder 내부 검토용이다.
- Feedback 작성자는 Project 내부 기록을 볼 수 없다.

## 7. Scout 성격의 로그인 사용자

Scout는 초기에는 채용 담당자가 아니라 프로젝트 발견자, 피드백 제공자, 테스터, 협업자, 멘토, 팀원 탐색자다.

### 1차 권한 후보

- 공개 프로젝트 탐색
- 공개 프로젝트 페이지 읽기
- 공개 Feedback Request에 Feedback 작성
- 테스터 신청 후보는 후순위
- Project Save/Follow 후보는 후순위

채용/헤드헌팅 권한은 이번 단계에서 확장하지 않는다.

## 8. 관리자 후보

관리자는 1차 핵심 기능이 아니다. 그러나 악성 콘텐츠, 민감 정보, 신고, 운영 대응을 위해 후순위로 문서화한다.

### 후순위 권한 후보

- 신고된 공개 콘텐츠 검토
- 공개 중단 후보
- 악성 Feedback 숨김 후보
- 사용자 제재 후보

이번 단계에서는 세부 관리자 기능을 확정하지 않는다.

## 9. 소유자 권한과 작성자 권한의 차이

| 구분 | 의미 | 1차 권장 |
|---|---|---|
| 소유자 권한 | Project 전체 관리 권한 | Project Owner 중심 |
| 작성자 권한 | 특정 기록을 작성한 사용자 권한 | 1인 흐름에서는 Owner와 동일 가능 |
| 승인 권한 | Change Card를 공식 기록으로 반영할 권한 | Project Owner 우선 |
| 공개 권한 | 외부 공개 상태를 바꿀 권한 | Project Owner 우선 |

## 10. 보류 사항

- 팀 권한
- 공동 편집
- 조직 권한
- 복수 승인자 워크플로우
- 관리자 세부 권한
- 채용 담당자 전용 권한
