# Rough Note / AI Draft Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `rough_notes`
- `ai_structured_drafts`

## 2. 기본 원칙

- Rough Note와 AI Draft는 기본 비공개 내부 기록이다.
- 외부 공개 정책에서 완전히 제외한다.
- AI Draft는 공식 기록이 아니라 Change Card 후보 초안이다.
- Change Card로 전환된 Rough Note 수정은 제한 후보를 둔다.

## 3. rough_notes SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table rough_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_builder_profile_id uuid not null references builder_profiles(id),
  body text not null,
  converted_change_card_id uuid,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

`converted_change_card_id`는 `change_cards` 생성 이후 FK로 보강할 수 있다. 순환 의존성 때문에 실제 migration 순서 검토가 필요하다.

## 4. ai_structured_drafts SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table ai_structured_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  rough_note_id uuid references rough_notes(id),
  requested_by_builder_profile_id uuid not null references builder_profiles(id),
  draft_type text,
  title_candidate text,
  structured_summary text,
  evidence text,
  decision text,
  change_content text,
  next_check text,
  status text not null default 'generated'
    check (status in ('generating', 'generated', 'editing', 'converted_to_change_card', 'held', 'failed')),
  converted_change_card_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

## 5. 수정 제한 후보

- 전환 전 Rough Note: Project Owner 수정 가능 후보
- Change Card로 전환된 Rough Note: 수정 제한 우선 검토
- AI Draft: Change Card로 전환 후 공식 기록이 아님. 공개하지 않음

## 6. RLS 연결 정책

- Project Owner 중심 read/insert/update
- 외부 read 차단
- 공개 Project에서도 노출 차단

## 7. 추가 검토 필요 사항

- Rough Note 원문 snapshot을 Change Card에 저장할지
- 순환 FK를 어떻게 처리할지
- AI Draft 실패 상태 보관 정책
