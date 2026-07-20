# Problem / Hypothesis RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 대상 후보

- `problem_definitions`
- `hypotheses`

Problem Definition과 Hypothesis의 과거 이력은 Change Card를 원천으로 추적한다. 이 문서는 현재값 접근 정책만 다룬다.

## 2. PROBLEM_READ_OWNER_01

```sql
-- draft only
create policy problem_definition_select_owner
on problem_definitions
for select
to authenticated
using (
  exists (
    select 1 from projects p
    join builder_profiles bp on bp.id = p.owner_builder_profile_id
    join user_profiles up on up.id = bp.user_profile_id
    where p.id = problem_definitions.project_id
      and up.auth_user_id = auth.uid()
  )
);
```

- 관련 Test Case ID: `PH-PD-001`

## 3. PROBLEM_READ_PUBLIC_01

```sql
-- draft only
create policy problem_definition_select_public
on problem_definitions
for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1 from projects p
    where p.id = problem_definitions.project_id
      and (
        p.visibility_status = 'public'
        or (p.visibility_status = 'link_shared' and can_read_link_shared_project(p.id))
      )
  )
);
```

- 관련 Test Case ID: `PH-PD-002`, `PH-PD-003`, `PH-PD-004`, `PP-005`
- 추가 검토 필요: `is_public` 같은 Problem 자체 공개 플래그를 둘지, Project 공개 상태만 따를지.

## 4. PROBLEM_UPDATE_OWNER_01

```sql
-- draft only
create policy problem_definition_update_owner
on problem_definitions
for update
to authenticated
using (is_project_owner(project_id, auth.uid()))
with check (is_project_owner(project_id, auth.uid()));
```

- 관련 Test Case ID: `PH-PD-005`, `PH-PD-006`, `PH-PD-007`
- 중요한 변경은 Change Card 생성을 유도한다. RLS는 유도 자체를 처리하지 못하므로 애플리케이션/UX 정책이 필요하다.

## 5. HYPOTHESIS_READ_OWNER_01

```sql
-- draft only
create policy hypothesis_select_owner
on hypotheses
for select
to authenticated
using (is_project_owner(project_id, auth.uid()));
```

- 관련 Test Case ID: `PH-HY-001`, `PH-HY-002`

## 6. HYPOTHESIS_READ_PUBLIC_01

```sql
-- draft only
create policy hypothesis_select_public
on hypotheses
for select
to anon, authenticated
using (
  is_public = true
  and sensitivity_status = 'normal'
  and exists (
    select 1 from projects p
    where p.id = hypotheses.project_id
      and (
        p.visibility_status = 'public'
        or (p.visibility_status = 'link_shared' and can_read_link_shared_project(p.id))
      )
  )
);
```

- 관련 Test Case ID: `PH-HY-004`, `PH-HY-005`, `PH-HY-006`
- 민감한 Hypothesis는 공개하지 않는다.

## 7. HYPOTHESIS_UPDATE_OWNER_01

```sql
-- draft only
create policy hypothesis_update_owner
on hypotheses
for update
to authenticated
using (is_project_owner(project_id, auth.uid()))
with check (is_project_owner(project_id, auth.uid()));
```

- 관련 Test Case ID: `PH-HY-002`, `PH-HY-003`
- 상태 변경 시 Change Card 연결을 유도한다.
