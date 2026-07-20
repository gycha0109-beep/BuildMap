# Profile Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `user_profiles`
- `builder_profiles`
- `scout_profiles` 후보 또는 후순위 제외

## 2. 권장 관계

```text
auth.users
→ user_profiles
→ builder_profiles
→ scout_profiles 후보
```

`auth.users`는 인증 원천이고, 공개 표시 정보와 Builder 역할 정보는 별도 제품 데이터로 둔다.

## 3. user_profiles 후보

### 목적

앱 사용자 표시 정보, 내부 사용자 상태, 약관/상태 후보를 담는다.

### 필드 후보

| 필드 후보 | 의미 | 공개 여부 |
|---|---|---|
| `id` | 앱 사용자 profile ID | 공개 응답 노출 금지 |
| `auth_user_id` | Supabase auth user 참조 후보 | 공개 응답 노출 금지 |
| `display_name` | 표시명 | 제한 공개 후보 |
| `handle` | 사용자 식별 핸들 후보 | 공개 가능 후보 |
| `created_at`, `updated_at` | 생성/수정 시점 | 내부 중심 |
| `archived_at` | 보관 후보 | 비공개 |

### SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id),
  display_name text,
  handle text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

## 4. builder_profiles 후보

### 목적

Builder 역할 데이터를 담는다. Builder는 프로젝트를 만든 사람이 아니라 성장시키는 사람이다.

### 필드 후보

| 필드 후보 | 의미 | 공개 여부 |
|---|---|---|
| `id` | Builder profile ID | 공개 응답에서 직접 노출 금지 후보 |
| `user_profile_id` | user profile 참조 | 공개 응답 노출 금지 |
| `public_name` | 공개 Builder 이름 | 공개 가능 |
| `bio` | 공개 소개 | 공개 가능 |
| `role_tags` | 역할 태그 후보 | 공개 가능 후보 |
| `interest_tags` | 관심 분야 후보 | 공개 가능 후보 |
| `is_public` | 공개 프로필 여부 후보 | 공개 정책에 영향 |
| `created_at`, `updated_at` | 시점 | 내부 중심 |

### SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table builder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references user_profiles(id),
  public_name text not null,
  bio text,
  role_tags text[] default '{}',
  interest_tags text[] default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_profile_id)
);
```

## 5. scout_profiles 후보

Scout Profile은 1차 필수가 아니다. 로그인 사용자 기반으로 공개 Project를 읽고 Feedback을 작성하는 흐름만으로 시작할 수 있다.

```sql
-- 후순위 후보: 1차 migration에서는 제외 가능
create table scout_profiles (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references user_profiles(id),
  interest_tags text[] default '{}',
  purpose_tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_profile_id)
);
```

## 6. RLS 연결 정책

- user profile 자기 읽기/수정
- Builder 공개 profile 읽기
- 이메일, auth ID, 내부 user ID 공개 금지

## 7. public-safe view 필요 여부

`public_builder_profiles` view 후보에서 내부 ID와 auth 관련 필드를 제외한다.

## 8. 추가 검토 필요 사항

- `handle`을 1차에서 사용할지 여부
- `builder_profiles.id`를 공개 응답에 포함할지 여부
- `scout_profiles`를 실제 1차 migration에 포함할지 여부
