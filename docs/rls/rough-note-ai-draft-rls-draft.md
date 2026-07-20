# Rough Note / AI Draft RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 핵심 원칙

Rough Note와 AI Draft는 모든 공개 정책에서 제외한다. Project가 전체 공개이거나 링크 공개여도 Rough Note와 AI Draft는 공개 페이지, 공개 Timeline, Scout 탐색 화면에 노출하지 않는다.

## 2. ROUGH_NOTE_INSERT_OWNER_01

```sql
-- draft only
create policy rough_note_insert_owner
on rough_notes
for insert
to authenticated
with check (
  is_project_owner(project_id, auth.uid())
);
```

- 관련 Test Case ID: `RNAI-RN-001`

## 3. ROUGH_NOTE_SELECT_OWNER_01

```sql
-- draft only
create policy rough_note_select_owner
on rough_notes
for select
to authenticated
using (
  is_project_owner(project_id, auth.uid())
);
```

- 관련 Test Case ID: `RNAI-RN-002`, `RNAI-RN-003`, `RNAI-RN-004`, `RNAI-RN-005`, `RNAI-RN-006`
- anon 정책은 만들지 않는다.

## 4. ROUGH_NOTE_UPDATE_OWNER_UNCONVERTED_01

```sql
-- draft only
create policy rough_note_update_owner_unconverted
on rough_notes
for update
to authenticated
using (
  is_project_owner(project_id, auth.uid())
  and converted_change_card_id is null
)
with check (
  is_project_owner(project_id, auth.uid())
  and converted_change_card_id is null
);
```

- 관련 Test Case ID: `RNAI-RN-007`, `RNAI-RN-008`
- Change Card로 전환된 Rough Note는 수정 제한을 우선 검토한다.

## 5. AI_DRAFT_INSERT_OWNER_01

```sql
-- draft only
create policy ai_draft_insert_owner
on ai_structured_drafts
for insert
to authenticated
with check (
  is_project_owner(project_id, auth.uid())
);
```

- 관련 Test Case ID: `RNAI-AI-001`, `RNAI-AI-007`

## 6. AI_DRAFT_SELECT_OWNER_01

```sql
-- draft only
create policy ai_draft_select_owner
on ai_structured_drafts
for select
to authenticated
using (
  is_project_owner(project_id, auth.uid())
);
```

- 관련 Test Case ID: `RNAI-AI-002`, `RNAI-AI-003`, `RNAI-AI-004`, `RNAI-AI-005`, `RNAI-AI-006`
- AI Draft는 공식 기록이 아니다.
- AI Draft가 Change Card로 전환되어도 AI Draft 자체는 공개하지 않는다.

## 7. AI_DRAFT_UPDATE_OWNER_01

```sql
-- draft only
create policy ai_draft_update_owner
on ai_structured_drafts
for update
to authenticated
using (is_project_owner(project_id, auth.uid()))
with check (is_project_owner(project_id, auth.uid()));
```

- 추가 검토 필요: `draft_status = 'converted_to_change_card'` 이후 수정 제한 여부.
