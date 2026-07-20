# Phase22 Public-safe View Execution Boundary Patch Scope

## 단계 정의

Phase22는 `phase20` 세 번째 실행에서 발생한 `PRE-050 VIEW_ACCESS_ERROR`를 문서화하고, anon source table direct grant 없이 public-safe view interface를 유지하기 위한 최소 view execution boundary patch를 작성한 단계다.

## 확정한 것

- phase20 third run은 `PRE-050`에서 중단됐다.
- 주 분류는 `VIEW_ACCESS_ERROR`다.
- SQLSTATE는 `42501`이다.
- 실패 object는 `public_project_cards`다.
- 직접 원인은 `security_invoker = true` view가 anon의 underlying source privilege를 요구한 것이다.
- Phase21 access path 수정 자체는 올바른 방향이었다.
- anon public read는 public-safe view를 사용해야 한다.
- anon source table direct `SELECT`는 계속 금지한다.
- broad grant는 추가하지 않는다.
- 현재 public-safe view execution model은 수정이 필요하다.
- 이번 단계에서는 Option A를 선택했다.
- Option A는 `security_invoker` 제거 + owner-executed view + explicit public predicate + explicit column allowlist 방식이다.
- `security_barrier = true`를 defense-in-depth로 적용했다.
- `security_barrier`는 public predicate와 column allowlist를 대체하지 않는다.
- 모든 public-safe view row predicate와 column allowlist를 감사했다.
- `public_decision_timeline`은 `select *`를 사용하지 않도록 explicit projection으로 보정했다.
- public Feedback Request / Feedback은 linked Change Card가 있는 경우 public Change Card boundary도 만족해야 한다.
- anon source table direct revoke는 유지한다.
- anon public-safe view `SELECT` grant는 유지한다.
- authenticated source table 최소 privilege는 RLS behavior test를 위해 유지한다.
- 실제 실행은 사용자의 로컬 PC에서 수행한다.
- remote 적용은 계속 금지한다.
- 정식 migration 승격은 계속 금지한다.
- 이번 단계에서 작업자는 Supabase CLI, Docker, psql, SQL을 실행하지 않았다.

## 보류한 것

- P0 RLS 실제 재실행
- P0 전체 PASS 판정
- P1/P2/P3 RLS 테스트
- link sharing secure RPC full matrix
- token rotation/revocation
- full function permission audit
- full trigger matrix
- remote Supabase migration
- production/staging 적용
- 정식 migration 승격
- API integration
- frontend integration
- 자동화 테스트 프레임워크
- dedicated database role architecture
- 전체 RPC 전환
- 새 제품 기능
- 관리자/팀/조직 권한
- 비로그인 피드백
- 결제/외부 연동
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- Project DNA
- 역량 점수화

## 다음 단계 후보

사용자는 최신 Phase22 ZIP을 로컬에 풀고, 임시 `supabase/migrations`를 최신 `migrations_draft`에서 다시 복사한 뒤 `supabase db reset`과 `phase20` wrapper를 재실행한다.

다음 실행의 핵심 확인 신호는 다음이다.

```text
PRE-050 PASS
VIEW_ACCESS_ERROR 없음
VIEW_BOUNDARY_FAIL 없음
UNEXPECTED_ALLOW 없음
anon source table direct SELECT EXPECTED_DENY
public-safe view actual SELECT PASS
```

## Phase22.5 correction note

Phase22 완료 후 실제 script coverage를 재확인한 결과, `phase20_06_public_safe_view_p0.sql`에서 `public_builder_profiles` actual SELECT 검증이 누락되어 있었다.

Phase22.5에서 다음을 확정한다.

- Phase22 execution model 자체는 유지한다.
- `public_builder_profiles` migration draft SQL은 이미 `security_barrier=true`, explicit column list, `bp.is_public=true`, no `security_invoker=true` 상태이므로 변경하지 않는다.
- `phase20_01_seed_p0_fixture.sql`에 non-public builder fixture를 추가한다.
- `phase20_00_preflight.sql`에 전체 8개 public-safe view reloptions check와 `public_builder_profiles` query smoke를 추가한다.
- `phase20_06_public_safe_view_p0.sql`에 `VIEW-P0-BP-*` runtime scenarios를 추가한다.
- 실제 PASS 여부는 네 번째 사용자 로컬 실행에서 확인한다.

## Phase22.6 Addendum

### 확정

- Phase22.6은 wrapper native stderr handling correction 단계다.
- SQL schema, RLS policy, public-safe view execution model, P0 scenario는 재설계하지 않는다.
- `run-phase20-p0-local.ps1`은 `psql` exit code와 SQL 내부 signal을 PowerShell native stderr 표시와 분리해서 판정한다.
- PostgreSQL `NOTICE` / `WARNING`이 stderr에 존재한다는 사실만으로 wrapper failure로 보지 않는다.
- PowerShell 7의 `PSNativeCommandUseErrorActionPreference`가 존재하면 native command 실행 구간에서만 임시 비활성화하고 원복한다.
- Windows PowerShell 5.1에서는 해당 변수가 없어도 동작하도록 처리한다.
- `ON_ERROR_STOP=1`은 유지한다.
- `UNEXPECTED_ALLOW` / `VIEW_BOUNDARY_FAIL`은 계속 P0 security blocker다.
- remote 적용과 정식 migration 승격은 계속 금지한다.

### 보류

- Phase20 네 번째 실행 PASS 판정
- P0 전체 PASS 판정
- SQL migration patch
- RLS policy patch
- public-safe view execution model 재설계
- P1/P2/P3 test pack
- remote Supabase migration
- API/frontend integration

## Phase23 PASS intake note

Phase23에서는 Phase20 네 번째 사용자 로컬 실행 결과를 PASS로 intake하고 wrapper final signal scan false positive를 보정했다. Phase22의 public-safe view execution model은 변경하지 않는다.

- owner-executed public-safe view 유지
- `security_barrier = true` 유지
- explicit public row predicate 유지
- explicit public column allowlist 유지
- anon source table direct revoke 유지
- broad anon grant 금지 유지
