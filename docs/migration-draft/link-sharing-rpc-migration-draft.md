# Link Sharing Secure RPC Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 목적

링크 공개 Project는 전체 공개과 다르다. `public_slug`만으로 접근하면 안 되며, 유효한 `share_token` 성격의 입력이 필요하다.

8.5단계 결정에 따라 링크 공개 데이터는 원천 테이블 직접 select보다 secure RPC 후보를 우선 검토한다.

## 2. share_token 원칙

- `share_token` 원문 저장 금지
- `share_token_hash` 저장 후보
- token 원문은 생성 시 1회 전달 후보
- token 재발급 시 기존 token 무효화
- Project가 private으로 전환되면 token이 맞아도 접근 차단

## 3. RPC 후보 목록

- `get_link_shared_project_page`
- `get_link_shared_decision_timeline`
- `get_link_shared_feedback_requests`
- `create_link_shared_feedback`

## 4. token hash 비교 후보

```sql
-- 검토용 pseudo SQL: 실행 금지
-- 입력 token을 DB 내부에서 hash 처리한 값과 projects.share_token_hash를 비교한다.
-- hash 알고리즘과 salt/pepper 사용 여부는 추가 검토 필요.
```

## 5. get_link_shared_project_page 후보

```sql
-- 검토용 초안: 실행 금지
create or replace function get_link_shared_project_page(
  p_project_id uuid,
  p_share_token text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_project projects;
begin
  -- 1. project 조회
  -- 2. visibility_status = 'link_shared' 확인
  -- 3. share_token_hash 검증
  -- 4. revoked 여부 확인
  -- 5. public-safe 응답만 조합해 반환
  -- 실제 구현 전 search_path, 권한, 로그 노출, token hash 검증 필요
  return '{}'::jsonb;
end;
$$;
```

## 6. create_link_shared_feedback 후보

```sql
-- 검토용 초안: 실행 금지
create or replace function create_link_shared_feedback(
  p_feedback_request_id uuid,
  p_share_token text,
  p_body text,
  p_feedback_type text default null,
  p_tester_interest boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_profile_id uuid;
  v_project_id uuid;
  v_feedback_id uuid;
begin
  -- 1. auth.uid()가 존재하는지 확인한다.
  -- 2. current_user_profile_id()를 가져온다.
  -- 3. feedback_request가 public인지 확인한다.
  -- 4. project가 link_shared인지 확인한다.
  -- 5. share_token_hash를 검증한다.
  -- 6. author_user_profile_id를 클라이언트 입력이 아닌 현재 사용자로 고정한다.
  -- 7. feedback row를 생성한다.
  return v_feedback_id;
end;
$$;
```

## 7. 관련 Test Case ID

- `LINK-002`
- `LINK-004`
- `LINK-005`
- `LINK-006`
- `LINK-011`
- `LINK-012`
- `FB-019`
- `FB-020`

## 8. 보안 위험

- token 원문 로그 노출
- `security definer` 함수의 search_path 위험
- 함수 권한 grant 범위 오류
- 원천 row 전체 반환 위험
- token hash 알고리즘 미확정

## 9. 추가 검토 필요 사항

- token hash 알고리즘
- RPC 반환 타입을 jsonb로 할지 composite type으로 할지
- API 계층에서 RPC를 감쌀지 여부
