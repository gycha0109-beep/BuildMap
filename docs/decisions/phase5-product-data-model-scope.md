# 5단계 제품 데이터 모델 범위 결정

## 1. 결정 목적

이 문서는 BuildMap 5단계에서 확정한 것과 보류한 것을 기록한다. 5단계는 구현 전 제품 데이터 모델 설계 단계다.

## 2. 확정한 것

### 5단계는 제품 데이터 모델 설계 단계다

이번 단계는 DB 설계가 아니다. SQL, 테이블, 컬럼, RLS, API 구조는 작성하지 않는다.

### 아직 DB 스키마를 확정하지 않는다

객체 이름은 제품 개념으로만 사용한다. 실제 테이블명이나 컬럼명처럼 고정하지 않는다.

### Change Card는 핵심 원천 기록이다

BuildMap에서 프로젝트 판단 흐름의 원천은 Change Card다. Change Card는 단순 로그가 아니라 의사결정 단위다.

### Decision Timeline은 Change Card 기반 표현이다

Decision Timeline은 별도 게시판이나 수동 작성 문서가 아니다. 승인된 Change Card를 시간, 중요도, 연결 관계에 따라 보여주는 표현 구조다.

### AI Draft는 Builder 승인 전까지 공식 기록이 아니다

AI Structured Draft는 Rough Note를 구조화한 초안이다. Builder가 승인하기 전까지 공식 Decision Timeline에 반영되지 않고 자동 공개되지 않는다.

### Public Project Page는 Project의 공개 뷰다

공개 프로젝트 페이지는 별도 제품 소개글이 아니다. Project, 공개 Problem Definition, 공개 Hypothesis, 공개 Change Card, Feedback Request 등을 조합한 공개 뷰다.

### Feedback은 특정 판단 또는 질문에 연결되어야 한다

피드백은 일반 댓글이 아니다. Feedback Request와 연결되어야 하며, Builder가 검토한 뒤 Change Card의 근거가 될 수 있다.

### 문제 정의·가설·변화 카드 연결은 느슨하게 유지한다

Change Card는 단독 생성 가능해야 한다. 다만 승인 시 가능하면 Problem Definition 또는 Hypothesis와 연결하도록 유도한다.

### 1차 탐색은 카드 그리드 중심이다

Project Card Grid를 1차 탐색 구조로 둔다. 히트맵은 후순위 실험이다.

### 히트맵은 후순위 실험이다

히트맵 산식은 아직 확정하지 않는다. 인기순위로 오해되지 않도록 주의한다.

### Scout는 초기에는 피드백/테스터/협업/발견 중심이다

Scout는 초기에는 채용 담당자가 아니다. 프로젝트 발견, 피드백 제공, 테스터 참여, 협업 탐색, 멘토링 중심으로 둔다.

### 채용/헤드헌팅은 장기 확장이다

채용 관련 데이터 구조는 1차 모델에 넣지 않는다.

## 3. 보류한 것

- 실제 DB 테이블 구조
- SQL
- Supabase RLS
- API 구조
- 세부 권한 정책
- AI 프롬프트
- 히트맵 산식
- 비로그인 피드백
- GitHub/Notion 연동
- 채용 기능
- Project DNA
- 역량 점수화
- 결제
- 외부 트래픽 데이터
- 조직/팀 플랜 데이터

## 4. 1차 데이터 모델 방향

1차 데이터 모델은 다음 흐름을 지원하는 데 집중한다.

```text
User / Builder Profile
→ Project
→ Problem Definition / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card
→ Decision Timeline 표현
→ Public Project Page 공개 뷰
→ Feedback Request
→ Feedback
→ 새 Change Card 후보
```

## 5. 다음 단계로 넘길 질문

- 이 제품 데이터 모델을 실제 DB 테이블로 변환할 때 어떤 객체를 분리하고 어떤 객체를 합칠 것인가?
- Change Card의 필수 필드는 DB 설계에서 어디까지 강제할 것인가?
- Public Project Page 요약은 원천 객체에서 매번 파생할 것인가, 별도 캐시를 둘 것인가?
- Visibility State를 객체별로 얼마나 세분화할 것인가?
- Feedback을 공개할 수 있게 할 것인가, Builder 내부 검토 중심으로 둘 것인가?
- Scout Profile을 1차 DB에 포함할 것인가, 로그인 사용자 피드백만으로 시작할 것인가?
- Activity Signal을 실시간으로 계산할 것인가, 이벤트성으로 저장할 것인가?
