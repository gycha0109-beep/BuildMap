# 7.5단계 Access Policy Test Cases / RLS Scenario Readiness README

## 1. 7.5단계 문서의 목적

7.5단계의 목적은 BuildMap 7단계에서 문서화한 `Auth / Visibility / Access Policy / RLS Policy Design`을 실제 RLS SQL 작성 전에 시나리오 단위로 검증하는 것이다.

이번 단계의 테스트 케이스는 자동화 테스트 코드가 아니다. 자연어로 작성된 정책 검증 문서이며, 이후 RLS SQL과 migration을 작성할 때 “허용해야 하는 상황”과 “차단해야 하는 상황”을 놓치지 않기 위한 기준선이다.

핵심 질문은 다음이다.

- 누가 어떤 상태의 Project를 읽을 수 있는가?
- 링크 공개 Project는 `share_token` 조건을 제대로 요구하는가?
- 공개 Timeline은 승인됨 + 공개됨 + 민감도 일반 Change Card만 노출하는가?
- Rough Note와 AI Draft가 모든 공개 정책에서 제외되는가?
- Feedback은 반드시 Feedback Request를 통해서만 생성되는가?
- 비로그인 사용자의 쓰기 권한이 1차에서 차단되는가?
- Project Owner 중심 권한 모델이 일관되게 유지되는가?

## 2. 7단계 Access Policy 문서와의 관계

7단계는 권한 정책을 자연어로 설계한 단계다. 7.5단계는 그 정책을 테스트 케이스로 검증한다.

우선순위는 다음과 같다.

1. `docs/decisions/phase6-5-db-schema-corrections.md`
2. `docs/decisions/phase7-auth-visibility-access-policy-scope.md`
3. `docs/access-policy/`
4. `docs/database/`
5. 이전 제품/화면/데이터 모델 문서

충돌이 있으면 6.5단계 보정 문서와 7단계 Access Policy 문서를 우선한다.

## 3. 이번 단계에서 다루는 범위

- 정책 테스트 케이스 표준 형식
- 행위자와 기본 전제
- Project 접근 시나리오
- 링크 공개 시나리오
- Change Card 공개 Timeline 시나리오
- Rough Note / AI Draft 비공개 시나리오
- Problem / Hypothesis 접근 시나리오
- Feedback Request / Feedback 시나리오
- Public Project Page 파생 뷰 시나리오
- Owner / Approval 권한 시나리오
- Access Policy Matrix 보정
- RLS SQL 작성 전 시나리오 체크리스트

## 4. 이번 단계에서 다루지 않는 범위

이번 단계에서는 다음을 하지 않는다.

- RLS SQL 작성
- `CREATE POLICY` 작성
- `USING`, `WITH CHECK` 조건식 작성
- Supabase migration 작성
- Supabase 프로젝트 연결
- API route 설계 또는 구현
- 프론트엔드 컴포넌트 생성
- 자동화 테스트 코드 작성
- 테스트 프레임워크 도입
- 관리자 권한 구현
- 팀/조직/공동 편집 권한 확장
- 비로그인 피드백 허용

## 5. 생성된 테스트 케이스 문서 목록

| 문서 | 역할 |
|---|---|
| `test-case-format.md` | 테스트 케이스 표준 형식과 기대 결과 정의 |
| `actors-and-assumptions.md` | 행위자 정의와 1차 권한 전제 |
| `project-access-test-cases.md` | Project 읽기/수정/공개 상태 테스트 |
| `link-sharing-test-cases.md` | 링크 공개, `share_token`, `public_slug` 테스트 |
| `change-card-access-test-cases.md` | Change Card 공개 Timeline 조건 테스트 |
| `rough-note-ai-draft-test-cases.md` | Rough Note / AI Draft 비공개 테스트 |
| `problem-hypothesis-test-cases.md` | Problem / Hypothesis 접근 테스트 |
| `feedback-test-cases.md` | Feedback Request / Feedback 테스트 |
| `public-project-page-test-cases.md` | 공개 프로젝트 페이지 파생 뷰 테스트 |
| `owner-approval-test-cases.md` | 소유자/작성자/승인자 권한 테스트 |
| `access-policy-matrix-corrections.md` | 7단계 매트릭스의 보수적 보정안 |
| `rls-scenario-readiness-checklist.md` | 실제 RLS SQL 작성 전 체크리스트 |

## 6. 읽는 순서

1. `README.md`
2. `test-case-format.md`
3. `actors-and-assumptions.md`
4. `project-access-test-cases.md`
5. `link-sharing-test-cases.md`
6. `change-card-access-test-cases.md`
7. `rough-note-ai-draft-test-cases.md`
8. `feedback-test-cases.md`
9. `public-project-page-test-cases.md`
10. `owner-approval-test-cases.md`
11. `access-policy-matrix-corrections.md`
12. `rls-scenario-readiness-checklist.md`

## 7. 7.5단계의 핵심 결론

- 8단계에서 바로 SQL로 들어가기 전에 정책 테스트 케이스가 필요하다.
- 공개 Timeline 조건은 `Project 공개 정책 + Change Card 승인됨 + 공개됨 + 민감도 일반`로 검증한다.
- `공개 가능`과 `공개됨`은 반드시 별도 테스트한다.
- `민감 정보 포함`은 공개 상태가 아니라 별도 차단 조건으로 검증한다.
- 링크 공개는 `share_token` 유효성, 폐기, 재발급, Project 공개 상태 변경을 모두 테스트해야 한다.
- Rough Note와 AI Draft는 공개 정책에서 완전히 제외한다.
- Feedback은 1차에서 Feedback Request를 통해서만 생성한다.
- Project Owner 중심 권한 모델을 1차 기준으로 유지한다.
- 관리자 후보 권한은 1차 RLS SQL에 포함하지 않는 방향을 우선한다.

## 8단계 RLS SQL 초안 안내

RLS SQL 초안은 `docs/rls/` 문서를 확인한다. 7.5단계 테스트 케이스는 8단계에서 RLS Policy ID와 매핑된다.
