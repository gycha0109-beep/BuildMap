# 8단계 RLS SQL 초안 범위 결정

## 1. 문서 목적

이 문서는 BuildMap 8단계에서 확정한 것과 보류한 것을 정리한다.

8단계는 실제 migration 작성이 아니라, RLS SQL 초안을 문서화하고 7.5단계 테스트 케이스와 매핑하는 단계다.

## 2. 확정한 것

- 8단계는 RLS SQL 초안 문서화 단계다.
- 실제 migration은 아직 작성하지 않는다.
- Supabase에 적용하지 않는다.
- 7.5단계 테스트 케이스를 RLS 정책 초안과 매핑한다.
- Feedback 작성 조건에는 Project 접근 조건을 포함한다.
- 링크 공개 Project의 Feedback 작성은 유효 share_token + 로그인 사용자 + 공개 Feedback Request 조건을 모두 요구한다.
- 공개 선택 Feedback 작성자 표시는 1차에서 익명 또는 역할/맥락 표시로 둔다.
- 관리자 후보 권한은 1차 RLS SQL 초안에서 제외한다.
- public_slug는 보안 토큰이 아니다.
- share_token은 링크 공개 접근 식별자 후보다.
- Rough Note와 AI Draft는 모든 공개 정책에서 제외한다.
- 공개 Timeline 조건은 Project 공개 정책 + Change Card 승인됨 + 공개됨 + 민감도 일반이다.
- Project Owner 중심 권한 모델을 1차 기준으로 유지한다.
- Change Card 작성 Builder와 승인 Builder는 개념상 분리하지만, 승인 권한은 1차에서 Project Owner 중심으로 둔다.

## 3. 보류한 것

- 실제 Supabase migration
- 실제 CREATE POLICY 최종본
- 실제 helper function 생성
- share_token 최종 저장/검증 방식
- token hash 저장 여부
- public_slug 실제 생성 정책
- API route
- 자동화 테스트 코드
- 관리자 권한
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- Feedback 작성자 동의 UX
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식

## 4. 8단계 문서 위치

8단계 문서는 다음 위치에 있다.

```text
BuildMap/docs/rls/
```

핵심 시작 문서는 다음이다.

```text
BuildMap/docs/rls/README.md
BuildMap/docs/rls/rls-test-case-mapping.md
BuildMap/docs/rls/rls-review-checklist.md
BuildMap/docs/rls/rls-known-limitations.md
```

## 5. 9단계로 넘어가기 전 확인 질문

1. 9단계로 바로 Supabase migration draft를 작성할 것인가, 8.5단계 RLS 보안 보정을 먼저 둘 것인가?
2. share_token 검증은 RLS helper, RPC, API 계층 중 어디에서 처리할 것인가?
3. token 원문 저장을 금지하고 hash 저장 후보로 갈 것인가?
4. public_slug와 share_token 실제 필드명을 확정할 것인가?
5. user_profiles와 builder_profiles의 실제 테이블명과 관계를 확정할 것인가?
6. 공개 페이지용 view를 만들 것인가, API에서 원천 테이블을 조합할 것인가?
7. 승인된 Change Card 수정 제한을 DB 정책으로 둘 것인가, 애플리케이션 정책으로 둘 것인가?
8. RLS SQL 초안을 7.5 테스트 케이스로 수동 검증하는 체크리스트를 별도로 만들 것인가?
