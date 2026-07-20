# Project Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `projects`

Project는 제품 소개글이 아니라 문제 정의, 가설, 변화 카드, 공개 뷰를 묶는 컨테이너다.

## 2. 필드 후보

| 필드 후보 | 의미 | 공개 가능성 |
|---|---|---|
| `id` | Project ID | 공개 응답 직접 노출은 신중 |
| `owner_builder_profile_id` | Project Owner Builder | 공개 응답에서는 내부 ID 제외 |
| `title` | 프로젝트명 | 공개 가능 |
| `one_line_description` | 한 줄 정의 | 공개 가능 |
| `current_need_summary` | 현재 필요한 것 요약 | 공개 가능 |
| `lifecycle_status` | 진행 상태 | 공개 가능 후보 |
| `visibility_status` | 공개 상태 | 정책에 사용 |
| `public_slug` | 전체 공개용 읽기 쉬운 경로 후보 | 보안 토큰 아님 |
| `share_token_hash` | 링크 공개 token hash 후보 | 절대 공개 금지 |
| `share_token_rotated_at` | token 재발급 시점 | 비공개 |
| `share_token_revoked_at` | token 폐기 시점 | 비공개 |
| `last_activity_at` | 탐색 정렬용 활동 시점 후보 | 파생/저장 추가 검토 |
| `created_at`, `updated_at` | 시점 | 일부 공개 가능 |
| `archived_at` | 보관 후보 | 비공개 |

## 3. SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_builder_profile_id uuid not null references builder_profiles(id),
  title text not null,
  one_line_description text,
  current_need_summary text,
  lifecycle_status text not null default 'idea'
    check (lifecycle_status in ('idea', 'building', 'testing', 'beta', 'operating', 'paused', 'ended')),
  visibility_status text not null default 'private'
    check (visibility_status in ('private', 'link_shared', 'public')),
  public_slug text unique,
  share_token_hash text unique,
  share_token_rotated_at timestamptz,
  share_token_revoked_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

## 4. check / unique 후보

- `visibility_status in ('private', 'link_shared', 'public')`
- `lifecycle_status in (...)`
- `public_slug unique`
- `share_token_hash unique` 후보

## 5. 보안 원칙

- `public_slug`는 보안 토큰이 아니다.
- `share_token` 원문은 저장하지 않는다.
- 링크 공개 접근은 `share_token_hash` 검증 후보를 사용한다.
- Project가 `private`이면 token이 맞아도 접근 차단한다.

## 6. RLS 연결 정책

- Project Owner는 자신의 Project read/update 가능
- 전체 공개 Project는 public-safe view를 통해 제한 공개 후보
- 링크 공개 Project는 secure RPC 후보
- 원천 `projects`에 대한 넓은 anon select는 피한다.

## 7. 추가 검토 필요 사항

- `last_activity_at`을 실제 저장할지 파생할지
- `share_token_hash` hash 알고리즘
- token hash unique 필요 여부
- `public_slug` 생성 정책
