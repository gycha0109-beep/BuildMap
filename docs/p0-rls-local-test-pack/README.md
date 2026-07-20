# BuildMap 19단계 P0 RLS Local Test Pack

## 19단계 목적

19단계는 사용자가 로컬 PC에서 직접 실행한 18단계 `auth.uid()` actor simulation PASS 결과를 반영하고, 20단계에서 local-only P0 RLS 검증을 실행할 수 있도록 문서와 SQL/PowerShell script 후보를 제공하는 단계다.

## 18단계 PASS와의 관계

후속 RLS 테스트는 `auth.uid()` actor simulation이 동작한다는 전제 위에서만 의미가 있다. 사용자가 제공한 결과에 따라 Method A `request.jwt.claim.sub`를 기본 방식으로 채택하고, Method B `request.jwt.claims` JSON은 fallback으로 유지한다.

## 이번 단계에서 실행하지 않은 것

- Codex는 Supabase CLI, Docker, psql, SQL을 실행하지 않았다.
- Codex는 local DB에 seed를 넣지 않았다.
- Codex는 RLS 테스트, RPC 호출, view 조회, trigger 테스트를 실행하지 않았다.
- remote Supabase, staging, production DB에는 접근하지 않았다.
- 정식 `supabase/migrations` 승격은 하지 않았다.

## 생성 문서 목록

1. `pack-overview.md`
2. `local-only-safety-rules.md`
3. `p0-scope.md`
4. `seed-data-design.md`
5. `actor-and-fixture-map.md`
6. `execution-order.md`
7. `expected-results.md`
8. `result-log-template.md`
9. `failure-classification.md`
10. `stop-rules.md`
11. `next-step-after-p0.md`

## 생성 script 목록

- `scripts/manual-local-rls/run-phase20-p0-local.ps1`
- `scripts/manual-local-rls/phase20_00_preflight.sql`
- `scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql`
- `scripts/manual-local-rls/phase20_02_project_access_p0.sql`
- `scripts/manual-local-rls/phase20_03_rough_note_ai_draft_p0.sql`
- `scripts/manual-local-rls/phase20_04_change_card_public_boundary_p0.sql`
- `scripts/manual-local-rls/phase20_05_feedback_author_spoofing_p0.sql`
- `scripts/manual-local-rls/phase20_06_public_safe_view_p0.sql`
- `scripts/manual-local-rls/phase20_07_approved_change_card_trigger_p0.sql`
- `scripts/manual-local-rls/phase20_99_result_summary.sql`

## 읽는 순서

`README.md` → `local-only-safety-rules.md` → `p0-scope.md` → `seed-data-design.md` → `actor-and-fixture-map.md` → `execution-order.md` → `expected-results.md` → `scripts/manual-local-rls/README.md`

## 최종 결론

19단계는 실행이 아니라 P0 local test pack 작성 단계다. 20단계에서 사용자가 local Docker Supabase DB container에 대해 script를 실행하고 로그를 가져오면, 그 결과에 따라 P0 PASS, Security Patch, Policy Patch, Seed Patch, View Boundary Patch로 분기한다.

## 20단계 첫 실행 실패 및 seed actor context patch

20단계 첫 실행에서 `phase20_00_preflight.sql`은 PASS했으나, `phase20_01_seed_p0_fixture.sql`이 `Feedback author_user_profile_id must match the current user profile.` 오류로 중단되었다.
이 실패는 P0 RLS 본 테스트 실패가 아니라 `feedbacks` baseline fixture insert 시 actor context가 누락된 `SEED_FAIL`이다.

관련 문서:

- `docs/p0-rls-local-test-pack/phase20-first-run-result.md`
- `docs/p0-rls-local-test-pack/seed-failure-analysis.md`
- `docs/p0-rls-local-test-pack/seed-actor-context-patch.md`
- `docs/p0-rls-local-test-pack/phase20-rerun-guide.md`

patch 이후 사용자는 local-only로 `scripts/manual-local-rls/run-phase20-p0-local.ps1`을 다시 실행한다.

## Phase 21 추가 문서

- `phase20-second-run-result.md`: phase20 두 번째 local 실행 결과.
- `project-access-permission-failure-analysis.md`: `permission denied for table projects` 원인 분석.
- `p0-access-path-and-privilege-matrix.md`: actor/object/action별 source/view/privilege matrix.
- `minimal-grant-boundary-patch.md`: broad grant 없이 적용한 최소 boundary patch.
- `phase20-third-run-guide.md`: patch 후 local-only 세 번째 실행 절차.

## Phase22 third run VIEW_ACCESS_ERROR intake

Phase20 세 번째 실행은 `PRE-050 VIEW_ACCESS_ERROR public_project_cards blocked by privilege/security_invoker: 42501`로 중단되었다. 관련 문서는 다음을 확인한다.

- `phase20-third-run-result.md`
- `public-safe-view-execution-model-analysis.md`
- `public-safe-view-row-column-boundary-audit.md`
- `public-safe-view-execution-boundary-patch.md`
- `phase20-fourth-run-guide.md`

## Phase22.5 보정 문서

- `phase22-5-public-builder-view-coverage-correction.md`: Phase22에서 누락된 `public_builder_profiles` runtime verification 보정.
- Phase22.5 이후 P0 public-safe view runtime 대상은 8개 view다.
- 실제 PASS 여부는 사용자의 네 번째 로컬 실행 로그로만 판단한다.

## Phase23 fourth-run PASS intake / signal scan correction

Phase23에서는 사용자의 Phase20 네 번째 로컬 실행 결과를 PASS로 intake하고, wrapper final scan이 `NEXT` 안내문, search hint, patch header의 token을 실제 failure로 오탐한 문제를 보정했다.

추가 문서:

- `phase20-fourth-run-pass-result.md`
- `p0-local-rls-test-pass-intake.md`
- `final-signal-scan-false-positive-analysis.md`
- `post-p0-next-step-decision.md`

Phase23은 SQL/migration/P0 scenario를 수정하지 않는다. wrapper는 raw substring scan 대신 file별 exact parsed signal을 집계한다.


## Phase23.5 보강

Phase23.5에서는 P0 PASS 판정을 유지하되, wrapper가 `NEEDS_REVIEW`, `SEED_FAIL`, `AUTH_CONTEXT_FAIL`, `TRIGGER_FAIL` 등을 final result에 반영하지 못하는 false-negative 위험을 보정했다. 자세한 내용은 `phase23-5-test-oracle-completeness-hardening.md`, `signal-taxonomy-and-exit-code-matrix.md`, `negative-control-oracle-matrix.md`, `scenario-coverage-manifest.md`를 확인한다.
## Phase23.6 parse gate / deterministic parser correction

- `phase23-6-wrapper-parse-gate-signal-parser-correction.md`: Phase23.5 parse error와 parser 결정성 보정 내용
- `powershell-static-parse-validation-guide.md`: wrapper 실행 전 syntax-only parse check
- `docs/decisions/phase23-6-wrapper-parse-gate-signal-parser-correction-scope.md`: 확정/보류 범위

Phase23.6 결과물은 먼저 PowerShell parse check를 통과해야 한다. 그 후 local-only wrapper assurance verification을 실행한다.
