# Problem / Hypothesis Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `problem_definitions`
- `hypotheses`

## 2. 원칙

- 현재값 중심으로 저장한다.
- 과거 이력은 Change Card에서 추적한다.
- 공개 페이지에는 공개 가능한 현재값만 노출한다.
- 민감한 문제 정의/가설은 공개하지 않는 방향을 검토한다.

## 3. problem_definitions SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table problem_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  current_statement text not null,
  context text,
  is_public_candidate boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);
```

## 4. hypotheses SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table hypotheses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  statement text not null,
  status text not null default 'assumed'
    check (status in ('assumed', 'validating', 'partially_validated', 'validated', 'refuted', 'held')),
  is_public_candidate boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 5. RLS 연결 정책

- Project Owner는 read/update 가능
- 비공개 Project의 Problem/Hypothesis는 외부 차단
- 전체 공개 Project에서는 public-safe view를 통해 공개 후보만 노출
- 링크 공개 Project에서는 secure RPC 응답에 포함 후보

## 6. 공개 상태 추가 여부

Problem/Hypothesis 자체 visibility 필드를 둘지 여부는 추가 검토 필요다. 1차에서는 Project 공개 상태와 `is_public_candidate` 후보 조합으로 충분한지 검토한다.

## 7. 추가 검토 필요 사항

- `unique(project_id)`를 problem_definitions에 둘지
- 여러 문제 정의를 동시에 허용할지
- Hypothesis 공개 후보 필드를 별도로 둘지
