# Log Intake Template

아래 양식을 복사해서 사용자가 실행 결과를 채워 가져온다. secret 값은 절대 붙이지 않는다.

## 1. 실행 환경

```text
OS:
터미널 종류:
BuildMap ZIP 버전:
현재 branch:
git status 요약:
```

## 2. 도구 버전

```text
Supabase CLI version:
Docker version:
Docker daemon 상태:
Git version:
```

## 3. Supabase local 설정

```text
supabase/config.toml 존재 여부:
supabase init 실행 여부:
remote link 감지 여부:
remote credential 존재 여부:
- SUPABASE_ACCESS_TOKEN present:
- SUPABASE_DB_URL present:
- DATABASE_URL present:
- SERVICE_ROLE_KEY present:
- SUPABASE_SERVICE_ROLE_KEY present:
- ANON_KEY present:
- SUPABASE_ANON_KEY present:
```

## 4. workspace

```text
disposable workspace 사용 여부:
workspace 경로:
원본 BuildMap 직접 수정 여부:
supabase/migrations_draft 원본 유지 여부:
supabase/migrations 임시 생성 여부:
```

## 5. migration copy

```text
복사 성공 여부:
복사된 SQL 파일 수:
누락 파일:
추가 파일:
DRAFT ONLY 주석 유지 여부:
```

## 6. 실행한 명령 목록

```text
1.
2.
3.
```

## 7. supabase start 결과

```text
실행 여부:
exit code:
stdout 요약:
stderr 요약:
```

## 8. supabase db reset 결과

```text
실행 여부:
exit code:
성공 여부:
성공한 migration 파일:
첫 번째 실패 migration 파일:
에러 메시지 요약:
마스킹 완료 여부:
```

## 9. supabase db lint --local 결과

```text
실행 여부:
exit code:
security warning:
performance warning:
RLS warning:
function warning:
view warning:
```

## 10. 첫 번째 실패

```text
첫 번째 실패 명령:
첫 번째 실패 파일:
실패 분류 후보:
에러 메시지 요약:
전체 로그 첨부 여부:
secret 마스킹 완료 여부:
```

## 11. remote 미적용 확인

```text
supabase link 실행 안 함:
supabase db push 실행 안 함:
supabase db pull 실행 안 함:
SQL Editor 사용 안 함:
remote DB 접속 안 함:
production/staging/remote DB 적용 안 함:
```
