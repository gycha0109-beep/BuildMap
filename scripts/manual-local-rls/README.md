# BuildMap Phase 20 P0 Local RLS Manual Scripts

> LOCAL ONLY. DO NOT RUN AGAINST REMOTE/STAGING/PRODUCTION DATABASES.

이 script들은 20단계에서 사용자가 로컬 Docker Supabase DB container에 대해 직접 실행할 수 있는 P0 RLS 검증 후보이다. 19단계에서는 script를 작성만 하며 실행하지 않는다.

## 실행 전 조건

- `supabase start` 성공
- `supabase db reset` 성공 권장
- `supabase_db_BuildMap` 또는 `supabase_db_*` local container 존재
- remote Supabase link/db push/db pull 금지
- hosted Supabase SQL Editor 사용 금지

## 실행 방식

PowerShell에서 BuildMap 루트에서 실행한다.

```powershell
./scripts/manual-local-rls/run-phase20-p0-local.ps1
```

wrapper는 DB URL, password, token, service role key를 요구하지 않는다. `docker exec`로 local DB container 안의 `psql`만 호출한다.

## 실패 시 중단 기준

- preflight 실패
- seed 실패
- `UNEXPECTED_ALLOW`
- secret 노출
- remote 연결 의심

## 로그

wrapper는 `docs/p0-rls-local-test-pack/logs/phase20-p0-rls-<timestamp>.log` 후보 경로에 로그를 저장한다. 로그를 공유할 때 credential은 마스킹한다.

## 20단계 first run patch 이후 재실행 주의사항

첫 실행에서 preflight는 PASS했지만 seed 단계에서 `Feedback author_user_profile_id must match the current user profile.` 오류가 발생했다. patch 이후 `phase20_01_seed_p0_fixture.sql`은 baseline feedback fixture를 `feedback_author` actor context에서 insert한다.

재실행 시 확인할 것:

- `SEED-FB-CTX-001 feedback_author auth.uid` 출력
- `SEED-005 feedbacks` count
- `UNEXPECTED_ALLOW` 미발생
- `FAIL` 미발생

이 script pack은 계속 local-only다. remote DB URL, password, token, service role key를 입력하지 않는다.

## Phase21 access path boundary

- anon public read는 source table이 아니라 public-safe view를 사용한다.
- authenticated owner/non-owner RLS 테스트는 source table을 사용한다.
- anon source table direct access는 `EXPECTED_DENY` 또는 `ACCESS_PATH_MISMATCH`로 처리한다.
- `GRANT_FAIL`, `ACCESS_PATH_MISMATCH`, `VIEW_ACCESS_ERROR`가 나오면 broad grant를 추가하지 말고 로그를 가져온다.

## Phase22 note

Phase22 이후 script는 anon public read를 owner-executed public-safe view로 검증한다. source table direct access는 anon에게 계속 금지되며, `VIEW_BOUNDARY_FAIL`은 P0 security blocker다.

## Phase22.5 public_builder_profiles coverage correction

Phase22.5에서는 `public_builder_profiles`가 public-safe view runtime verification에서 누락된 문제를 보정했다.

추가 확인 항목:

- `phase20_00_preflight.sql`: anon `SELECT` privilege 및 actual query smoke for `public_builder_profiles`
- `phase20_00_preflight.sql`: 전체 8개 public-safe view `security_invoker` / `security_barrier` reloptions 확인
- `phase20_01_seed_p0_fixture.sql`: non-public builder fixture 추가
- `phase20_06_public_safe_view_p0.sql`: `VIEW-P0-BP-*` scenarios 추가
- `phase20_99_result_summary.sql`: builder view count/exclusion summary 추가

이 변경은 migration execution model을 바꾸지 않는다. remote DB, hosted SQL Editor, source table broad grant는 계속 금지다.

## Phase22.6 native stderr handling correction

Phase22.6에서는 `run-phase20-p0-local.ps1`의 native stderr 처리 방식을 보정했다.

핵심 원칙:

- PostgreSQL `NOTICE` / `WARNING`이 stderr로 전달되는 것만으로 wrapper 실패로 보지 않는다.
- PowerShell `NativeCommandError` object 자체를 BuildMap SQL failure classification으로 보지 않는다.
- wrapper는 `psql` process exit code와 SQL 내부 signal을 분리해서 판정한다.
- `ON_ERROR_STOP=1`은 유지하므로 uncaught SQL error는 계속 non-zero exit로 중단된다.
- `EXPECTED_DENY`는 정상적인 P0 deny 결과다.
- `UNEXPECTED_ALLOW` / `VIEW_BOUNDARY_FAIL`은 계속 P0 security blocker다.

Patch level은 `Phase22.5 view coverage + Phase22.6 wrapper stderr correction`으로 갱신했다.

## Phase23 exact signal scan correction

Phase23에서는 wrapper final scan이 안내 문구와 search hint를 failure signal로 오탐한 문제를 보정했다.

변경 원칙:

- wrapper는 전체 로그를 raw substring으로 검색하지 않는다.
- SQL file별 normalized output line에서 exact signal token만 파싱한다.
- `NEXT`, `Search hints`, `Patch level`, `Native stderr handling`, `Review log for`, `PATCH` line은 scan 대상에서 제외한다.
- `FAIL`은 exact token일 때만 감지한다. `GRANT_FAIL`, `SEED_FAIL`, `VIEW_BOUNDARY_FAIL` 내부의 suffix는 plain `FAIL`이 아니다.
- `EXPECTED_DENY`는 정상 결과다.
- 정상 실행이면 `OverallResult: PASS`를 출력한다.


## Phase23.5 wrapper assurance note

`run-phase20-p0-local.ps1`은 Phase23.5부터 SQL file별 expected scenario/check ID manifest를 검증한다. `ExitCode = 0`만으로 성공 처리하지 않고 `MissingScenarioIds`, `DuplicateScenarioIds`, `ParsedSignals`, `FileOverallResult`, `OverallResult`를 함께 확인한다.
## Phase23.6 PowerShell parse gate

Phase23.6 wrapper를 실행하기 전에 BuildMap 루트에서 syntax parse check를 수행한다.

```powershell
$ScriptPath = Resolve-Path ".\scripts\manual-local-rls\run-phase20-p0-local.ps1"
$Tokens = $null
$ParseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$Tokens, [ref]$ParseErrors) | Out-Null
if ($ParseErrors.Count -eq 0) { "POWERSHELL_PARSE_CHECK: PASS" } else { "POWERSHELL_PARSE_CHECK: FAIL"; $ParseErrors | Format-List Message, Extent }
```

`POWERSHELL_PARSE_CHECK: FAIL`이면 wrapper를 실행하지 않는다. 이 check는 Docker, psql 또는 SQL을 실행하지 않는다.

Phase23.6 parser는 psql table의 exact result cell과 PostgreSQL diagnostic line의 scenario ID 직후 첫 signal만 판독한다. 설명문 안의 `pass`, `fail`, `error` 단어를 별도 signal로 재검색하지 않는다.
