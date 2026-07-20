# Seed Actor Context Patch

## 문제

`feedbacks` fixture는 `author_user_profile_id`가 현재 `auth.uid()`에 대응하는 `user_profiles.id`와 일치해야 한다.
기존 seed script는 이 actor context를 설정하지 않아 valid baseline feedback 생성 중 `SEED_FAIL`이 발생했다.

## patch 원칙

- `user_profiles`, `builder_profiles`, `projects`, `rough_notes`, `ai_structured_drafts`, `change_cards`, `feedback_requests`는 fixture setup 성격으로 유지한다.
- `feedbacks` baseline fixture insert는 actor별 transaction에서 수행한다.
- invalid spoofing fixture는 seed하지 않는다.
- spoofing은 별도 P0 script에서 expected deny로 검증한다.

## feedback_author authored feedback

`feedback_author`가 작성한 baseline feedback은 다음 context에서 insert한다.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
-- author_user_profile_id = 10000000-0000-0000-0000-000000000103
insert into public.feedbacks (...);
commit;
reset role;
```

## owner authored feedback 후보

owner authored feedback이 필요한 경우 다음 context를 사용한다.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
-- author_user_profile_id = 10000000-0000-0000-0000-000000000101
insert into public.feedbacks (...);
commit;
reset role;
```

현재 patch에서는 P0 public-safe view baseline을 위해 `feedback_author` authored feedback 2개를 생성한다.

## 반영 파일

- `scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql`
- `scripts/manual-local-rls/phase20_05_feedback_author_spoofing_p0.sql`

## 남은 검증

20단계 재실행에서 seed가 PASS해야 한다.
seed가 다시 실패하면 첫 번째 실패 로그만 가져와 다음 patch 대상으로 삼는다.
