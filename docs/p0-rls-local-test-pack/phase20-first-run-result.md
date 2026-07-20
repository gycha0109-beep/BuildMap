# 20단계 첫 실행 결과

## 목적

이 문서는 사용자가 로컬 PC에서 실행한 `phase20` P0 RLS local script pack의 첫 실행 결과를 기록한다.
이번 기록은 remote Supabase 적용 결과가 아니며, production/staging/remote DB에는 어떤 SQL도 실행하지 않았다.

## 실행 정보

- 실행 위치: BuildMap phase19 package의 BuildMap 루트
- local DB container: `supabase_db_buildmap`
- wrapper: `scripts/manual-local-rls/run-phase20-p0-local.ps1`
- remote command: 없음
- hosted Supabase SQL Editor 사용: 없음
- secret/token/password/DB URL 노출: 없음

## preflight 결과

`phase20_00_preflight.sql` 실행은 성공했다.

- exit code: `0`
- `PRE-001 current_database = postgres`
- `PRE-002 current_user = postgres`
- `PRE-003 anon auth.uid null = PASS`
- `PRE-004 Method A owner auth.uid = PASS`
- `PRE-005 table exists user_profiles = true`
- `PRE-006 table exists builder_profiles = true`
- `PRE-007 table exists projects = true`
- `PRE-008 table exists change_cards = true`
- `PRE-009 table exists feedbacks = true`
- `PRE-010 view exists public_feedbacks = true`
- `PRE-011 helper exists current_user_profile_id = true`
- `PRE-012 helper exists is_project_owner = true`
- `PRE-013 helper exists can_insert_feedback = true`

## RLS enabled 확인

다음 대상에서 RLS enabled 상태가 확인되었다.

- `ai_structured_drafts = true`
- `change_cards = true`
- `feedback_requests = true`
- `feedbacks = true`
- `projects = true`
- `rough_notes = true`

## 실패 위치

- 실패 파일: `scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql`
- 실패 단계: seed fixture 생성 중 `feedbacks` baseline fixture insert

## 실패 로그

```text
ERROR: Feedback author_user_profile_id must match the current user profile.
```

## 판정

- 분류: `SEED_FAIL`
- P0 RLS 본 테스트 진입 여부: 미진입
- RLS behavior 실패 여부: 아직 판단하지 않음
- 보안 trigger 해석: `Feedback author spoofing` 방지 로직이 동작한 것으로 해석 가능

## 결론

20단계 첫 실행은 preflight까지는 통과했으나, seed script가 valid feedback fixture를 만들 때 actor context를 설정하지 않아 중단되었다. 따라서 이번 실패는 P0 본 테스트 실패가 아니라 seed script patch 대상이다.
