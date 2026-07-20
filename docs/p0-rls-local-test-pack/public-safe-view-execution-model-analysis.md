# Public-safe View Execution Model Analysis

## 문제 요약

Phase20 세 번째 실행은 `PRE-050`에서 중단되었다.

```text
VIEW_ACCESS_ERROR public_project_cards blocked by privilege/security_invoker: 42501
```

Phase21 patch는 anon public read를 source table 직접 조회에서 `public_project_cards` public-safe view 조회로 전환했다. 방향은 맞았지만, 기존 view가 `security_invoker = true`였기 때문에 invoking role인 `anon`에게 underlying source relation privilege가 요구되었다.

BuildMap은 anon에게 `public.projects` source table 직접 `SELECT`를 부여하지 않기로 결정해 왔으므로, view 조회가 PostgreSQL privilege 단계에서 차단되었다.

## object privilege와 RLS의 차이

PostgreSQL에서는 table/view/function object privilege와 RLS policy가 서로 다른 계층이다.

1. role이 object privilege를 갖는지 확인한다.
2. table에 RLS가 enable되어 있으면 row policy를 평가한다.
3. object privilege가 없으면 RLS policy 평가까지 도달하지 못한다.

따라서 이번 `42501`은 row policy가 `deny`한 결과가 아니다. view execution model과 underlying source privilege가 충돌한 결과다.

## view privilege와 underlying relation privilege 관계

`security_invoker = true` view는 view를 호출한 role의 권한으로 underlying relation privilege와 RLS를 평가한다. 따라서 `anon`이 view에 `SELECT`를 가지고 있어도, underlying `public.projects`에 대한 source table privilege가 없으면 view 조회가 실패할 수 있다.

반대로 `security_invoker`를 사용하지 않는 일반 view는 view owner 권한으로 underlying relation에 접근한다. 이 경우 `anon`에게 source table direct `SELECT`를 주지 않고도 view interface를 제공할 수 있다. 대신 view SQL 자체가 public row predicate와 column allowlist를 강제해야 한다.

## Option 비교

| 기준 | Option A: non-security-invoker public-safe view | Option B: anon source privilege + security_invoker 유지 | Option C: SECURITY DEFINER public read RPC |
|---|---|---|---|
| anon source table direct access | 차단 유지 | 열릴 가능성 큼 | 차단 유지 |
| public-safe view interface 유지 | 유지 | 유지 가능하지만 source direct 경계 약화 | view wrapper가 필요하거나 API 전환 필요 |
| private row 차단 방식 | view SQL predicate | RLS + source grant | function predicate |
| sensitive/internal/draft 차단 | view SQL predicate | RLS + source grant | function predicate |
| column allowlist | view select list | view select list + source column grant 검토 필요 | function return schema/json |
| underlying RLS 의존 | 의존하지 않는 방향 | 강하게 의존 | function 내부 로직에 의존 |
| view owner/table owner 영향 | 존재. 그래서 view predicate 감사 필수 | invoking user 기반 | function owner 기반 |
| search_path 위험 | 낮음 | 낮음 | 높음. SECURITY DEFINER 관리 필요 |
| function EXECUTE 위험 | 없음 | 없음 | 있음 |
| schema 변경량 | 작음 | 작지만 보안 경계 훼손 가능 | 큼 |
| P0 patch 적합성 | 높음 | 낮음 | 중간/후순위 |
| 향후 API integration | view 그대로 사용 가능 | view 사용 가능하지만 source privilege 부담 | API/RPC 경계로 확장 가능 |

## 최종 선택

이번 단계에서는 **Option A**를 선택한다.

```text
anon
→ public-safe view SELECT
→ view owner privilege로 underlying relation 조회
→ view SQL 자체가 공개 row predicate와 공개 column allowlist를 강제
→ anon source table direct SELECT는 계속 revoke
```

## Option A 선택 이유

1. 기존 public-safe view interface를 유지할 수 있다.
2. anon에게 source table direct privilege를 주지 않는다.
3. P0 scope 안에서 가장 작은 수정이다.
4. broad grant 없이 `public_project_cards` view 조회 실패를 해결할 수 있다.
5. 공개 가능한 row/column을 view SQL에서 명시적으로 감사할 수 있다.

## Option B를 채택하지 않는 이유

Option B는 `security_invoker = true`를 유지하면서 anon에게 underlying source relation privilege를 부여하는 방식이다. 이 방식은 다음 위험 때문에 채택하지 않는다.

```text
anon이 public.projects를 직접 조회할 수 있음
anon이 public.change_cards를 직접 조회할 수 있음
source table의 민감/internal column 접근 경계가 약해짐
public-safe view 전용 access path가 무너짐
column-level grant를 쓰더라도 row-level 민감성 검토가 복잡해짐
```

따라서 다음 grant는 추가하지 않는다.

```sql
grant select on public.projects to anon;
grant select on public.change_cards to anon;
grant select on public.feedbacks to anon;
grant select on all tables in schema public to anon;
```

## Option C를 보류한 이유

`SECURITY DEFINER` function/RPC boundary는 link_shared/token 검증처럼 복합 권한 검증이 필요한 경우에 적합하다. 그러나 전체 공개 카드/목록/Timeline의 경우 현재 목표는 기존 public-safe view interface를 유지하는 것이다. Option C는 search_path, function owner, EXECUTE grant, 반환 schema/json 제한을 새로 검토해야 하므로 이번 P0 patch보다 범위가 크다.

## view owner / table owner / BYPASSRLS 위험

Option A는 view owner 권한으로 source table을 읽을 수 있으므로, source table RLS만 믿으면 안 된다. 특히 view owner가 table owner이거나 BYPASSRLS 성격을 갖는 경우 underlying RLS가 public boundary 역할을 하지 못할 수 있다.

따라서 public-safe view는 다음을 직접 보장해야 한다.

```text
private Project 제외
archived Project 제외
approved + published + normal Change Card만 포함
sensitive/internal/draft Change Card 제외
public/open Feedback Request만 포함
public_selected Feedback만 포함
internal_review Feedback 제외
author_user_profile_id / auth_user_id / owner_user_profile_id / share_token_hash 제외
Rough Note / AI Draft 제외
select * 금지
```

## security_barrier의 역할

이번 patch는 public-safe view에 `security_barrier = true`를 적용한다. 이는 predicate pushdown 관련 위험을 줄이는 보조 장치다.

그러나 `security_barrier`는 보안 만능 장치가 아니다. public row predicate와 column allowlist를 대체하지 않는다. view SQL의 explicit predicate가 최종 public boundary다.
