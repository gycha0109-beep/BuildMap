# Dry-run Command Plan

## 주의

이 문서는 명령 계획이다. 실제 실행하지 않는다.

## 명령 후보

### 1. 현재 상태 확인

```bash
git status --short
git branch --show-current
```

- 목적: 작업 상태와 branch 확인.
- 실행하면 안 되는 상황: 기존 작업이 불명확한 경우.
- remote DB 영향: 없음.

### 2. draft 파일 확인

```bash
find BuildMap/supabase/migrations_draft -maxdepth 1 -type f -name "*.sql" | sort
```

- 목적: SQL draft 순서 확인.
- 실행하면 안 되는 상황: 없음.
- remote DB 영향: 없음.

### 3. 정식 migrations 디렉터리 확인

```bash
find BuildMap/supabase/migrations -maxdepth 1 -type f -name "*.sql" 2>/dev/null
```

- 목적: 정식 migration과 draft 경로 혼동 방지.
- 실행하면 안 되는 상황: 없음.
- remote DB 영향: 없음.

### 4. 임시 dry-run branch 생성 후보

```bash
git checkout -b dry-run/buildmap-supabase-migration-draft
```

- 목적: 실험 격리.
- 실행하면 안 되는 상황: 현재 작업이 commit되지 않은 경우.

### 5. draft 파일 임시 복사 후보

```bash
mkdir -p supabase/migrations
cp BuildMap/supabase/migrations_draft/*.sql supabase/migrations/
```

- 목적: local dry-run 실험용 임시 복사.
- 실행하면 안 되는 상황: 실제 프로젝트 migrations가 있는 경우, remote 연결이 의심되는 경우.
- 주의: 복사 파일은 실험 후 폐기해야 한다.

### 6. Supabase local 후보

```bash
supabase start
supabase db reset
supabase db lint
```

- 목적: local-only 문법 및 정책 검증.
- 실행하면 안 되는 상황: Supabase CLI가 remote project에 연결되어 있거나 local 격리가 불명확한 경우.

### 7. 실패 로그 저장 후보

```bash
mkdir -p BuildMap/output/dry-run-logs
```

- 목적: 실패 로그 수집 위치.
- remote DB 영향: 없음.

## 실패 시 대응

- SQL 실행을 반복하기 전 실패 원인을 `expected-failure-catalog.md`와 연결한다.
- 보정이 필요한 경우 `migration-draft-adjustment-plan.md`에 추가한다.
- 실제 remote Supabase 적용은 계속 금지한다.
