# macOS/Linux Bash Runbook

> 단계: BuildMap 15단계  
> 성격: 사용자 로컬 PC 실행 후보  
> 주의: 아래 명령은 사용자가 직접 실행할 후보이며, 문서 작성 단계에서는 실행하지 않는다.

## 1. 작업 폴더 이동

```bash
cd /path/to/BuildMap
pwd
```

## 2. preflight 확인

```bash
supabase --version
docker --version
docker info
git --version
git branch --show-current
git status --short
test -d supabase/migrations_draft && echo "migrations_draft=true" || echo "migrations_draft=false"
find supabase/migrations_draft -name "*.sql" | wc -l
```

## 3. secret env 존재 여부 확인

값을 출력하지 않는다. 존재 여부만 확인한다.

```bash
test -n "${SUPABASE_ACCESS_TOKEN:-}" && echo "SUPABASE_ACCESS_TOKEN present=true" || echo "SUPABASE_ACCESS_TOKEN present=false"
test -n "${SUPABASE_DB_URL:-}" && echo "SUPABASE_DB_URL present=true" || echo "SUPABASE_DB_URL present=false"
test -n "${DATABASE_URL:-}" && echo "DATABASE_URL present=true" || echo "DATABASE_URL present=false"
test -n "${SERVICE_ROLE_KEY:-}" && echo "SERVICE_ROLE_KEY present=true" || echo "SERVICE_ROLE_KEY present=false"
test -n "${SUPABASE_SERVICE_ROLE_KEY:-}" && echo "SUPABASE_SERVICE_ROLE_KEY present=true" || echo "SUPABASE_SERVICE_ROLE_KEY present=false"
test -n "${ANON_KEY:-}" && echo "ANON_KEY present=true" || echo "ANON_KEY present=false"
test -n "${SUPABASE_ANON_KEY:-}" && echo "SUPABASE_ANON_KEY present=true" || echo "SUPABASE_ANON_KEY present=false"
```

## 4. disposable workspace 생성 후보

```bash
SOURCE="/path/to/BuildMap"
WORKSPACE="/tmp/BuildMap-dry-run"
rm -rf "$WORKSPACE"
cp -R "$SOURCE" "$WORKSPACE"
cd "$WORKSPACE"
pwd
```

## 5. migrations_draft → migrations 복사 후보

```bash
mkdir -p supabase/migrations
cp supabase/migrations_draft/*.sql supabase/migrations/
ls -1 supabase/migrations/*.sql | sort
```

## 6. supabase/config.toml 확인

```bash
test -f supabase/config.toml && echo "config=true" || echo "config=false"
```

## 7. 필요 시 disposable workspace에서만 supabase init 후보

```bash
supabase init
```

실행 전 현재 경로가 disposable workspace인지 다시 확인한다. `supabase link`는 실행하지 않는다.

## 8. supabase start 후보

```bash
supabase start
```

## 9. supabase db reset 후보

```bash
supabase db reset
```

## 10. supabase db lint --local 후보

```bash
supabase db lint --local
```

## 11. 결과 로그 저장 후보

```bash
# 예시 후보. secret 출력 위험이 없는지 확인한 뒤 사용한다.
supabase db reset 2>&1 | tee dry-run-db-reset.log
supabase db lint --local 2>&1 | tee dry-run-db-lint.log
```

공유 전 `log-redaction-guide.md`에 따라 마스킹한다.

## 12. 실행 중단 기준

- remote credential 값을 출력해야 하는 상황
- `supabase link`를 요구하는 상황
- `db push`, `db pull`을 안내받는 상황
- Docker daemon이 꺼져 있는 상황
- 첫 migration 실패 후 원인 분석 없이 다음 destructive 명령을 이어가야 하는 상황

## 13. 결과 전달 항목

- `log-intake-template.md`
- `result-report-template.md`
- 첫 번째 실패 명령
- 첫 번째 실패 파일
- 에러 메시지 요약
- secret 마스킹 완료 여부
