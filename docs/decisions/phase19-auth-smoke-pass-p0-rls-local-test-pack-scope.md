# Phase 19 Auth Smoke PASS & P0 RLS Local Test Pack Scope

## 확정한 것

- 사용자 로컬 PC에서 18단계 `auth.uid()` actor simulation smoke test가 PASS했다.
- `anon` actor는 `auth.uid() = null`이다.
- Method A `request.jwt.claim.sub`는 전체 actor에서 PASS했다.
- Method B `request.jwt.claims`는 전체 actor에서 PASS했다.
- 후속 RLS 테스트 기본 방식은 Method A다.
- Method B는 fallback으로 유지한다.
- 18단계 진행 판단은 No-Go에서 Go로 재분류한다.
- 19단계는 P0 RLS local test script pack 작성 단계다.
- 19단계에서 Codex는 실제 SQL을 실행하지 않았다.
- 20단계에서 사용자가 local-only script를 실행하고 로그를 제공한다.
- remote 적용은 계속 금지한다.
- 정식 migration 승격은 계속 금지한다.

## 보류한 것

- P0 RLS 실제 실행
- P1/P2/P3 RLS 테스트
- link sharing secure RPC full matrix
- token rotation/revocation 검증
- full function permission audit
- full trigger matrix
- SQL patch
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

## 20단계 진입 조건

- 사용자는 local Docker Supabase DB container를 사용한다.
- wrapper는 remote DB URL이나 credential을 입력받지 않는다.
- `scripts/manual-local-rls/run-phase20-p0-local.ps1`을 BuildMap 루트에서 실행한다.
- 실행 로그에서 secret/token/password/DB URL을 마스킹한다.
- `UNEXPECTED_ALLOW`가 있으면 즉시 P0 blocker로 보고한다.
