# Secure RPC Security Hardening

## 적용한 변경

### `search_path`

모든 link-sharing `SECURITY DEFINER` 함수는 `search_path = pg_catalog, pg_temp`를 사용한다. `public`, `auth`, `extensions` object는 함수 본문에서 schema-qualified한다.

### function privilege

PostgreSQL 함수는 생성 시 PUBLIC EXECUTE 기본 권한을 가질 수 있으므로 file 07에서 생성 직후 PUBLIC/anon/authenticated 권한을 revoke하고, file 08에서 의도한 role만 다시 grant한다.

### token contract

- 생성: `extensions.gen_random_bytes(32)`
- 표현: lowercase hex 64자
- 저장: SHA-256 hash 64자
- raw token: rotation 응답으로 1회 반환 후보
- missing/invalid format: read/write access check에서 `not_found`

### lifecycle update consistency

`rotate_project_share_token`과 `revoke_project_share_token`은 owner 확인 뒤 실제 `UPDATE`가 non-archived Project row에 적용됐는지도 `FOUND`로 확인한다. 확인과 갱신 사이에 row가 삭제·archive되는 경우 성공 응답을 반환하지 않고 동일한 `42501 / not_allowed` 경계로 종료한다. 반복 revoke는 기존 `share_token_revoked_at`을 보존해 response뿐 아니라 저장 상태도 idempotent하게 유지한다.

### Feedback Request boundary

`change_card_id`가 없는 Project-level request는 공개/open 조건만 확인한다. `change_card_id`가 있으면 연결 카드가 반드시 다음을 만족해야 한다.

- `work_status = approved`
- `visibility_status = published`
- `sensitivity_status = normal`
- `archived_at is null`

이 조건은 read RPC와 feedback write RPC에 동일하게 적용한다.

## 공식 기준

- PostgreSQL `CREATE FUNCTION`: SECURITY DEFINER 함수의 안전한 `search_path`와 PUBLIC EXECUTE revoke 필요
- PostgreSQL Function Security: 신뢰하지 않는 사용자가 object를 만들 수 있는 schema를 `search_path`에서 제외
- Supabase API security: object grant와 RLS는 별도 계층

공식 문서:

- https://www.postgresql.org/docs/current/sql-createfunction.html
- https://www.postgresql.org/docs/current/perm-functions.html
- https://supabase.com/docs/guides/api/securing-your-api
