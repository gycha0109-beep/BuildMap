# BuildMap 5.5단계 데이터 모델 보정 결정

## 1. 5.5단계 목적

이 문서는 BuildMap 5단계 제품 데이터 모델을 6단계 DB 설계로 넘기기 전에 보정하기 위한 결정 문서다.

이번 단계의 목적은 새 기능을 늘리는 것이 아니다. 이미 정리한 제품 데이터 모델에서 원천 데이터와 파생 데이터, 작업 상태와 공개 상태, 내부 기록과 공개 표현, 1차 필수 범위와 선택 범위를 더 명확하게 분리한다.

5.5단계는 구현 단계가 아니다. SQL, DB 테이블명, 컬럼명, Supabase, RLS, API, 프론트엔드 컴포넌트, 패키지 설치, 상세 UI 구현은 작성하지 않는다.

## 2. 보정이 필요한 이유

5단계 문서는 BuildMap의 핵심 데이터 객체를 충분히 정리했지만, 바로 DB 설계로 들어가면 일부 개념이 서로 섞일 위험이 있다.

주요 위험은 다음이다.

- Change Card의 작업 상태와 공개 상태가 하나의 상태처럼 섞이는 위험
- AI Structured Draft의 상태가 Change Card의 승인 상태와 충돌하는 위험
- Project의 진행 상태와 공개 상태가 섞이는 위험
- Problem Definition과 Hypothesis의 이력이 Change Card와 중복 원천이 되는 위험
- Public Project Page가 별도 제품 소개글처럼 독립 원천 데이터가 되는 위험
- Feedback이 일반 댓글처럼 노출되는 위험
- 1차 필수 데이터 범위가 커져 초기 구현이 무거워지는 위험
- Scout 데이터가 채용 플랫폼 방향으로 과도하게 확장되는 위험

따라서 5.5단계에서는 6단계 DB 설계 전에 반드시 지켜야 할 경계선을 정리한다.

## 3. 유지할 5단계 핵심 결론

5단계에서 확정한 핵심 결론은 유지한다.

- Change Card는 BuildMap의 핵심 원천 기록이다.
- Decision Timeline은 승인된 Change Card를 시간, 중요도, 연결 관계에 따라 보여주는 표현 구조다.
- Public Project Page는 Project의 공개 뷰다.
- Feedback은 일반 댓글이 아니라 특정 판단 또는 질문에 연결되는 근거다.
- AI Structured Draft는 공식 기록이 아니라 Change Card 후보 초안이다.
- AI 초안은 Builder 승인 전까지 공식 Decision Timeline에 반영되지 않는다.
- 문제 정의와 가설의 변경 이력은 원칙적으로 Change Card에서 추적한다.
- Scout는 초기에는 채용 담당자가 아니라 프로젝트 발견자, 피드백 제공자, 테스터, 협업자, 멘토, 팀원 탐색자다.
- Project DNA, 역량 점수, AI 자동 평가 점수는 사용하지 않는다.

## 4. 원천 데이터와 파생/표현 데이터 구분

6단계 DB 설계에서 가장 중요한 원칙은 원천 데이터와 파생/표현 데이터를 섞지 않는 것이다.

### 4.1 원천 데이터

원천 데이터는 Builder 또는 사용자의 실제 입력, 승인, 상태 변경에서 직접 발생하는 데이터다.

원천 데이터 후보는 다음이다.

- User
- Builder Profile
- Project
- Problem Definition의 현재 상태
- Hypothesis의 현재 상태
- Rough Note
- AI Structured Draft
- Change Card
- Feedback Request
- Feedback
- Visibility State

이 중에서도 Change Card는 BuildMap의 핵심 원천 기록이다. Project가 무엇을 만들었는지보다, 왜 그렇게 바뀌었는지를 남기는 중심 단위이기 때문이다.

### 4.2 파생/표현 데이터

파생/표현 데이터는 원천 데이터를 사용자가 이해하기 쉬운 형태로 보여주기 위한 결과다.

파생/표현 데이터 후보는 다음이다.

- Decision Timeline
- Public Project Page
- Project Card Grid 표시 정보
- 최근 전환 요약
- 공개 변화 카드 목록
- 간단한 Decision Diff
- Activity Signal 요약

### 4.3 권장 원칙

1차 구현에서는 가능한 한 파생/표현 데이터를 원천 데이터에서 계산하거나 조합해 보여주는 방향을 우선한다.

캐시, 스냅샷, 검색 인덱스, 별도 요약 저장은 후순위다. 이를 너무 빨리 원천 데이터처럼 저장하면 Change Card, Project, Public Project Page 사이에 불일치가 생길 수 있다.

예를 들어 Public Project Page의 최근 전환은 별도 소개글이 아니라 공개 가능한 핵심 전환 Change Card에서 파생되는 것이 안전하다.

## 5. 상태값 분리 보정

5단계 문서에서 가장 먼저 보정해야 할 부분은 상태값이다. 상태는 성격이 다른 축을 하나로 섞으면 이후 DB 설계와 화면 로직이 복잡해진다.

### 5.1 Change Card 작업 상태 후보

Change Card 작업 상태는 Builder가 기록을 작성하고 승인하는 흐름을 나타낸다.

- 초안
- 수정 중
- 승인됨
- 보류됨

이 축은 Change Card가 공식 기록으로 인정될 수 있는지와 관련된다. 승인된 Change Card만 공식 Decision Timeline의 원천이 될 수 있다.

### 5.2 Change Card 공개 상태 후보

Change Card 공개 상태는 승인 여부와 별개로 외부 노출 가능성을 나타낸다.

- 내부 전용
- 공개 가능
- 공개됨
- 민감 정보 포함

승인된 Change Card라도 내부 전용일 수 있다. 반대로 공개 가능 상태라고 해서 자동으로 공개되는 것은 아니다. Builder가 명시적으로 공개 전환해야 한다.

### 5.3 확정할 원칙

6단계 DB 설계에서는 Change Card의 작업 상태와 공개 상태를 분리해야 한다.

다만 위 상태값 자체는 제품 설계용 후보이며, DB enum처럼 확정하지 않는다. 최종 값 이름은 6단계에서 더 다듬을 수 있다.

## 6. AI Draft에서 Change Card로 전환되는 원칙

AI Structured Draft는 Change Card가 아니다. AI가 Builder의 Rough Note를 구조화한 후보 초안이다.

### 6.1 AI Structured Draft 상태 후보

AI Draft의 상태는 다음과 같이 보정한다.

- 생성 중
- 생성됨
- 수정 중
- Change Card로 전환됨
- 보류됨
- 실패

기존에 사용할 수 있었던 “승인됨” 표현은 AI Draft에는 쓰지 않는 것이 안전하다. 승인은 공식 기록인 Change Card 쪽의 작업 상태에서 다룬다.

### 6.2 전환 흐름

권장 흐름은 다음이다.

```text
Rough Note
→ AI Structured Draft 생성
→ Builder 검토 및 수정
→ Change Card로 전환
→ Change Card 작업 상태가 승인됨이 되면 공식 Decision Timeline에 반영
```

AI Draft는 공식 Decision Timeline의 원천이 아니다. AI Draft가 Builder에 의해 수용되면 “승인됨”이 아니라 “Change Card로 전환됨”으로 본다.

### 6.3 AI가 하지 말아야 할 것

- 없는 성과를 만들지 않는다.
- 과장된 포트폴리오 문장으로 바꾸지 않는다.
- Builder 승인 없이 Timeline에 반영하지 않는다.
- 자동 공개하지 않는다.
- Change Card의 최종 판단을 대신 확정하지 않는다.

## 7. Project 진행 상태와 공개 상태 분리

Project의 상태도 두 축으로 분리한다.

### 7.1 Project 진행 상태 후보

Project 진행 상태는 프로젝트가 어느 단계에 있는지를 나타낸다.

- 아이디어
- 제작 중
- 테스트 중
- 베타
- 운영 중
- 일시 중단
- 종료됨

“공개됨”은 진행 상태에서 제거한다. 공개는 진행 단계가 아니라 노출 정책이기 때문이다.

### 7.2 Project 공개 상태 후보

Project 공개 상태는 프로젝트가 외부에 어떻게 노출되는지를 나타낸다.

- 비공개
- 링크 공개
- 전체 공개

### 7.3 분리해야 하는 이유

Project가 운영 중이어도 비공개일 수 있다. 테스트 중이어도 링크 공개일 수 있다. 아이디어 단계라도 일부 공개할 수 있다.

따라서 진행 상태와 공개 상태를 섞으면 “운영 중이지만 비공개” 또는 “테스트 중이지만 링크 공개” 같은 자연스러운 상태를 표현하기 어렵다.

6단계 DB 설계에서는 Project 진행 상태와 공개 상태를 분리한다.

## 8. Problem Definition / Hypothesis 이력 원천 정리

Problem Definition과 Hypothesis는 프로젝트의 판단 중심축이다. 그러나 이력까지 직접 많이 들고 있으면 Change Card와 중복 원천이 될 수 있다.

### 8.1 Problem Definition 원칙

Problem Definition은 현재 문제 정의를 나타낸다.

- 현재 Problem Definition은 현재 상태를 가진다.
- 과거 문제 정의 이력의 원천은 Change Card다.
- 문제 정의가 바뀌는 순간은 “문제 정의 수정” 유형의 Change Card로 남긴다.
- Problem Definition에 별도 이력 객체를 둘지는 후순위로 보류한다.
- 화면 표시 또는 성능을 위해 요약 캐시를 둘 수 있지만, 원천은 Change Card다.

예시는 다음이다.

```text
현재 Problem Definition:
사람들은 장기 목표와 이번 주 실행 단위를 연결하지 못한다.

이전 문제 정의:
사람들은 장기 목표를 세우지 못한다.

이전 문제 정의가 왜 바뀌었는지:
문제 정의 수정 Change Card에서 추적한다.
```

### 8.2 Hypothesis 원칙

Hypothesis는 현재 가설 문장과 현재 상태를 가진다.

- 가설 생성, 반박, 보류, 수정의 판단 흐름은 Change Card가 원천이다.
- Hypothesis 상태 변경은 가능하면 관련 Change Card 생성을 유도한다.
- 모든 상태 변경에 Change Card 생성을 강제하지는 않는다.
- 1차 구현에서는 연결을 유도하되 입력 부담을 줄이기 위해 강제하지 않는다.

예시는 다음이다.

```text
현재 Hypothesis:
사용자는 긴 목표 계획보다 이번 주에 확인할 수 있는 증거 단위를 더 쉽게 이해한다.

현재 상태:
검증 중

상태 변화 이유:
관련 Change Card에서 추적한다.
```

### 8.3 권장 방향

Problem Definition과 Hypothesis는 현재 상태를 빠르게 보여주는 객체로 둔다. 이력이 필요한 경우 Change Card를 따라간다.

이렇게 해야 BuildMap의 중심이 “가설 관리 도구”가 아니라 “판단 흐름 기록”으로 유지된다.

## 9. Public Project Page 공개 뷰 원칙

Public Project Page는 별도의 제품 소개글이 아니다. Project 데이터의 공개 뷰다.

### 9.1 1차 원칙

1차에서는 Public Project Page 상단 요약을 원천 객체에서 파생한다.

- 프로젝트명: Project에서 가져온다.
- 한 줄 정의: Project에서 가져온다.
- 현재 상태: Project 진행 상태에서 가져온다.
- 현재 필요한 것: Project의 현재 필요한 것 요약에서 가져온다.
- 문제 정의: 현재 Problem Definition에서 가져온다.
- 현재 가설: 현재 Hypothesis에서 가져온다.
- 최근 전환: 공개 가능한 핵심 전환 Change Card에서 파생한다.
- 공개 변화 카드 목록: 공개 상태가 허용된 승인 Change Card에서 파생한다.

### 9.2 공개 제한 원칙

Builder가 공개 여부를 선택한 데이터만 공개 페이지에 노출한다.

Rough Note와 AI Structured Draft는 자동 공개하지 않는다. Feedback 내용도 기본적으로 공개하지 않는다. Change Card도 승인과 공개 전환이 모두 충족되어야 공개 페이지에 노출된다.

### 9.3 보류할 것

- 공개 페이지용 별도 소개글을 원천 데이터로 만드는 것
- 별도 캐시 또는 스냅샷을 1차부터 두는 것
- 검색 최적화를 위한 별도 인덱스 구조
- 공개 페이지 전용 편집기

필요하다면 후순위에서 캐시나 스냅샷을 검토할 수 있다. 단, 그 경우에도 원천은 Project와 Change Card다.

## 10. 현재 필요한 것과 Feedback Request의 역할 구분

“현재 필요한 것”은 BuildMap 공개 페이지에서 중요한 정보다. 그러나 이것을 Feedback Request와 동일하게 보면 모델이 애매해진다.

### 10.1 Project의 현재 필요한 것

Project의 “현재 필요한 것”은 프로젝트가 외부에 보여주는 요약 상태다.

예시는 다음이다.

```text
첫 화면 이해도 피드백이 필요합니다.
```

이 정보는 공개 프로젝트 페이지, 프로젝트 카드 그리드, Scout 탐색 화면에서 빠르게 읽히는 요약이다.

### 10.2 Feedback Request

Feedback Request는 실제 피드백, 테스터, 검증 요청을 받기 위한 구체 요청 단위다.

예시는 다음이다.

```text
사이드프로젝트 경험자 5명에게 첫 화면을 보여주고,
10초 안에 서비스 목적을 이해하는지 확인하고 싶습니다.
```

Feedback Request는 프로젝트 전체, 문제 정의, 가설, 변화 카드, 공개 페이지 등 특정 대상에 연결될 수 있다.

### 10.3 권장 방향

1차에서는 역할을 다음처럼 구분한다.

- Project의 현재 필요한 것: 외부 노출용 요약 상태
- Feedback Request: 특정 판단 또는 질문에 대한 구체 요청 단위

실제 DB 필드명은 아직 만들지 않는다. 6단계에서는 제품상 역할만 반영해 구조를 설계한다.

## 11. Feedback 공개 정책

Feedback은 BuildMap에서 일반 댓글이 아니다. 특정 판단 또는 질문에 연결되는 근거다.

### 11.1 기본 정책

- Feedback Request는 공개 가능하다.
- Feedback 내용은 기본적으로 Builder 내부 검토용으로 둔다.
- Builder가 선택한 Feedback만 공개할 수 있다.
- Feedback이 반영되면 새 Change Card로 이어질 수 있다.
- 1차에서는 비로그인 피드백을 보류한다.
- Feedback을 일반 댓글창처럼 노출하지 않는다.

### 11.2 Feedback의 역할

Feedback은 외부 사용자의 의견을 쌓는 댓글 공간이 아니다. Builder가 다음 판단을 내리는 근거가 되어야 한다.

예시는 다음이다.

```text
Feedback Request:
첫 화면에서 서비스 목적이 10초 안에 이해되는지 확인하고 싶습니다.

Feedback:
처음에는 자기계발 앱처럼 보였고, 프로젝트 기록 플랫폼이라는 점은 바로 이해되지 않았습니다.

이후 Change Card:
첫 화면 메시지를 “목표 관리”에서 “프로젝트 판단 흐름 기록”으로 수정한다.
```

### 11.3 공개 시 주의

Feedback을 공개할 때는 다음을 확인한다.

- 작성자가 공개 표시를 허용했는가?
- 민감 정보가 포함되어 있지 않은가?
- 단순 댓글처럼 프로젝트 페이지를 흐리지 않는가?
- 해당 Feedback이 어떤 판단에 연결되는지 명확한가?

## 12. Project Save / Follow와 Activity Signal 범위 조정

Project Save / Follow와 Activity Signal은 유용하지만 1차 핵심 기록 흐름보다 우선하지 않는다.

### 12.1 Project Save / Follow

Project Save / Follow는 1차 필수가 아니라 1차 선택 데이터로 둔다.

공개 프로젝트 탐색과 Scout 흐름에는 유용하지만, Builder의 Decision Timeline 기록 흐름보다 우선하지 않는다. 1차 구현 범위가 커지면 Save / Follow는 후순위로 내려도 된다.

### 12.2 Activity Signal

Activity Signal은 탐색, 카드 그리드, 히트맵에 사용할 수 있는 활동 신호다.

1차에서는 필수가 아니라 선택 데이터로 둔다. 단순 이벤트성 기록 또는 파생 요약 후보로만 다룬다.

### 12.3 탐색 정렬 원칙

1차 탐색 정렬은 최근 업데이트순을 기본으로 둔다.

다음 항목은 정렬 점수보다 필터 또는 배지로 시작한다.

- 피드백 요청 중
- 테스터 모집 중
- 최근 전환 있음
- 협업자 필요

히트맵 산식, 점수화, 자동 랭킹은 보류한다.

## 13. Project 상태 변경과 Change Card 연결 원칙

Project 상태가 바뀌는 순간은 중요한 판단일 수 있다.

예시는 다음이다.

- 아이디어에서 제작 중으로 이동
- 제작 중에서 테스트 중으로 이동
- 테스트 중에서 베타로 이동
- 베타에서 운영 중으로 이동
- 운영 중에서 일시 중단으로 이동
- 운영 중에서 종료됨으로 이동

### 13.1 권장 원칙

Project 상태 변경은 가능하면 Change Card 생성을 유도한다.

상태 변경은 단순 상태 변경이 아니라 프로젝트의 방향, 검증 수준, 공개 방식, 사용자 반응에 대한 판단을 포함할 수 있기 때문이다.

### 13.2 강제하지 않는 이유

모든 상태 변경에 Change Card 생성을 강제하면 Builder의 기록 부담이 커진다.

따라서 1차에서는 다음 방향이 적합하다.

- 중요한 상태 변경에는 Change Card 생성을 유도한다.
- 사소한 상태 수정은 Change Card 없이도 가능하게 둔다.
- 상태 변경 화면에서 “이 변경을 변화 카드로 남기겠습니까?”를 제안할 수 있다.

### 13.3 연결 가능한 Change Card 유형

Project 상태 변경은 다음 유형과 연결될 수 있다.

- 릴리즈
- 방향 전환
- 판단 수정
- 판단 유지
- 인수인계 메모

## 14. 1차 필수 데이터 / 1차 선택 데이터 / 2차 확장 데이터 / 장기 확장 데이터 재정리

5단계에서 1차 필수 데이터가 넓어질 위험이 있었다. 5.5단계에서는 6단계 DB 설계 전 범위를 축소한다.

### 14.1 1차 필수 데이터

1차 필수 데이터는 Builder가 판단 흐름을 기록하고, 변화 카드를 승인하고, 공개 프로젝트 페이지와 피드백 요청까지 최소로 운영하는 데 필요한 데이터다.

- User
- Builder Profile
- Project
- Problem Definition
- Hypothesis
- Rough Note
- AI Structured Draft
- Change Card
- Feedback Request
- Feedback
- Visibility State

### 14.2 1차 표현/파생 구조

다음은 1차에 필요하지만 원천 데이터라기보다 표현 또는 파생 구조로 본다.

- Decision Timeline 표현에 필요한 Change Card 정보
- Public Project Page에 필요한 공개 정보

### 14.3 1차 선택 데이터

1차 선택 데이터는 초기 제품 경험을 돕지만 핵심 Decision Timeline 기록 흐름보다 우선하지 않는다.

- Scout Profile
- Project Link
- Project Tag
- Project Save / Follow
- 간단한 Activity Signal
- 간단한 Decision Diff

### 14.4 2차 확장 데이터

- 테스터 신청
- 협업 요청
- 인수인계 요약
- 세부 공개 권한
- Scout 저장 목록
- 프로젝트 활동 지표

### 14.5 장기 확장 데이터

- 채용 관련 데이터
- 투자자 탐색 데이터
- 외부 GitHub/Notion 연동 데이터
- 외부 트래픽 데이터
- 조직/팀 플랜 데이터
- 고급 검색/추천 데이터

### 14.6 이번 범위에서 계속 제외할 데이터

- 결제
- 가격 정책
- 지원자 관리 시스템
- 투자 매칭
- AI 역량 평가
- Project DNA
- 고급 히트맵 산식
- 실시간 협업 편집

## 15. Scout 데이터 범위 보정

Scout Profile은 1차 필수가 아니라 1차 선택 데이터로 둔다.

### 15.1 초기 Scout의 의미

초기 Scout는 채용 담당자가 아니다. 다음 역할에 가깝다.

- 프로젝트 발견자
- 피드백 제공자
- 테스터
- 협업자
- 멘토
- 팀원 탐색자

### 15.2 권장 범위

초기에는 Scout 전용 복잡한 프로필보다 로그인 사용자 기반 피드백, 테스터 신청, 프로젝트 저장 정도로 시작할 수 있다.

Scout Profile이 없어도 로그인 사용자가 공개 프로젝트를 보고 피드백을 남길 수 있는 구조를 검토한다.

### 15.3 후순위 확장

Scout 전용 프로필은 다음 기능이 필요해질 때 확장한다.

- 프로젝트 탐색 선호 저장
- 프로젝트 저장 목록
- 테스터 신청 이력
- 협업 제안 이력
- 멘토링 목적 표시

채용/헤드헌팅 데이터는 장기 확장으로 유지한다.

## 16. 6단계 DB 설계에서 반드시 지켜야 할 원칙

6단계 DB 설계에서는 다음 원칙을 반드시 지킨다.

1. Change Card 작업 상태와 공개 상태를 분리한다.
2. AI Structured Draft는 공식 기록이 아니라 Change Card 후보 초안으로 다룬다.
3. AI Draft의 최종 상태는 “승인됨”이 아니라 “Change Card로 전환됨”으로 본다.
4. 공식 승인 상태는 Change Card에 둔다.
5. Project 진행 상태와 공개 상태를 분리한다.
6. Problem Definition의 과거 이력 원천은 Change Card로 둔다.
7. Hypothesis의 판단 변화 원천은 Change Card로 둔다.
8. Decision Timeline은 별도 원천 데이터가 아니라 승인된 Change Card의 표현 구조로 둔다.
9. Public Project Page는 Project의 공개 뷰로 둔다.
10. Public Project Page의 상단 요약은 1차에서 원천 객체로부터 파생한다.
11. Feedback 내용은 기본적으로 Builder 내부 검토용으로 둔다.
12. Feedback Request와 Feedback을 일반 댓글 구조로 만들지 않는다.
13. 1차 필수 데이터 범위를 과도하게 넓히지 않는다.
14. Scout와 채용 기능을 1차 핵심 범위로 끌어오지 않는다.
15. Save / Follow, Activity Signal, Decision Diff는 1차 선택 또는 후순위로 둘 수 있다.
16. 상태값은 제품 설계용 후보로 다루고, 이름을 DB enum처럼 조급하게 확정하지 않는다.

## 17. 아직 보류할 것

5.5단계에서도 다음은 보류한다.

- 실제 DB 테이블 구조
- SQL
- Supabase RLS
- API 구조
- 상세 권한 정책
- AI 프롬프트 세부 설계
- AI 자동화 수준
- 비로그인 피드백
- 음성 입력
- 이미지/파일 업로드
- GitHub/Notion 연동
- 히트맵 산식
- 자동 랭킹
- 채용 기능
- 헤드헌팅 기능
- 투자자 탐색 기능
- Project DNA
- 역량 점수화
- 결제
- 조직/팀 플랜
- 실시간 협업 편집

## 18. 6단계로 넘어가기 전 확인 질문

6단계 DB 설계로 넘어가기 전, 다음 질문에 답해야 한다.

1. Change Card 작업 상태와 공개 상태가 분리되었는가?
2. AI Draft가 공식 기록이 아니라 Change Card 후보임이 명확한가?
3. AI Draft의 “Change Card로 전환됨”과 Change Card의 “승인됨”이 서로 충돌하지 않는가?
4. Project 진행 상태와 공개 상태가 분리되었는가?
5. Problem Definition과 Hypothesis의 이력 원천이 Change Card로 정리되었는가?
6. Public Project Page가 별도 원천이 아니라 공개 뷰임이 명확한가?
7. Public Project Page 요약은 1차에서 원천 객체로부터 파생한다는 원칙이 명확한가?
8. “현재 필요한 것”과 Feedback Request의 역할이 분리되었는가?
9. Feedback은 기본 내부 검토, 선택 공개 구조로 정리되었는가?
10. Feedback이 일반 댓글 구조로 흘러가지 않도록 제한되어 있는가?
11. 1차 필수 데이터가 과도하지 않게 축소되었는가?
12. Scout Profile이 1차 필수가 아니라 선택 데이터로 정리되었는가?
13. 채용/헤드헌팅 데이터가 장기 확장으로 유지되었는가?
14. Decision Timeline이 별도 원천 데이터가 아니라 Change Card 표현임이 명확한가?
15. Save / Follow, Activity Signal, Decision Diff를 1차 필수로 끌어오지 않았는가?

## 최종 보정 결론

5.5단계의 결론은 다음이다.

> BuildMap의 6단계 DB 설계는 Change Card를 핵심 원천 기록으로 두되, Change Card 작업 상태와 공개 상태를 분리하고, Decision Timeline과 Public Project Page를 원천 데이터가 아닌 표현/공개 뷰로 다루는 방향으로 진행한다.

이 보정을 통해 BuildMap은 단순 프로젝트 소개 서비스, 댓글형 커뮤니티, 채용 플랫폼, Notion식 문서 저장소로 흐르지 않고, 프로젝트의 판단 흐름을 기록하고 공개하는 Decision Timeline 플랫폼이라는 정체성을 유지할 수 있다.
