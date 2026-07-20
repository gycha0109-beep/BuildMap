# Phase26 Link Sharing Regression Baseline & Change Gate

## 목적

Phase26은 사용자 로컬 PC에서 확인된 Phase25 Link Sharing Secure RPC Full Matrix의 `OverallResult: PASS`를 보호 기준선으로 고정한다.

이번 단계는 RPC, RLS, migration 또는 response contract를 다시 설계하지 않는다. 이후 관련 파일이 변경될 때 다음 세 가지를 구분하기 위한 회귀 게이트를 추가한다.

1. 검증된 기준선과 동일한가
2. 의도한 변경으로 기준선이 달라졌는가
3. 근거 없이 보안 기준선이 변조되었는가

## 기준선

- 기준 실행: Phase25 Link Sharing Secure RPC Full Matrix
- 사용자 로컬 완료 문구: `Phase25 link sharing RPC local run completed. OverallResult: PASS`
- expected SQL files: 8
- expected scenarios: 107
- protected files: 18
- raw 실행 로그: 현재 ZIP에 포함되지 않음
- remote Supabase 적용: 없음

사용자가 전달한 PASS 결과는 실행 기준선으로 수용하되, 원본 로그가 프로젝트에 포함되지 않았다는 사실은 숨기지 않는다. 추후 로그가 제공되면 Phase26 gate의 `-PassLogPath`로 구조를 재검증할 수 있다.

## 산출물

- `phase25-pass-baseline.md`
- `protected-scope-and-hash-policy.md`
- `change-gate-runbook.md`
- `runtime-log-attestation-contract.md`
- `baseline-refresh-procedure.md`
- `failure-classification.md`
- `phase26-static-validation-report.md`
- `phase26-independent-review.md`
- `scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json`
- `scripts/manual-local-link-sharing/run-phase26-link-sharing-regression-gate.ps1`

## 판정 원칙

- hash mismatch는 자동 승인하지 않는다.
- scenario 추가·삭제·이동은 baseline drift다.
- baseline JSON은 테스트 성공 없이 갱신하지 않는다.
- 실제 정책 변경 후에는 clean local reset과 Phase25 전체 재실행이 필요하다.
- 기존 PASS를 유지한 채 문서만 변경하는 경우 protected file hash는 변하지 않아야 한다.

## 실행 범위

Phase26 gate 기본 실행은 정적 검증만 수행한다.

- Docker 실행 없음
- Supabase CLI 실행 없음
- psql 실행 없음
- SQL 실행 없음
- DB URL 또는 secret 입력 없음
- remote command 없음

선택적으로 기존 Phase25 로그 경로를 넘기면 PASS 로그의 구조도 검증한다.
