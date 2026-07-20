# Phase 20 P0 Seed Script Actor Context Patch Scope

## 단계명 보정

요청 원문에는 21단계로 표기된 부분이 있었으나, BuildMap 진행상 이번 작업은 20단계 첫 실행 실패를 반영한 20단계 patch로 기록한다.

## 확정한 것

- 20단계 preflight는 PASS했다.
- 주요 table/view/helper 존재 확인은 PASS했다.
- RLS enabled 확인은 PASS했다.
- 20단계 seed는 `phase20_01_seed_p0_fixture.sql`에서 실패했다.
- 실패 원인은 `feedbacks` seed insert actor context 누락이다.
- 실패 분류는 `SEED_FAIL`이다.
- 이것은 P0 RLS 본 테스트 실패가 아니다.
- `Feedback author spoofing` 방지 trigger 또는 관련 로직은 작동한 것으로 해석된다.
- seed script는 valid feedback fixture를 actor context 안에서 insert하도록 수정한다.
- spoofing 검증은 seed가 아니라 `phase20_05_feedback_author_spoofing_p0.sql`에서 `EXPECTED_DENY`로 수행한다.
- `digest(p_token, 'sha256')` schema qualification 문제는 local draft correctness patch로 반영한다.
- remote 적용은 계속 금지한다.
- 정식 migration 승격은 계속 금지한다.
- 이번 단계에서 작업자는 SQL, Docker, Supabase CLI, psql을 실행하지 않았다.
- 이번 단계 이후 사용자는 local-only로 phase20 wrapper를 재실행한다.

## 보류한 것

- P0 RLS 실제 재실행
- P1/P2/P3 RLS 테스트
- link sharing secure RPC full matrix
- token rotation/revocation 검증
- full function permission audit
- full trigger matrix
- seed/digest correction 외 SQL patch
- remote Supabase migration
- production/staging DB 적용
- 정식 migration 승격
- API route
- 프론트엔드 구현
- 자동화 테스트 코드
- hmac/pepper 기반 token hash
- public_slug 실제 생성 정책
- last_activity_at 갱신 방식
- Feedback 작성자 동의 UX
- 관리자 권한
- 팀 권한
- 공동 편집
- 조직 권한
- 비로그인 피드백
- Save / Follow
- Activity Signal
- Decision Diff Snapshot
- 채용/헤드헌팅 권한
- 결제 권한
- Project DNA
- 역량 점수화
- 외부 연동 권한
- 히트맵 산식

## 다음 단계

사용자는 local DB reset 후 `scripts/manual-local-rls/run-phase20-p0-local.ps1`을 다시 실행한다.
재실행 결과에서 seed가 PASS하면 P0 본 테스트 결과를 공유한다.
seed가 다시 실패하면 첫 번째 실패 로그만 공유한다.
