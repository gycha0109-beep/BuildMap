# Project RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 대상 후보

- `projects`
- `project_links` 후보

필드 후보:

- `owner_builder_profile_id`
- `visibility_status`: `private`, `link_shared`, `public` 후보
- `progress_status`
- `public_slug` 후보
- `share_token_hash` 또는 링크 접근 식별자 후보
- `share_token_revoked_at` 후보

## 2. PROJECT_READ_OWNER_01

```sql
-- draft only
create policy project_select_owner
on projects
for select
to authenticated
using (
  owner_builder_profile_id in (
    select bp.id
    from builder_profiles bp
    join user_profiles up on up.id = bp.user_profile_id
    where up.auth_user_id = auth.uid()
  )
);
```

- 목적: Project Owner가 자신의 Project를 읽는다.
- 관련 Test Case ID: `PRJ-READ-001`

## 3. PROJECT_READ_PUBLIC_01

```sql
-- draft only
create policy project_select_public
on projects
for select
to anon, authenticated
using (
  visibility_status = 'public'
);
```

- 목적: 전체 공개 Project의 공개 가능한 정보 읽기.
- 차단: 비공개 Project, 링크 공개 Project를 public_slug만으로 읽는 경우.
- 관련 Test Case ID: `PRJ-READ-004`, `PRJ-READ-005`, `PP-002`, `LINK-007`
- 주의: 공개 가능한 컬럼만 노출하려면 view 또는 API 레이어의 컬럼 제한도 필요하다. RLS만으로 컬럼 노출을 완전히 해결하지 않는다.

## 4. PROJECT_READ_LINK_01

```sql
-- draft only / not final
create policy project_select_link_shared
on projects
for select
to anon, authenticated
using (
  visibility_status = 'link_shared'
  and can_read_link_shared_project(id) -- helper candidate
);
```

- 목적: 링크 공개 Project를 유효한 share_token 조건으로 읽는다.
- 관련 Test Case ID: `LINK-001`~`LINK-016`, `PP-003`, `PP-004`
- 추가 검토 필요:
  - `share_token`을 RLS context로 어떻게 전달할지.
  - token 원문을 저장하지 않고 hash로 검증할지.
  - secure RPC 또는 edge/API 계층에서 검증할지.

## 5. PROJECT_INSERT_BUILDER_01

```sql
-- draft only
create policy project_insert_builder
on projects
for insert
to authenticated
with check (
  owner_builder_profile_id in (
    select bp.id
    from builder_profiles bp
    join user_profiles up on up.id = bp.user_profile_id
    where up.auth_user_id = auth.uid()
  )
);
```

- 목적: 로그인 Builder가 자신의 Project를 생성한다.
- 차단: 비로그인 사용자.

## 6. PROJECT_UPDATE_OWNER_01

```sql
-- draft only
create policy project_update_owner
on projects
for update
to authenticated
using (
  owner_builder_profile_id in (
    select bp.id
    from builder_profiles bp
    join user_profiles up on up.id = bp.user_profile_id
    where up.auth_user_id = auth.uid()
  )
)
with check (
  owner_builder_profile_id in (
    select bp.id
    from builder_profiles bp
    join user_profiles up on up.id = bp.user_profile_id
    where up.auth_user_id = auth.uid()
  )
);
```

- 목적: Project Owner만 Project 수정, 공개 상태 변경, 진행 상태 변경을 수행한다.
- 관련 Test Case ID: `PRJ-UPD-001`~`PRJ-UPD-004`, `PRJ-VIS-001`, `PRJ-VIS-002`, `PRJ-STATUS-001`, `OWN-004`, `OWN-006`, `OWN-007`, `OWN-009`
- 추가 검토 필요: 공개 상태 변경과 일반 수정 정책을 분리할지.

## 7. PROJECT_LINK_SELECT_PUBLIC_01 후보

```sql
-- draft only
create policy project_link_select_public
on project_links
for select
to anon, authenticated
using (
  exists (
    select 1
    from projects p
    where p.id = project_links.project_id
      and (
        p.visibility_status = 'public'
        or (p.visibility_status = 'link_shared' and can_read_link_shared_project(p.id))
      )
  )
);
```

- 목적: 공개 페이지의 데모/GitHub/Figma 링크 후보를 표시한다.
- 관련 Test Case ID: `PP-017`
- 추가 검토 필요: 링크별 공개 여부가 필요한지.

## 8. public_slug와 share_token 원칙

- `public_slug`는 전체 공개용 읽기 쉬운 경로 후보다.
- `public_slug`는 보안 토큰이 아니다.
- `share_token`은 링크 공개 접근 식별자 후보다.
- Project가 비공개로 전환되면 share_token 접근은 차단되어야 한다.
