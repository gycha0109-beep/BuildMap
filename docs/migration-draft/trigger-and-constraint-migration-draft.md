# Trigger and Constraint Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. updated_at 자동 갱신 trigger 후보

```sql
-- 검토용 초안: 실행 금지
create trigger set_projects_updated_at
before update on projects
for each row execute function set_updated_at();
```

각 주요 테이블에 동일 패턴 후보를 적용할 수 있다.

## 2. 승인된 Change Card content mutation 제한 후보

승인된 Change Card의 본문/근거/판단/변경 내용 직접 수정은 제한하는 방향을 우선 검토한다.

```sql
-- 검토용 pseudo SQL: 실행 금지
create or replace function prevent_approved_change_card_content_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.work_status = 'approved' then
    if new.structured_summary is distinct from old.structured_summary
       or new.evidence is distinct from old.evidence
       or new.decision is distinct from old.decision
       or new.change_content is distinct from old.change_content
       or new.next_check is distinct from old.next_check then
      raise exception 'approved change card content cannot be directly changed';
    end if;
  end if;
  return new;
end;
$$;
```

`visibility_status`, `sensitivity_status`는 Project Owner가 변경 가능 후보로 둔다.

## 3. Feedback author spoofing 방지 후보

RLS `with check`와 helper에서 다음을 강제한다.

```text
author_user_profile_id = current_user_profile_id()
```

링크 공개 Feedback은 secure RPC에서 author를 서버 측으로 고정한다.

## 4. 상태값 check constraint 후보

각 테이블 문서의 상태값 check constraint를 사용한다.

## 5. public_slug / share_token_hash unique 후보

```sql
-- 검토용 초안: 실행 금지
create unique index projects_public_slug_unique on projects(public_slug) where public_slug is not null;
create unique index projects_share_token_hash_unique on projects(share_token_hash) where share_token_hash is not null;
```

## 6. feedback_request target constraint 후보

1차에서 Feedback Request 대상은 Project 또는 Change Card 중심이다.

```text
project_id는 필수
change_card_id는 선택
Problem/Hypothesis 직접 target은 후순위
```

## 7. 추가 검토 필요 사항

- 승인 후 수정 제한을 trigger로 실제 적용할지
- trigger가 운영상 너무 강한 제약이 되는지
- token hash unique가 필요한지
- soft delete와 unique constraint 충돌 여부
