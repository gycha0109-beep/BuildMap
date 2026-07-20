# Phase20 세 번째 실행 가이드

## 목적

이 문서는 phase20 두 번째 실행의 `permission denied for table projects` 이후 patch를 반영한 세 번째 local-only 실행 절차를 정리한다.

## 실행 전 원칙

- remote Supabase에는 접근하지 않는다.
- `supabase link`, `supabase db push`, `supabase db pull`은 실행하지 않는다.
- hosted Supabase SQL Editor를 사용하지 않는다.
- 정식 `supabase/migrations` 영구 승격을 하지 않는다.
- 현재 local dry-run 구조에서만 임시 `supabase/migrations` 복사본을 사용한다.

## 권장 절차

1. 최신 21단계 ZIP을 압축 해제한다.
2. BuildMap 루트로 이동한다.
3. 기존 local dry-run 임시 migration 복사본이 있으면 삭제한다.
4. `supabase/migrations_draft/*.sql`을 임시 `supabase/migrations`로 다시 복사한다.
5. `supabase start` 상태를 확인한다.
6. `supabase db reset`을 실행해 최신 draft/grant patch를 local DB에 반영한다.
7. phase20 wrapper를 실행한다.
8. 로그에서 다음 신호를 검색한다.

```text
UNEXPECTED_ALLOW
GRANT_FAIL
ACCESS_PATH_MISMATCH
VIEW_ACCESS_ERROR
FAIL
ERROR
EXPECTED_DENY
PASS
```

## 재실행 명령 후보

PowerShell 기준:

```powershell
.\scripts\manual-local-rls\run-phase20-p0-local.ps1
```

## 결과 제출 기준

### 정상 진행 시

다음 파일들의 출력 블록을 포함한다.

- `phase20_00_preflight.sql`
- `phase20_02_project_access_p0.sql`
- `phase20_06_public_safe_view_p0.sql`
- `phase20_99_result_summary.sql`

### 실패 시

첫 번째 실패 파일과 다음 신호가 포함된 블록만 가져온다.

```text
UNEXPECTED_ALLOW
GRANT_FAIL
ACCESS_PATH_MISMATCH
VIEW_ACCESS_ERROR
FAIL
ERROR
```

Secret, token, password, DB URL은 계속 마스킹한다.
