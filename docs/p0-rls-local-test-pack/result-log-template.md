# 20단계 Result Log Template

```text
실행 OS:
실행 경로:
DB container:
PowerShell wrapper 실행 여부:

preflight 결과:
seed 결과:

phase20_02_project_access_p0.sql 결과:
phase20_03_rough_note_ai_draft_p0.sql 결과:
phase20_04_change_card_public_boundary_p0.sql 결과:
phase20_05_feedback_author_spoofing_p0.sql 결과:
phase20_06_public_safe_view_p0.sql 결과:
phase20_07_approved_change_card_trigger_p0.sql 결과:
phase20_99_result_summary.sql 결과:

첫 번째 FAIL:
UNEXPECTED_ALLOW 목록:
EXPECTED_DENY 목록:
trigger error 목록:
view exposure error 목록:
secret 마스킹 확인: 예/아니오
remote 명령 미실행 확인: 예/아니오
다음 조치 요청:
```

로그를 가져올 때 DB URL, password, token, key 원문은 제거한다.

## Phase22.6 native stderr 확인 항목

20단계 네 번째 실행 로그를 가져올 때 다음 항목을 함께 확인한다.

| 항목 | 기록 기준 |
|---|---|
| wrapper patch level | `Phase22.5 view coverage + Phase22.6 wrapper stderr correction` 포함 여부 |
| native stderr 처리 | `Native stderr handling` header 포함 여부 |
| `psql` exit code | SQL 파일별 `ExitCode` |
| SQL 내부 signal | `PASS`, `EXPECTED_DENY`, `VIEW_ACCESS_ERROR`, `VIEW_BOUNDARY_FAIL`, `UNEXPECTED_ALLOW`, `FAIL` 등 |
| `NativeCommandError` 표시 | 표시만으로 실패 판정하지 않음. 해당 SQL file의 `ExitCode`와 signal을 함께 제출 |
| secret masking | password/token/key/DB URL 미포함 |

제출 시 `NOTICE` / `WARNING` output이 있으면 삭제하지 말고 그대로 포함하되, secret이 있으면 마스킹한다.

## Phase23 parsed signal log fields

Phase23 이후 로그 제출 시 다음 line을 우선 포함한다.

```text
FileResult: <sql-file> | ExitCode=<code> | ParsedSignals=<summary>
UnexpectedAllowDetected: <true/false>
GrantFailDetected: <true/false>
AccessPathMismatchDetected: <true/false>
ViewAccessErrorDetected: <true/false>
ViewBoundaryFailDetected: <true/false>
ViewOptionMismatchDetected: <true/false>
ViewExecutionModelMismatchDetected: <true/false>
FailDetected: <true/false>
UncaughtErrorDetected: <true/false>
ExpectedDenyDetected: <true/false>
PassDetected: <true/false>
OverallResult: <PASS/NEEDS_REVIEW>
```

`Search guidance` 또는 사람이 읽는 안내 line에 포함된 token은 판정 근거가 아니다.


## Phase23.5 로그 필수 항목

다음 항목을 함께 가져온다: 모든 `FileResult`, `MissingScenarioIds`, `DuplicateScenarioIds`, `ConflictingScenarioIds`, `ParsedSignals`, `FileOverallResult`, `NeedsReviewDetected`, `ScenarioCoverageFailDetected`, `TriggerFailDetected`, `PolicyFailDetected`, `ScriptErrorDetected`, `UnexpectedAllowDetected`, `UnexpectedDenyDetected`, `ExpectedDenyDetected`, `PassDetected`, `OverallResult`, 마지막 250줄.
## Phase23.6 제출 항목

wrapper 실행 전에 다음 결과를 포함한다.

```text
POWERSHELL_PARSE_CHECK: PASS/FAIL
```

wrapper 실행 후 다음을 포함한다.

```text
모든 FileResult
MissingScenarioIds
DuplicateScenarioIds
ConflictingScenarioIds
ParsedSignals
FileOverallResult
UnexpectedAllowDetected
UnexpectedDenyDetected
SeedFailDetected
AuthContextFailDetected
PolicyFailDetected
TriggerFailDetected
ViewExposureFailDetected
ViewBoundaryFailDetected
ViewAccessErrorDetected
ViewOptionMismatchDetected
ViewExecutionModelMismatchDetected
GrantFailDetected
AccessPathMismatchDetected
ScriptErrorDetected
EnvErrorDetected
NeedsReviewDetected
ScenarioCoverageFailDetected
FailDetected
UncaughtErrorDetected
ExpectedDenyDetected
PassDetected
OverallResult
```

마지막 300줄을 함께 제공하며 credential과 remote DB URL은 제거한다.
