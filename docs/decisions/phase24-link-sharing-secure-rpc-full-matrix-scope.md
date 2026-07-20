# Phase24 Link Sharing Secure RPC Security Hardening & Full Matrix Scope

## 확정

- 기존 Phase20 P0 Local RLS PASS Intake를 유지하고, Phase23.6 PowerShell parse check PASS 이후 link-sharing security를 다음 우선순위로 선택했다.
- token은 32 random bytes, lowercase hex 64자다.
- raw token은 저장하지 않고 rotation 성공 시 1회 반환한다.
- read failure는 `not_found`로 통일한다.
- `SECURITY DEFINER` search_path는 `pg_catalog, pg_temp`다.
- link RPC와 dependency helper는 application/auth/extension object를 schema-qualified한다.
- function 생성 직후 PUBLIC/anon/authenticated EXECUTE를 revoke한다.
- file 08은 intended role만 EXECUTE grant한다.
- Feedback Request linked Change Card boundary를 read/write RPC 모두에 적용한다.
- Phase25 local-only Full Matrix pack을 작성한다.
- 현재 Full Matrix는 6개 external RPC와 1개 internal helper의 contract 전체를 의미한다.
- Builder enrichment, public-selected Feedback read, public Project Links collection은 현재 response contract에서 보류한다.
- 현재 작업자는 Supabase CLI, Docker, psql, SQL 또는 wrapper를 실행하지 않았다.

## 보류

- Phase25 실제 실행 및 PASS/FAIL intake
- HMAC/pepper
- token expiry
- rate limiting
- API/frontend integration
- full function permission audit
- remote migration
- 정식 migration 승격
- production/staging 적용

## Phase25 진입 조건

- PowerShell parse check PASS
- 최신 migrations_draft를 local migrations로 복사
- local `supabase db reset` 성공
- remote command/secret 없음
