# Change Card RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 대상 후보

- `change_cards`

Change Card는 BuildMap의 핵심 원천 기록이다. Decision Timeline은 별도 원천 테이블이 아니라 Change Card의 표현 구조다.

필드 후보:

- `project_id`
- `created_by_builder_profile_id`
- `approved_by_builder_profile_id`
- `work_status`: `draft`, `editing`, `approved`, `held` 후보
- `visibility_status`: `internal`, `publishable`, `published` 후보
- `sensitivity_status`: `normal`, `sensitive` 후보
- `approved_at`

## 2. CHANGE_CARD_SELECT_OWNER_INTERNAL_01

```sql
-- draft only
create policy change_card_select_owner_internal
on change_cards
for select
to authenticated
using (
  is_project_owner(project_id, auth.uid())
  or created_by_builder_profile_id in (
    select bp.id
    from builder_profiles bp
    join user_profiles up on up.id = bp.user_profile_id
    where up.auth_user_id = auth.uid()
  )
);
```

- 목적: Project Owner 또는 작성 Builder가 내부 Change Card를 읽는다.
- 관련 Test Case ID: `CC-READ-001`, `CC-READ-002`, `CC-READ-003`
- 1차에서는 Owner 중심 권한을 우선하며, 작성자 내부 읽기는 후보로 둔다.

## 3. CHANGE_CARD_SELECT_PUBLIC_01

```sql
-- draft only
create policy change_card_select_public
on change_cards
for select
to anon, authenticated
using (
  work_status = 'approved'
  and visibility_status = 'published'
  and sensitivity_status = 'normal'
  and exists (
    select 1
    from projects p
    where p.id = change_cards.project_id
      and (
        p.visibility_status = 'public'
        or (p.visibility_status = 'link_shared' and can_read_link_shared_project(p.id))
      )
  )
);
```

- 목적: 공개 Timeline에 노출 가능한 Change Card만 읽는다.
- 관련 Test Case ID: `CC-PUBLIC-001`~`CC-PUBLIC-005`, `CC-LINK-001`, `CC-LINK-002`, `CC-SENS-001`, `CC-STATUS-001`~`CC-STATUS-003`, `LINK-013`, `LINK-014`, `PP-010`~`PP-013`
- 공개 조건:
  - Project가 전체 공개 또는 링크 공개 접근 조건을 만족한다.
  - Change Card 작업 상태가 승인됨이다.
  - Change Card 공개 상태가 공개됨이다.
  - Change Card 민감도가 일반이다.
- `공개 가능`은 공개 읽기 허용이 아니다.

## 4. CHANGE_CARD_INSERT_OWNER_01

```sql
-- draft only
create policy change_card_insert_owner
on change_cards
for insert
to authenticated
with check (
  is_project_owner(project_id, auth.uid())
);
```

- 목적: Project Owner가 자신의 Project에 Change Card를 생성한다.
- 관련 Test Case ID: `OWN-001`
- 1차에서는 Project Owner 중심으로 제한한다.

## 5. CHANGE_CARD_UPDATE_OWNER_01

```sql
-- draft only
create policy change_card_update_owner
on change_cards
for update
to authenticated
using (
  is_project_owner(project_id, auth.uid())
)
with check (
  is_project_owner(project_id, auth.uid())
);
```

- 목적: Project Owner가 Change Card를 수정, 승인, 공개 상태 변경한다.
- 관련 Test Case ID: `CC-UPD-001`, `CC-APP-001`, `CC-APP-002`, `CC-PUB-001`, `OWN-002`~`OWN-006`, `OWN-008`, `OWN-013`, `OWN-014`
- 추가 검토 필요:
  - 승인된 Change Card 수정 제한.
  - 승인 행위와 일반 수정 행위를 별도 정책/함수로 나눌지.
  - `approved_by_builder_profile_id`를 Project Owner로 기록하는 방식.

## 6. 승인/공개 상태 변경의 추가 제약 후보

RLS의 `with check`만으로 상태 전이를 세밀하게 제어하기 어려울 수 있다. 후속 단계에서는 다음 제약 후보를 검토한다.

```sql
-- pseudo draft only
-- 승인 상태로 바꿀 때 approved_by_builder_profile_id가 Project Owner인지 확인.
-- 공개됨으로 바꿀 때 work_status = 'approved'이고 sensitivity_status = 'normal'인지 확인.
```

- 상태 전이 검증은 trigger, RPC, application service, RLS helper 중 어떤 책임인지 추가 검토 필요.
