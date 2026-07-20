# BuildMap 4단계 텍스트 와이어 문서

## 1. 문서의 목적

이 문서는 BuildMap의 핵심 화면을 **텍스트 와이어 구조**로 정리한다.

3단계까지는 어떤 화면이 필요하고 어떤 흐름으로 연결되는지를 정리했다. 4단계에서는 한 단계 더 구체화하여, 각 화면에서 사용자가 실제로 무엇을 보고, 무엇을 입력하고, 어떤 버튼을 누르고, 다음 화면으로 어떻게 이동하는지를 문서화한다.

이번 단계의 목적은 구현이 아니다. 화면을 그리거나 컴포넌트를 만드는 것이 아니라, 구현 직전에 제품 구조가 흔들리지 않도록 화면별 정보와 행동을 고정하는 것이다.

## 2. 1·2·3단계 문서와의 관계

4단계 문서는 기존 문서를 대체하지 않는다.

- 1단계 문서는 BuildMap의 철학, 문제 정의, 포지셔닝, 핵심 개념을 정의했다.
- 2단계 문서는 Builder, Scout, 공통 사용자, 인수인계 관점의 유즈케이스를 정의했다.
- 3단계 문서는 화면 구조와 사용자 흐름을 제품 설계 수준에서 정의했다.
- 4단계 문서는 3단계 화면을 실제 사용 가능한 텍스트 와이어 구조로 풀어쓴다.

따라서 4단계의 모든 화면은 다음 원칙을 유지한다.

> BuildMap은 코드 변경이 아니라 프로젝트가 왜 지금의 모습이 되었는지를 기록하고 공유하는 Decision Timeline 플랫폼이다.

## 3. 이번 단계에서 다루는 범위

이번 단계에서는 다음을 다룬다.

- Builder 대시보드에서 보여야 할 정보
- 첫 프로젝트 생성 화면의 단계별 입력 구조
- 문제 정의와 가설 입력 화면
- 거친 메모를 변화 카드 초안으로 바꾸는 화면
- AI 변화 카드 초안 검토 및 승인 화면
- Decision Timeline 화면
- 공개 프로젝트 페이지
- 피드백 요청 및 작성 화면
- Scout 프로젝트 탐색 화면
- 프로젝트 카드 그리드 화면
- 간단한 Decision Diff 화면
- 빈 상태, 로딩 상태, 오류 상태, 권한 상태

각 문서는 화면의 목적, 사용자, 진입 조건, 주요 영역, 입력, 버튼, 상태, 다음 이동, 초기 구현 요소, 후순위 요소를 텍스트로 정리한다.

## 4. 이번 단계에서 다루지 않는 범위

이번 단계에서는 다음을 다루지 않는다.

- 코드 구현
- DB 설계
- API 설계
- Supabase 연결
- 패키지 설치
- 실제 UI 컴포넌트 생성
- HTML, JSX, CSS 코드
- 이미지 와이어프레임
- 디자인 시스템
- AI 프롬프트 세부 설계
- 권한 정책의 세부 구현
- 결제
- 채용 기능
- Project DNA 표현
- 역량 점수화

이번 단계는 구현 전 화면 구조를 정리하는 단계다. DB, API, 컴포넌트, 디자인 시스템은 아직 확정하지 않는다.

## 5. 생성된 텍스트 와이어 문서 목록

| 문서 | 역할 |
|---|---|
| `builder-dashboard-wire.md` | Builder가 자신의 프로젝트, 판단 흐름, 승인 대기 카드, 미해결 가설을 확인하는 대시보드 |
| `project-create-wire.md` | 첫 프로젝트 생성 흐름 |
| `problem-hypothesis-wire.md` | 문제 정의와 가설 입력/수정 화면 |
| `rough-note-to-change-card-wire.md` | 거친 메모 입력 및 AI 구조화 시작 화면 |
| `change-card-review-wire.md` | AI 변화 카드 초안 검토, 수정, 승인 화면 |
| `decision-timeline-wire.md` | 프로젝트 판단 흐름을 보여주는 Decision Timeline 화면 |
| `public-project-page-wire.md` | 외부에 공개되는 프로젝트 페이지 구조 |
| `feedback-request-wire.md` | Builder가 특정 판단에 대한 피드백을 요청하는 화면 |
| `feedback-write-wire.md` | Scout 또는 로그인 사용자가 피드백을 작성하는 화면 |
| `scout-project-discovery-wire.md` | Scout가 프로젝트를 탐색하고 피드백/테스터/협업으로 이어지는 화면 |
| `project-card-grid-wire.md` | 히트맵 전 단계의 기본 프로젝트 카드 그리드 탐색 화면 |
| `simple-decision-diff-wire.md` | 초기 판단과 현재 판단을 비교하는 간단한 Decision Diff 화면 |
| `empty-loading-error-states.md` | 공통 빈 상태, 로딩, 오류, 권한, 공개 전환 경고 상태 |

## 6. 읽는 순서

권장 순서는 다음과 같다.

1. `builder-dashboard-wire.md`
2. `project-create-wire.md`
3. `problem-hypothesis-wire.md`
4. `rough-note-to-change-card-wire.md`
5. `change-card-review-wire.md`
6. `decision-timeline-wire.md`
7. `public-project-page-wire.md`
8. `feedback-request-wire.md`
9. `feedback-write-wire.md`
10. `scout-project-discovery-wire.md`
11. `project-card-grid-wire.md`
12. `simple-decision-diff-wire.md`
13. `empty-loading-error-states.md`

이 순서대로 읽으면 Builder의 내부 기록 흐름에서 공개, 피드백, Scout 탐색, 판단 비교까지 자연스럽게 이어진다.

## 7. 4단계의 핵심 결론

4단계의 핵심 결론은 다음이다.

1. BuildMap의 첫 구현 전 화면 구조는 Builder의 판단 흐름 기록을 중심으로 잡는다.
2. 화면은 완성작 등록이 아니라 문제 정의, 가설, 메모, 변화 카드, Decision Timeline으로 이어져야 한다.
3. AI 구조화는 텍스트 메모 하나에서 시작한다.
4. AI 초안은 Builder가 수정하고 승인해야 공식 Timeline에 반영된다.
5. 공개 프로젝트 페이지는 제품 소개보다 판단 흐름과 현재 필요한 도움을 먼저 보여준다.
6. Scout 탐색은 카드 그리드를 기본으로 시작하고, 히트맵은 후순위 실험으로 둔다.
7. 피드백은 비로그인 익명 제출을 1차에서 보류하고, 최소 계정 또는 로그인 기반으로 가정한다.
8. DB, API, 컴포넌트, 디자인 시스템은 아직 확정하지 않는다.
