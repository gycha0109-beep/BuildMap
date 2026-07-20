# Local-only Safety Rules

## 금지 명령과 금지 행위

- `supabase link`
- `supabase db push`
- `supabase db pull`
- hosted Supabase SQL Editor 사용
- remote DB URL 사용
- production/staging DB 접속
- service role key 입력 또는 출력
- anon key 입력 또는 출력
- password 출력
- token 출력
- 정식 `supabase/migrations` 영구 승격

## 허용 범위

- local Docker Supabase DB container
- `docker exec` 기반 local `psql`
- local-only test fixture
- reset 가능한 local DB
- secret 없는 로그 공유

## 로그 원칙

- DB URL, password, token, service role key는 붙여넣지 않는다.
- container name과 SQL script 결과는 공유 가능하다.
- 실패 로그에 credential이 포함되면 `[REDACTED]`로 마스킹한다.
