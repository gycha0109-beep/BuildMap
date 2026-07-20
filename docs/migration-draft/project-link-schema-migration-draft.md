# Project Link Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `project_links`

Project Link는 1차 선택 데이터로 포함 가능하다. 자동 GitHub/Notion 연동이 아니라 단순 링크 저장이다.

## 2. SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  url text not null,
  link_type text,
  visibility_status text not null default 'public'
    check (visibility_status in ('internal', 'public')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

## 3. RLS 연결 정책

- Project Owner만 생성/수정/보관 가능
- 공개 Project Page에는 `visibility_status = public`인 link만 노출
- 내부 링크는 외부에 노출하지 않음

## 4. public-safe view 연결

`public_project_links` view 후보는 다음만 노출한다.

- project public 식별자 후보
- label
- url
- link_type
- sort_order

## 5. 추가 검토 필요 사항

- URL 검증 정책
- 링크 타입을 check constraint로 둘지 여부
- 악성 URL 신고/관리자 권한은 후순위
