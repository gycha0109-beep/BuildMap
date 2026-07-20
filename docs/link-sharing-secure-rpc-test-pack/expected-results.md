# Expected Results

## PASS 조건

- 모든 SQL `ExitCode = 0`
- 모든 expected `LINK-*` scenario ID 관측
- SECURITY DEFINER 함수 owner가 caller/app role이 아님
- authenticated read 3개 surface가 모두 valid token으로 성공
- cross-project token과 archived Project lifecycle mutation은 차단
- missing/duplicate/conflicting scenario 없음
- `UNEXPECTED_ALLOW`, `RPC_BOUNDARY_FAIL`, `TOKEN_LIFECYCLE_FAIL`, `RESPONSE_EXPOSURE_FAIL` 없음
- `OverallResult: PASS`

## 핵심 blocker

| Signal | 의미 |
|---|---|
| `UNEXPECTED_ALLOW` | invalid token/actor가 접근 또는 mutation 성공 |
| `RPC_BOUNDARY_FAIL` | SECURITY DEFINER/search_path/response contract 불일치 |
| `TOKEN_LIFECYCLE_FAIL` | rotate/revoke/old-new token 상태 불일치 |
| `RESPONSE_EXPOSURE_FAIL` | 민감 row/field/token/internal identifier 노출 |
| `GRANT_FAIL` | 의도한 EXECUTE matrix 불일치 |
| `SCENARIO_COVERAGE_FAIL` | expected scenario 누락/중복/충돌 |
