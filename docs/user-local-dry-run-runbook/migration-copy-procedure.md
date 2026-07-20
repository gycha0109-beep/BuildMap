# Migration Copy Procedure

> 단계: BuildMap 15단계  
> 성격: User Local Dry-run Runbook & Log Intake  
> 주의: 이 문서는 사용자의 로컬 PC에서 실행할 후보 절차를 정리한다. 이 문서 작성 단계에서는 Supabase CLI, Docker, SQL, DB reset, db lint를 실행하지 않는다.


## 목적

local dry-run을 위해 `supabase/migrations_draft`의 SQL draft 파일을 disposable workspace 안의 `supabase/migrations`로 임시 복사한다.

이 작업은 정식 migration 승격이 아니다.

## 경로

원본 후보:

```text
supabase/migrations_draft
```

임시 대상 후보:

```text
supabase/migrations
```

## 원칙

- 원본 `migrations_draft`는 유지한다.
- 원본 프로젝트에 `supabase/migrations`를 영구 생성하지 않는다.
- 복사는 disposable workspace에서만 수행한다.
- 복사된 파일에도 `DRAFT ONLY` 주석이 남아 있어야 한다.

## 확인할 파일 수

SQL draft 파일은 9개여야 한다.

1. `20260708000000_buildmap_00_extensions_and_primitives_draft.sql`
2. `20260708001000_buildmap_01_core_schema_draft.sql`
3. `20260708002000_buildmap_02_decision_records_schema_draft.sql`
4. `20260708003000_buildmap_03_feedback_and_links_schema_draft.sql`
5. `20260708004000_buildmap_04_helpers_and_triggers_draft.sql`
6. `20260708005000_buildmap_05_rls_policies_draft.sql`
7. `20260708006000_buildmap_06_public_safe_views_draft.sql`
8. `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`
9. `20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

## Windows PowerShell 복사 후보

```powershell
New-Item -ItemType Directory -Force supabase\migrations
Copy-Item supabase\migrations_draft\*.sql supabase\migrations\
Get-ChildItem supabase\migrations\*.sql | Sort-Object Name
```

## macOS/Linux Bash 복사 후보

```bash
mkdir -p supabase/migrations
cp supabase/migrations_draft/*.sql supabase/migrations/
ls -1 supabase/migrations/*.sql | sort
```

## 복사 후 확인

- 파일 수가 9개인지 확인한다.
- 파일명 정렬 순서가 유지되는지 확인한다.
- 각 파일 상단의 `DRAFT ONLY` 주석이 유지되는지 확인한다.
- 원본 `migrations_draft` 파일이 삭제되지 않았는지 확인한다.

## dry-run 후 처리

복사본은 dry-run 전용이다. 실제 migration으로 승격하지 않는다. dry-run 결과가 확보되면 로그만 전달하고 복사본은 폐기할 수 있다.
