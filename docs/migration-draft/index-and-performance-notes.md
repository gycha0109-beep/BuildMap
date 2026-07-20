# Index and Performance Notes

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 기본 원칙

성능 최적화는 후순위지만, 공개 페이지와 Decision Timeline 조회에 필요한 기본 index 후보는 migration draft에 남긴다.

## 2. Project index 후보

```sql
-- 검토용 초안: 실행 금지
create index projects_owner_idx on projects(owner_builder_profile_id);
create index projects_visibility_idx on projects(visibility_status);
create unique index projects_public_slug_unique on projects(public_slug) where public_slug is not null;
create unique index projects_share_token_hash_unique on projects(share_token_hash) where share_token_hash is not null;
create index projects_last_activity_idx on projects(last_activity_at desc) where archived_at is null;
```

## 3. Change Card index 후보

```sql
-- 검토용 초안: 실행 금지
create index change_cards_project_idx on change_cards(project_id);
create index change_cards_public_timeline_idx
on change_cards(project_id, approved_at desc)
where work_status = 'approved'
  and visibility_status = 'published'
  and sensitivity_status = 'normal'
  and archived_at is null;
```

## 4. Feedback index 후보

```sql
-- 검토용 초안: 실행 금지
create index feedback_requests_project_idx on feedback_requests(project_id);
create index feedbacks_request_idx on feedbacks(feedback_request_id);
create index feedbacks_author_idx on feedbacks(author_user_profile_id);
```

## 5. Project Link index 후보

```sql
-- 검토용 초안: 실행 금지
create index project_links_project_idx on project_links(project_id, sort_order);
```

## 6. 주의 사항

- index는 실제 쿼리 패턴이 확정된 뒤 조정한다.
- public-safe view / secure RPC 설계에 따라 index가 달라질 수 있다.
- token hash index는 보안/운영 정책과 함께 검토한다.
