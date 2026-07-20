# Final Signal Scan False-positive Analysis

## 목적

이 문서는 Phase20 네 번째 실행에서 SQL/RLS/view/trigger 검증은 정상 종료됐으나, wrapper final signal scan이 실패 signal을 오탐한 원인을 분석하고 Phase23 wrapper 보정 방향을 기록한다.

## 실제 현상

wrapper final scan은 다음 값을 출력했다.

```text
UnexpectedAllowDetected: True
GrantFailDetected: True
AccessPathMismatchDetected: True
ViewAccessErrorDetected: True
ViewBoundaryFailDetected: True
FailDetected: True
```

그러나 사용자 제공 로그의 실제 scenario 결과는 PASS / EXPECTED_DENY 중심이며, actual security blocker는 확인되지 않았다.

## 오탐 원인 1: NEXT instruction collision

로그에는 사람이 읽기 위한 안내 문구가 있었다.

```text
NEXT | Review log for UNEXPECTED_ALLOW, VIEW_BOUNDARY_FAIL, VIEW_ACCESS_ERROR, GRANT_FAIL, ACCESS_PATH_MISMATCH, FAIL, ERROR.
```

기존 wrapper는 raw substring scan을 수행했기 때문에, 이 안내 문구 안의 token을 실제 failure signal로 감지했다.

## 오탐 원인 2: Search hints collision

wrapper 자체가 다음 search hint를 출력했다.

```text
Search hints: UNEXPECTED_ALLOW, VIEW_BOUNDARY_FAIL, VIEW_ACCESS_ERROR, VIEW_OPTION_MISMATCH, VIEW_EXECUTION_MODEL_MISMATCH, GRANT_FAIL, ACCESS_PATH_MISMATCH, FAIL, ERROR, EXPECTED_DENY, PASS
```

이 line은 분석 안내이지 scenario result가 아니다. 기존 broad scan은 이 line도 signal source로 처리했다.

## 오탐 원인 3: PATCH/header collision

SQL header, patch 설명, wrapper metadata에는 다음과 같은 token 설명이 포함될 수 있다.

```text
GRANT_FAIL
VIEW_ACCESS_ERROR
ACCESS_PATH_MISMATCH
FAIL
```

설명 문구는 machine-readable result line이 아니므로 failure 판정에 사용하면 안 된다.

## 오탐 원인 4: FAIL substring collision

다음 token들은 모두 `_FAIL` suffix를 가진다.

```text
GRANT_FAIL
SEED_FAIL
AUTH_CONTEXT_FAIL
TRIGGER_FAIL
VIEW_BOUNDARY_FAIL
```

기존 일반 `FAIL` broad regex는 이런 compound token 내부의 `FAIL`도 감지할 수 있었다. Phase23 wrapper는 `FAIL`을 exact token으로만 인식하도록 보정한다.

## 기존 구조의 한계

기존 구조는 SQL file output 전체에 대해 다음 류의 broad check를 수행했다.

```powershell
$OutputText -match "UNEXPECTED_ALLOW"
$OutputText -match "FAIL"
```

이 방식은 실제 scenario result와 문서/안내/검색 힌트를 구분하지 못한다.

## Phase23 보정 방향

Phase23 wrapper는 다음 구조를 채택한다.

1. SQL file별 output line을 먼저 정규화한다.
2. `NEXT |`, `Search hints:`, `Patch level:`, `Native stderr handling:`, `Review log for`, `PATCH`류 line은 scan 대상에서 제외한다.
3. PostgreSQL diagnostic prefix 뒤의 exact signal token만 파싱한다.
4. psql table row의 `scenario_id | result` 구조에서 exact result cell만 파싱한다.
5. `_FAIL` suffix token을 일반 `FAIL`로 해석하지 않는다.
6. 각 SQL file별 `ParsedSignals`를 기록한다.
7. final scan은 raw entire log를 재검색하지 않고 file별 parsed signal object를 집계한다.

## 기대되는 정상 final scan

이번 네 번째 실행과 동일한 정상 output이면 기대값은 다음이다.

```text
UnexpectedAllowDetected: False
GrantFailDetected: False
AccessPathMismatchDetected: False
ViewAccessErrorDetected: False
ViewBoundaryFailDetected: False
ViewOptionMismatchDetected: False
ViewExecutionModelMismatchDetected: False
FailDetected: False
UncaughtErrorDetected: False
ExpectedDenyDetected: True
PassDetected: True
OverallResult: PASS
```

## 결론

이번 문제는 SQL/RLS/view/trigger 실패가 아니라 `WRAPPER_SIGNAL_SCAN_FALSE_POSITIVE`다. Phase23 patch는 SQL/migration/P0 scenario를 수정하지 않고 wrapper의 signal parser만 최소 보정한다.


## Phase23.5 false-negative guard

Phase23은 raw substring false positive를 제거했다. Phase23.5는 반대 방향의 위험, 즉 signal이 출력됐지만 final result에 반영되지 않거나 scenario가 누락돼도 PASS가 되는 false-negative 위험을 줄인다.
