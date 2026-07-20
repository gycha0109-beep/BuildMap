# BuildMap 2단계 유즈케이스 문서

## 1. 2단계 문서의 목적

이 문서는 BuildMap의 핵심 유즈케이스를 정의한다.

이번 단계의 목표는 구현이 아니다. 화면, DB, API, 패키지, Supabase 연결, UI 컴포넌트는 다루지 않는다.

2단계의 목적은 다음 질문에 답하는 것이다.

> 어떤 상황에서 BuildMap이 필요하며, Builder와 Scout는 Decision Timeline과 변화 카드를 어떻게 사용하게 되는가?

BuildMap은 코드 변경 기록 서비스가 아니다. BuildMap은 프로젝트가 왜 지금의 모습이 되었는지를 기록하고 공유하는 Decision Timeline 플랫폼이다. 따라서 유즈케이스도 단순 기능 목록이 아니라 프로젝트의 판단 흐름이 발생하고, 구조화되고, 공유되고, 이해되는 상황을 중심으로 작성한다.

## 2. 1단계 문서와의 관계

1단계 문서는 BuildMap의 철학, 문제 정의, 포지셔닝, 핵심 개념을 확정했다.

2단계 문서는 그 철학을 실제 사용 상황으로 내려온다.

- 1단계: BuildMap이 왜 존재해야 하는가
- 2단계: BuildMap은 어떤 상황에서 사용되는가
- 이후 단계: 어떤 화면, 데이터, 구현 구조가 필요한가

이번 문서는 1단계에서 확정한 다음 원칙을 유지한다.

- 중심은 버전이 아니라 Decision Timeline이다.
- 변화 카드는 단순 로그가 아니라 의사결정 단위다.
- Builder는 프로젝트를 만든 사람이 아니라 프로젝트를 성장시키는 사람이다.
- Scout는 초기에는 피드백 제공자, 테스터, 협업자, 발견자 역할이 우선이다.
- AI는 생성보다 구조화에 집중한다.
- 공개 프로젝트 페이지는 내부 기록 후 공개 전환 구조가 적합하다.
- 프로젝트 인수인계는 중요한 유즈케이스 후보로 다룬다.

## 3. 이번 단계에서 다루는 범위

이번 단계에서는 다음을 다룬다.

- Builder가 프로젝트 판단 흐름을 기록하는 상황
- 거친 메모가 변화 카드 초안으로 구조화되는 상황
- Builder가 변화 카드를 승인하고 Decision Timeline에 반영하는 상황
- 공개 프로젝트 페이지를 통해 프로젝트 맥락을 보여주는 상황
- Scout가 프로젝트와 Builder를 발견하고 피드백, 테스트, 협업으로 참여하는 상황
- 프로젝트 인수인계에서 Decision Timeline이 쓰이는 상황
- 변화 카드가 실제 의사결정 단위로 작동하는 대표 시나리오
- 유즈케이스 우선순위

이번 단계의 중심은 **Builder의 판단 흐름 기록**이다.

Scout, 히트맵, 채용, 평가 기능은 BuildMap의 확장 가치다. 2단계에서는 핵심 흐름과 연결되는 범위에서만 다룬다.

## 4. 이번 단계에서 다루지 않는 범위

이번 단계에서는 다음을 확정하지 않는다.

- 화면 설계
- DB 구조
- API 구조
- 구현 스택
- 패키지 설치
- Supabase 연결
- 세부 권한 정책
- 가격 정책
- 결제
- 복잡한 추천 알고리즘
- 점수화된 역량 평가
- 자동 채점
- 실제 채용 플로우

애매한 항목은 기능으로 확정하지 않고 “추가 검토 필요”로 남긴다.

## 5. 유즈케이스 문서 목록

```text
BuildMap/
  docs/
    use-cases/
      README.md
      builder-use-cases.md
      scout-use-cases.md
      common-use-cases.md
      change-card-scenarios.md
      handoff-use-cases.md
      use-case-priorities.md
    decisions/
      phase2-use-case-scope.md
```

각 문서의 역할은 다음과 같다.

| 문서 | 역할 |
|---|---|
| `builder-use-cases.md` | Builder가 프로젝트 판단 흐름을 기록하고 관리하는 핵심 상황 |
| `scout-use-cases.md` | Scout가 프로젝트와 Builder를 발견하고 참여하는 상황 |
| `common-use-cases.md` | 공개 페이지, 히트맵, 팔로우, 피드백 등 공통 탐색 상황 |
| `change-card-scenarios.md` | 변화 카드가 실제 의사결정 단위로 작동하는 대표 시나리오 |
| `handoff-use-cases.md` | 새 팀원, 협업자, 인수자, 멘토가 프로젝트 맥락을 이해하는 상황 |
| `use-case-priorities.md` | 핵심 유즈케이스, 초기 구현 후보, 확장 후보, 제외 항목 |
| `../decisions/phase2-use-case-scope.md` | 2단계에서 확정한 범위와 보류한 항목 |

## 6. 유즈케이스를 읽는 순서

권장 읽기 순서는 다음과 같다.

1. `README.md`
2. `builder-use-cases.md`
3. `change-card-scenarios.md`
4. `common-use-cases.md`
5. `scout-use-cases.md`
6. `handoff-use-cases.md`
7. `use-case-priorities.md`
8. `../decisions/phase2-use-case-scope.md`

이 순서가 적합한 이유는 BuildMap의 중심이 Scout 탐색이나 채용 기능이 아니라 Builder의 판단 흐름 기록이기 때문이다. 먼저 Builder가 무엇을 기록하는지 이해한 뒤, 그 기록이 공개 페이지, Scout 발견, 인수인계로 확장되는 구조를 보는 것이 맞다.

## 7. BuildMap의 중심 유즈케이스 요약

BuildMap의 중심 흐름은 다음과 같다.

```text
Builder가 거친 기록을 남긴다
→ AI가 판단 단위로 구조화한다
→ Builder가 수정하고 승인한다
→ 변화 카드가 Decision Timeline에 쌓인다
→ 프로젝트 진화도가 형성된다
→ 공개 가능한 기록이 외부에 공유된다
→ Scout, 테스터, 협업자, 새 팀원이 프로젝트 맥락을 이해한다
```

이 흐름에서 AI는 프로젝트를 대신 만들어주는 생성기가 아니다. AI는 Builder의 메모, 피드백, 실험 결과, 회의 내용을 문제·가설·근거·판단·변경·다음 확인 사항으로 정리하는 구조화 보조자다.

BuildMap이 기록하려는 것은 결과물이 아니라 결과물에 도달한 이유다.
