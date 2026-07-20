# BuildMap 5단계 데이터 모델 문서

## 1. 문서의 목적

이 문서는 BuildMap의 5단계 산출물이다. 목적은 BuildMap에서 어떤 제품 데이터 객체가 존재하고, 각 객체가 어떤 책임을 가지며, 서로 어떤 관계로 연결되는지 정리하는 것이다.

이번 단계는 **DB 설계가 아니라 제품 데이터 구조 설계**다. SQL, 테이블, 컬럼, 인덱스, RLS, API 경로, 프론트엔드 상태 관리 구조는 아직 확정하지 않는다.

## 2. 1·2·3·4단계 문서와의 관계

- 1단계는 BuildMap의 철학, 문제 정의, 포지셔닝, 핵심 개념을 확정했다.
- 2단계는 Builder, Scout, 피드백, 인수인계 등 핵심 유즈케이스를 정리했다.
- 3단계는 화면과 사용자 흐름을 제품 설계 수준에서 정리했다.
- 4단계는 화면별 텍스트 와이어 구조를 정리했다.
- 5단계는 위 흐름을 뒷받침하는 제품 데이터 모델을 정리한다.

5단계의 데이터 모델은 이전 단계의 철학과 화면 흐름을 훼손하지 않는다. 특히 BuildMap의 중심은 여전히 **Builder의 판단 흐름 기록**이며, 데이터 모델의 중심은 **Change Card**다.

## 3. 이번 단계에서 다루는 범위

이번 단계에서 다루는 것은 다음이다.

- 핵심 도메인 객체 정의
- 객체별 역할과 책임
- 객체별 필수 정보와 선택 정보
- 객체별 생성 시점과 읽히는 화면
- 객체 간 연결 관계
- 내부 기록과 공개 표현의 관계
- 변화 카드와 Decision Timeline의 원천/표현 관계
- 1차 구현 필수 데이터와 후순위 데이터 구분
- 공개/비공개 및 상태 후보
- 데이터 모델상 위험과 대응 원칙

## 4. 이번 단계에서 다루지 않는 범위

이번 단계에서는 다음을 작성하지 않는다.

- SQL
- 실제 DB 테이블명
- 실제 DB 컬럼명
- Supabase RLS 정책
- API 구조
- 프론트엔드 상태 관리 설계
- 상세 컴포넌트 설계
- AI 프롬프트 세부 설계
- 가격 정책, 결제, 채용 플로우
- Project DNA, 역량 점수화, AI 자동 평가

## 5. 생성된 데이터 모델 문서 목록

```text
BuildMap/docs/data-model/
  README.md
  product-data-model-overview.md
  domain-objects.md
  object-relationships.md
  builder-and-scout-model.md
  project-model.md
  problem-and-hypothesis-model.md
  rough-note-and-ai-draft-model.md
  change-card-model.md
  decision-timeline-model.md
  public-project-page-model.md
  feedback-model.md
  visibility-and-state-model.md
  discovery-model.md
  decision-diff-model.md
  initial-data-scope.md
  data-model-risks.md
BuildMap/docs/decisions/
  phase5-product-data-model-scope.md
  phase5-5-data-model-corrections.md
```

## 6. 읽는 순서

권장 순서는 다음이다.

1. `product-data-model-overview.md`
2. `domain-objects.md`
3. `object-relationships.md`
4. `change-card-model.md`
5. `decision-timeline-model.md`
6. `public-project-page-model.md`
7. `feedback-model.md`
8. `visibility-and-state-model.md`
9. `initial-data-scope.md`
10. `data-model-risks.md`
11. `phase5-product-data-model-scope.md`
12. `phase5-5-data-model-corrections.md`

## 7. 5단계의 핵심 결론

5단계의 핵심 결론은 다음이다.

> BuildMap의 원천 기록은 Change Card이고, Decision Timeline은 승인된 Change Card를 시간·중요도·관계에 따라 보여주는 표현 구조다.

따라서 Decision Timeline은 별도의 게시글 묶음이 아니다. Project 역시 제품 소개글이 아니라 문제 정의, 가설, 변화 카드, 피드백, 공개 페이지를 묶는 판단 흐름 컨테이너다.

1차 구현에서는 Builder가 Project를 만들고, Problem Definition과 Hypothesis를 입력하고, Rough Note를 남기고, AI Structured Draft를 검토한 뒤 Change Card를 승인하여 Decision Timeline과 Public Project Page에 연결되는 흐름을 우선한다.


## 8. 5.5단계 보정 문서 확인

DB 스키마 설계로 넘어가기 전에는 `docs/decisions/phase5-5-data-model-corrections.md`를 먼저 확인한다. 이 문서는 원천 데이터와 파생/표현 데이터, 상태값 분리, 공개 정책, 1차 데이터 범위를 보정한다.

## 9. 6단계 DB 스키마 초안 문서 위치

6단계 DB 스키마 초안 문서는 `docs/database/`에 위치한다. 6단계 문서를 읽을 때도 `docs/decisions/phase5-5-data-model-corrections.md`의 보정 결정을 우선 기준으로 삼는다.

