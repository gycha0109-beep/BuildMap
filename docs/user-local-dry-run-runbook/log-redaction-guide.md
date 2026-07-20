# Log Redaction Guide

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 마스킹 대상

로그를 공유하기 전 아래 값은 반드시 제거하거나 `[REDACTED]`로 바꾼다.

- Supabase access token
- service role key
- anon key
- database URL
- password
- JWT
- local DB connection string 중 password
- project ref
- email이 포함된 개인 정보
- absolute path 중 사용자명이 민감한 경우

## 마스킹 원칙

- 전체 값을 붙이지 않는다.
- 앞뒤 일부도 필요 없으면 전부 `[REDACTED]` 처리한다.
- 에러 메시지는 남기되 credential 값은 제거한다.
- connection string은 필요하면 `[REDACTED_DB_URL]`로 대체한다.
- service role key, anon key, JWT는 일부도 남기지 않는다.

## 예시

원문 예시:

```text
postgresql://postgres:secret-password@127.0.0.1:54322/postgres
```

공유용:

```text
[REDACTED_DB_URL]
```

원문 예시:

```text
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxx
```

공유용:

```text
SUPABASE_ACCESS_TOKEN present=true, value=[REDACTED]
```

## 공유해도 되는 정보

- 명령 이름
- exit code
- 실패한 migration 파일명
- SQL error code
- SQL statement 주변의 민감하지 않은 일부
- RLS policy 이름
- function/view/trigger 이름
- warning 종류

## 공유하면 안 되는 정보

- remote DB URL
- service role key
- anon key
- password
- JWT
- access token
- 실제 사용자 이메일
- 개인 경로 전체가 민감한 경우의 absolute path
