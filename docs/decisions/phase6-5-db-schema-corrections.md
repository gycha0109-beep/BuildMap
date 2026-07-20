# 6.5단계 DB 스키마 보정 결정

## 1. 6.5단계 목적

6.5단계는 BuildMap의 6단계 DB 스키마 초안에서 남아 있는 모호함을 보정하는 결정 문서다.

이번 단계는 7단계 `Auth / Visibility / Access Policy / RLS Policy Design`으로 넘어가기 전, 권한 정책과 공개 정책에 영향을 주는 데이터 구조를 먼저 안정화하는 것을 목표로 한다.

이번 단계에서는 다음을 하지 않는다.

- SQL 작성
- Supabase migration 작성
- Supabase 프로젝트 연결
- RLS 정책 SQL 작성
- API route 설계 또는 구현
- 프론트엔드 컴포넌트 생성
- 패키지 설치
- 새로운 기능 추가
- 테이블 후보의 불필요한 확장

6.5단계의 핵심은 새 범위를 넓히는 것이 아니라, 6단계 스키마 초안이 7단계 권한/RLS 정책 설계로 안전하게 이어지도록 공개 상태, 민감도, 사용자 구조, 링크 공개, 피드백 대상, 원문 보존, 작성자/승인자, 활동 시점의 기준을 정리하는 것이다.

## 2. 보정이 필요한 이유

6단계 DB 스키마 초안은 1차 구현에 필요한 테이블 후보와 필드 후보를 정리했다. 그러나 실제 권한 정책과 RLS 설계에 들어가면 다음 모호함이 치명적인 설계 문제로 이어질 수 있다.

- 공개 상태와 민감도 플래그가 같은 축에 섞일 수 있다.
- 링크 공개를 지원하면서 공개 URL 식별자 정책이 없을 수 있다.
- Feedback Request 대상이 너무 넓어져 다형성 참조와 RLS가 복잡해질 수 있다.
- Rough Note가 Change Card 전환 후 수정되어 승인된 판단의 근거가 흔들릴 수 있다.
- Change Card 작성자와 승인자가 항상 같다고 가정하면 팀/협업 확장 시 모호해질 수 있다.
- `updated_at`과 탐색 정렬용 활동 시점이 섞일 수 있다.
- Supabase Auth 사용자와 앱 프로필, Builder Profile의 책임이 섞일 수 있다.
- Project Link, Tag, Save/Follow, Activity Signal, Decision Diff Snapshot이 1차 범위를 과도하게 키울 수 있다.
- Change Card 생성 필수와 승인 필수를 구분하지 않으면 기록 부담이 커지거나 Timeline 품질이 떨어질 수 있다.
- Public Project Page의 내용 파생 원칙과 공개 URL 식별자가 섞일 수 있다.

따라서 6.5단계는 6단계 문서를 대체하지 않고, 6단계 DB 스키마 초안을 7단계 권한/공개/RLS 정책 설계에 맞게 보정하는 안전장치로 둔다.

## 3. 유지할 6단계 핵심 결론

6.5단계에서도 6단계의 핵심 결론은 유지한다.

- Change Card는 핵심 원천 테이블 후보다.
- Decision Timeline은 별도 원천 테이블이 아니라 승인된 Change Card의 표현 구조다.
- Public Project Page는 별도 제품 소개글 테이블이 아니라 Project의 공개 뷰다.
- Feedback은 일반 댓글이 아니라 Feedback Request 또는 특정 판단에 연결되는 근거다.
- AI Structured Draft는 공식 기록이 아니라 Change Card 후보 초안이다.
- Problem Definition과 Hypothesis의 과거 이력은 Change Card를 원천으로 추적한다.
- Change Card 작업 상태와 공개 상태는 분리한다.
- Project 진행 상태와 공개 상태는 분리한다.
- Scout Profile, Save/Follow, Activity Signal, Decision Diff는 1차 필수에서 제외하거나 선택/후순위로 둔다.
- 채용/헤드헌팅, 결제, 투자자 매칭, 외부 GitHub/Notion 연동, Project DNA, 역량 점수화, AI 자동 평가 점수는 이번 단계에서 제외한다.

## 4. Change Card 공개 상태와 민감도 분리

### 문제

6단계 문서에서는 Change Card 공개 상태 후보에 `민감 정보 포함`이 함께 들어가 있었다.

그러나 `민감 정보 포함`은 공개 상태가 아니라 민감도 또는 보안/개인정보 플래그에 가깝다. 하나의 Change Card는 동시에 다음 상태를 가질 수 있다.

- 내부 전용이면서 민감 정보 포함
- 공개 가능이지만 민감 정보 포함으로 인해 공개 전 재검토 필요
- 공개됨이지만 이후 민감 정보 발견으로 공개 중단 필요

따라서 공개 상태와 민감도는 같은 축으로 섞으면 안 된다.

### 보정 원칙

Change Card는 최소한 다음 두 축으로 분리한다.

#### Change Card 공개 상태 후보

- 내부 전용
- 공개 가능
- 공개됨

#### Change Card 민감도 후보

- 일반
- 민감 정보 포함

상태값 이름은 아직 DB enum처럼 최종 확정하지 않는다. 다만 7단계 권한/RLS 정책 설계에서는 공개 상태와 민감도를 같은 필드나 같은 정책 축으로 섞지 않는다는 원칙을 확정한다.

### 7단계에 주는 영향

- 공개 조회 정책은 공개 상태를 기준으로 설계한다.
- 공개 전 경고, 검토, 차단 정책은 민감도 후보를 함께 고려한다.
- Builder가 공개 전환할 수 있더라도 민감 정보 포함 카드에는 추가 확인 단계를 둘 수 있다.
- RLS 정책 설계 시 `공개 가능`과 `공개됨`은 다르게 취급해야 한다. `공개 가능`은 외부 공개 상태가 아니라 공개 후보 상태다.

## 5. Project 링크 공개 식별자 원칙

### 문제

Project 공개 상태는 다음으로 구분된다.

- 비공개
- 링크 공개
- 전체 공개

그런데 링크 공개를 지원하려면 외부 사용자가 접근할 수 있는 식별자 후보가 필요하다. 공개 페이지 내용은 원천 데이터에서 파생하더라도, 공개 URL 접근을 위한 식별자는 Project 쪽에 저장될 수 있다.

### 공개 접근 식별자 후보

- 공개 slug
- share token
- public path 후보
- 추측하기 어려운 random key 후보

### 1차 권장 방향

- 공개 페이지 내용은 Project, Problem Definition, Hypothesis, 공개 승인 Change Card, Feedback Request에서 파생한다.
- 공개 접근 식별자는 Project에 저장되는 후보로 둔다.
- 링크 공개와 전체 공개은 다른 정책으로 다룬다.
- 링크 공개는 추측 방지와 공유 범위 제어를 별도로 검토한다.
- 실제 필드명은 7단계 권한/공개 정책 설계 또는 migration 직전까지 확정하지 않는다.

### public slug와 share token의 역할 차이 후보

| 후보 | 성격 | 적합한 공개 상태 | 주의점 |
|---|---|---|---|
| 공개 slug | 사람이 읽기 쉬운 공개 경로 | 전체 공개 | 추측 가능성이 있으므로 링크 공개 보안 용도로는 부적합할 수 있음 |
| share token | 추측하기 어려운 공유 키 | 링크 공개 | 노출되면 접근 가능하므로 재발급/폐기 정책이 필요할 수 있음 |
| public path | 공개 URL 경로 개념 | 전체 공개 또는 링크 공개 | 실제 구조 확정 전까지 개념 후보로만 둠 |
| random key | 추측 방지용 식별자 | 링크 공개 | UX는 불리하지만 접근 제어에는 유리함 |

이번 단계에서는 어떤 식별자를 실제로 만들지 않는다. SQL도 작성하지 않는다.

## 6. Feedback Request 대상 범위 축소

### 문제

6단계에서 Feedback Request 연결 대상 후보는 다음처럼 넓게 잡혀 있었다.

- Project
- Problem Definition
- Hypothesis
- Change Card
- Public Project Page 표현

이 구조를 그대로 DB에 옮기면 다형성 target 구조가 필요해질 수 있다. 그러면 참조 무결성, RLS, 공개 정책, 화면 쿼리가 모두 복잡해진다.

### 1차 권장 대상

1차 Feedback Request 대상은 다음으로 좁힌다.

- Project
- Change Card

### 후순위 대상

- Problem Definition
- Hypothesis
- Public Project Page 표현

### 보완 표현 방식

Problem Definition이나 Hypothesis에 대한 피드백도 1차에서는 Project-level 또는 Change Card-level Feedback Request로 표현할 수 있다.

예시:

| 피드백 의도 | 1차 표현 방식 |
|---|---|
| 현재 문제 정의에 대한 피드백 요청 | Project에 연결된 Feedback Request로 만들고 질문/context에 문제 정의 피드백임을 명시 |
| 현재 가설에 대한 피드백 요청 | Project에 연결된 Feedback Request로 만들고 질문/context에 가설 검증 피드백임을 명시 |
| 특정 판단에 대한 피드백 요청 | Change Card에 연결된 Feedback Request |
| 공개 페이지 전체 이해도 피드백 | Project-level Feedback Request |

### 확정하지 않을 것

이번 단계에서는 `target_type`, `target_id` 같은 다형성 설계를 확정하지 않는다. 오히려 1차에서는 단순한 연결을 우선한다는 원칙을 문서화한다.

## 7. Rough Note 수정/보존 정책

### 문제

Rough Note는 Builder가 남긴 원문 기록이며 AI Structured Draft와 Change Card의 근거가 된다. 그런데 Rough Note가 Change Card 전환 후 자유롭게 수정되면 승인된 Change Card의 원문 근거가 흔들릴 수 있다.

BuildMap의 핵심은 판단 흐름의 신뢰성이다. 원문 근거가 사후 변경되면 Change Card가 무엇을 근거로 승인되었는지 불명확해진다.

### 후보 A: Change Card로 전환된 Rough Note 수정 제한

장점:

- 원문 근거가 흔들리지 않는다.
- 구현과 정책이 단순하다.
- 1차 구현에 적합하다.

단점:

- 오타나 잘못된 표현 수정이 어렵다.
- Builder가 원문을 정리하고 싶어도 제한될 수 있다.

### 후보 B: Rough Note는 수정 가능하지만 Change Card에 원문 스냅샷 저장

장점:

- Rough Note 수정 유연성이 있다.
- 승인 시점의 근거를 보존할 수 있다.

단점:

- 중복 저장이 생긴다.
- 원천 Rough Note와 Change Card 스냅샷의 관계를 관리해야 한다.
- 데이터 불일치 설명이 필요하다.

### 후보 C: Rough Note 수정 이력 별도 보관

장점:

- 가장 정확하게 원문 변화를 추적할 수 있다.

단점:

- 1차 구현이 복잡해진다.
- 별도 이력 테이블과 권한 정책이 필요해질 수 있다.

### 1차 권장 방향

- Change Card로 전환된 Rough Note는 수정 제한을 우선 검토한다.
- 필요한 경우 Change Card에 원문 스냅샷 후보를 후순위로 둔다.
- Rough Note 수정 이력 테이블은 후순위로 보류한다.
- 승인된 Change Card의 근거가 사후 변경되지 않도록 해야 한다는 원칙은 확정한다.

## 8. Change Card 작성자와 승인자 분리 가능성

### 문제

6단계에서는 Change Card의 작성 Builder 참조가 중심이었다. 그러나 실제 흐름에서는 다음 주체가 달라질 수 있다.

- Rough Note 작성자
- AI Draft 생성 요청자
- Change Card 편집자
- Change Card 승인자

1인 프로젝트에서는 모두 같을 수 있지만, 팀/협업 기능이 들어가면 달라질 수 있다.

### 1차 원칙

- 1차 구현은 1인 Builder 흐름을 기본으로 한다.
- 작성자와 승인자가 동일한 경우를 기본으로 둔다.
- 팀 권한, 공동 편집, 조직 권한은 이번 단계에서 확장하지 않는다.

### DB 설계 후보로 남길 것

- 작성 Builder 후보
- 승인 Builder 후보

### 권장 방향

- Change Card에는 작성자와 승인자가 분리될 수 있다는 점을 문서화한다.
- 1차에서는 승인자를 소유 Builder 또는 작성 Builder로 제한할 수 있다.
- 승인자 참조 후보는 남기되, 복잡한 팀 승인 워크플로우는 후순위로 둔다.

## 9. Project updated_at과 last_activity_at 구분

### 문제

Project에는 최근 업데이트 시점이 필요하다. 그러나 일반 수정 시점과 탐색 정렬용 활동 시점은 다를 수 있다.

예를 들어 다음 사건들은 모두 “업데이트”처럼 보일 수 있지만 성격이 다르다.

- 프로젝트명 수정
- 한 줄 정의 수정
- 현재 필요한 것 수정
- Change Card 승인
- Feedback Request 생성
- Feedback 반영
- 공개 상태 변경

이 모든 것을 하나의 `updated_at` 성격으로 처리하면 탐색 정렬과 내부 수정 기록이 섞인다.

### 개념 분리

| 개념 | 의미 | 예시 |
|---|---|---|
| Project updated_at 성격 | Project 자체 정보가 수정된 시점 | 프로젝트명, 한 줄 정의, 현재 필요한 것, 공개 상태 수정 |
| Project last_activity_at 성격 | 탐색 정렬과 최근 활동 표시를 위한 활동 시점 후보 | Change Card 승인, Feedback Request 생성, 공개 업데이트, 의미 있는 판단 반영 |

### 1차 권장 방향

- `updated_at` 성격은 일반 수정 시점으로 둔다.
- `last_activity_at` 성격은 탐색 정렬용 파생/갱신 후보로 둔다.
- `last_activity_at`을 실제 저장할지, 원천 데이터에서 계산할지는 migration 직전 결정한다.
- Activity Signal 테이블을 만들지 않더라도 최근 업데이트순 탐색은 가능해야 한다.
- Activity Signal 복잡화와 히트맵 산식 확정은 피한다.

## 10. Auth User / App User Profile / Builder Profile 관계

### 문제

Supabase Auth를 사용할 가능성이 높다면 인증 원천과 앱의 제품 사용자 정보를 분리해야 한다.

인증 시스템의 사용자와 BuildMap 제품에서 보여주는 사용자 프로필, Builder 역할 데이터가 한 객체에 섞이면 권한 정책과 앱 기능이 복잡해진다.

### 권장 개념 구조

```text
auth.users
→ app user profile 또는 user_profiles 후보
→ builder_profiles
→ scout_profiles 후보
```

### 각 책임

| 개념 | 책임 |
|---|---|
| auth.users | 인증 원천. 로그인, 인증 식별자, 인증 provider 등 |
| app user profile 또는 user_profiles 후보 | 앱 사용자 표시명, 기본 정보, 약관 동의 후보, 계정 상태 등 제품 데이터 |
| builder_profiles | Builder 역할 데이터. 역할 태그, 관심 분야, 공개 Builder 정보, 보유 프로젝트 관계 |
| scout_profiles | Scout 전용 탐색 목적, 저장/관심 기반 정보 후보. 1차 선택 데이터 |

### 1차 권장 방향

- auth.users를 인증 원천으로 본다.
- 앱에서 필요한 사용자 표시 정보는 별도 user profile 후보로 둔다.
- Builder Profile은 1차 필수로 둔다.
- Scout Profile은 1차 선택으로 둔다.
- 실제 테이블명은 확정하지 않는다.
- Supabase Auth 연동 SQL은 작성하지 않는다.

## 11. Project Link와 Project Tag 범위

### Project Link

Project Link는 공개 프로젝트 페이지에서 데모, GitHub, Figma, Notion, 기타 링크를 보여줄 때 유용하다.

1차 판단:

- 1차 선택 데이터로 포함 가능하다.
- 자동 연동이 아니라 단순 링크 저장이다.
- GitHub/Notion 자동 동기화 또는 외부 API 연동은 제외한다.
- 공개 페이지에서 외부 결과물을 확인하는 보조 정보로만 다룬다.

### Project Tag

Project Tag는 탐색과 분류에 유용하다. 그러나 별도 tag 테이블은 1차에서 과할 수 있다.

1차 판단:

- 별도 정규화된 tag 테이블은 보류한다.
- 처음에는 Project 내부의 단순 태그 후보 또는 보류로 충분하다.
- 정규화된 tag 테이블, 추천/검색용 태그 인덱스, 고급 분류 체계는 후순위로 둔다.

## 12. Save / Follow, Activity Signal, Decision Diff Snapshot 제외 원칙

다음 항목은 1차 핵심 Decision Timeline 기록 흐름에 필수는 아니다.

- Save / Follow
- Activity Signal
- Decision Diff Snapshot

### Save / Follow

- 공개 프로젝트 재방문과 Scout 탐색에는 유용하다.
- 그러나 핵심 흐름인 Project → Rough Note → AI Draft → Change Card → Decision Timeline에는 필수 아니다.
- 1차 구현 범위가 커지면 제외한다.

### Activity Signal

- 1차에서는 복잡한 이벤트/점수/히트맵 산식으로 만들지 않는다.
- 최근 업데이트순 정렬만으로 시작할 수 있다.
- 피드백 요청 중, 테스터 모집 중, 최근 전환 있음은 정렬보다 배지 또는 필터 후보로 둔다.
- Activity Signal 테이블은 1차 migration에서 제외 가능하다.

### Decision Diff Snapshot

- 별도 snapshot 없이 Change Card와 현재 Problem/Hypothesis 상태를 기반으로 단순 비교 화면으로 시작할 수 있다.
- Decision Diff는 코드 diff가 아니라 판단 diff다.
- 1차에서는 저장 데이터보다 파생 화면으로 시작한다.

## 13. Change Card 초안 생성 필수와 승인 시 필수/권장 정보 구분

### 문제

Change Card 필수 필드를 너무 많이 강제하면 Builder가 기록하지 않는다. 반대로 승인된 Change Card가 너무 빈약하면 Decision Timeline이 의미 없어지고, BuildMap의 핵심 차별점이 약해진다.

따라서 Change Card의 필수 조건은 “초안 생성”과 “공식 승인”을 분리해야 한다.

### 초안 생성 시 최소 필수 후보

- Project 참조
- 작성 Builder 참조
- 유형
- 제목
- 구조화 요약
- 작업 상태
- 공개 상태
- 생성 시점

### 승인 시 강력 권장 또는 필수 후보

- 근거
- 판단
- 다음 확인 사항
- 승인 시점

### 선택 또는 후순위 후보

- 변경 내용
- 연결된 문제 정의
- 연결된 가설
- 연결된 피드백
- 중요도
- 관련 링크
- 관련 프로젝트 상태 변화

### 권장 원칙

- 초안 저장은 가볍게 한다.
- 공식 Timeline 반영은 더 엄격하게 한다.
- 실제 NOT NULL 제약은 이번 단계에서 확정하지 않는다.
- DB migration 전에 초안 생성 필수와 승인 시 필수/권장 필드를 반드시 분리해 검토한다.

## 14. Feedback은 Feedback Request를 통해서만 받는 1차 원칙

### 원칙

1차에서는 Feedback은 반드시 Feedback Request를 통해 생성되는 것으로 둔다.

BuildMap의 Feedback은 일반 댓글이 아니라 특정 질문 또는 판단에 대한 피드백이다. 따라서 공개 페이지 하단에 일반 댓글창을 만드는 방식은 BuildMap의 철학과 맞지 않는다.

### Project-level Feedback Request

프로젝트 전체에 대한 피드백도 가능하지만, 내부적으로는 Project-level Feedback Request로 처리한다.

예시:

- 프로젝트 전체에 대한 피드백 요청
- 문제 정의 공감도
- 첫 화면 이해도
- 테스터 참여 의사
- 협업 관심

### Change Card-level Feedback Request

특정 판단이나 변화 카드에 대한 피드백은 Change Card-level Feedback Request로 처리한다.

예시:

- 특정 방향 전환에 대한 피드백
- 기능 제거 판단에 대한 피드백
- 가설 반박 판단에 대한 피드백
- 릴리즈 목적에 대한 피드백

### 보류

- 일반 댓글창
- 비로그인 피드백
- 모든 객체에 대한 다형성 피드백 target
- 피드백 자동 공개

## 15. Public Project Page 파생 원칙과 공개 URL 식별자 구분

### 공개 페이지 내용 원칙

Public Project Page는 별도 제품 소개글이 아니다. 공개 페이지 내용은 원천 데이터에서 파생한다.

파생 원천 후보:

- Project
- Problem Definition
- Hypothesis
- 공개 상태가 `공개됨`이고 작업 상태가 승인된 Change Card
- Feedback Request
- Project Link 후보
- Builder Profile의 공개 정보

### 공개 페이지에 별도 원천 본문을 만들지 않는 이유

- Project와 공개 페이지의 내용이 불일치할 수 있다.
- 제품 소개 페이지처럼 변질될 수 있다.
- BuildMap의 핵심인 판단 흐름보다 홍보 문구가 앞설 수 있다.

### 공개 URL 식별자 원칙

공개 페이지 내용은 파생으로 시작하되, 공개 URL 접근 식별자는 Project에 저장되는 후보로 둘 수 있다.

| 후보 | 목적 |
|---|---|
| public_slug | 전체 공개 페이지의 읽기 쉬운 경로 후보 |
| share_token | 링크 공개 접근을 위한 추측 어려운 토큰 후보 |

실제 필드명, 생성 방식, 재발급/폐기 정책, 공개/링크 공개별 접근 정책은 7단계 권한/공개/RLS 정책 설계에서 확정한다.

## 16. 7단계 권한/공개/RLS 정책 설계에서 반드시 지켜야 할 원칙

7단계는 RLS SQL 작성 단계가 아니라 권한/공개/RLS 정책 설계 단계로 간다.

반드시 지켜야 할 원칙은 다음이다.

- Change Card 공개 상태와 민감도 플래그를 분리해서 정책을 설계한다.
- `공개 가능`은 외부 공개가 아니라 공개 후보 상태로 다룬다.
- `공개됨`인 승인 Change Card만 공개 Timeline에 노출하는 방향을 기본으로 둔다.
- 민감 정보 포함 카드는 공개 전 추가 확인 또는 공개 차단 후보로 다룬다.
- Project 링크 공개는 전체 공개와 다르게 다룬다.
- 링크 공개는 추측 방지 식별자와 접근 범위를 별도로 검토한다.
- Feedback Request는 공개 가능하지만 Feedback 내용은 기본 내부 검토로 둔다.
- Builder가 선택한 Feedback만 공개할 수 있다.
- Feedback은 1차에서 Feedback Request를 통해서만 생성한다.
- Rough Note와 AI Draft는 기본 비공개 내부 기록으로 둔다.
- 승인된 Change Card의 근거가 사후 변경되지 않도록 Rough Note 전환 후 수정/보존 정책을 반영한다.
- auth.users, user profile, Builder Profile의 책임을 분리한다.
- Scout/채용/헤드헌팅 정책을 1차 권한 설계에 과도하게 넣지 않는다.
- Public Project Page는 별도 원천이 아니라 Project 공개 뷰로 다룬다.
- Decision Timeline은 별도 원천 테이블이 아니라 Change Card 표현으로 다룬다.

## 17. 아직 보류할 것

- 실제 SQL
- Supabase migration
- RLS 정책 SQL
- API route 설계
- 프론트엔드 컴포넌트
- 패키지 설치
- 상태값의 DB enum 확정
- 공개 slug 또는 share token 실제 필드명 확정
- 링크 공개 재발급/폐기 정책
- Feedback Request 다형성 target 설계
- Rough Note 수정 이력 테이블
- Change Card 원문 스냅샷 필드 확정
- 팀 권한, 공동 편집, 조직 권한
- Scout 전용 복잡한 프로필
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 정규화된 Project Tag 테이블
- GitHub/Notion 자동 연동
- 비로그인 피드백
- 채용/헤드헌팅
- 결제
- Project DNA
- 역량 점수화
- 히트맵 산식

## 18. 7단계로 넘어가기 전 확인 질문

1. Change Card 공개 상태와 민감도 플래그를 실제 DB에서도 별도 필드 후보로 둘 것인가?
2. `공개 가능` 상태를 외부 공개가 아닌 공개 후보 상태로 고정할 것인가?
3. Project 링크 공개를 위해 `share token` 성격의 식별자를 둘 것인가?
4. 전체 공개 페이지에는 `public slug` 성격의 읽기 쉬운 경로가 필요한가?
5. Feedback Request 1차 대상은 Project와 Change Card로 좁혀도 충분한가?
6. Problem Definition/Hypothesis 피드백은 Project-level Feedback Request로 우선 처리해도 되는가?
7. Change Card로 전환된 Rough Note를 1차에서 수정 제한하는 방향으로 갈 것인가?
8. Change Card에 승인 Builder 후보를 둘 것인가, 1차에서는 작성 Builder만으로 갈 것인가?
9. Project의 `last_activity_at` 성격 값을 실제 저장할 것인가, 원천 데이터에서 파생할 것인가?
10. 앱 사용자 표시 정보용 user profile 후보를 Builder Profile과 분리할 것인가?
11. Project Link를 1차 선택 테이블로 포함할 것인가?
12. Project Tag는 1차에서 별도 테이블 없이 단순 태그 후보 또는 보류로 처리할 것인가?
13. Save / Follow, Activity Signal, Decision Diff Snapshot을 1차 migration에서 제외할 것인가?
14. Change Card 승인 시 `근거`, `판단`, `다음 확인 사항`, `승인 시점`을 필수에 가깝게 둘 것인가?
15. Feedback은 1차에서 반드시 Feedback Request를 통해서만 생성되도록 할 것인가?
16. 7단계는 SQL 없이 `Auth / Visibility / Access Policy / RLS Policy Design` 문서화로 진행할 것인가?
