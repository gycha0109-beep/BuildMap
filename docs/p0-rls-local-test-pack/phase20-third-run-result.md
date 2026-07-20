# Phase20 Third Run Result

## 목적

이 문서는 사용자가 로컬 PC에서 수행한 `phase20` P0 RLS wrapper 세 번째 실행 결과를 기록한다.

이번 문서는 실제 재실행 결과를 새로 만든 것이 아니다. 사용자가 제공한 redacted log를 기준으로 작성한다.

## 실행 정보

| 항목 | 값 |
|---|---|
| 실행 명령 | `./scripts/manual-local-rls/run-phase20-p0-local.ps1` |
| 실행 경로 | `C:\Users\M\Downloads\BuildMap` |
| local DB container | `supabase_db_BuildMap` |
| patch level | Phase21 access path / minimal grant boundary patch |
| remote DB URL 사용 | 없음 |
| password 사용 | 없음 |
| token/key 사용 | 없음 |
| remote command 실행 | 없음 |

## 실패 위치

| 항목 | 값 |
|---|---|
| 실패 파일 | `scripts/manual-local-rls/phase20_00_preflight.sql` |
| 실패 scenario | `PRE-050` |
| 실패 signal | `VIEW_ACCESS_ERROR` |
| SQLSTATE | `42501` |
| object | `public_project_cards` |
| 직접 원인 | `security_invoker` / underlying source privilege conflict |

## 실패 로그 요약

```text
WARNING: PRE-050 VIEW_ACCESS_ERROR public_project_cards blocked by privilege/security_invoker: 42501
```

PowerShell 출력에 `NativeCommandError`도 표시되었으나, 이는 `psql`이 warning/stderr stream을 반환하면서 PowerShell이 오류 레코드로 표시한 결과일 수 있다. 이번 단계의 본질적 실패는 PowerShell wrapper 문제가 아니라 `public_project_cards` view 조회가 SQLSTATE `42501`로 차단된 것이다.

## 실행되지 않은 단계

이번 실행은 preflight에서 중단되었으므로 다음 파일은 실행되지 않았다.

```text
phase20_01_seed_p0_fixture.sql
phase20_02_project_access_p0.sql
phase20_03_rough_note_ai_draft_p0.sql
phase20_04_change_card_public_boundary_p0.sql
phase20_05_feedback_author_spoofing_p0.sql
phase20_06_public_safe_view_p0.sql
phase20_07_approved_change_card_trigger_p0.sql
phase20_99_result_summary.sql
```

## 확인된 사실

| 항목 | 결과 |
|---|---|
| Phase21에서 anon public read가 source table에서 public-safe view로 전환됨 | 확인 |
| anon source table direct privilege | 계속 revoke 상태 |
| `public_project_cards` | `security_invoker = true` 상태였음 |
| anon의 underlying `public.projects` source privilege | 없음 |
| view query 결과 | SQLSTATE `42501` |
| UNEXPECTED_ALLOW | 없음 |
| remote access | 없음 |
| secret exposure | 없음 |

## 최종 판정

```text
Phase20 third run: FAIL
Primary classification: VIEW_ACCESS_ERROR
Secondary classification: VIEW_EXECUTION_MODEL_CONFLICT
ACCESS_PATH_MISMATCH: 아님
GRANT_FAIL: authenticated source table 최소 privilege 누락 문제가 아님
POLICY_FAIL: 아님
UNEXPECTED_ALLOW: 없음
SEED_FAIL: 아님
SCRIPT_ERROR: 본질적 원인 아님
ENV_ERROR: 아님
Remote access: 없음
Secret exposure: 없음
```
