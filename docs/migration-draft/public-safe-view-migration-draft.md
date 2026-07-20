# Public-safe View Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 목적

public-safe view는 공개 응답에서 원천 테이블 row 전체가 노출되는 것을 막기 위한 후보다.

RLS는 row 접근 제어 중심이다. 공개 row select가 허용되어도 컬럼 제한이 없으면 내부 식별자, token hash, 작성자 ID 같은 민감 정보가 노출될 수 있다.

## 2. view 후보 목록

- `public_project_cards`
- `public_project_pages`
- `public_decision_timeline`
- `public_change_cards`
- `public_feedback_requests`
- `public_feedbacks`
- `public_builder_profiles`
- `public_project_links`

## 3. public_project_cards 후보

```sql
-- 검토용 초안: 실행 금지
create view public_project_cards
with (security_invoker = true)
as
select
  p.public_slug,
  p.title,
  p.one_line_description,
  p.current_need_summary,
  p.lifecycle_status,
  p.last_activity_at,
  bp.public_name as builder_name
from projects p
join builder_profiles bp on bp.id = p.owner_builder_profile_id
where p.visibility_status = 'public'
  and p.archived_at is null;
```

주의: 실제 Supabase/PostgreSQL 버전에서 `security_invoker` 동작과 RLS 적용을 반드시 검증한다.

## 4. public_change_cards 후보

```sql
-- 검토용 초안: 실행 금지
create view public_change_cards
with (security_invoker = true)
as
select
  cc.id,
  p.public_slug,
  cc.type,
  cc.title,
  cc.structured_summary,
  cc.evidence,
  cc.decision,
  cc.change_content,
  cc.next_check,
  cc.importance,
  cc.approved_at
from change_cards cc
join projects p on p.id = cc.project_id
where p.visibility_status = 'public'
  and cc.work_status = 'approved'
  and cc.visibility_status = 'published'
  and cc.sensitivity_status = 'normal'
  and cc.archived_at is null;
```

## 5. public_feedbacks 후보

```sql
-- 검토용 초안: 실행 금지
create view public_feedbacks
with (security_invoker = true)
as
select
  f.id,
  fr.id as feedback_request_id,
  case
    when f.public_author_display_mode = 'anonymous' then '익명 피드백'
    else '맥락 기반 피드백'
  end as public_author_label,
  f.feedback_type,
  f.body,
  f.created_at
from feedbacks f
join feedback_requests fr on fr.id = f.feedback_request_id
join projects p on p.id = fr.project_id
where p.visibility_status = 'public'
  and fr.visibility_status = 'public'
  and f.visibility_status = 'public_selected'
  and f.archived_at is null;
```

## 6. 절대 포함하지 않을 컬럼 후보

- 이메일
- auth ID
- 내부 user ID
- `author_user_profile_id`
- `owner_user_profile_id`
- `share_token_hash`
- Rough Note 원문
- AI Draft 본문
- 내부 검토 상태

## 7. view owner / RLS 우회 위험

View는 생성자 권한, security invoker 여부, underlying table RLS 적용 방식에 따라 보안 결과가 달라질 수 있다.

따라서 migration 전 다음을 검증한다.

- `security_invoker = true` 사용 가능 여부
- view에 대한 anon/select grant 범위
- underlying table의 RLS 적용 여부
- view가 원천 테이블 RLS를 우회하지 않는지

## 8. 추가 검토 필요 사항

- public-safe view 대신 API 조합으로 갈지
- 링크 공개 데이터는 view가 아니라 secure RPC로 분리할지
- view 결과에 id를 얼마나 노출할지
