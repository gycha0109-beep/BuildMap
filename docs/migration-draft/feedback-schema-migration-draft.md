# Feedback Schema Migration Draft

> 주의: 이 문서의 SQL은 검토용 초안이다. 실제 Supabase migration 파일이 아니며, 아직 실행하거나 적용하지 않는다. 실제 적용 전 Supabase/PostgreSQL 문법, 보안, RLS 동작을 별도로 검증해야 한다.

## 1. 대상 후보

- `feedback_requests`
- `feedbacks`

Feedback은 일반 댓글이 아니라 Feedback Request를 통해 생성되는 판단 근거다.

## 2. feedback_requests SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table feedback_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  change_card_id uuid references change_cards(id),
  created_by_builder_profile_id uuid not null references builder_profiles(id),
  title text not null,
  question text not null,
  context text,
  visibility_status text not null default 'internal'
    check (visibility_status in ('internal', 'public')),
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

1차 대상은 Project 또는 Change Card 중심이다. Problem/Hypothesis 대상 피드백은 Project-level 요청의 질문/context로 표현한다.

## 3. feedbacks SQL 초안

```sql
-- 검토용 초안: 실행 금지
create table feedbacks (
  id uuid primary key default gen_random_uuid(),
  feedback_request_id uuid not null references feedback_requests(id) on delete cascade,
  project_id uuid references projects(id),
  author_user_profile_id uuid not null references user_profiles(id),
  body text not null,
  feedback_type text,
  tester_interest boolean not null default false,
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewing', 'reflected', 'not_reflected')),
  visibility_status text not null default 'internal_review'
    check (visibility_status in ('internal_review', 'public_selected')),
  public_author_display_mode text not null default 'anonymous'
    check (public_author_display_mode in ('anonymous', 'role_context')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

## 4. 필수 보안 조건

- 비로그인 Feedback 차단
- Feedback Request 없이 Feedback 생성 차단
- `author_user_profile_id`는 현재 auth user의 user profile이어야 한다.
- Feedback 작성 조건에는 Project 접근 조건이 포함되어야 한다.
- 링크 공개 Feedback 작성에는 유효 `share_token` + 로그인 사용자 + 공개 Feedback Request 조건이 필요하다.
- 공개 Feedback 원천 row 전체 직접 공개 금지
- 공개 응답에서 `author_user_profile_id`, 이메일, auth ID 노출 금지

## 5. public-safe view 연결

`public_feedbacks` view 후보는 다음만 노출한다.

- feedback id 후보 또는 public id 후보
- feedback request id 후보
- body 또는 요약 후보
- feedback_type
- public_author_display_mode 기반 표시 문자열
- created_at

내부 식별자는 제외한다.

## 6. secure RPC 연결 후보

`create_link_shared_feedback` RPC에서 다음을 검증한다.

```text
로그인 사용자
+ 유효 share_token
+ Project link_shared 상태
+ 공개 Feedback Request
+ author_user_profile_id = current_user_profile_id()
```

## 7. 추가 검토 필요 사항

- `project_id`를 feedbacks에 중복 저장할지 여부
- Feedback 작성 후 수정 허용 여부
- 공개 Feedback 작성자 표시 동의 UX
