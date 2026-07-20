# Change Card Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `change_cards`

Change Card는 BuildMap의 핵심 원천 기록이다. Decision Timeline은 별도 원천 테이블이 아니라 승인된 Change Card에서 파생된다.

## 2. 필드 후보

| 필드 후보 | 의미 | 비고 |
|---|---|---|
| `id` | Change Card ID | 원천 기록 ID |
| `project_id` | Project 참조 | 필수 후보 |
| `author_builder_profile_id` | 작성 Builder | 필수 후보 |
| `approved_by_builder_profile_id` | 승인 Builder 후보 | 1차는 Project Owner 중심 |
| `rough_note_id` | 원문 메모 참조 | 강력 권장 |
| `ai_draft_id` | AI Draft 참조 | 선택/권장 |
| `type` | 변화 카드 유형 | 필수 후보 |
| `title` | 제목 | 필수 후보 |
| `structured_summary` | 구조화 요약 | 필수 후보 |
| `evidence` | 근거 | 승인 시 강력 권장 |
| `decision` | 판단 | 승인 시 강력 권장 |
| `change_content` | 변경 내용 | 권장 |
| `next_check` | 다음 확인 사항 | 승인 시 강력 권장 |
| `linked_problem_definition_id` | 문제 정의 연결 후보 | 선택 |
| `linked_hypothesis_id` | 가설 연결 후보 | 선택 |
| `linked_feedback_id` | 피드백 연결 후보 | 선택 |
| `work_status` | 초안/승인 상태 | 공개 조건에 필요 |
| `visibility_status` | 내부/공개 후보/공개 | 공개 조건에 필요 |
| `sensitivity_status` | 일반/민감 | 공개 조건에 필요 |
| `importance` | 일반/핵심 전환 후보 | 선택 |
| `approved_at` | 승인 시점 | 승인 시 필요 후보 |
| `created_at`, `updated_at` | 시점 | 필수 후보 |
| `archived_at` | 보관 후보 | 선택 |

## 3. SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table change_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_builder_profile_id uuid not null references builder_profiles(id),
  approved_by_builder_profile_id uuid references builder_profiles(id),
  rough_note_id uuid references rough_notes(id),
  ai_draft_id uuid references ai_structured_drafts(id),
  type text not null,
  title text not null,
  structured_summary text not null,
  evidence text,
  decision text,
  change_content text,
  next_check text,
  linked_problem_definition_id uuid references problem_definitions(id),
  linked_hypothesis_id uuid references hypotheses(id),
  linked_feedback_id uuid,
  work_status text not null default 'draft'
    check (work_status in ('draft', 'editing', 'approved', 'held')),
  visibility_status text not null default 'internal'
    check (visibility_status in ('internal', 'publishable', 'published')),
  sensitivity_status text not null default 'normal'
    check (sensitivity_status in ('normal', 'sensitive')),
  importance text not null default 'normal'
    check (importance in ('normal', 'key_transition')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

`linked_feedback_id`는 `feedbacks` 생성 이후 FK를 추가하는 후보로 둔다.

## 4. 공개 읽기 조건

공개 Timeline에 노출되려면 다음을 모두 만족해야 한다.

```text
Project 공개 정책 만족
+ work_status = approved
+ visibility_status = published
+ sensitivity_status = normal
```

`publishable`은 공개가 아니다.
`sensitive`는 공개 Timeline 차단이다.

## 5. 승인된 Change Card 수정 제한 후보

승인된 Change Card의 다음 필드는 직접 수정 제한을 우선 검토한다.

- `structured_summary`
- `evidence`
- `decision`
- `change_content`
- `next_check`

공개 상태와 민감도는 Project Owner가 변경 가능 후보로 둔다.

## 6. trigger 후보

```sql
-- 검토용 pseudo SQL: 실행 금지
-- approved 상태의 본문/근거/판단/변경 내용이 변경되면 reject하는 trigger 후보
```

실제 trigger는 후속 단계에서 작성한다.

## 7. index 후보

- `(project_id, approved_at desc)`
- `(project_id, work_status, visibility_status, sensitivity_status, approved_at desc)`
- `linked_problem_definition_id`
- `linked_hypothesis_id`

## 8. 추가 검토 필요 사항

- 승인 시 `evidence`, `decision`, `next_check`를 DB 제약으로 강제할지
- 승인 후 수정 제한을 DB trigger로 둘지 application validation으로 시작할지
- `type`을 text+check로 둘지 별도 type table로 둘지
