# Local-only Safety Rules

## 허용

- 사용자 로컬 PC
- local Docker Supabase DB container
- `docker exec` 기반 local `psql`
- reset 가능한 fixture DB
- redacted log 공유

## 금지

- `supabase link`, `supabase db push`, `supabase db pull`
- hosted SQL Editor
- remote/staging/production DB
- remote DB URL
- password, token, service role key, anon key 입력 또는 출력
- local fixture token을 실제 서비스 token으로 재사용
- 결과 검증 전 `migrations_draft` 정식 승격

wrapper는 remote connection parameter를 입력받지 않으며 `supabase_db_*` local container만 탐색한다.
