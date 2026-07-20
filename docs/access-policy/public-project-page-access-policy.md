# Public Project Page 접근 정책

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 문서 목적

이 문서는 Public Project Page의 접근 정책을 정리한다. Public Project Page는 별도 제품 소개글이 아니라 Project의 공개 뷰다.

## 2. 공개 페이지 내용 파생 원칙

공개 페이지 내용은 다음 원천 데이터에서 파생한다.

- Project 공개 정보
- Builder 공개 Profile 정보
- 공개 가능한 현재 Problem Definition
- 공개 가능한 현재 Hypothesis
- 승인됨 + 공개됨 + 민감 정보 없음 Change Card
- 공개 Feedback Request
- Builder가 공개 선택한 Feedback
- Project Link 후보

공개 페이지용 별도 원천 본문을 만들지 않는다.

## 3. 공개 페이지 접근 조건

### 비공개 Project

- 외부 접근 불가.
- Project Owner만 내부에서 볼 수 있다.
- 공개 URL이 있더라도 접근 차단되어야 한다.

### 링크 공개 Project

- 유효한 링크 공개 접근 식별자를 가진 사용자가 공개 가능한 정보만 볼 수 있다.
- 링크 접근 조건을 만족하지 않으면 접근할 수 없다.

### 전체 공개 Project

- 누구나 공개 가능한 정보만 볼 수 있다.
- public_slug 후보를 통해 읽기 쉬운 경로를 제공할 수 있다.

## 4. 공개 페이지에 노출 가능한 정보 후보

- Project 이름
- 한 줄 정의
- 현재 진행 상태
- 현재 필요한 것 요약
- 공개 가능한 Problem Definition
- 공개 가능한 Hypothesis
- 최근 전환 요약 후보
- 공개 Timeline
- 공개 Feedback Request
- 공개 선택된 Feedback
- Project Link 후보
- Builder 공개 Profile 정보

## 5. 공개 페이지에 노출하지 않는 정보

- Rough Note
- AI Structured Draft
- 내부 전용 Change Card
- 공개 가능이지만 아직 공개됨이 아닌 Change Card
- 민감 정보 포함 Change Card
- 내부 검토 Feedback
- 인증 식별자
- 이메일
- 비공개 Project 내부 정보

## 6. 공개 Timeline 구성 조건

공개 Timeline에는 다음 조건을 만족한 Change Card만 노출한다.

- Project가 링크 공개 또는 전체 공개 상태다.
- Change Card 작업 상태가 승인됨이다.
- Change Card 공개 상태가 공개됨이다.
- Change Card 민감도가 일반이다.
- 접근자가 Project 공개 정책을 만족한다.

## 7. Feedback Request 노출 조건

- Project Owner가 공개 요청으로 설정한 Feedback Request만 노출한다.
- 비공개 Project의 Feedback Request는 외부에 노출하지 않는다.
- 링크 공개 Project에서는 링크 접근 조건을 만족한 사용자에게만 노출한다.

## 8. Feedback 내용 노출 조건

- Feedback 내용은 기본 내부 검토용이다.
- Builder가 공개 선택한 Feedback만 노출할 수 있다.
- 작성자 표시 정보는 제한적으로만 노출한다.

## 9. Builder 공개 정보 노출 조건

- Builder가 공개한 Profile 정보만 노출한다.
- 이메일, 인증 ID, 내부 상태는 노출하지 않는다.

## 10. 추가 검토 필요 사항

- 공개 페이지 미리보기 권한
- 공개 페이지 비활성화 처리
- 신고된 공개 페이지 임시 차단
- 공개 선택된 Feedback의 작성자 동의 정책
