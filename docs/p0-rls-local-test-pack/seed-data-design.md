# Seed Data Design

## seed 원칙

- 모든 seed는 local DB 전용이다.
- remote DB에 적용하면 안 된다.
- fixed UUID를 사용한다.
- 반복 실행을 위해 local fixture UUID 범위만 cleanup한다.
- 실행 전 `supabase db reset` 상태가 가장 안전하다.

## actor fixture

| Actor | auth_user_id | user_profile_id | builder_profile_id |
|---|---|---|---|
| owner | `00000000-0000-0000-0000-000000000101` | `10000000-0000-0000-0000-000000000101` | `20000000-0000-0000-0000-000000000101` |
| non-owner | `00000000-0000-0000-0000-000000000102` | `10000000-0000-0000-0000-000000000102` | `20000000-0000-0000-0000-000000000102` |
| feedback author | `00000000-0000-0000-0000-000000000103` | `10000000-0000-0000-0000-000000000103` | 없음 |
| link shared user | `00000000-0000-0000-0000-000000000104` | `10000000-0000-0000-0000-000000000104` | 없음 |

## Project fixture

- owner private project: `30000000-0000-0000-0000-000000000101`
- owner public project: `30000000-0000-0000-0000-000000000102`
- non-owner public project: `30000000-0000-0000-0000-000000000103`
- owner link_shared project candidate: `30000000-0000-0000-0000-000000000104`

## Decision record fixture

- rough note for public project
- AI structured draft for public project
- approved + published + normal Change Card for public project
- approved + published + sensitive Change Card for public project
- draft Change Card for public project
- internal Change Card for public project
- approved + published + normal Change Card for private project

## Feedback fixture

- public Feedback Request for public project
- internal Feedback Request for public project
- Change Card-level Feedback Request for public Change Card
- public_selected Feedback
- internal_review Feedback

## 실제 SQL 위치

Seed 구현 후보는 `scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql`에 있다.

## 20단계 seed actor context patch

`feedbacks` fixture는 `prevent_feedback_author_spoofing` trigger 또는 동일 검증 로직 때문에 반드시 작성자 actor context에서 insert해야 한다.

- `feedback_author` baseline feedback은 `request.jwt.claim.sub = 00000000-0000-0000-0000-000000000103` context에서 insert한다.
- `author_user_profile_id`는 `10000000-0000-0000-0000-000000000103`을 사용한다.
- intentionally invalid spoofing row는 seed하지 않는다.
- spoofing 차단은 `phase20_05_feedback_author_spoofing_p0.sql`에서 expected deny로 검증한다.
