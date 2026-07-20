# 7단계 Auth / Visibility / Access Policy / RLS Policy Design 범위 결정

## 1. 문서 목적

이 문서는 BuildMap 7단계에서 확정한 것과 보류한 것을 정리한다.

7단계는 실제 RLS SQL 작성 단계가 아니다. 6.5단계 DB 스키마 보정 문서를 최우선 기준으로 삼아 Auth, Visibility, Access Policy, RLS Policy Design을 자연어 정책 문서로 고정하는 단계다.

## 2. 확정한 것

- 7단계는 `Auth / Visibility / Access Policy / RLS Policy Design` 문서화 단계다.
- 아직 RLS SQL은 작성하지 않는다.
- 6.5단계 보정 문서가 7단계의 최우선 기준이다.
- `auth.users`와 앱 사용자 profile, Builder Profile의 책임을 분리한다.
- Change Card 공개 상태와 민감도는 분리한다.
- Project 공개 상태와 Change Card 공개 상태를 함께 고려한다.
- 링크 공개와 전체 공개는 다른 정책이다.
- `public_slug`와 `share_token`은 목적이 다르다.
- Rough Note와 AI Draft는 기본 비공개다.
- AI Draft는 공식 기록이 아니라 Change Card 후보 초안이다.
- Feedback은 Feedback Request를 통해 생성한다.
- Feedback 내용은 기본 내부 검토용이다.
- 공개 Timeline은 승인됨 + 공개됨 + 민감 정보 없음 Change Card만 노출하는 방향을 기본으로 한다.
- Project가 비공개이면 외부에는 공개 Change Card도 노출하지 않는다.
- 비로그인 쓰기 권한은 1차에서 제외한다.
- Public Project Page는 Project의 공개 뷰이며, 원천 데이터의 공개 조건을 초과하지 않는다.
- Feedback Request는 공개 가능하지만 Feedback 내용은 별도 공개 선택 정책을 따른다.

## 3. 보류한 것

- 실제 RLS SQL
- `CREATE POLICY` 문
- Supabase migration
- API route
- 세부 관리자 기능
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식
- public_slug / share_token 실제 필드명
- share_token 생성 알고리즘
- Rough Note 수정 이력 테이블
- Change Card 원문 스냅샷 필드

## 4. 7단계 문서의 위치

7단계 문서는 다음 위치에 있다.

```text
BuildMap/docs/access-policy/
```

핵심 결정 문서는 다음이다.

```text
BuildMap/docs/decisions/phase7-auth-visibility-access-policy-scope.md
```

## 5. 8단계로 넘어가기 전 확인 질문

1. 8단계는 실제 RLS SQL 문서 초안으로 갈 것인가, 아니면 migration readiness 보정 단계를 한 번 더 둘 것인가?
2. `public_slug`와 `share_token`을 실제 DB 필드 후보로 확정할 것인가?
3. Change Card 공개 조건을 `승인됨 + 공개됨 + 민감도 일반`으로 고정해도 되는가?
4. Rough Note와 AI Draft는 모든 공개 정책에서 완전히 제외해도 되는가?
5. Feedback 공개 선택 시 작성자 동의 또는 익명 표시 정책이 필요한가?
6. Project Owner 외 승인 Builder를 1차에서 실제로 둘 것인가, 후보로만 남길 것인가?
7. 관리자 후보 권한을 RLS SQL 단계에 포함할 것인가, 완전히 후순위로 둘 것인가?
8. 비로그인 방문자의 읽기 권한은 공개 페이지와 공개 Timeline으로만 제한해도 되는가?
9. 링크 공개 Project의 Feedback Request에 로그인 사용자가 Feedback을 작성할 수 있게 할 것인가?
10. 실제 RLS SQL 작성 전에 정책별 테스트 케이스 문서를 먼저 만들 것인가?
