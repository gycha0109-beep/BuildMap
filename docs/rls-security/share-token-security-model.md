# Share Token Security Model

## 1. share_token의 목적

`share_token`은 링크 공개 Project에 접근하기 위한 추측 어려운 식별자 후보다. 링크를 받은 사람만 공개 가능한 Project 정보를 읽을 수 있도록 제한하는 데 사용한다.

`share_token`은 인증 수단이 아니라 링크 공개 접근 조건이다. 로그인 권한이나 Owner 권한을 대체하지 않는다.

## 2. public_slug와 share_token의 차이

| 항목 | 목적 | 보안 성격 |
|---|---|---|
| `public_slug` | 전체 공개 Project의 읽기 쉬운 URL 경로 | 보안 토큰 아님 |
| `share_token` | 링크 공개 Project 접근 식별자 | 추측 어려운 식별자 후보 |

`public_slug`는 보안 수단으로 사용하지 않는다. 링크 공개 Project는 `public_slug`만으로 접근 가능하면 안 된다.

## 3. share_token 원문 저장 금지 권장

1차 권장 방향은 다음이다.

- `share_token` 원문 저장은 금지하는 방향을 우선 검토한다.
- DB에는 token hash 저장 후보를 우선한다.
- token 원문은 생성 시 사용자에게 한 번 전달하고, 이후 재조회하지 않는 방식을 검토한다.
- token 검증 시 원문 token을 hash 처리해 저장된 hash와 비교하는 방식을 검토한다.

## 4. token 생성 후보

- 충분히 긴 random token을 생성한다.
- 사람이 추측 가능한 slug, 프로젝트명, builder명 기반 token은 사용하지 않는다.
- 생성된 token 원문은 로그에 남기지 않는 방향을 검토한다.
- token hash만 저장하는 방향을 우선 검토한다.

## 5. token 재발급 후보

- Project Owner는 링크 공개 token을 재발급할 수 있다.
- 재발급 시 기존 token은 폐기된다.
- 기존 링크로 접근하면 차단되어야 한다.
- 재발급 행위는 보안상 중요한 이벤트이므로 로그 또는 내부 기록 후보로 남긴다. 단, 이번 단계에서 이벤트 테이블은 추가하지 않는다.

## 6. token 폐기 후보

- Project가 비공개로 전환되면 기존 token 접근은 차단되어야 한다.
- token 자체를 폐기할 수도 있고, Project 공개 상태가 비공개이면 token 검증 결과와 무관하게 접근을 차단할 수도 있다.
- 9단계 전 어느 방식을 우선할지 결정해야 한다.

## 7. Project 공개 상태 전환별 token 역할

| 전환 | 권장 처리 |
|---|---|
| 링크 공개 → 비공개 | 기존 token 접근 차단 |
| 링크 공개 → 전체 공개 | `public_slug` 접근 허용, token은 더 이상 필수 조건이 아님 |
| 전체 공개 → 링크 공개 | `public_slug`만으로 접근 차단, 유효 token 필요 |
| 링크 공개 token 재발급 | 기존 token 차단, 새 token만 유효 |

## 8. token hash 비교 위치 후보

### 선택 A: RLS helper function에서 token hash 검증

장점:

- DB 정책과 가까운 곳에서 검증 가능하다.
- 7.5 테스트 케이스와 RLS 정책 매핑이 쉽다.

단점:

- 클라이언트가 token을 DB 정책 context로 어떻게 전달할지 설계가 필요하다.
- RLS 함수에 token을 직접 입력하는 구조는 로그/노출 위험을 관리해야 한다.
- Supabase client 직접 select와 결합할 때 경계가 복잡해질 수 있다.

### 선택 B: secure RPC가 token을 검증하고 공개 데이터만 반환

장점:

- 원천 테이블 row 전체 노출을 줄일 수 있다.
- 공개 페이지 응답 형태를 제한하기 쉽다.
- token 원문을 RLS 조건에 직접 노출하지 않는 방향을 설계하기 쉽다.

단점:

- RPC 설계가 필요하다.
- RLS와 RPC 책임 경계를 명확히 해야 한다.
- RPC 내부에서 public-safe 응답을 보장해야 한다.

### 선택 C: API 계층에서 token을 검증하고 DB는 owner/public-safe 정책만 사용

장점:

- 응답 조합과 컬럼 마스킹을 API에서 통제할 수 있다.
- 공개 페이지 응답 구조를 제품 요구에 맞게 설계하기 쉽다.

단점:

- API 구현 전까지 DB 단독 정책 검증이 어렵다.
- API 실수 시 정책 우회 위험이 생길 수 있다.
- 서버 측 검증과 RLS 정책의 책임 분리 문서화가 필요하다.

## 9. 1차 권장 방향

- `share_token` 원문 저장은 금지한다.
- `share_token`은 hash 저장 후보를 우선한다.
- 링크 공개 데이터는 원천 테이블 직접 select보다 secure RPC 또는 API 조합을 우선 검토한다.
- RLS helper는 보조 후보로 둔다.
- 최종 선택은 9단계 migration draft 직전 또는 9단계 초입에서 확정한다.

## 10. migration draft 전 반드시 결정해야 할 것

- token hash 저장 방식
- token 검증 위치
- token 재발급/폐기 방식
- 링크 공개 Project에서 Feedback 작성 시 token 검증을 어디에서 수행할지
- public-safe 응답을 view/RPC/API 중 어디서 보장할지
