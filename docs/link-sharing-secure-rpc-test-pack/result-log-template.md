# Phase25 Result Log Template

## 실행 정보

- OS / PowerShell version:
- BuildMap root:
- local DB container:
- PowerShell parse check:
- `supabase db reset`:
- wrapper exit code:
- remote command used: none / 발견 시 즉시 중단
- secret exposure: none / 발견 시 즉시 중단

## File coverage

- 모든 `FileResult`:
- `MissingScenarioIds`:
- `DuplicateScenarioIds`:
- `ConflictingScenarioIds`:
- 첫 번째 non-PASS scenario:

## Final flags

```text
UnexpectedAllowDetected:
UnexpectedDenyDetected:
SeedFailDetected:
AuthContextFailDetected:
PolicyFailDetected:
TriggerFailDetected:
ViewExposureFailDetected:
ViewBoundaryFailDetected:
ViewAccessErrorDetected:
ViewOptionMismatchDetected:
ViewExecutionModelMismatchDetected:
GrantFailDetected:
AccessPathMismatchDetected:
RpcBoundaryFailDetected:
TokenLifecycleFailDetected:
ResponseExposureFailDetected:
ScriptErrorDetected:
EnvErrorDetected:
NeedsReviewDetected:
ScenarioCoverageFailDetected:
FailDetected:
UncaughtErrorDetected:
ExpectedDenyDetected:
PassDetected:
OverallResult:
```

## 제출 범위

- 마지막 300줄
- 모든 `FileResult`와 final flags
- 실제 secret/password/remote DB URL이 제거된 redacted log

고정 fixture token은 local-only 값이지만 로그 본문에 원문 전체를 추가로 복사하지 않는다.
