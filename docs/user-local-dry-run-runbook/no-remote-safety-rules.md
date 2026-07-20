# No Remote Safety Rules

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 절대 금지 명령

이번 runbook에서 아래 명령은 실행하지 않는다.

```bash
supabase link
supabase db push
supabase db pull
supabase migration up --linked
supabase migration repair --linked
supabase functions deploy
```

아래 행위도 금지한다.

- Supabase SQL Editor에 SQL 복사/실행
- remote database URL로 `psql` 접속
- production/staging/remote DB에 SQL 실행
- service role key를 사용하는 실행
- remote project ref를 대상으로 한 적용

## remote credential 처리

local dry-run에는 remote credential이 없어야 한다. 환경변수에 값이 있더라도 출력하지 않는다.

값을 출력하면 안 되는 후보:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_URL`
- `DATABASE_URL`
- `SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANON_KEY`
- `SUPABASE_ANON_KEY`
- DB password
- JWT

## 기록 방식

환경변수는 값이 아니라 존재 여부만 기록한다.

예:

```text
SUPABASE_ACCESS_TOKEN: present=true
SUPABASE_DB_URL: present=false
SERVICE_ROLE_KEY: present=false
```

## remote link 감지 시 행동

remote project ref, `.supabase` linked state, remote DB URL이 감지되면 remote 관련 명령은 중단한다. local-only dry-run을 계속하려면 disposable workspace를 새로 만들고 remote link가 없는 상태에서 진행한다.

## 핵심 원칙

remote credential이 없어도 local dry-run은 가능해야 한다. remote credential이 필요한 순간, 그 작업은 이번 단계 범위를 벗어난다.
