# Phase22.6 Wrapper Native stderr Handling Correction

## 목적

이 문서는 Phase20 네 번째 로컬 실행 전에 발견된 PowerShell wrapper의 native stderr 처리 gap을 보정한 내용을 기록한다.

이번 단계는 SQL schema, RLS policy, public-safe view execution model, P0 scenario를 다시 설계하는 단계가 아니다. Phase22와 Phase22.5에서 확정한 owner-executed public-safe view, `security_barrier = true`, explicit public row predicate, explicit public column allowlist, anon source table direct revoke, broad anon grant 금지, 8개 public-safe view runtime verification 방향은 그대로 유지한다.

## 문제 근거

기존 wrapper는 global `$ErrorActionPreference = "Stop"` 상태에서 다음 형태로 native command output을 수집했다.

```powershell
$Output = $Sql | docker exec -i $ContainerName psql -U postgres -d postgres -v ON_ERROR_STOP=1 2>&1
$ExitCode = $LASTEXITCODE
```

PowerShell 환경에 따라 `psql` stderr에 전달된 PostgreSQL `NOTICE` 또는 `WARNING`이 `NativeCommandError` / `ErrorRecord` 형태로 pipeline에 들어오거나 terminating error처럼 취급될 수 있다. 이 경우 wrapper가 SQL output을 끝까지 로그에 남기고 자체 signal classification을 수행하기 전에 중단될 수 있다.

## 핵심 구분

| 항목 | 판정 기준 |
|---|---|
| PostgreSQL `NOTICE` | 그 자체로 실패가 아님 |
| PostgreSQL `WARNING` | 그 자체로 실패가 아님. 단 SQL 내부 signal이 `VIEW_ACCESS_ERROR` 등으로 명시되면 해당 signal을 따른다 |
| PowerShell `NativeCommandError` | 그 자체로 BuildMap SQL 실패 분류가 아님 |
| `psql` process exit code | uncaught SQL/native command 실패 판단 기준 |
| SQL 내부 signal | `UNEXPECTED_ALLOW`, `VIEW_BOUNDARY_FAIL`, `VIEW_ACCESS_ERROR`, `GRANT_FAIL`, `PASS`, `EXPECTED_DENY` 등 BuildMap P0 판정 기준 |

## 적용한 wrapper 보정

`run-phase20-p0-local.ps1`에 `Invoke-LocalPsqlScript` helper를 추가했다.

보정 내용:

1. global `$ErrorActionPreference = "Stop"`은 유지한다.
2. `docker exec + psql` native command 실행 구간에서만 `$ErrorActionPreference = "Continue"`로 임시 변경한다.
3. PowerShell 7 환경에서 `PSNativeCommandUseErrorActionPreference` 변수가 존재하면 native command 실행 구간에서만 `$false`로 임시 변경한다.
4. 실행 후 두 preference 값을 반드시 원복한다.
5. `$LASTEXITCODE`는 native command 직후 즉시 `$ExitCode`에 저장한다.
6. stdout/stderr mixed output은 `ErrorRecord`와 일반 문자열을 모두 text line으로 정규화한다.
7. 로그 기록과 signal scan은 정규화된 `$OutputLines`, `$OutputText`를 기준으로 수행한다.
8. `ON_ERROR_STOP=1`은 유지한다.

## PowerShell 5.1 / 7 호환 처리

`PSNativeCommandUseErrorActionPreference`는 PowerShell 7 계열에서 의미가 있는 preference 변수다. Windows PowerShell 5.1에서는 존재하지 않을 수 있으므로, wrapper는 다음 방식으로 존재 여부를 먼저 확인한다.

```powershell
$HasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
```

존재할 때만 기존 값을 저장하고 임시로 `$false`로 설정한다. 존재하지 않는 환경에서는 해당 변수를 필수로 가정하지 않는다.

## exit code와 signal 우선순위

| 조건 | wrapper 판정 |
|---|---|
| `ExitCode = 0` + `PASS` / `EXPECTED_DENY` 중심 | 계속 진행 |
| `ExitCode = 0` + `UNEXPECTED_ALLOW` | 최종 exit `2` |
| `ExitCode = 0` + `VIEW_BOUNDARY_FAIL` | 최종 exit `2` |
| `ExitCode = 0` + `GRANT_FAIL` | 최종 exit `4` |
| `ExitCode = 0` + `VIEW_ACCESS_ERROR` / `ACCESS_PATH_MISMATCH` / `VIEW_OPTION_MISMATCH` / `VIEW_EXECUTION_MODEL_MISMATCH` | 최종 exit `5` |
| `ExitCode != 0` + `permission denied for table/view/function` | 즉시 exit `4` |
| `ExitCode != 0` + seed script 실패 | 즉시 seed failure로 중단 |
| `ExitCode != 0` + 일반 SQL failure | 해당 native exit code로 중단 |

## 수정하지 않은 범위

이번 단계에서는 다음을 수정하지 않았다.

- `supabase/migrations_draft/*.sql`
- `phase20_00_preflight.sql`
- `phase20_01_seed_p0_fixture.sql`
- `phase20_02_project_access_p0.sql`
- `phase20_03_rough_note_ai_draft_p0.sql`
- `phase20_04_change_card_public_boundary_p0.sql`
- `phase20_05_feedback_author_spoofing_p0.sql`
- `phase20_06_public_safe_view_p0.sql`
- `phase20_07_approved_change_card_trigger_p0.sql`
- `phase20_99_result_summary.sql`

## local-only safety

이번 patch는 wrapper의 local execution log handling만 보정한다. 다음은 계속 금지한다.

- remote DB URL 사용
- password/token/key 출력
- `supabase link`
- `supabase db push`
- `supabase db pull`
- hosted Supabase SQL Editor
- production/staging/remote DB SQL
- 정식 `supabase/migrations` 승격

## 최종 판정

Phase22.6은 `WRAPPER_NATIVE_STDERR_HANDLING_GAP` 보정 단계다. 실제 Phase20 네 번째 실행 결과는 아직 확인되지 않았다. PASS 여부는 사용자가 최신 ZIP을 로컬 PC에서 실행한 뒤 redacted log를 제공해야 판단한다.

## Phase23 successor note

Phase22.6은 native stderr handling을 보정했다. Phase23에서는 그 이후 사용자 네 번째 실행에서 확인된 final signal scan false positive를 보정했다.

핵심 변경:

- raw substring scan 제거 또는 제한
- exact signal token parsing
- `NEXT` / `Search hints` / `Patch level` / `Review log for` line 제외
- compound `_FAIL` token과 plain `FAIL` 구분
- file별 parsed signal 집계
- `OverallResult` 출력

Phase23에서도 SQL/migration/P0 scenario는 수정하지 않았다.
