# Public Project Page 모델

## 1. 정의

Public Project Page는 Project의 공개 가능한 일부 데이터를 외부에 보여주는 공개 뷰다. 별도 제품 소개글이 아니며, Builder가 따로 꾸미는 포트폴리오 페이지도 아니다.

Public Project Page의 목적은 외부 사용자가 다음을 이해하게 하는 것이다.

- 이 프로젝트가 어떤 문제를 다루는가?
- 지금 어떤 가설 위에 서 있는가?
- 최근 어떤 전환을 거쳤는가?
- 어떤 Change Card가 공개되어 있는가?
- 지금 어떤 도움, 피드백, 테스터, 협업자가 필요한가?

## 2. Project 데이터의 공개 뷰

Public Project Page는 Project와 공개 가능한 관련 객체를 조합해 보여준다.

원천 후보:

- Project
- Problem Definition
- Hypothesis
- 공개된 Change Card
- Feedback Request
- Project Link
- Builder Profile 공개 정보
- Project Save 또는 Follow 후보

공개 페이지 자체가 모든 내용을 별도로 저장하기 시작하면 원천 기록이 중복된다.

## 3. 공개 페이지에 표시되는 정보

### 프로젝트명

- 원천: Project
- 공개 여부: Project가 공개 상태일 때 노출
- 초기 구현: 필수

### 한 줄 정의

- 원천: Project
- 공개 여부: 노출
- 초기 구현: 필수
- 주의: 홍보 문구가 아니라 현재 프로젝트의 판단 방향을 짧게 보여준다.

### 현재 상태

- 원천: Project 상태
- 공개 여부: 노출 가능
- 초기 구현: 필수 후보

### 현재 필요한 것

- 원천: Project의 현재 필요한 것 또는 Feedback Request
- 공개 여부: 노출
- 초기 구현: 필수
- 주의: 외부 사용자가 무엇을 할 수 있는지 명확해야 한다.

### 문제 정의

- 원천: 현재 Problem Definition
- 공개 여부: Builder가 공개한 경우 노출
- 초기 구현: 필수
- 주의: 제품 설명보다 앞에 보여주는 것이 적합하다.

### 현재 가설

- 원천: 대표 Hypothesis
- 공개 여부: 선택 공개
- 초기 구현: 필수 또는 강력 권장

### 최근 전환

- 원천: 공개된 핵심 전환 Change Card
- 공개 여부: 공개 카드만 노출
- 초기 구현: 필수 후보
- 주의: 별도 텍스트로 중복 저장하지 않는다.

### 프로젝트 진화도

- 원천: 공개된 Change Card의 연결 관계와 중요도
- 공개 여부: 공개 데이터 기반
- 초기 구현: 간단 표현
- 후순위: 고급 그래프/시각화

### 공개 변화 카드

- 원천: 공개됨 상태의 Change Card
- 공개 여부: 공개 카드만
- 초기 구현: 필수

### 피드백 요청

- 원천: Feedback Request
- 공개 여부: 공개 요청만
- 초기 구현: 필수 후보

### 관련 링크

- 원천: Project Link
- 공개 여부: 링크별 공개 제어
- 초기 구현: 선택

### Builder 정보

- 원천: Builder Profile 공개 정보
- 공개 여부: 공개 정보만
- 초기 구현: 필수 후보

### 팔로우 또는 저장

- 원천: Project Follow 또는 Save
- 공개 여부: 사용자별 비공개 행위
- 초기 구현: 후보

## 4. 내부 데이터와 공개 데이터의 차이

| 내부 데이터 | 공개 데이터 |
|---|---|
| 모든 Rough Note | 노출하지 않음 |
| AI Draft | 노출하지 않음 |
| 내부 Change Card | 노출하지 않음 |
| 공개됨 Change Card | 노출 |
| 비공개 Problem/Hypothesis | 노출하지 않음 |
| 공개 Feedback Request | 노출 |
| 로그인 사용자 Feedback | 정책에 따라 제한 노출 |

## 5. 공개 가능 Change Card만 노출되는 원칙

Project가 공개 상태여도 모든 Change Card가 공개되는 것은 아니다. Change Card마다 공개 상태를 별도로 가진다.

권장 원칙:

- Project 공개 상태는 페이지 접근 가능 여부를 제어한다.
- Change Card 공개 상태는 카드 노출 여부를 제어한다.
- 민감 정보 포함 카드는 공개 전 경고가 필요하다.

## 6. 민감 정보 공개 방지

Public Project Page는 외부 노출 페이지이므로 다음 위험을 방지해야 한다.

- 내부 회의 내용 노출
- 사용자 개인정보 노출
- 미확정 전략 노출
- 팀원 비판이나 감정적 표현 노출
- AI 초안 자동 공개

1차에서는 Builder가 공개 전 확인 체크리스트를 보는 방식이 적합하다. 자동 민감 정보 탐지는 후순위다.

## 7. 초기 구현 필수 정보

- Project 기본 정보
- 현재 필요한 것
- 현재 Problem Definition
- 현재 Hypothesis 후보
- 최근 핵심 전환 3~5개
- 공개 Change Card 목록
- Feedback Request
- Builder 공개 정보
- 공개 상태 제어

## 8. 후순위 정보

- 고급 프로젝트 진화도
- 커스텀 섹션
- 링크 미리보기
- 공개 페이지 분석
- 팔로우 알림
- 공유 이미지 생성
- SEO 설정

## 9. 추가 검토 필요

- 공개 페이지 상단 요약을 별도 저장할지, 항상 원천 객체에서 파생할지.
- 공개 Change Card가 많아졌을 때 기본 노출 개수를 어떻게 제한할지.
- Feedback을 공개 페이지에 직접 노출할지, Builder 검토 후 노출할지.
- 링크 공개 범위를 카드별로 둘지, Project 단위로 둘지.
