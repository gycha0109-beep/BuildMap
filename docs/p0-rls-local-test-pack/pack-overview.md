# P0 RLS Local Test Pack 개요

## P0 테스트 목표

P0 테스트는 전체 RLS 매트릭스가 아니라 즉시 막아야 하는 보안/개인정보/무결성 blocker만 확인한다.

핵심 목표는 다음이다.

- private Project가 외부 actor에게 노출되지 않는지 확인한다.
- Rough Note와 AI Draft가 외부 actor에게 노출되지 않는지 확인한다.
- public Change Card는 `approved + published + normal + public project` 조건에서만 보이는지 확인한다.
- Feedback 작성자가 `author_user_profile_id`를 위조할 수 없는지 확인한다.
- public-safe view가 내부 식별자와 민감 컬럼을 노출하지 않는지 확인한다.
- 승인된 Change Card의 핵심 기록 필드를 직접 수정할 수 없는지 확인한다.

## local-only 실행 전제

- 실행 대상은 local Docker Supabase DB container다.
- PowerShell wrapper는 `supabase_db_BuildMap` 또는 `supabase_db_*` local container만 찾는다.
- remote DB URL, service role key, anon key, password를 입력받지 않는다.
- hosted Supabase SQL Editor를 사용하지 않는다.

## actor simulation method

- 기본: Method A `request.jwt.claim.sub`
- fallback: Method B `request.jwt.claims`
- 20단계 script는 Method A를 기본으로 사용한다.

## seed fixture 전략

- fixed UUID를 사용한다.
- local fixture 전용 UUID 범위만 cleanup한다.
- `feedbacks.project_id`는 저장하지 않는다.
- Feedback의 Project 관계는 `feedback_request_id -> feedback_requests.project_id`로 추적한다.

## failure strategy

- `UNEXPECTED_ALLOW`는 P0 security blocker다.
- 예상 denial은 `EXPECTED_DENY`로 기록한다.
- seed 실패는 본 테스트 중단 사유다.
- secret/token/password/DB URL 원문은 로그에 남기지 않는다.

## 20단계 첫 실행 이후 patch 반영

첫 실행 결과 preflight는 PASS했지만 seed 단계에서 `feedbacks.author_user_profile_id`와 현재 actor context가 불일치해 `SEED_FAIL`이 발생했다. 20단계 patch에서는 baseline feedback fixture를 `feedback_author` actor context에서 insert하도록 변경했다.

invalid spoofing fixture는 seed에서 만들지 않고, `phase20_05_feedback_author_spoofing_p0.sql`에서 `EXPECTED_DENY`로 검증한다.

## PATCH 21 access path / privilege boundary 반영

phase20 두 번째 실행에서 `permission denied for table projects`가 발생했다. 이를 단순 anon source table grant로 해결하지 않고, anon public read는 public-safe view로 이동하고 authenticated source table 테스트는 최소 privilege + RLS로 검증하도록 보정했다.

## Phase22 note

Phase22: public-safe view execution model은 Option A로 보정했다. anon public read는 public-safe view를 유지하고, anon source table direct privilege는 계속 금지한다.

## Phase22.5 pack coverage correction

Phase22.5 이후 P0 public-safe view runtime coverage는 `public_builder_profiles`를 포함한 8개 view를 대상으로 한다.
기존 security model은 변경하지 않고, script coverage gap만 보정했다.

## Phase23 signal scan correction note

Phase20 네 번째 로컬 실행은 사용자 제공 결과 기준으로 P0 PASS intake가 가능하다. 다만 기존 wrapper final scan은 사람이 읽는 `NEXT` instruction과 `Search hints` line을 실제 failure signal로 오탐했다.

Phase23 이후 pack의 wrapper 판정은 다음 원칙을 따른다.

- 전체 로그 raw substring scan 금지
- SQL file별 normalized output line 파싱
- `NEXT`, `Search hints`, `Patch level`, `Review log for` 등 안내 line 제외
- exact signal token만 집계
- `EXPECTED_DENY`는 정상 결과
- `OverallResult: PASS`를 명시 출력
