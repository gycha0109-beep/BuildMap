# 7단계 Access Policy 문서 README

> 본 문서는 BuildMap 7단계 문서다. 7단계는 실제 RLS SQL 작성 단계가 아니라, SQL 작성 전 권한/공개/접근 정책을 자연어로 고정하는 단계다. `docs/decisions/phase6-5-db-schema-corrections.md`를 최우선 기준으로 삼는다.

## 1. 7단계 문서의 목적

7단계의 목적은 BuildMap의 `Auth / Visibility / Access Policy / RLS Policy Design`을 문서화하는 것이다.

이번 단계에서는 다음 질문에 답한다.

- 누가 어떤 데이터를 볼 수 있는가?
- 누가 어떤 데이터를 만들 수 있는가?
- 누가 어떤 데이터를 수정하거나 보관할 수 있는가?
- 어떤 상태의 데이터가 공개 프로젝트 페이지와 공개 Timeline에 노출되는가?
- 링크 공개와 전체 공개는 어떻게 다른가?
- Rough Note, AI Draft, 내부 Feedback처럼 기본 비공개여야 하는 기록은 어떻게 보호할 것인가?
- 실제 RLS SQL 작성 전에 어떤 정책 조건을 반드시 고정해야 하는가?

BuildMap의 핵심은 판단 흐름 기록이다. 따라서 권한 정책은 단순한 공개/비공개 스위치가 아니라, `Project 공개 상태`, `Change Card 작업 상태`, `Change Card 공개 상태`, `민감도`, `작성자`, `승인자`, `Feedback 검토 상태`를 함께 고려해야 한다.

## 2. 6단계/6.5단계 문서와의 관계

6단계는 DB 스키마 초안 문서화 단계였다. 6.5단계는 DB 스키마 초안에서 권한/RLS 설계에 영향을 주는 모호함을 보정했다.

7단계는 6단계와 6.5단계를 바탕으로 실제 RLS SQL 작성 전에 권한 정책을 문서로 고정한다.

우선순위는 다음과 같다.

1. `docs/decisions/phase6-5-db-schema-corrections.md`
2. `docs/database/`의 6단계 DB 스키마 초안
3. `docs/decisions/phase5-5-data-model-corrections.md`
4. `docs/data-model/`의 5단계 제품 데이터 모델
5. 1~4단계 철학, 유즈케이스, 화면, 텍스트 와이어 문서

충돌이 있으면 6.5단계 보정 결정을 우선한다.

## 3. 이번 단계에서 다루는 범위

이번 단계에서 다루는 범위는 다음이다.

- 인증 원천과 앱 프로필의 책임 분리
- 사용자/Profile/Auth 구조
- Builder, Project Owner, Change Card 작성자/승인자, Feedback 작성자, Scout 성격 사용자 역할
- Project 공개 상태 정책
- Change Card 작업 상태, 공개 상태, 민감도 기반 접근 정책
- Rough Note와 AI Draft의 비공개 정책
- Problem Definition / Hypothesis 공개 정책
- Feedback Request / Feedback 접근 정책
- Public Project Page 접근 정책
- 링크 공개 정책
- RLS 정책 설계 초안
- 접근 정책 매트릭스
- RLS SQL 작성 전 체크리스트

## 4. 이번 단계에서 다루지 않는 범위

이번 단계에서는 다음을 하지 않는다.

- RLS SQL 작성
- `CREATE POLICY` 작성
- SQL 조건식 작성
- Supabase migration 작성
- API route 설계 또는 구현
- 프론트엔드 컴포넌트 생성
- 팀/조직 권한 확장
- 채용/헤드헌팅 권한 설계
- 결제 권한 설계
- 외부 GitHub/Notion 연동 권한 설계
- Project DNA, 역량 점수, AI 자동 평가 설계

## 5. 생성된 access-policy 문서 목록

| 문서 | 역할 |
|---|---|
| `auth-model.md` | 인증 원천, user profile, builder/scout profile 관계 |
| `user-profile-policy.md` | 사용자 프로필 접근 정책 |
| `role-and-ownership-policy.md` | 역할, 소유권, 작성자/승인자 정책 |
| `visibility-model.md` | 공개/비공개/민감도 모델 |
| `project-access-policy.md` | Project 접근 정책 |
| `change-card-access-policy.md` | Change Card 접근 정책 |
| `rough-note-and-ai-draft-access-policy.md` | Rough Note / AI Draft 비공개 정책 |
| `problem-hypothesis-access-policy.md` | Problem Definition / Hypothesis 접근 정책 |
| `feedback-access-policy.md` | Feedback Request / Feedback 접근 정책 |
| `public-project-page-access-policy.md` | Public Project Page 접근 정책 |
| `link-sharing-policy.md` | 링크 공개, public slug, share token 정책 |
| `rls-policy-design.md` | 자연어 기반 RLS 정책 설계 초안 |
| `access-policy-matrix.md` | 행위자와 객체별 권한 매트릭스 |
| `access-policy-risks.md` | 권한/공개/RLS 정책 위험과 대응 |
| `rls-readiness-checklist.md` | 실제 RLS SQL 작성 전 체크리스트 |

## 6. 읽는 순서

권장 읽기 순서는 다음이다.

1. `README.md`
2. `auth-model.md`
3. `visibility-model.md`
4. `role-and-ownership-policy.md`
5. `project-access-policy.md`
6. `change-card-access-policy.md`
7. `rough-note-and-ai-draft-access-policy.md`
8. `feedback-access-policy.md`
9. `public-project-page-access-policy.md`
10. `link-sharing-policy.md`
11. `rls-policy-design.md`
12. `access-policy-matrix.md`
13. `rls-readiness-checklist.md`

## 7. 7단계의 핵심 결론

7단계의 핵심 결론은 다음이다.

- 인증 원천은 `auth.users`로 보고, 앱 사용자 표시 정보와 Builder 역할 데이터는 분리한다.
- Project 공개 상태와 Change Card 공개 상태를 함께 고려해야 외부 노출 여부가 결정된다.
- `공개 가능`은 `공개됨`이 아니다.
- `민감 정보 포함`은 공개 상태가 아니라 민감도 플래그다.
- Rough Note와 AI Draft는 공개되지 않는 내부 기록이다.
- Change Card는 `승인됨 + 공개됨 + 민감 정보 없음` 조건을 만족하고 Project 공개 정책도 만족할 때만 공개 Timeline에 노출된다.
- Feedback Request는 공개될 수 있지만 Feedback 내용은 기본 내부 검토용이다.
- Feedback은 1차에서 반드시 Feedback Request를 통해 생성한다.
- 링크 공개와 전체 공개는 다르다. `public_slug`는 보안 토큰이 아니며, `share_token`은 링크 공개 접근 식별자 후보다.
- 7단계는 RLS SQL 작성이 아니라 정책 문서화 단계다.

> RLS SQL 작성 전에는 `docs/access-policy-tests/` 문서를 먼저 확인한다.
