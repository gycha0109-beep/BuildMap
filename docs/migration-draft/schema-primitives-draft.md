# Schema Primitives Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. uuid 사용 후보

BuildMap의 1차 테이블은 `uuid` primary key 후보를 사용한다.

```sql
-- 검토용 초안: 실행 금지
create extension if not exists pgcrypto;

-- 각 테이블 id 후보
id uuid primary key default gen_random_uuid()
```

## 2. timestamptz 사용 후보

모든 주요 원천 테이블에는 `created_at`, `updated_at` 후보를 둔다.

```sql
-- 검토용 초안: 실행 금지
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

`archived_at`은 삭제 대신 보관 정책이 필요한 테이블에 후보로 둔다.

## 3. 상태값 저장 방식 후보

9단계에서는 DB enum보다 `text + check constraint` 후보를 우선 검토한다.

이유:

- 초기 상태값이 변할 수 있다.
- enum은 추후 변경 migration이 더 무거울 수 있다.
- 현재 단계는 실행 전 draft다.

### Project visibility 후보

```sql
visibility_status text not null default 'private'
check (visibility_status in ('private', 'link_shared', 'public'))
```

### Project lifecycle 후보

```sql
lifecycle_status text not null default 'idea'
check (lifecycle_status in ('idea', 'building', 'testing', 'beta', 'operating', 'paused', 'ended'))
```

### Change Card work status 후보

```sql
work_status text not null default 'draft'
check (work_status in ('draft', 'editing', 'approved', 'held'))
```

### Change Card visibility 후보

```sql
visibility_status text not null default 'internal'
check (visibility_status in ('internal', 'publishable', 'published'))
```

### Change Card sensitivity 후보

```sql
sensitivity_status text not null default 'normal'
check (sensitivity_status in ('normal', 'sensitive'))
```

### AI Draft status 후보

```sql
status text not null default 'generated'
check (status in ('generating', 'generated', 'editing', 'converted_to_change_card', 'held', 'failed'))
```

### Feedback review / visibility 후보

```sql
review_status text not null default 'new'
check (review_status in ('new', 'reviewing', 'reflected', 'not_reflected')),
visibility_status text not null default 'internal_review'
check (visibility_status in ('internal_review', 'public_selected'))
```

## 4. updated_at trigger 후보

```sql
-- 검토용 초안: 실행 금지
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

실제 적용 전에는 schema, security, search_path 설정을 검토한다.

## 5. auth.uid() 사용 후보

Supabase Auth 기반 RLS에서 현재 로그인 사용자를 식별할 때 `auth.uid()` 후보를 사용한다.

```sql
-- 검토용 조건 예시: 실행 금지
auth.uid() = user_profiles.auth_user_id
```

## 6. current user profile 조회 helper 후보

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

추가 검토 필요:

- `security definer` 여부
- RLS 재귀 위험
- 성능
- authenticated role에서의 접근 권한
