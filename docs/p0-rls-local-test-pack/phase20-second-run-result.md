# Phase20 두 번째 실행 결과

## 목적

이 문서는 사용자가 로컬 PC에서 수행한 `phase20` P0 RLS wrapper 두 번째 실행 결과를 기록한다.
이번 문서는 remote 적용 결과가 아니며, hosted Supabase SQL Editor나 production/staging DB 실행 결과도 아니다.

## 실행 정보

| 항목 | 값 |
|---|---|
| 실행 wrapper | `scripts/manual-local-rls/run-phase20-p0-local.ps1` |
| local DB container | `supabase_db_BuildMap` |
| remote command | 없음 |
| hosted SQL Editor | 사용 안 함 |
| secret/token/password/DB URL 노출 | 없음 |

## preflight 결과

`phase20_00_preflight.sql`은 성공했다.

| 항목 | 결과 |
|---|---|
| ExitCode | `0` |
| `PRE-001 current_database` | `postgres` |
| `PRE-002 current_user` | `postgres` |
| `PRE-003 anon auth.uid null` | PASS |
| `PRE-004 Method A owner auth.uid` | PASS |
| 주요 source table 존재 | PASS |
| `public_feedbacks` view 존재 | PASS |
| `current_user_profile_id`, `is_project_owner`, `can_insert_feedback` helper 존재 | PASS |
| RLS enabled 확인 | PASS |

RLS enabled가 확인된 table:

```text
ai_structured_drafts
change_cards
feedback_requests
feedbacks
projects
rough_notes
```

## seed 결과

`phase20_01_seed_p0_fixture.sql`은 성공했다.

| 항목 | 결과 |
|---|---|
| ExitCode | `0` |
| `SEED-FB-CTX-001 feedback_author auth.uid` | PASS |
| `auth_uid` | `00000000-0000-0000-0000-000000000103` |
| `current_user_profile_id` | `10000000-0000-0000-0000-000000000103` |

fixture count:

| fixture | count |
|---|---:|
| `auth.users` | 4 |
| `user_profiles` | 4 |
| `projects` | 4 |
| `change_cards` | 5 |
| `feedbacks` | 2 |

## 이전 SEED_FAIL 해결

20단계 첫 실행에서 발생한 `Feedback author_user_profile_id must match the current user profile.` 오류는 해결되었다.
`feedbacks` baseline fixture insert가 `feedback_author` actor context에서 실행되면서 `author_user_profile_id`와 `current_user_profile_id()`가 일치했다.

## 새 실패

| 항목 | 값 |
|---|---|
| 실패 파일 | `phase20_02_project_access_p0.sql` |
| 실패 지점 | Project access P0 테스트 초입 |
| 오류 | `ERROR: permission denied for table projects` |
| P0 본 테스트 진행 상태 | Project access 초입에서 중단 |

## 해석

이 오류는 이전 seed actor context 오류와 다른 새로운 오류다.
이번 오류는 RLS row policy의 allow/deny 결과가 아니라 PostgreSQL table privilege 검사 단계에서 차단된 것이다.
즉, 해당 query는 RLS policy 평가까지 도달하지 못했다.

## 분류

최종 분류는 다음 두 가지를 함께 사용한다.

| 분류 | 의미 |
|---|---|
| `ACCESS_PATH_MISMATCH` | anon public read 시나리오가 public-safe view 대신 source table `public.projects`를 직접 조회했다. |
| `GRANT_FAIL` | authenticated source-table RLS 테스트에 필요한 최소 privilege가 없을 경우 적용되는 분류다. 이번 로그의 직접 실패는 anon source table path에서 발생한 것으로 본다. |

## remote 미적용 확인

이번 실행에서도 remote 적용은 없었다.
`supabase link`, `supabase db push`, `supabase db pull`, hosted SQL Editor, production/staging DB는 사용하지 않았다.
