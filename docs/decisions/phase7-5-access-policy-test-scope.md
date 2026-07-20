# 7.5단계 Access Policy Test Cases / RLS Scenario Readiness 범위 결정

## 1. 문서 목적

이 문서는 BuildMap 7.5단계에서 확정한 것과 보류한 것을 정리한다.

7.5단계는 실제 RLS SQL 작성 전, 7단계 Access Policy 문서가 허용/차단 시나리오에서 일관되게 작동하는지 자연어 테스트 케이스로 검증하는 단계다.

## 2. 확정한 것

- 7.5단계는 RLS SQL 작성 전 정책 테스트 케이스 문서화 단계다.
- 이번 단계의 테스트 케이스는 실제 테스트 코드가 아니라 자연어 시나리오 문서다.
- 아직 RLS SQL은 작성하지 않는다.
- 아직 `CREATE POLICY` 문은 작성하지 않는다.
- 링크 공개는 별도 시나리오 검증이 필요하다.
- Feedback은 1차에서 Feedback Request를 통해서만 생성한다.
- 비로그인 쓰기 권한은 1차에서 차단한다.
- 공개 Timeline 조건은 `Project 공개 정책 + Change Card 승인됨 + 공개됨 + 민감도 일반`이다.
- Rough Note와 AI Draft는 모든 공개 정책에서 제외한다.
- Project Owner 중심 권한 모델을 1차 기준으로 둔다.
- Change Card 작성자와 승인자는 개념상 분리하지만, 1차 승인 권한은 Project Owner 중심으로 둔다.
- 관리자 후보 권한은 1차 RLS SQL에서 제외한다.
- `public_slug`는 보안 토큰이 아니다.
- `share_token`은 링크 공개 접근 식별자 후보다.
- Feedback 내용은 기본 내부 검토용이며, Builder가 선택한 Feedback만 공개 가능하다.
- 비공개 Project에서는 공개 상태의 Change Card도 외부에 노출하지 않는다.

## 3. 보류한 것

- 실제 RLS SQL
- `CREATE POLICY` 문
- Supabase migration
- API route
- 자동화 테스트 코드
- 관리자 권한 구현
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- Feedback 작성자 동의 UX
- `share_token` 실제 생성/폐기 구현
- `public_slug` 실제 생성 정책
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식

## 4. 7.5단계 문서 위치

7.5단계 문서는 다음 위치에 있다.

```text
BuildMap/docs/access-policy-tests/
```

핵심 체크리스트는 다음이다.

```text
BuildMap/docs/access-policy-tests/rls-scenario-readiness-checklist.md
```

## 5. 8단계로 넘어가기 전 확인 질문

1. 8단계는 RLS SQL 초안 문서로 바로 갈 것인가, 아니면 migration readiness 보정 단계를 한 번 더 둘 것인가?
2. RLS SQL 초안 작성 시 7.5단계 Test Case ID를 정책 ID와 매핑할 것인가?
3. `public_slug`와 `share_token` 실제 필드 후보를 8단계에서 확정할 것인가?
4. Project Owner 외 Change Card 승인 Builder를 1차에서 완전히 제외할 것인가?
5. 공개 선택 Feedback의 작성자 표시 방식을 익명/표시명/역할 중 무엇으로 둘 것인가?
6. 링크 공개 Project의 Feedback 작성 조건을 `유효 share_token + 로그인 사용자 + 공개 Feedback Request`로 고정할 것인가?
7. 관리자 후보 권한을 RLS SQL 초안에서도 제외할 것인가?
8. RLS SQL 작성 후 이 테스트 케이스를 수동 검증 체크리스트로 재사용할 것인가?
