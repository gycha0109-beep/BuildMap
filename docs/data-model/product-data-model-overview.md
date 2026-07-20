# 제품 데이터 모델 개요

## 1. BuildMap의 데이터 모델 철학

BuildMap의 데이터 모델은 파일 변경, 작업 완료, 포트폴리오 소개글을 중심으로 잡지 않는다. 중심은 프로젝트가 어떤 판단을 거쳐 지금의 모습이 되었는지를 남기는 것이다.

따라서 BuildMap의 데이터 구조는 다음 질문에 답해야 한다.

- 이 프로젝트는 어떤 문제에서 시작했는가?
- 어떤 가설을 믿고 움직였는가?
- 어떤 실험과 피드백이 있었는가?
- 어떤 판단을 유지했고, 무엇을 버렸는가?
- 어떤 전환 때문에 현재 상태가 되었는가?
- 외부 사용자는 지금 무엇을 도와줄 수 있는가?

## 2. 핵심 원천 기록

BuildMap의 핵심 원천 기록은 **Change Card**다.

Change Card는 단순 로그가 아니다. 하나의 변화 카드는 프로젝트에서 발생한 하나의 의사결정 단위다. 문제 정의 수정, 가설 반박, 기능 제거, 방향 전환, 릴리즈, 인수인계 메모 등이 모두 Change Card가 될 수 있다.

원천 기록을 Change Card로 두는 이유는 다음이다.

- Decision Timeline을 별도 게시판으로 만들지 않기 위해서다.
- 프로젝트 진화도를 수동 소개글로 만들지 않기 위해서다.
- 공개 프로젝트 페이지를 홍보 문구가 아니라 판단 흐름 기반으로 구성하기 위해서다.
- Scout가 점수가 아니라 근거를 보고 프로젝트와 Builder를 이해하게 하기 위해서다.

## 3. Decision Timeline의 성격

Decision Timeline은 독립 게시글 묶음이 아니다. 승인된 Change Card가 시간, 중요도, 연결된 문제·가설·피드백 관계에 따라 배열된 **표현 구조**다.

즉 다음과 같이 구분한다.

| 구분 | 성격 |
|---|---|
| Change Card | 원천 기록 |
| Decision Timeline | 원천 기록을 보여주는 흐름 표현 |
| Public Project Page | 공개 가능한 일부 기록을 외부에 보여주는 공개 뷰 |
| Decision Diff | 특정 시점의 판단 차이를 비교하는 파생 표현 |

이 구분이 무너지면 같은 판단이 Timeline, 카드, 공개 페이지, Diff에 중복 저장될 위험이 있다.

## 4. 내부 기록과 공개 표현의 관계

BuildMap의 기본 정책은 **내부 기록 후 공개 전환**이다.

Builder는 Rough Note, AI Structured Draft, Change Card를 내부에서 먼저 정리한다. 이후 Builder가 승인하고 공개 가능한 Change Card만 Public Project Page에 노출한다. AI 초안은 자동 공개되지 않으며, 승인 전까지 공식 Decision Timeline에도 반영되지 않는다.

공개 표현은 내부 기록의 일부 뷰다. 공개 프로젝트 페이지는 별도의 제품 소개글이 아니라 Project, Problem Definition, Hypothesis, Change Card, Feedback Request, Project Link 일부를 조합해 보여주는 외부 표현이다.

## 5. 큰 관계

BuildMap의 큰 관계는 다음과 같다.

```text
User
→ Builder Profile 또는 Scout Profile

Builder Profile
→ Project
→ Problem Definition / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card
→ Decision Timeline 표현
→ Public Project Page 공개 뷰

Scout Profile 또는 로그인 사용자
→ Project Discovery
→ Public Project Page
→ Feedback Request
→ Feedback
→ Builder 검토
→ 새 Change Card 후보
```

## 6. 1차 구현에서 필요한 데이터 흐름

1차 구현의 제품 데이터 흐름은 다음이다.

```text
Builder
→ Project 생성
→ Problem Definition / Hypothesis 입력
→ Rough Note 입력
→ AI Draft 생성
→ Change Card 승인
→ Decision Timeline에 반영
→ Public Project Page에 일부 공개
→ Feedback Request 생성
→ Feedback 수집
→ 새 Change Card로 연결
```

이 흐름에서 가장 중요한 것은 Change Card 승인 전과 승인 후를 분리하는 것이다. 승인 전 AI Draft는 후보 기록이고, 승인된 Change Card만 공식 판단 기록이다.

## 7. 후순위 확장 데이터 흐름

후순위 확장에서는 다음 흐름이 추가될 수 있다.

- 테스터 신청과 테스트 결과가 Feedback 또는 Change Card로 연결되는 흐름
- 협업자 요청과 협업 제안 이력
- Scout 저장 목록과 프로젝트 재방문 흐름
- 인수인계 요약 생성
- 외부 GitHub/Notion 링크 또는 변경 힌트 연결
- 고급 Activity Signal 기반 탐색
- 히트맵 실험
- 조직/팀 단위 프로젝트 운영

다만 이 단계에서는 후순위 확장 흐름을 DB 구조로 확정하지 않는다.

## 8. 단일 원천 기록 원칙

중복 저장 위험을 줄이기 위해 다음 원칙을 둔다.

- 프로젝트의 판단 원천은 Change Card다.
- Timeline은 Change Card에서 파생된다.
- Public Project Page는 Project와 공개 Change Card에서 파생된다.
- Decision Diff는 Change Card와 Problem/Hypothesis의 시점 차이에서 파생된다.
- Feedback은 일반 댓글이 아니라 특정 질문 또는 판단에 연결된다.

추가 검토 필요: 일부 요약 정보는 성능과 사용성을 위해 별도로 캐싱될 수 있다. 다만 캐시와 원천 기록의 관계는 DB 설계 단계에서 별도로 검토한다.
