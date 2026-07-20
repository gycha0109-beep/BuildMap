# Phase24 Static Validation Report

## 수행한 정적 확인

- Phase25 wrapper manifest: 8개 SQL file
- expected scenario: 107개
- 모든 expected ID가 대응 SQL에 존재함
- invalid PowerShell keyword `elselseif`, `elseifelseif`, `elseelseif`: 0건
- wrapper brace/parenthesis lightweight count: balanced
- wrapper와 run guide의 local path 문자열 정상화 및 standalone carriage-return 0건 확인
- repeated revoke가 최초 `share_token_revoked_at`을 보존하는 state-idempotence guard 확인
- executable scripts에 `supabase link`, `supabase db push`, `supabase db pull`, remote DB URL 입력 구조 없음
- file 07의 6개 `SECURITY DEFINER` RPC: `search_path = pg_catalog, pg_temp`
- SECURITY DEFINER 함수 owner가 anon/authenticated/authenticator/service_role이 아닌지 확인하는 scenario 포함
- file 07의 7개 function: 생성 직후 PUBLIC/anon/authenticated EXECUTE revoke
- `extensions.gen_random_bytes` schema qualification 확인
- linked Change Card Feedback Request boundary가 read/write RPC에 모두 존재함
- authenticated actor의 project/timeline/feedback-request read surface를 모두 실제 호출하는 scenario 포함
- cross-project valid token과 archived Project rotate/revoke denial scenario 포함
- rotate/revoke owner check 이후 실제 non-archived row update `FOUND` guard 확인
- migration 변경 범위는 file 04 dependency helper, file 07 link RPC, file 08 grant/final check에 한정

## 수행하지 않은 확인

현재 작업 환경에서는 다음을 실행하지 않았다.

- PowerShell `Parser.ParseFile()`
- Supabase CLI
- Docker
- psql
- SQL syntax/application
- RPC call
- Phase25 wrapper

따라서 실제 PASS 판정은 사용자 로컬의 PowerShell parse check와 Phase25 wrapper 결과 이후에만 가능하다.
