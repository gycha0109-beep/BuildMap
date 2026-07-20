# Feedback RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 대상 후보

- `feedback_requests`
- `feedbacks`

Feedback은 일반 댓글이 아니다. Feedback은 반드시 Feedback Request를 통해 생성된다.

## 2. FEEDBACK_REQUEST_SELECT_PUBLIC_01

```sql
-- draft only
create policy feedback_request_select_public
on feedback_requests
for select
to anon, authenticated
using (
  request_visibility_status = 'public'
  and exists (
    select 1
    from projects p
    where p.id = feedback_requests.project_id
      and (
        p.visibility_status = 'public'
        or (p.visibility_status = 'link_shared' and can_read_link_shared_project(p.id))
      )
  )
);
```

- 목적: 공개 조건을 만족한 Project의 공개 Feedback Request를 읽는다.
- 관련 Test Case ID: `FB-REQ-005`, `FB-REQ-006`, `LINK-015`, `PP-014`

## 3. FEEDBACK_REQUEST_SELECT_OWNER_01

```sql
-- draft only
create policy feedback_request_select_owner
on feedback_requests
for select
to authenticated
using (
  is_project_owner(project_id, auth.uid())
);
```

- 목적: Project Owner가 내부/공개 Feedback Request를 모두 읽는다.

## 4. FEEDBACK_REQUEST_INSERT_OWNER_01

```sql
-- draft only
create policy feedback_request_insert_owner
on feedback_requests
for insert
to authenticated
with check (
  is_project_owner(project_id, auth.uid())
);
```

- 관련 Test Case ID: `FB-REQ-001`, `FB-REQ-002`, `FB-REQ-003`, `FB-REQ-004`
- 대상은 1차에서 Project 또는 Change Card 중심으로 둔다.

## 5. FEEDBACK_INSERT_LOGGED_IN_WITH_REQUEST_01

```sql
-- draft only / requires helper review
create policy feedback_insert_logged_in_with_request
on feedbacks
for insert
to authenticated
with check (
  feedback_request_id is not null
  and can_create_feedback(feedback_request_id, auth.uid())
);
```

- 목적: 로그인 사용자가 접근 가능한 공개 Feedback Request에만 Feedback을 작성한다.
- 관련 Test Case ID: `FB-CREATE-001`, `FB-CREATE-002`, `FB-CREATE-003`, `FB-LINK-002`, `FB-LINK-003`
- 링크 공개 Project의 경우 `유효 share_token + 로그인 사용자 + 공개 Feedback Request` 조건이 모두 필요하다.
- 추가 검토 필요: share_token 접근 context를 `can_create_feedback`에 어떻게 전달할지.

## 6. FEEDBACK_SELECT_AUTHOR_OR_OWNER_01

```sql
-- draft only
create policy feedback_select_author_or_owner
on feedbacks
for select
to authenticated
using (
  author_user_profile_id in (
    select id from user_profiles where auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from feedback_requests fr
    where fr.id = feedbacks.feedback_request_id
      and is_project_owner(fr.project_id, auth.uid())
  )
);
```

- 목적: Feedback 작성자는 자기 Feedback을 읽고, Project Owner는 자신의 Project Feedback을 읽는다.
- 관련 Test Case ID: `FB-READ-001`, `FB-READ-002`, `FB-READ-003`, `FB-READ-004`

## 7. FEEDBACK_SELECT_PUBLIC_SELECTED_01

```sql
-- draft only
create policy feedback_select_public_selected
on feedbacks
for select
to anon, authenticated
using (
  feedback_visibility_status = 'public_selected'
  and exists (
    select 1
    from feedback_requests fr
    join projects p on p.id = fr.project_id
    where fr.id = feedbacks.feedback_request_id
      and fr.request_visibility_status = 'public'
      and (
        p.visibility_status = 'public'
        or (p.visibility_status = 'link_shared' and can_read_link_shared_project(p.id))
      )
  )
);
```

- 목적: Builder가 공개 선택한 Feedback만 공개 페이지에서 읽는다.
- 관련 Test Case ID: `FB-PUB-002`, `FB-PRIV-001`, `FB-PRIV-002`, `LINK-016`, `PP-015`, `PP-016`
- 주의: 작성자 이메일, auth ID, 내부 user ID는 select 대상에서 제외해야 한다. RLS는 행 접근 정책이고, 컬럼 노출 제한은 view/API 설계가 필요하다.

## 8. FEEDBACK_UPDATE_OWNER_REVIEW_01

```sql
-- draft only
create policy feedback_update_owner_review
on feedbacks
for update
to authenticated
using (
  exists (
    select 1
    from feedback_requests fr
    where fr.id = feedbacks.feedback_request_id
      and is_project_owner(fr.project_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from feedback_requests fr
    where fr.id = feedbacks.feedback_request_id
      and is_project_owner(fr.project_id, auth.uid())
  )
);
```

- 목적: Project Owner가 Feedback 검토 상태와 공개 선택 상태를 변경한다.
- 관련 Test Case ID: `FB-PUB-001`, `FB-LINK-001`
- Feedback 작성자 자기 수정 여부는 추가 검토 필요.
