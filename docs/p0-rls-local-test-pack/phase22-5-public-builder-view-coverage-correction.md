# Phase22.5 Public Builder View Coverage Correction

## 목적

이 문서는 Phase22 완료 후 네 번째 로컬 실행 전에 발견된 `public_builder_profiles` runtime verification 누락을 기록한다.

Phase22의 핵심 결정은 변경하지 않는다.

- owner-executed public-safe view 유지
- `security_barrier = true` 유지
- explicit public row predicate 유지
- explicit public column allowlist 유지
- anon source table direct revoke 유지
- broad anon grant 금지 유지

이번 보정은 public-safe view execution model 재설계가 아니라, P0 runtime script coverage gap 보정이다.

## 발견된 coverage gap

Phase22 문서와 완료 보고에서는 모든 public-safe view의 actual SELECT와 boundary check가 보강됐다고 표현했다.

그러나 실제 `scripts/manual-local-rls/phase20_06_public_safe_view_p0.sql`에는 다음 7개 view만 runtime verification 대상이었다.

- `public_project_cards`
- `public_project_pages`
- `public_change_cards`
- `public_decision_timeline`
- `public_feedback_requests`
- `public_feedbacks`
- `public_project_links`

다음 view가 누락되어 있었다.

- `public_builder_profiles`

## 분류

| 항목 | 판정 |
|---|---|
| Primary classification | `SCRIPT_COVERAGE_GAP` |
| `VIEW_ACCESS_ERROR` | 아직 확인되지 않음 |
| `VIEW_BOUNDARY_FAIL` | 아직 확인되지 않음 |
| `UNEXPECTED_ALLOW` | 없음 |
| migration SQL 구조 실패 | 확인되지 않음 |
| remote 영향 | 없음 |
| secret 노출 | 없음 |

## migration SQL 확인 결과

`supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql`의 `public_builder_profiles`는 현재 다음 조건을 만족한다.

- `security_invoker = true` 없음
- `security_barrier = true`
- explicit column list 사용
- `bp.is_public = true` predicate 사용
- `user_profile_id` 미노출
- `auth_user_id` 미노출

따라서 이번 22.5단계에서는 migration draft SQL을 수정하지 않는다.

## 추가한 non-public builder fixture

`phase20_01_seed_p0_fixture.sql`에 다음 fixture를 추가했다.

| 항목 | 값 |
|---|---|
| `builder_profile_id` | `20000000-0000-0000-0000-000000000104` |
| `user_profile_id` | `10000000-0000-0000-0000-000000000104` |
| `public_display_name` | `P0 Private Builder` |
| `bio` | `Local P0 private builder` |
| `is_public` | `false` |

이 fixture는 `public_builder_profiles` exclusion 검증 전용이다. 기존 Project owner 관계에는 연결하지 않는다.

## 추가한 runtime scenarios

`phase20_06_public_safe_view_p0.sql`에 다음 독립 block을 추가했다.

| Scenario ID | 목적 | 기대 |
|---|---|---|
| `VIEW-P0-BP-001` | anon이 `public_builder_profiles`를 조회할 수 있는지 확인 | `PASS` |
| `VIEW-P0-BP-002` | owner public builder fixture 노출 확인 | count = 1 |
| `VIEW-P0-BP-003` | non-owner public builder fixture 노출 확인 | count = 1 |
| `VIEW-P0-BP-004` | non-public builder fixture 미노출 확인 | count = 0 |
| `VIEW-P0-BP-005` | `user_profile_id` column 미노출 확인 | column 없음 |
| `VIEW-P0-BP-006` | `auth_user_id` / internal owner column 미노출 확인 | column 없음 |

## preflight 보정

`phase20_00_preflight.sql`에 다음을 추가했다.

- anon `SELECT` on `public.public_builder_profiles`
- anon actual query smoke: `select count(*) from public.public_builder_profiles`
- 전체 8개 public-safe view 존재 확인
- 전체 8개 public-safe view의 `security_invoker=true` 잔존 여부 확인
- 전체 8개 public-safe view의 `security_barrier=true` 적용 여부 확인

## result summary 보정

`phase20_99_result_summary.sql`에 다음을 추가했다.

- public builder fixture count
- private builder fixture exclusion count
- anon `public_builder_profiles` SELECT privilege
- 전체 public-safe view count
- `security_invoker=true` 잔존 view count
- `security_barrier=true` 누락 view count

## 문서 표현 보정

Phase22 문서의 표현은 다음 기준으로 보정한다.

- Phase22에서는 7개 public-safe view runtime verification을 보강했다.
- `public_builder_profiles` actual SELECT 검증은 Phase22.5에서 보완했다.
- Phase22.5 이후 전체 8개 public-safe view가 runtime verification 대상이다.
- 실제 PASS 여부는 사용자의 네 번째 로컬 실행 전에는 확정하지 않는다.

## 보안 경계 유지

이번 patch는 다음을 변경하지 않는다.

- anon source table direct SELECT 금지
- broad anon grant 금지
- public-safe view SELECT grant 유지
- authenticated source table RLS test path 유지
- `security_invoker=true` 재도입 금지
- explicit public row predicate 유지
- explicit column allowlist 유지
- `security_barrier=true` 유지

## 다음 실행

사용자는 최신 Phase22.5 ZIP을 로컬 PC에서 풀고, Phase20 fourth run guide에 따라 local-only로 재실행한다.

## Phase22.6 후속 보정

Phase22.5의 `public_builder_profiles` runtime coverage 보정은 유지한다. Phase22.6에서는 SQL scenario나 migration draft를 변경하지 않고, 네 번째 실행 전에 wrapper가 PostgreSQL `NOTICE` / `WARNING` stderr를 PowerShell terminating error처럼 처리하지 않도록 보정했다.

따라서 Phase22.5에서 추가한 `VIEW-P0-BP-*`, `SUMMARY-009A`, `SUMMARY-009B`, `SUMMARY-014`, `SUMMARY-015`, `SUMMARY-016`, `SUMMARY-017` signal은 그대로 유지된다. 실제 PASS 여부는 사용자의 다음 local run log로만 판단한다.
