# BuildMap 3단계 화면 및 흐름 문서

## 1. 문서의 목적

이 문서는 BuildMap의 핵심 화면 구조와 사용자 흐름을 정리한다.

이번 단계의 목적은 구현 설계가 아니다. 목적은 다음 질문에 답하는 것이다.

> BuildMap에는 어떤 화면이 필요하고, 각 화면에서 사용자는 무엇을 보고 무엇을 해야 하는가?

BuildMap은 코드 변경을 보여주는 서비스가 아니라 프로젝트가 왜 지금의 모습이 되었는지를 보여주는 Decision Timeline 플랫폼이다. 따라서 화면 구조도 일반적인 작업 관리, 포트폴리오 등록, 제품 홍보 페이지가 아니라 **판단 흐름을 기록하고 이해시키는 구조**를 중심으로 설계한다.

## 2. 1단계/2단계 문서와의 관계

1단계 문서는 BuildMap의 철학, 문제 정의, 포지셔닝, 핵심 개념을 정의했다.

2단계 문서는 Builder, Scout, 공통 사용자, 새 팀원/협업자의 유즈케이스를 정리했다.

3단계 문서는 1단계와 2단계에서 확정한 내용을 바탕으로 화면과 흐름을 정리한다. 새로운 기능을 과도하게 확정하지 않고, 유즈케이스가 실제 제품 화면에서 어떻게 이어져야 하는지만 명확히 한다.

## 3. 이번 단계에서 다루는 범위

이번 단계에서 다루는 것은 다음이다.

- 전체 정보 구조
- Builder 핵심 화면 흐름
- 프로젝트 생성 흐름
- 변화 카드 작성 및 승인 흐름
- Decision Timeline 화면 구조
- 공개 프로젝트 페이지 구조
- Scout 탐색 흐름
- 히트맵 탐색 화면의 제품적 의미
- 공개/비공개 상태와 화면 상태
- 화면 우선순위

## 4. 이번 단계에서 다루지 않는 범위

이번 단계에서는 다음을 다루지 않는다.

- 코드 구현
- DB 설계
- API 설계
- Supabase 연결
- 패키지 설치
- 실제 UI 컴포넌트 생성
- 와이어프레임 이미지 생성
- 디자인 시스템 확정
- AI 프롬프트 세부 설계
- 결제/가격 정책
- 채용/헤드헌팅 전용 화면
- 역량 점수화 또는 AI 자동 평가 화면

이번 단계는 **구현 설계가 아니라 화면과 흐름의 제품 설계**다. DB, API, 프론트엔드 컴포넌트, 상세 디자인은 아직 확정하지 않는다.

## 5. 생성된 화면 문서 목록

| 문서 | 역할 |
|---|---|
| `information-architecture.md` | BuildMap의 제품 관점 정보 구조 |
| `builder-flow.md` | Builder의 전체 핵심 화면 흐름 |
| `project-creation-flow.md` | 첫 프로젝트 생성 흐름 |
| `change-card-workflow.md` | 거친 메모에서 변화 카드 승인까지의 핵심 흐름 |
| `decision-timeline-screen.md` | Decision Timeline 화면 구조 |
| `public-project-page.md` | 공개 프로젝트 페이지 정보 순서와 역할 |
| `scout-discovery-flow.md` | Scout의 탐색, 피드백, 테스터, 협업 흐름 |
| `exploration-heatmap.md` | 프로젝트 히트맵 탐색 화면 |
| `visibility-and-states.md` | 공개/비공개 정책과 주요 상태 정의 |
| `screen-priorities.md` | 핵심 화면, 초기 구현 화면, 확장 화면 우선순위 |

## 6. 문서를 읽는 순서

권장 순서는 다음이다.

1. `information-architecture.md`
2. `builder-flow.md`
3. `project-creation-flow.md`
4. `change-card-workflow.md`
5. `decision-timeline-screen.md`
6. `public-project-page.md`
7. `scout-discovery-flow.md`
8. `exploration-heatmap.md`
9. `visibility-and-states.md`
10. `screen-priorities.md`

이 순서로 읽으면 BuildMap의 내부 기록 흐름에서 공개/탐색 흐름까지 자연스럽게 이어진다.

## 7. 3단계의 핵심 결론

3단계의 핵심 결론은 다음이다.

> 첫 구현의 중심 화면 흐름은 프로젝트 생성 → 문제 정의 → 가설 → 거친 메모 입력 → AI 변화 카드 초안 → Builder 승인 → Decision Timeline 반영 → 공개 프로젝트 페이지다.

Scout와 히트맵은 중요하지만, 초기에는 최소 탐색 수준으로 둔다. Scout는 프로젝트를 발견하고, 피드백을 작성하고, 테스터로 신청하고, 프로젝트를 저장하는 정도가 적합하다. 채용/헤드헌팅은 초기 핵심이 아니다.

공개 프로젝트 페이지는 제품 소개 페이지가 아니다. 공개 프로젝트 페이지는 프로젝트의 판단 흐름, 현재 필요한 도움, 최근 전환, 핵심 변화 카드를 보여주는 페이지다.

AI는 자동 생성기가 아니다. AI는 Builder의 거친 메모를 문제, 근거, 판단, 변경, 다음 확인 사항으로 구조화하는 보조자다. AI 초안은 Builder가 승인하기 전까지 Decision Timeline에 반영되지 않고, 자동 공개되지 않는다.
