# Minimal GRANT boundary patch

## 목적

phase20 두 번째 실행에서 `permission denied for table projects`가 발생했다.
이번 patch는 이를 broad grant로 해결하지 않고, P0 테스트 access path와 privilege boundary를 분리해 보정한다.

## 기존 grant 상태 요약

`08_grants_and_final_checks_draft.sql`에는 다음 방향이 이미 있었다.

- internal helper/RPC function execute revoke/grant 후보.
- authenticated role의 source table 접근 후보.
- public-safe view에 대한 `anon, authenticated` SELECT grant 후보.
- source table에 대한 broad anon SELECT 금지.

하지만 P0 script는 anon public read 시나리오에서 `public.projects` source table을 직접 조회했다.
이 때문에 의도된 source table 차단이 wrapper 실패로 나타났다.

## 추가한 patch

### 1. anon source table revokes 명시화

`08_grants_and_final_checks_draft.sql`에서 anon source table direct access 금지 의도를 더 명확히 했다.

대상:

```text
user_profiles
builder_profiles
projects
problem_definitions
hypotheses
rough_notes
ai_structured_drafts
change_cards
feedback_requests
feedbacks
project_links
```

이 revokes는 public-safe view 경계를 유지하기 위한 draft 후보이며, remote 적용이 아니다.

### 2. authenticated source table 최소 privilege 설명 보강

authenticated actor가 RLS를 검증하려면 table privilege가 있어야 한다.
따라서 `projects`, `rough_notes`, `ai_structured_drafts`, `change_cards`, `feedback_requests`, `feedbacks`에 대한 authenticated source access는 RLS/trigger 평가를 위한 최소 전제라고 문서화했다.

### 3. public-safe view SELECT grant 유지

다음 view는 anon/authenticated public boundary로 유지한다.

```text
public_builder_profiles
public_project_cards
public_project_pages
public_change_cards
public_decision_timeline
public_feedback_requests
public_feedbacks
public_project_links
```

## 추가하지 않은 privilege

다음은 추가하지 않았다.

```sql
grant select on all tables in schema public to anon;
grant all on all tables in schema public to anon, authenticated;
grant select on public.projects to anon;
grant select on public.rough_notes to anon;
grant select on public.ai_structured_drafts to anon;
grant select on public.feedbacks to anon;
```

## security_invoker view 충돌 여부

`public-safe view`가 `security_invoker = true`인 상태에서 anon source table privilege를 요구할 수 있다.
이 경우 broad source grant를 추가하지 않는다.
다음 실행에서 view query가 `VIEW_ACCESS_ERROR`를 출력하면 view execution model 또는 RPC/API boundary patch로 분기한다.

## 최종 보안 경계

- anon source table direct read는 금지.
- anon public read는 public-safe view 사용.
- authenticated source table read/update/insert는 RLS와 trigger가 통제.
- internal helper/RPC execute boundary는 유지.
- remote 적용과 정식 migration 승격은 계속 금지.
