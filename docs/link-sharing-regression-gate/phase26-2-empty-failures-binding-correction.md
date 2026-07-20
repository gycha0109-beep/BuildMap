# Phase26.2 Empty Failures Binding Correction

## 사용자 로컬 오류

```text
'Failures' 매개 변수가 빈 컬렉션이므로 인수를 해당 매개 변수에 바인딩할 수 없습니다.
```

## 원인

정상 gate 경로에서는 failure list가 비어 있다. PowerShell 함수의 `List[string] $Failures` 매개변수에 빈 collection 허용 attribute가 없어 binder가 함수 본문 진입 전에 거부했다.

## 보정

`run-phase26-link-sharing-regression-gate.ps1`의 관련 매개변수 3곳에 다음을 적용했다.

```powershell
[AllowEmptyCollection()]
```

## 결과

사용자 로컬 재실행 결과:

```text
ProtectedFileCount: 18
ScenarioFileCount: 8
ExpectedScenarioCount: 107
PassLogValidation: SKIPPED
Phase26GateResult: PASS
```

Phase25 protected file과 baseline hash는 변경하지 않았다.
