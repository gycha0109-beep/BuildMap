# Public-safe View / RPC / API Boundary

## 1. 비교 목적

공개 Project 카드, Public Project Page, 공개 Decision Timeline, 공개 Feedback은 원천 테이블을 직접 노출하면 위험하다. 이번 문서는 public-safe response boundary를 어디에 둘지 비교한다.

## 2. 선택 A: public-safe SQL view 후보

### 역할

원천 테이블에서 공개 가능한 컬럼만 모아 읽기 전용 view 후보를 만든다.

### 장점

- 공개 가능한 컬럼을 DB 레벨에서 제한하기 쉽다.
- 전체 공개 데이터 응답에 적합하다.
- Supabase client에서 단순하게 조회할 수 있다.

### 단점

- 링크 공개 `share_token` 검증과 결합하기 어렵다.
- view 자체에 RLS 또는 security barrier 고려가 필요할 수 있다.
- 복잡한 조합 로직이 늘어나면 유지가 어려워질 수 있다.

### 적합한 데이터

- 전체 공개 Project 카드
- 전체 공개 Builder Profile 일부
- 전체 공개 Change Card 목록 후보

### 부적합한 데이터

- 링크 공개 Project
- token 검증이 필요한 공개 페이지
- 작성자 익명화/맥락 표시가 필요한 Feedback 응답

### 1차 권장 여부

전체 공개 데이터에는 후보로 적합하다. 링크 공개 데이터에는 단독 사용을 권장하지 않는다.

## 3. 선택 B: secure RPC 후보

### 역할

DB 함수/RPC가 token 검증과 public-safe 응답 조합을 함께 담당하는 후보 방식이다.

### 장점

- 링크 공개 token 검증과 응답 제한을 한 경계에서 처리할 수 있다.
- 원천 테이블 row 전체 노출을 줄일 수 있다.
- 공개 페이지 전용 응답 구성이 가능하다.

### 단점

- RPC 설계와 보안 검토가 필요하다.
- 함수 권한, security definer 여부, RLS 우회 위험을 엄격히 검토해야 한다.
- 실제 Supabase 동작 검증이 필요하다.

### 적합한 데이터

- 링크 공개 Public Project Page
- 링크 공개 Decision Timeline
- 링크 공개 Feedback Request
- 링크 공개 Feedback 작성 조건 검증 후보

### 1차 권장 여부

링크 공개 데이터에는 강력 후보. 단, 9단계에서 실제 함수 보안 모델을 확정해야 한다.

## 4. 선택 C: API route 조합 후보

### 역할

서버 API가 token 검증, 원천 데이터 조회, 응답 조합, 컬럼 제한을 담당한다.

### 장점

- 공개 응답을 제품 요구에 맞게 조합하기 쉽다.
- token 원문을 클라이언트-DB RLS 조건에 직접 전달하지 않아도 된다.
- Feedback 작성자 표시 정책을 API에서 통제하기 쉽다.

### 단점

- API 구현 전까지 DB 단독 정책 검증이 어렵다.
- API 실수 시 정책 우회 위험이 있다.
- RLS와 API 책임 경계를 명확히 해야 한다.

### 적합한 데이터

- Public Project Page 전체 응답
- 공개 Decision Timeline
- 공개 Feedback 표시
- 링크 공개 token 검증

### 1차 권장 여부

제품 응답 조합에는 적합하다. 단, BuildMap의 9단계가 migration draft라면 API 구현은 아직 하지 않는다.

## 5. 선택 D: 원천 테이블 직접 select 최소화 후보

### 역할

원천 테이블 직접 public select를 최소화하거나 금지한다.

### 장점

- 민감 컬럼 노출 위험을 줄인다.
- 공개 응답 경계를 명확히 만들 수 있다.

### 단점

- 빠른 프로토타이핑은 느려질 수 있다.
- view/RPC/API 중 하나의 조합 경계를 반드시 설계해야 한다.

### 1차 권장 여부

강력 권장. 공개 응답은 원천 테이블 직접 select보다 public-safe response boundary를 거치는 방향이 안전하다.

## 6. 공개 응답별 1차 권장 경계

| 공개 응답 | 1차 권장 후보 | 비고 |
|---|---|---|
| 공개 Project 카드 | public-safe view 또는 API | 전체 공개 중심 |
| Public Project Page | API 또는 secure RPC | 링크 공개 token이 있으면 RPC/API 우선 |
| 공개 Decision Timeline | API 또는 public-safe view | 민감/공개 상태 필터 필수 |
| 공개 Change Card 목록 | API 또는 public-safe view | 원천 row 전체 금지 |
| 공개 Feedback Request | API 또는 view 후보 | 링크 공개면 token 조건 필요 |
| 공개 선택 Feedback | API 우선 | 작성자 익명/역할 표시 필요 |
| Builder 공개 Profile | public-safe view 또는 API | 이메일/auth ID 제외 |
| Project Link | API 또는 view 후보 | 공개 가능 link만 |

## 7. 결론

- 전체 공개 데이터는 public-safe view 또는 API 조합을 우선 검토한다.
- 링크 공개 데이터는 share_token 검증이 필요하므로 secure RPC 또는 API 조합을 우선 검토한다.
- 원천 테이블 직접 anon select는 최소화하거나 금지하는 방향을 우선 검토한다.
- Supabase client에서 원천 테이블을 직접 넓게 select하는 구조는 피한다.
