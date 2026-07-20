# Public-safe View Execution Boundary Patch

## 목적

이 문서는 Phase20 세 번째 실행에서 발생한 `PRE-050 VIEW_ACCESS_ERROR`를 해결하기 위해 적용한 public-safe view execution boundary patch를 설명한다.

## 선택한 방식

이번 단계에서는 Option A를 채택했다.

```text
security_invoker 제거
security_barrier 적용
view SQL 자체에 public row predicate 명시
view select list를 public column allowlist로 유지
anon source table direct revoke 유지
anon public-safe view SELECT grant 유지
authenticated source table 최소 grant 유지
```

## 실제 SQL patch 위치

| 파일 | patch |
|---|---|
| `supabase/migrations_draft/20260708006000_buildmap_06_public_safe_views_draft.sql` | `security_invoker = true` 제거, `security_barrier = true` 적용, row predicate/column allowlist 보강 |
| `supabase/migrations_draft/20260708008000_buildmap_08_grants_and_final_checks_draft.sql` | Phase22 view execution boundary 주석 및 verification note 보강 |
| `scripts/manual-local-rls/phase20_00_preflight.sql` | `PRE-050` actual SELECT / execution model check 보강 |
| `scripts/manual-local-rls/phase20_06_public_safe_view_p0.sql` | Phase22에서는 7개 public-safe view actual SELECT/boundary check를 보강했고, Phase22.5에서 `public_builder_profiles` actual SELECT/boundary check를 보완 |
| `scripts/manual-local-rls/run-phase20-p0-local.ps1` | `VIEW_BOUNDARY_FAIL` signal 감지 보강 |

## security_invoker 제거 방식

기존 view는 다음 형태였다.

```sql
create or replace view public.public_project_cards
with (security_invoker = true)
as ...
```

이번 patch 이후 view는 다음 형태다.

```sql
create or replace view public.public_project_cards
with (security_barrier = true)
as ...
```

`security_invoker = true`를 제거하면 view는 기본 owner-executed behavior로 돌아간다. anon은 source table direct privilege 없이 view에 부여된 `SELECT` privilege를 통해 public-safe interface를 조회할 수 있다.

## explicit public row predicate

각 view는 source RLS에만 의존하지 않고 자체 predicate를 가진다.

| view | 핵심 predicate |
|---|---|
| `public_builder_profiles` | `is_public = true` |
| `public_project_cards` | Project `visibility_status = 'public'`, `archived_at is null` |
| `public_project_pages` | Project `visibility_status = 'public'`, `archived_at is null` |
| `public_change_cards` | public Project + Change Card `approved` + `published` + `normal` |
| `public_decision_timeline` | `public_change_cards`의 explicit projection |
| `public_feedback_requests` | public Project + request `public/open` + linked public card if present |
| `public_feedbacks` | public Project + request `public/open` + feedback `public_selected` + linked public card if present |
| `public_project_links` | public Project + link `public` |

## explicit public column allowlist

모든 view는 explicit select list를 유지한다. `select *`는 사용하지 않는다.

특히 다음 column은 노출하지 않는다.

```text
auth_user_id
owner_user_profile_id
author_user_profile_id
share_token_hash
rough_note_id
ai_draft_id
internal status metadata not needed for public read
```

## anon source table revoke 유지

이번 patch는 anon source table direct privilege를 열지 않는다. `08_grants_and_final_checks_draft.sql`의 source table revoke 정책은 유지된다.

```sql
revoke all on table public.projects from anon;
revoke all on table public.change_cards from anon;
revoke all on table public.feedbacks from anon;
revoke all on table public.rough_notes from anon;
revoke all on table public.ai_structured_drafts from anon;
```

## public-safe view SELECT grant 유지

anon과 authenticated는 public-safe view에 대해서만 `SELECT` 후보를 갖는다.

```sql
grant select on table public.public_project_cards to anon, authenticated;
grant select on table public.public_change_cards to anon, authenticated;
grant select on table public.public_feedbacks to anon, authenticated;
```

## view owner / table owner / RLS bypass 위험 처리

Option A에서는 view owner 권한으로 source table을 읽을 수 있다. 그러므로 source table RLS가 public-safe view의 최종 보안 경계가 아니다.

이 위험은 다음 방식으로 통제한다.

1. view SQL에 public predicate를 명시한다.
2. 민감 row 조건을 predicate에서 제외한다.
3. 민감 column을 select list에서 제외한다.
4. `security_barrier = true`를 보조 방어로 적용한다.
5. P0 script에서 view actual SELECT와 forbidden row/column absence를 확인한다.

## security_barrier 적용 여부

적용했다.

이유:

```text
public-safe view가 row boundary 역할을 하므로 predicate pushdown 관련 위험을 줄이는 defense-in-depth가 필요하다.
```

단, `security_barrier`는 explicit predicate와 column allowlist를 대체하지 않는다.

## 선택하지 않은 변경

이번 patch는 다음을 하지 않았다.

```text
anon source table SELECT grant 추가
grant select on all tables
grant all on all tables
dedicated owner role 생성
전체 RPC 전환
API route 구현
정식 migration 승격
remote 적용
```

## 다음 실행에서 기대하는 결과

```text
PRE-050 PASS
VIEW_ACCESS_ERROR 없음
VIEW_BOUNDARY_FAIL 없음
anon source table direct SELECT EXPECTED_DENY
public-safe view actual SELECT PASS
private/sensitive/internal/draft fixture가 view에 없음
```


## Phase22.5 public_builder_profiles coverage correction

Phase22의 execution model은 유지한다. 다만 runtime verification script에서 `public_builder_profiles`가 누락되어 Phase22.5에서 보완했다.

- `public_builder_profiles` actual SELECT 추가
- public builder positive fixture 검증 추가
- non-public builder negative fixture 검증 추가
- `user_profile_id`, `auth_user_id` column exclusion 검증 추가
- 전체 8개 view `security_invoker` / `security_barrier` reloptions catalog check 추가

실제 PASS 여부는 네 번째 사용자 로컬 실행 로그로만 판단한다.
