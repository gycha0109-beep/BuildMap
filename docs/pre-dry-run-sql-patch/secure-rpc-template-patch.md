# Secure RPC Template Patch

## 보강 원칙

링크 공개 데이터는 원천 테이블 직접 select보다 secure RPC 후보를 우선한다. secure RPC는 token 검증, 반환 컬럼 제한, 실패 응답 통일을 담당한다.

## 13단계 반영 항목

- `SECURITY DEFINER` 후보 명시
- `SET search_path = public, pg_temp` 후보 보강
- 함수 내부 schema qualification 원칙 주석 보강
- public-safe `jsonb` 반환 원칙 유지
- 원천 row 전체 반환 금지 주석 보강
- token 실패 응답 통일
- private Project 차단
- revoked token 차단
- `public_slug`만으로 link_shared 접근 금지
- `create_link_shared_feedback` authenticated 전용 후보 유지
- `author_user_profile_id = current_user_profile_id()` 강제 유지
- 08 grants 파일과 execute grant 연계

## 반영 위치

- `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
- `20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

## dry-run 검증 항목

- token 없음/잘못됨/revoked/rotation 실패 응답이 통일되는가
- 반환 `jsonb`에 내부 id, `share_token_hash`, `author_user_profile_id`가 없는가
- `SECURITY DEFINER`가 필요한 범위보다 넓게 동작하지 않는가
- `search_path` 고정이 실제 문법상 유효한가
- execute grant가 필요 role에만 열리는가
