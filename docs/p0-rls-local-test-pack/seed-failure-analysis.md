# Seed 실패 원인 분석

## 오류 요약

- 오류 메시지: `Feedback author_user_profile_id must match the current user profile.`
- 실패 파일: `scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql`
- 실패 분류: `SEED_FAIL`

## 직접 원인

`feedbacks` fixture를 삽입할 때 현재 SQL session의 `auth.uid()` actor context가 `feedbacks.author_user_profile_id`와 일치하지 않았다.

`prevent_feedback_author_spoofing` trigger 또는 동일한 검증 로직은 다음 원칙을 강제한다.

```text
author_user_profile_id = current_user_profile_id()
```

그러나 기존 seed script는 fixture setup 흐름에서 `feedbacks` row를 bulk insert하면서 `feedback_author` actor context를 설정하지 않았다.

## 보안 해석

이 실패는 보안 로직이 깨졌다는 뜻이 아니다.
오히려 `Feedback author spoofing` 방지 로직이 seed 과정에서도 정상적으로 작동했음을 보여준다.

## RLS 본 테스트와의 관계

이번 실패는 P0 RLS 본 테스트 실패가 아니다.
Project access, Rough Note/AI Draft 차단, Change Card 공개 경계, public-safe view, approved Change Card trigger 시나리오는 아직 실행되지 않았다.

## patch 방향

- valid feedback baseline fixture는 해당 작성자 actor context에서 insert한다.
- `feedback_author` fixture는 `feedback_author_auth_user_id` context에서 insert한다.
- `owner` authored feedback이 필요하면 `owner_auth_user_id` context에서 insert한다.
- intentionally invalid spoofing row는 seed에 넣지 않는다.
- spoofing 차단 검증은 `phase20_05_feedback_author_spoofing_p0.sql`에서 `EXPECTED_DENY`로 실행한다.
