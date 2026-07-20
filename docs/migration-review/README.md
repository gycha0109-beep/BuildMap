# 10단계 Supabase Migration Syntax / Security Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 10단계 문서의 목적

10단계는 9단계 `docs/migration-draft/`에 작성된 Supabase migration draft를 실제 migration 파일로 옮기기 전에 문법, 보안, 정책 정합성, Supabase/PostgreSQL 동작 위험을 검수하는 단계다.

이번 단계의 목적은 다음이다.

- 9단계 SQL 초안의 문법상 위험을 식별한다.
- RLS 정책 초안의 `USING` / `WITH CHECK` 책임을 검토한다.
- public-safe view, secure RPC, helper function, trigger 후보의 보안 경계를 검토한다.
- `share_token_hash`, 공개 응답 컬럼 제한, Feedback 작성자 위조 방지, 승인된 Change Card 수정 제한을 실제 migration 전 보정 목록으로 정리한다.
- 7.5단계 Test Case ID와 9단계 migration draft의 매핑 상태를 확인한다.

## 2. 9단계 migration draft와의 관계

10단계는 9단계 draft를 폐기하지 않는다. 9단계의 다음 결론을 유지한다.

- 실제 migration 파일은 아직 만들지 않는다.
- SQL은 문서 안의 검토용 초안으로만 다룬다.
- `share_token` 원문 저장은 금지한다.
- `share_token_hash` 후보를 유지한다.
- 전체 공개 데이터는 public-safe view 후보를 우선 검토한다.
- 링크 공개 데이터는 secure RPC 후보를 우선 검토한다.
- 원천 테이블의 넓은 `anon` select는 피한다.
- Project Owner 중심 권한 모델을 유지한다.

## 3. 8.5단계 RLS Security Correction과의 관계

8.5단계 결정은 10단계 검수의 핵심 기준이다. 특히 다음 원칙은 변경하지 않는다.

- RLS는 row-level 접근 제어이며 컬럼 마스킹을 자동으로 해결하지 않는다.
- 공개 페이지와 공개 Timeline은 원천 row 전체를 직접 노출하지 않는다.
- `public_slug`는 보안 토큰이 아니다.
- 링크 공개는 `share_token_hash` 검증 후보를 전제로 한다.
- 공개 Feedback에서도 내부 사용자 식별자는 노출하지 않는다.

## 4. 이번 단계에서 다루는 범위

- 문서 안 SQL 초안 문법 검수
- schema draft 정합성 검수
- RLS policy syntax / security 검수
- public-safe view / secure RPC 보안 검수
- helper function / trigger / constraint 후보 검수
- Feedback integrity, Change Card mutation boundary 검수
- 7.5 Test Case ID 매핑 검수
- migration draft corrections 및 Go / No-Go 판단

## 5. 이번 단계에서 다루지 않는 범위

- 실제 `.sql` migration 파일 작성
- `supabase/migrations` 디렉터리 생성
- Supabase CLI 실행
- DB 연결 및 SQL 실행
- 실제 RLS policy, helper function, RPC, view, trigger 생성
- API route, 프론트엔드, 자동화 테스트 코드 구현
- 관리자/팀/조직 권한
- 비로그인 피드백
- Save / Follow, Activity Signal, Decision Diff Snapshot

## 6. 생성된 migration review 문서 목록

| 문서 | 역할 |
|---|---|
| `review-overview.md` | 전체 검수 개요와 Go / Conditional Go / No-Go 기준 |
| `official-docs-verification-notes.md` | Supabase/PostgreSQL 공식 문서 재검증 항목 |
| `sql-syntax-review.md` | SQL 초안 전반의 문법 검수 |
| `schema-draft-review.md` | schema draft 검수 |
| `rls-policy-syntax-review.md` | RLS policy syntax / security 검수 |
| `public-safe-view-security-review.md` | public-safe view 보안 검수 |
| `secure-rpc-security-review.md` | secure RPC 보안 검수 |
| `share-token-hash-review.md` | `share_token_hash` 방식 검수 |
| `helper-function-review.md` | helper function 후보 검수 |
| `trigger-constraint-review.md` | trigger / constraint 후보 검수 |
| `feedback-integrity-review.md` | Feedback 무결성 검수 |
| `change-card-mutation-review.md` | 승인된 Change Card 수정 제한 검수 |
| `manual-test-mapping-review.md` | 7.5 Test Case ID 매핑 검수 |
| `migration-draft-corrections.md` | 11단계 전 보정 목록 |
| `go-no-go-checklist.md` | 실제 migration 파일 작성 전 Go / No-Go 체크리스트 |
| `docs/decisions/phase10-migration-syntax-security-review-scope.md` | 10단계 확정/보류 결정 |

## 7. 읽는 순서

1. `README.md`
2. `review-overview.md`
3. `official-docs-verification-notes.md`
4. `sql-syntax-review.md`
5. `schema-draft-review.md`
6. `rls-policy-syntax-review.md`
7. `public-safe-view-security-review.md`
8. `secure-rpc-security-review.md`
9. `share-token-hash-review.md`
10. `feedback-integrity-review.md`
11. `change-card-mutation-review.md`
12. `migration-draft-corrections.md`
13. `go-no-go-checklist.md`
14. `docs/decisions/phase10-migration-syntax-security-review-scope.md`

## 8. 10단계의 핵심 결론

10단계의 결론은 **Conditional Go**다.

실제 migration 파일 작성 단계로 넘어갈 수는 있으나, 다음 항목은 11단계 시작 전에 반드시 보정하거나 적용 전 공식 문서 기준으로 재검증해야 한다.

- `share_token_hash` 알고리즘과 검증 위치
- public-safe view의 `security_invoker`, grant, RLS 동작
- secure RPC의 `SECURITY DEFINER`, `search_path`, execute grant
- Feedback 작성자 위조 방지 조건
- 승인된 Change Card 수정 제한 trigger 또는 application validation 경계
- 7.5 Test Case ID 전체 매핑 보강


## 11단계 SQL draft 안내

11단계 draft 파일은 `supabase/migrations_draft/`에 있으며 실제 적용 금지 대상이다. 정식 `supabase/migrations`로 이동하거나 Supabase CLI로 실행하지 않는다.
