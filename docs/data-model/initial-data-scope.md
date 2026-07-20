# 1차 구현 데이터 범위

이 문서는 5단계 기준의 제품 데이터 범위를 우선순위로 나눈다. 실제 DB 설계나 API 범위가 아니다.

## 1. 1차 필수 데이터

### User

로그인, 작성자 식별, 피드백 작성, 저장/팔로우 후보를 위해 필요하다.

### Builder Profile

Project 생성과 Change Card 승인 주체를 표현하기 위해 필요하다.

### Project

BuildMap의 중심 컨테이너다. 문제, 가설, 변화 카드, 공개 페이지를 묶는다.

### Problem Definition

Project의 판단 중심축이다. 최소한 현재 문제 정의 문장은 필요하다.

### Hypothesis

Project가 믿고 검증하는 판단이다. 복잡한 가설 관리가 아니라 짧은 문장과 상태를 우선한다.

### Rough Note

Builder가 거친 메모를 남기고 AI 구조화를 시작하기 위해 필요하다.

### AI Structured Draft

Rough Note를 Change Card 초안으로 구조화하기 위해 필요하다. 공식 기록은 아니다.

### Change Card

BuildMap의 핵심 원천 기록이다. 승인된 Change Card가 Timeline을 만든다.

### Decision Timeline 표현에 필요한 Change Card 정보

Timeline 자체는 원천 객체가 아니라 표현이지만, 표시를 위해 카드 유형, 승인 시점, 중요도, 공개 상태, 요약 등이 필요하다.

### Public Project Page에 필요한 공개 정보

Project 기본 정보, 현재 필요한 것, 공개 문제 정의, 공개 가설, 공개 Change Card, Feedback Request가 필요하다.

### Feedback Request

피드백을 특정 판단 또는 질문에 연결하기 위해 필요하다.

### Feedback

로그인 사용자 또는 Scout가 남기는 판단 연결 피드백이다.

### Visibility State

내부 기록 후 공개 전환을 위해 필수다.

### 기본 Project Save 또는 Follow 후보

1차 필수로 확정하지는 않지만, Scout 탐색 흐름에 유용하므로 후보로 둔다.

## 2. 1차 선택 데이터

### Scout Profile

Scout 전용 프로필은 선택으로 시작할 수 있다. 로그인 사용자 피드백만으로도 1차 흐름은 가능하다.

### Project Link

데모, 설문, GitHub, Notion 등 외부 맥락 연결에 유용하지만 필수는 아니다.

### Project Tag

탐색 필터에 유용하지만 과도한 분류 체계는 후순위로 둔다.

### 간단한 Activity Signal

최근 업데이트, 피드백 요청 중, 테스터 모집 중 같은 카드 표시용 신호는 선택으로 둘 수 있다.

### 간단한 Decision Diff

핵심 가치는 있으나 1차 필수 흐름은 Change Card와 Timeline이다. Diff는 선택 구현 후보로 둔다.

## 3. 2차 확장 데이터

- 테스터 신청
- 협업 요청
- 인수인계 요약
- 세부 공개 권한
- Scout 저장 목록 고도화
- 프로젝트 활동 지표
- 피드백 공개 동의
- Change Card 고급 필터
- 타깃 사용자 또는 성공 기준 객체 후보

## 4. 장기 확장 데이터

- 채용 관련 데이터
- 헤드헌팅 관련 데이터
- 투자자 탐색 데이터
- 외부 GitHub/Notion 연동 데이터
- 외부 트래픽 데이터
- 조직/팀 플랜 데이터
- 고급 검색/추천 데이터
- 고급 히트맵 집계 데이터
- 알림 설정 데이터

## 5. 이번 단계에서 제외할 데이터

- 결제
- 가격 정책
- 지원자 관리 시스템
- 투자 매칭
- AI 역량 평가
- Project DNA
- 고급 히트맵 산식
- 실시간 협업 편집
- 채용 공고 등록
- 헤드헌팅 계약
- 조직 결제 권한

## 6. 1차 데이터 흐름 최소안

1차 구현으로 좁히면 다음 데이터 흐름이 핵심이다.

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

## 7. 1차 범위 결정 원칙

1차 데이터 범위는 다음 기준으로 판단한다.

- Builder가 판단 흐름을 남기는 데 필요한가?
- Change Card 생성과 승인에 필요한가?
- Decision Timeline 표현에 필요한가?
- Public Project Page에서 프로젝트의 판단 흐름을 이해하게 하는가?
- 피드백이 다음 판단으로 이어지게 하는가?

이 기준에 해당하지 않는 데이터는 2차 또는 장기 확장으로 둔다.
