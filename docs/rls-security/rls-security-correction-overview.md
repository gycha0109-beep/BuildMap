# RLS Security Correction Overview

## 1. 8단계 RLS 초안에서 유지할 결론

8단계 RLS 초안의 핵심 결론은 유지한다.

- Change Card는 핵심 원천 기록이다.
- Decision Timeline은 승인된 Change Card 기반 표현이다.
- Public Project Page는 Project의 공개 뷰다.
- Rough Note와 AI Structured Draft는 기본 비공개 내부 기록이다.
- Feedback은 Feedback Request를 통해 생성되는 판단 근거다.
- 비로그인 쓰기 권한은 1차에서 허용하지 않는다.
- Project Owner 중심 권한 모델을 유지한다.
- 관리자 후보 권한은 1차 RLS 초안과 migration draft에서 제외한다.

## 2. 8단계 RLS 초안에서 보정해야 할 위험

8단계 RLS 초안은 정책 방향을 정리했지만 다음 위험이 남아 있다.

| 위험 | 보정 방향 |
|---|---|
| `share_token` 검증 위치가 불명확함 | RLS helper / secure RPC / API 비교 후 9단계 전 결정 |
| `share_token` 원문 저장 위험 | 원문 저장 금지, hash 저장 후보 우선 |
| `public_slug`를 보안 토큰처럼 사용할 위험 | `public_slug`는 전체 공개 경로, 보안 조건 아님 |
| RLS row select 허용 시 민감 컬럼 노출 위험 | public-safe response boundary 필요 |
| 공개 Feedback 작성자 내부 식별자 노출 위험 | 익명/역할 표시, 내부 식별자 노출 금지 |
| Feedback 작성자 위조 위험 | insert 시 현재 auth user와 author 후보 일치 필요 |
| 승인된 Change Card 사후 수정 위험 | 승인 후 본문/근거/판단 직접 수정 제한 검토 |
| RLS helper function 구현 가능성 불명확 | helper별 입력, 보안 전제, 대체 경계 검토 |

## 3. 9단계 migration draft 전에 반드시 확정하거나 추가 검토할 항목

- `share_token` 최종 검증 위치
- `share_token` hash 저장 방식
- `public_slug` / `share_token` 실제 필드 후보
- 공개 응답을 public-safe view로 구성할지, secure RPC로 구성할지, API에서 조합할지
- 공개 Feedback 작성자 표시 정책
- Feedback insert 작성자 위조 방지 조건
- 승인된 Change Card 수정 제한을 DB trigger/constraint 후보로 둘지, application validation 후보로 둘지
- 링크 공개 Feedback 작성 조건에 token 검증을 어디에서 반영할지

## 4. RLS가 해결하는 것

RLS는 다음을 해결하는 데 적합하다.

- 행 단위 소유자 접근 제한
- 비공개 Project 접근 차단
- Owner 외 Project 수정 차단
- Rough Note / AI Draft 외부 접근 차단
- 공개 조건을 만족하지 않는 Change Card 행 접근 차단
- Feedback 작성/읽기 조건의 기본 행 접근 제한

## 5. RLS만으로 해결하기 어려운 것

RLS만으로 다음을 완전히 해결하기 어렵다.

- 컬럼 단위 마스킹
- 공개 페이지 전용 응답 조합
- 익명화된 Feedback 작성자 표시
- `share_token` 원문 전달/검증/로그 노출 통제
- 승인된 Change Card의 특정 컬럼만 수정 제한
- 공개 카드 그리드와 공개 Timeline의 안전한 필드 제한

따라서 공개 페이지와 공개 Timeline은 원천 테이블 직접 노출이 아니라 public-safe view, secure RPC, API 조합을 우선 검토해야 한다.

## 6. public-safe view / RPC / API 경계가 필요한 이유

공개 페이지는 여러 원천 객체를 조합한다.

- Project 공개 정보
- Builder 공개 Profile
- 공개 가능한 Problem/Hypothesis
- 승인됨 + 공개됨 + 민감도 일반 Change Card
- 공개 Feedback Request
- Builder가 공개 선택한 Feedback
- Project Link 후보

원천 테이블을 직접 열면 내부 식별자, 내부 상태, 원문, 민감 필드가 함께 노출될 수 있다. 공개 응답 경계는 이 위험을 줄이기 위한 계층이다.

## 7. 7.5 체크리스트 상태 보정 필요성

7.5단계는 시나리오를 문서화했다. 8단계는 RLS 초안을 작성했다. 8.5단계에서는 두 문서를 대조해 다음 상태를 부여한다.

- 확인됨: 테스트 케이스와 RLS 초안이 모두 존재함
- 부분 확인: 테스트 케이스는 있으나 구현 경계가 추가 검토 필요함
- 확인 필요: 테스트 케이스 또는 RLS 초안이 불충분함
- 후순위 제외: 1차 범위에서 제외됨
