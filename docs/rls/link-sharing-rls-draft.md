# Link Sharing RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 링크 공개의 목적

링크 공개는 Project를 전체 공개하지 않고, 링크를 가진 사람에게만 공개 가능한 정보를 보여주는 접근 방식이다.

## 2. 전체 공개와 링크 공개의 차이

| 구분 | 전체 공개 | 링크 공개 |
|---|---|---|
| 접근 식별자 | `public_slug` 후보 | `share_token` 후보 |
| URL 성격 | 읽기 쉬운 공개 경로 | 추측 어려운 접근 식별자 |
| 보안 토큰 여부 | 아님 | 후보 |
| 접근 범위 | 누구나 공개 정보 읽기 | 유효 token 보유자만 공개 정보 읽기 |

## 3. public_slug와 share_token

- `public_slug`는 보안 토큰이 아니다.
- `share_token`은 링크 공개 접근 식별자 후보다.
- Project가 비공개로 전환되면 share_token 접근은 차단되어야 한다.
- share_token 재발급 시 기존 token은 무효화되어야 한다.

## 4. link_shared_project_read_candidate

```sql
-- draft only / not final
create policy project_select_link_shared
on projects
for select
to anon, authenticated
using (
  visibility_status = 'link_shared'
  and can_read_link_shared_project(id)
);
```

- 관련 Test Case ID: `LINK-001`~`LINK-012`, `PP-003`, `PP-004`
- 보안 위험: RLS에서 token을 안전하게 전달/검증하는 방식이 불명확하다.
- 추가 검토 필요:
  - token hash 저장 여부
  - token 원문 저장 금지
  - RPC에서 token을 검증하고 공개 데이터를 반환하는 방식
  - PostgREST request context에 token을 넣는 방식의 위험

## 5. link_shared_change_card_read_candidate

```sql
-- draft only / not final
create policy change_card_select_link_shared_public
on change_cards
for select
to anon, authenticated
using (
  work_status = 'approved'
  and visibility_status = 'published'
  and sensitivity_status = 'normal'
  and exists (
    select 1 from projects p
    where p.id = change_cards.project_id
      and p.visibility_status = 'link_shared'
      and can_read_link_shared_project(p.id)
  )
);
```

- 관련 Test Case ID: `LINK-013`, `LINK-014`, `CC-LINK-001`, `CC-LINK-002`

## 6. link_shared_feedback_request_read_candidate

```sql
-- draft only / not final
create policy feedback_request_select_link_shared_public
on feedback_requests
for select
to anon, authenticated
using (
  request_visibility_status = 'public'
  and exists (
    select 1 from projects p
    where p.id = feedback_requests.project_id
      and p.visibility_status = 'link_shared'
      and can_read_link_shared_project(p.id)
  )
);
```

- 관련 Test Case ID: `LINK-015`

## 7. link_shared_feedback_insert_candidate

```sql
-- draft only / not final
create policy feedback_insert_link_shared_logged_in
on feedbacks
for insert
to authenticated
with check (
  feedback_request_id is not null
  and can_create_feedback(feedback_request_id, auth.uid())
);
```

- 목적: 링크 공개 Project의 공개 Feedback Request에 로그인 사용자가 Feedback을 작성한다.
- 조건: 유효 share_token + 로그인 사용자 + 공개 Feedback Request.
- 관련 Test Case ID: `FB-LINK-002`, `FB-LINK-003`
- 추가 검토 필요: helper function에 share_token 접근 context를 어떻게 전달할지.

## 8. share_token 시나리오

| 시나리오 | 기대 |
|---|---|
| share_token 없음 | 차단 |
| 잘못된 share_token | 차단 |
| 폐기된 share_token | 차단 |
| 재발급 전 기존 token | 차단 |
| 재발급 후 새 token | 조건부 허용 |
| Project 비공개 전환 | token이 있어도 차단 |
| Project 전체 공개 전환 | public_slug 접근 허용 |
| 전체 공개→링크 공개 전환 | public_slug만으로 접근 차단 |

## 9. 8단계 결론

share_token 처리는 8단계에서 최종 확정하지 않는다. RLS SQL 작성 전에 반드시 해결해야 할 보안 과제로 남긴다.
