# Helper Function Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. current_user_profile_id()

```sql
-- 검토용 초안: 실행 금지
create or replace function current_user_profile_id()
returns uuid
language sql
stable
as $$
  select id from user_profiles where auth_user_id = auth.uid()
$$;
```

주의: RLS 재귀, 권한, 성능 검토 필요.

## 2. is_project_owner(project_id)

```sql
-- 검토용 초안: 실행 금지
create or replace function is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from projects p
    join builder_profiles bp on bp.id = p.owner_builder_profile_id
    where p.id = p_project_id
      and bp.user_profile_id = current_user_profile_id()
      and p.archived_at is null
  )
$$;
```

## 3. is_project_owner_by_builder(builder_profile_id)

```sql
-- 검토용 초안: 실행 금지
create or replace function is_project_owner_by_builder(p_builder_profile_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from builder_profiles bp
    where bp.id = p_builder_profile_id
      and bp.user_profile_id = current_user_profile_id()
  )
$$;
```

## 4. can_read_public_project(project_id)

```sql
-- 검토용 초안: 실행 금지
create or replace function can_read_public_project(p_project_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from projects p
    where p.id = p_project_id
      and p.visibility_status = 'public'
      and p.archived_at is null
  )
$$;
```

## 5. can_read_public_change_card(change_card_id)

```sql
-- 검토용 초안: 실행 금지
create or replace function can_read_public_change_card(p_change_card_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from change_cards cc
    join projects p on p.id = cc.project_id
    where cc.id = p_change_card_id
      and p.visibility_status = 'public'
      and cc.work_status = 'approved'
      and cc.visibility_status = 'published'
      and cc.sensitivity_status = 'normal'
      and cc.archived_at is null
  )
$$;
```

## 6. can_insert_feedback(feedback_request_id, author_user_profile_id)

```sql
-- 검토용 초안: 실행 금지
create or replace function can_insert_feedback(
  p_feedback_request_id uuid,
  p_author_user_profile_id uuid
)
returns boolean
language sql
stable
as $$
  select p_author_user_profile_id = current_user_profile_id()
    and exists (
      select 1
      from feedback_requests fr
      join projects p on p.id = fr.project_id
      where fr.id = p_feedback_request_id
        and fr.visibility_status = 'public'
        and fr.status = 'open'
        and p.visibility_status = 'public'
        and p.archived_at is null
    )
$$;
```

링크 공개 Feedback 작성은 secure RPC 후보에서 처리한다.

## 7. can_read_feedback(feedback_id)

```sql
-- 검토용 초안: 실행 금지
create or replace function can_read_feedback(p_feedback_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from feedbacks f
    join feedback_requests fr on fr.id = f.feedback_request_id
    where f.id = p_feedback_id
      and (
        f.author_user_profile_id = current_user_profile_id()
        or is_project_owner(fr.project_id)
      )
  )
$$;
```

## 8. share_token 관련 helper 제외 원칙

`share_token`을 직접 입력받는 helper는 1차에서 신중하게 다룬다. 링크 공개 token 검증은 secure RPC 후보를 우선한다.

## 9. 추가 검토 필요 사항

- `security definer` 여부
- `search_path` 고정
- RLS 재귀 위험
- authenticated/anon role grant 범위
