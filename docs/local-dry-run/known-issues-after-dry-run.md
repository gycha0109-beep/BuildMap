# Known Issues After Dry-run

## 해결된 문제

없음. dry-run이 실행되지 않았으므로 SQL 문제는 해결되지 않았다.

## 새로 발견한 문제

- 현재 실행 환경에 Supabase CLI가 없다.
- 현재 실행 환경에 Docker가 없다.
- `supabase/config.toml`이 없다.

## 아직 검증하지 못한 문제

- `pgcrypto` extension 적용 여부
- `auth.users` FK 참조 가능 여부
- `security_invoker` view 동작
- `SECURITY DEFINER` RPC와 `search_path`
- helper function `PUBLIC EXECUTE` revoke/grant
- RLS `USING` / `WITH CHECK`
- `feedback_requests.change_card_id` / `project_id` 정합성 trigger
- approved Change Card mutation trigger
- Feedback author spoofing 방지
- public-safe view 컬럼 제한

## dry-run 환경 문제

현재 sandbox는 local Supabase dry-run 실행 환경이 아니다.

## 다음 단계에서 해결할 문제

15단계는 SQL patch가 아니라, 먼저 사용자의 로컬 환경에서 Supabase CLI/Docker 기반 preflight를 통과시키는 실행 단계가 되어야 한다.
