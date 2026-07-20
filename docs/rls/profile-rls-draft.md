# Profile RLS 초안

> 주의: 아래 SQL은 검토용 초안이다. Supabase에 실행하지 않으며, migration 파일도 아니다. 실제 테이블명, 컬럼명, enum 값, helper function 이름은 후속 migration 단계에서 재검토한다.

## 1. 대상 후보

- `auth.users` 참조
- `user_profiles` 후보
- `builder_profiles`
- `scout_profiles` 후보

`auth.users`는 인증 원천이고, 공개/비공개 표시 정보는 앱 프로필 계층에서 분리한다.

## 2. USER_PROFILE_READ_SELF_01

- Policy ID: `USER_PROFILE_READ_SELF_01`
- 대상 테이블 후보: `user_profiles`
- 행위: select
- 목적: 로그인 사용자가 자신의 앱 사용자 프로필을 읽는다.

```sql
-- draft only
create policy user_profile_select_self
on user_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
);
```

- 허용 조건: `auth.uid()`와 user profile의 인증 사용자 참조가 일치한다.
- 차단 조건: 다른 사용자의 비공개 profile, 비로그인 방문자.
- 관련 Test Case ID: `PP-007`, `FB-PRIV-001`
- 추가 검토 필요: user profile 후보 테이블명, auth_user_id 필드명.

## 3. USER_PROFILE_UPDATE_SELF_01

```sql
-- draft only
create policy user_profile_update_self
on user_profiles
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());
```

- 목적: 로그인 사용자가 자신의 표시 정보만 수정한다.
- 차단: 이메일, auth ID, 내부 상태 등 공개/수정 대상이 아닌 필드는 별도 제약 필요.
- 관련 Test Case ID: `PP-007`

## 4. BUILDER_PROFILE_READ_PUBLIC_01

```sql
-- draft only
create policy builder_profile_select_public
on builder_profiles
for select
to anon, authenticated
using (
  is_public = true
);
```

- 목적: 공개 프로젝트 페이지에서 Builder가 공개한 Builder Profile 정보만 읽는다.
- 노출 가능: 공개 표시명, 소개, 역할 태그, 공개 관심 분야.
- 노출 금지: 이메일, 인증 ID, 내부 user ID.
- 관련 Test Case ID: `PP-006`, `PP-007`, `FB-PRIV-001`, `FB-PRIV-002`

## 5. BUILDER_PROFILE_UPDATE_SELF_01

```sql
-- draft only
create policy builder_profile_update_self
on builder_profiles
for update
to authenticated
using (
  user_profile_id in (
    select id from user_profiles where auth_user_id = auth.uid()
  )
)
with check (
  user_profile_id in (
    select id from user_profiles where auth_user_id = auth.uid()
  )
);
```

- 목적: Builder가 자신의 Builder Profile을 수정한다.
- 추가 검토 필요: Project Owner 권한과 Builder Profile 수정 권한의 관계.

## 6. SCOUT_PROFILE_POLICY_CANDIDATE

Scout Profile은 1차 선택 데이터다. 8단계에서는 실제 RLS 정책 초안을 강하게 확정하지 않는다.

```sql
-- candidate only, phase1 optional
-- scout_profiles는 1차 migration에서 제외 가능하다.
```

- 관련 Test Case ID: Scout는 공개 Project 읽기와 Feedback 작성자로 주로 처리한다.
- 상태: 후순위 또는 1차 선택.
