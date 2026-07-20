# Local-only Safety Rules


> 주의: 이 문서는 18단계에서 사용자가 local DB에서 검토 후 실행할 후보 절차를 정리한다.  
> 17단계에서는 SQL, RPC, view, trigger, function permission 테스트를 실행하지 않는다.  
> remote Supabase, staging, production DB 적용은 계속 금지한다.


## 금지 명령

아래 명령은 18단계 manual test에서도 금지한다.

```bash
supabase link
supabase db push
supabase db pull
supabase migration up --linked
supabase migration repair --linked
```

추가 금지 항목:

- Supabase hosted SQL Editor 사용
- remote DB URL 사용
- production/staging DB 접속
- remote `psql` 접속
- service role key 공유
- access token 공유
- anon/service key 원문 공유
- remote credential를 포함한 로그 공유

## 허용 범위

| 허용 대상 | 조건 |
|---|---|
| local Supabase stack | 사용자의 PC에서만 실행 |
| local DB | `supabase start`로 생성된 local DB |
| disposable local workspace | 원본 오염 방지 |
| local-only `psql` 후보 | connection string의 password 마스킹 |
| local Studio 후보 | hosted Supabase SQL Editor와 혼동 금지 |
| 테스트 데이터 | local DB에만 생성 |
| 실패 로그 공유 | secret 마스킹 후 공유 |

## remote credential 처리

다음 값은 절대 출력하지 않는다.

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_URL`
- `DATABASE_URL`
- `SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANON_KEY`
- `SUPABASE_ANON_KEY`
- local DB connection string의 password
- raw `share_token`

존재 여부만 `true/false`로 기록한다.

## 즉시 중단 조건

- remote DB 연결 의심
- secret/token/password가 터미널 출력에 포함됨
- hosted Supabase SQL Editor를 열었음
- `supabase link`, `db push`, `db pull`을 실행하려 함
- 테스트 DB URL이 remote로 보임

## 로그 공유 원칙

- raw token은 `[REDACTED_TOKEN]`
- DB URL은 `[REDACTED_DB_URL]`
- password는 `[REDACTED_PASSWORD]`
- auth user UUID는 필요하면 역할명으로 대체
- public/internal row id는 최소한으로만 공유
