# 9단계 Supabase Migration Draft

## 1. 9단계 문서의 목적

9단계는 BuildMap의 8단계 RLS SQL 초안과 8.5단계 RLS Security Correction 결정을 바탕으로 실제 Supabase migration 파일을 작성하기 전에 migration draft를 문서화하는 단계다.

이번 단계의 목적은 다음을 migration 작성 순서 관점에서 정리하는 것이다.

- 1차 테이블 후보
- 필드 후보
- 상태값 저장 방식 후보
- foreign key / check constraint 후보
- RLS policy 후보
- public-safe view 후보
- secure RPC 후보
- helper function 후보
- trigger / constraint 후보
- index 후보
- 수동 검증 계획

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 2. 8단계/8.5단계 문서와의 관계

9단계는 다음 문서를 우선 입력으로 삼는다.

1. `docs/decisions/phase8-5-rls-security-corrections.md`
2. `docs/decisions/phase8-rls-sql-draft-scope.md`
3. `docs/decisions/phase7-5-access-policy-test-scope.md`
4. `docs/decisions/phase7-auth-visibility-access-policy-scope.md`
5. `docs/decisions/phase6-5-db-schema-corrections.md`

특히 8.5단계에서 확정한 다음 원칙을 migration draft 전반에 반영한다.

- `share_token` 원문 저장 금지
- `share_token_hash` 후보 포함
- 링크 공개 데이터는 secure RPC 후보 우선 검토
- 전체 공개 데이터는 public-safe view 후보 우선 검토
- 공개 응답에서 원천 row 전체 노출 금지
- Feedback 작성자 위조 방지
- 승인된 Change Card 본문/근거/판단 직접 수정 제한 후보 포함

## 3. 이번 단계에서 다루는 범위

- 문서 안의 SQL 초안
- table / field / check constraint / foreign key 후보
- public-safe view 후보
- secure RPC 후보
- helper function 후보
- RLS policy 후보
- trigger / index 후보
- manual verification plan

## 4. 이번 단계에서 다루지 않는 범위

- 실제 `.sql` migration 파일 생성
- `supabase/migrations` 디렉터리 생성
- Supabase CLI 실행
- Supabase 프로젝트 연결
- DB에 SQL 실행
- 실제 정책 적용
- API route 설계 또는 구현
- 프론트엔드 구현
- 자동화 테스트 코드
- 관리자/팀/조직/공동 편집 권한
- 비로그인 피드백
- Save / Follow, Activity Signal, Decision Diff Snapshot

## 5. 생성된 migration draft 문서 목록

| 문서 | 역할 |
|---|---|
| `migration-draft-overview.md` | 전체 migration draft 개요 |
| `migration-boundaries.md` | 9단계에서 허용/금지되는 작업 경계 |
| `migration-order-draft.md` | migration 적용 순서 후보 |
| `schema-primitives-draft.md` | uuid, timestamp, status 저장 방식, 공통 trigger 후보 |
| `profile-schema-migration-draft.md` | user/profile/builder profile schema 초안 |
| `project-schema-migration-draft.md` | projects schema 초안 |
| `problem-hypothesis-schema-migration-draft.md` | problem/hypothesis schema 초안 |
| `rough-note-ai-draft-schema-migration-draft.md` | rough note / AI draft schema 초안 |
| `change-card-schema-migration-draft.md` | Change Card 핵심 schema 초안 |
| `feedback-schema-migration-draft.md` | Feedback Request / Feedback schema 초안 |
| `project-link-schema-migration-draft.md` | Project Link schema 초안 |
| `public-safe-view-migration-draft.md` | public-safe view 후보 |
| `link-sharing-rpc-migration-draft.md` | link sharing secure RPC 후보 |
| `rls-policy-migration-draft.md` | RLS policy migration draft |
| `helper-function-migration-draft.md` | helper function 후보 |
| `trigger-and-constraint-migration-draft.md` | trigger / constraint 후보 |
| `index-and-performance-notes.md` | index / performance 후보 |
| `manual-verification-plan.md` | 수동 검증 계획 |
| `migration-known-risks.md` | 알려진 위험과 대응 |
| `migration-readiness-checklist.md` | 실제 migration 파일 작성 전 체크리스트 |

## 6. 읽는 순서

1. `README.md`
2. `migration-draft-overview.md`
3. `migration-boundaries.md`
4. `migration-order-draft.md`
5. `schema-primitives-draft.md`
6. schema별 migration draft 문서
7. `public-safe-view-migration-draft.md`
8. `link-sharing-rpc-migration-draft.md`
9. `rls-policy-migration-draft.md`
10. `helper-function-migration-draft.md`
11. `trigger-and-constraint-migration-draft.md`
12. `manual-verification-plan.md`
13. `migration-known-risks.md`
14. `migration-readiness-checklist.md`
15. `docs/decisions/phase9-supabase-migration-draft-scope.md`

## 7. 9단계의 핵심 결론

9단계의 핵심 결론은 다음이다.

- 실제 migration은 아직 만들지 않는다.
- SQL은 문서 안의 검토용 초안으로만 작성한다.
- `share_token` 원문 저장은 금지한다.
- `share_token_hash` 후보를 migration draft에 포함한다.
- 전체 공개 응답은 public-safe view 후보를 우선한다.
- 링크 공개 응답은 secure RPC 후보를 우선한다.
- 원천 테이블에 대한 넓은 anon select는 피한다.
- 공개 Feedback 원천 row 전체 직접 노출을 금지한다.
- Project Owner 중심 권한 모델을 유지한다.


## 8. 실제 migration 파일 작성 전 검수

실제 migration 파일 작성 전에는 `docs/migration-review/` 문서를 먼저 확인한다. 10단계 문서는 9단계 SQL 초안, RLS 초안, public-safe view 후보, secure RPC 후보, helper/trigger 후보를 문법과 보안 관점에서 검수한다.


## 11단계 file draft 이후 적용 금지

11단계에서 `supabase/migrations_draft/`에 SQL draft 파일이 생성되더라도 실제 Supabase 적용은 계속 금지한다. 실제 적용 전 문법 검증, local dry-run, advisor 검증, 수동 테스트가 필요하다.
