# BuildMap 12단계 - Supabase Migration Draft Static Review / Dry-run Preparation

## 12단계 문서의 목적

12단계는 11단계에서 생성한 `supabase/migrations_draft` SQL draft를 실제로 실행하기 전, **정적 검수와 local dry-run 준비 상태**를 문서화하는 단계다.

이번 단계는 실행 단계가 아니다. SQL 파일을 Supabase에 적용하지 않고, Supabase CLI도 실행하지 않는다. 목적은 dry-run 전에 예상되는 실패, 보안 경계, 권한 모델, 테스트 매핑 누락을 정리하는 것이다.

## 11단계 SQL file draft와의 관계

11단계는 검토용 SQL 파일을 `supabase/migrations_draft/`에 생성했다. 12단계는 그 파일들을 대상으로 다음을 검수한다.

- SQL draft 파일별 역할과 의존성
- public-safe view의 접근 모델
- `SECURITY DEFINER` RPC의 권한/반환 경계
- helper function의 `EXECUTE` 노출 위험
- `feedback_requests.change_card_id`와 `project_id` 정합성
- Feedback 작성자 위조 방지
- 승인된 Change Card 사후 조작 위험
- 7.5 Test Case ID 매핑 누락

## 10단계 migration review와의 관계

10단계가 문법/보안 검수 방향을 문서화했다면, 12단계는 11단계 SQL file draft를 대상으로 dry-run 직전의 구체 체크리스트와 예상 실패 카탈로그를 만든다.

## 이번 단계에서 다루는 범위

- SQL draft 정적 검수
- local dry-run 준비 계획
- dry-run 명령 계획 문서화
- 예상 실패 목록 정리
- 보정 후보 정리
- Go / Conditional Go / No-Go 판단

## 이번 단계에서 다루지 않는 범위

- 실제 SQL 실행
- Supabase CLI 실행
- `supabase db lint` 실행
- local dry-run 실행
- 정식 `supabase/migrations` 이동
- remote Supabase 적용
- API route, 프론트엔드, 자동화 테스트 구현

## 생성된 문서 목록

- `static-review-overview.md`
- `sql-draft-inventory.md`
- `public-safe-view-access-model-review.md`
- `function-execute-permission-review.md`
- `secure-rpc-template-review.md`
- `helper-function-exposure-review.md`
- `share-token-dry-run-review.md`
- `feedback-request-consistency-review.md`
- `feedback-author-integrity-review.md`
- `change-card-approval-integrity-review.md`
- `rls-using-with-check-review.md`
- `test-case-mapping-gap-review.md`
- `local-dry-run-preparation-plan.md`
- `dry-run-command-plan.md`
- `expected-failure-catalog.md`
- `migration-draft-adjustment-plan.md`
- `go-no-go-before-dry-run.md`
- `docs/decisions/phase12-migration-static-review-dry-run-prep-scope.md`

## 읽는 순서

1. `static-review-overview.md`
2. `sql-draft-inventory.md`
3. `public-safe-view-access-model-review.md`
4. `function-execute-permission-review.md`
5. `secure-rpc-template-review.md`
6. `helper-function-exposure-review.md`
7. `feedback-request-consistency-review.md`
8. `feedback-author-integrity-review.md`
9. `change-card-approval-integrity-review.md`
10. `test-case-mapping-gap-review.md`
11. `local-dry-run-preparation-plan.md`
12. `dry-run-command-plan.md`
13. `expected-failure-catalog.md`
14. `migration-draft-adjustment-plan.md`
15. `go-no-go-before-dry-run.md`

## 12단계 핵심 결론

13단계 local dry-run은 **Conditional Go**다. 단, dry-run 전에 다음 보정은 반드시 반영하거나 실험 항목으로 고정해야 한다.

- public-safe view의 `security_invoker`와 source table grant/RLS 충돌 검증
- helper/RPC function의 `PUBLIC EXECUTE` 위험 정리
- `SECURITY DEFINER` RPC의 `search_path`, grant, 반환 컬럼 제한 검증
- `feedback_requests.change_card_id`와 `project_id` 정합성 보정 후보 정리
- approved Change Card의 `approved_at`, `approved_by_builder_profile_id`, `work_status` 사후 조작 차단 후보 정리
- 7.5 Test Case ID 매핑 보강

## 적용 금지

`supabase/migrations_draft`의 SQL 파일은 계속 draft다. 이 단계 이후에도 정식 migration으로 이동하거나 Supabase에 적용하지 않는다.
