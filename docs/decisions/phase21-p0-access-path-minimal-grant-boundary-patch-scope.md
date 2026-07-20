# Phase21 P0 Access Path / Minimal GRANT Boundary Patch Scope

## 확정한 것

- phase20 preflight는 PASS했다.
- phase20 seed는 PASS했다.
- 이전 `SEED_FAIL`은 해결됐다.
- 새 실패는 `phase20_02_project_access_p0.sql`에서 발생했다.
- 오류는 `permission denied for table projects`다.
- 이번 오류는 이전 feedback actor context 오류와 다른 새로운 오류다.
- 이번 오류는 RLS row policy 결과가 아니라 table privilege 단계에서 차단된 상태다.
- anon public read는 source `public.projects`가 아니라 public-safe view 중심으로 검증한다.
- authenticated owner/non-owner source table 테스트에는 최소 privilege를 부여해 RLS 평가까지 도달하게 한다.
- broad anon source table grant는 허용하지 않는다.
- expected permission deny는 SQL 내부에서 처리한다.
- uncaught permission deny는 `GRANT_FAIL`로 분류한다.
- source/view access path 불일치는 `ACCESS_PATH_MISMATCH`로 분류한다.
- public-safe view가 source table privilege 문제로 실패하면 `VIEW_ACCESS_ERROR`로 분류하고 broad grant를 보류한다.
- remote 적용은 계속 금지한다.
- 정식 migration 승격은 계속 금지한다.
- 21단계에서 작업자는 Supabase CLI, Docker, psql, SQL을 실행하지 않았다.
- patch 후 사용자가 local DB reset과 phase20 wrapper 재실행을 수행한다.

## 보류한 것

- P0 RLS 실제 재실행.
- P1/P2/P3 RLS 테스트.
- link sharing secure RPC full matrix.
- token rotation/revocation full test.
- full function permission audit.
- full trigger matrix.
- performance test.
- API integration test.
- frontend integration test.
- remote Supabase migration.
- production/staging 적용.
- 정식 migration 승격.
- 제품 기능 추가.
- 관리자 권한.
- 팀/조직 권한.
- 비로그인 피드백.
- 결제.
- 외부 연동.

## 다음 단계

사용자는 최신 ZIP을 기준으로 local-only 세 번째 phase20 wrapper 실행을 수행한다.
결과 로그에서 `UNEXPECTED_ALLOW`, `GRANT_FAIL`, `ACCESS_PATH_MISMATCH`, `VIEW_ACCESS_ERROR`, `FAIL`, `ERROR`를 확인하고 redacted log를 가져온다.
