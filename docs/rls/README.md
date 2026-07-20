# 8단계 RLS SQL 초안 문서

## 1. 8단계 문서의 목적

8단계는 BuildMap의 실제 Supabase migration 작성 전에 RLS 정책 SQL 초안을 문서화하는 단계다. 이 단계의 산출물은 실행용 SQL이 아니라 검토용 초안이다.

이번 단계의 목적은 다음이다.

- 7단계 Access Policy 문서를 RLS 정책 후보로 번역한다.
- 7.5단계 Access Policy Test Case ID를 RLS Policy ID와 연결한다.
- 공개/비공개, 링크 공개, 민감도, Owner 권한, Feedback Request 기반 작성 조건을 SQL 초안 수준에서 검토한다.
- 실제 migration 전에 helper function 후보와 미해결 보안 위험을 드러낸다.

## 2. 7단계/7.5단계 문서와의 관계

8단계는 다음 문서를 최우선 기준으로 삼는다.

1. `docs/decisions/phase7-5-access-policy-test-scope.md`
2. `docs/decisions/phase7-auth-visibility-access-policy-scope.md`
3. `docs/decisions/phase6-5-db-schema-corrections.md`

기존 문서가 충돌하는 경우에는 7.5단계 테스트 케이스, 7단계 Access Policy, 6.5단계 보정 문서를 우선한다.

## 3. 이번 단계에서 다루는 범위

- RLS Policy ID 후보
- RLS 정책명 후보
- 검토용 RLS SQL 초안
- 7.5 Test Case ID와 정책 매핑
- 객체별 read/insert/update 정책 후보
- helper function 후보
- link sharing 위험과 검토 지점
- RLS 리뷰 체크리스트

## 4. 이번 단계에서 다루지 않는 범위

- 실제 Supabase migration
- 실제 DB 적용
- Supabase 프로젝트 연결
- API route 설계 또는 구현
- 프론트엔드 컴포넌트 구현
- 자동화 테스트 코드
- 관리자 권한 구현
- 팀/공동 편집/조직 권한
- 비로그인 Feedback 작성
- 채용/헤드헌팅, 결제, 외부 연동

## 5. 생성된 RLS 초안 문서 목록

| 문서 | 역할 |
|---|---|
| `rls-draft-overview.md` | RLS 초안 전체 개요와 보호 대상 |
| `rls-naming-conventions.md` | 정책명, Policy ID, helper 후보 명명 규칙 |
| `rls-policy-id-mapping.md` | 7단계 자연어 Policy ID와 8단계 RLS 초안 매핑 |
| `rls-test-case-mapping.md` | 7.5 Test Case ID와 RLS 정책 후보 매핑 |
| `profile-rls-draft.md` | user profile / builder profile 정책 초안 |
| `project-rls-draft.md` | Project / Project Link 정책 초안 |
| `problem-hypothesis-rls-draft.md` | Problem Definition / Hypothesis 정책 초안 |
| `rough-note-ai-draft-rls-draft.md` | Rough Note / AI Draft 비공개 정책 초안 |
| `change-card-rls-draft.md` | Change Card 핵심 정책 초안 |
| `feedback-rls-draft.md` | Feedback Request / Feedback 정책 초안 |
| `public-project-page-rls-draft.md` | 공개 프로젝트 페이지 파생 뷰 정책 조합 |
| `link-sharing-rls-draft.md` | share_token / public_slug 링크 공개 정책 초안 |
| `rls-helper-function-candidates.md` | RLS helper function 후보 |
| `rls-review-checklist.md` | RLS 초안 리뷰 체크리스트 |
| `rls-known-limitations.md` | 8단계 초안의 한계와 후속 검토 사항 |

## 6. 읽는 순서


1. `README.md`
2. `rls-draft-overview.md`
3. `rls-naming-conventions.md`
4. `rls-policy-id-mapping.md`
5. `rls-test-case-mapping.md`
6. 객체별 RLS 초안 문서
7. `link-sharing-rls-draft.md`
8. `rls-helper-function-candidates.md`
9. `rls-review-checklist.md`
10. `rls-known-limitations.md`
11. `docs/decisions/phase8-rls-sql-draft-scope.md`


## 7. 8단계의 핵심 결론

- RLS 초안은 7.5단계 테스트 케이스와 정책 ID를 매핑해야 한다.
- 공개 Timeline 조건은 `Project 공개 정책 + Change Card 승인됨 + 공개됨 + 민감도 일반`이다.
- Rough Note와 AI Draft는 모든 공개 정책에서 제외한다.
- Feedback은 반드시 Feedback Request를 통해 생성한다.
- 링크 공개 Feedback 작성은 `유효 share_token + 로그인 사용자 + 공개 Feedback Request` 조건을 요구한다.
- `public_slug`는 보안 토큰이 아니다.
- `share_token`은 링크 공개 접근 식별자 후보다.
- 관리자 후보 권한은 1차 RLS SQL 초안에서 제외한다.

> 9단계 Supabase migration draft로 넘어가기 전에는 `docs/rls-security/README.md`와 `docs/decisions/phase8-5-rls-security-corrections.md`를 먼저 확인한다.

## 9단계 migration draft 안내

9단계 migration draft는 `docs/migration-draft/README.md`에서 확인한다. 9단계는 실제 migration 파일 작성이 아니라 문서 안의 검토용 SQL 초안 작성 단계다.

