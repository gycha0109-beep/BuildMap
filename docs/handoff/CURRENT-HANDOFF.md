# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase28 Unified RLS Regression Baseline & Change Gate — 설계/구현/독립 리뷰/보완/정적 검증 완료, 사용자 local PowerShell runtime pending
- 기준 날짜: 2026-07-20
- 공식 작업 기준: GitHub `gycha0109-beep/BuildMap`
- 기준 브랜치: `agent/phase28-unified-rls-regression-gate`
- Phase20 P0 RLS runtime: 사용자 로컬 PASS
- Phase25 Link Sharing runtime: 사용자 로컬 `OverallResult: PASS`
- Phase26 regression gate: 사용자 로컬 `Phase26GateResult: PASS`
- Phase27.1 P1 RLS runtime: 사용자 로컬 `OverallResult: PASS`, scenario coverage `181/181`
- Phase28 unified baseline: 42 protected files / 3 packs / 26 scenario files / 435 scenarios
- hosted/remote 적용: 없음
- migration draft `00–09`: 보호 기준선에 포함
- 정식 migration 승격: 없음

## 보호 기준선

### P0 RLS

- Phase20 계열 P0 Local RLS: PASS
- wrapper parse/signal/oracle hardening: Phase23.6까지 완료
- Phase28 expected SQL files: 9
- Phase28 expected scenarios: 147

### Link sharing

- Phase24 secure RPC hardening: 완료
- Phase25 Full Matrix: 사용자 로컬 PASS
- expected SQL files: 8
- expected scenarios: 107
- Phase26 protected files: 18
- legacy baseline manifest: `scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json`
- legacy gate: `scripts/manual-local-link-sharing/run-phase26-link-sharing-regression-gate.ps1`

### P1 RLS

- Phase27.1 P1 Access & Integrity Hardening: 사용자 로컬 PASS
- expected SQL files: 9
- expected scenarios: 181
- `UnexpectedAllowDetected: False`
- `UnexpectedDenyDetected: False`
- `TriggerFailDetected: False`
- `ScenarioCoverageFailDetected: False`

### Unified Phase28 baseline

- manifest: `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
- gate: `scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1`
- protected files: 42
- packs: 3
- scenario files: 26
- scenarios: 435
- hash contract: `normalized_utf8_lf`
- automatic baseline refresh: prohibited
- optional logs: supplied logs fail closed; `-RequireAllPassLogs` requires all three

## Phase25 실행 중 발견·보정된 사항

1. `phase25_06_response_exposure.sql`에서 존재하지 않는 `jsonb_object_length(jsonb)` 호출로 중단
2. Phase25.1에서 `jsonb_object_keys(jsonb)` row count 방식으로 최소 보정
3. clean local rerun 후 사용자 보고 기준 `OverallResult: PASS`

이 오류는 RPC/RLS 보안 실패가 아니라 테스트 SQL 함수 호환성 오류였다.

## Phase26 변경

- Phase25 PASS attestation 문서화
- 18개 보호 파일 SHA-256 baseline 생성
- 8개 SQL/107 scenario contract 고정
- PowerShell parse와 forbidden remote command 정적 gate 추가
- 선택적 Phase25 PASS log validator 추가
- baseline 자동 갱신 금지
- 누적 handoff 체계 신설

## Phase27 변경

- `scripts/manual-local-rls-p1/` 신설
- P1 actor/fixture namespace 분리
- Problem/Hypothesis, Feedback Request/Feedback, Project Links, Change Card, Profile/Discovery, integrity/permission matrix 구현
- external scenario manifest와 SQL source ID pre-run 교차검증
- 최초 9개 SQL / 167 expected scenarios
- 독립 리뷰에서 adversarial fixture, linked-card parity, identity spoof, approved immutable field, account status, ownership/token direct mutation negative control 추가
- final review에서 Builder identity reassignment oracle가 unique constraint에 가려지지 않도록 unbound foreign user profile fixture 추가
- final review에서 fixture label을 scenario로 오인하던 wrapper 정규식을 `P1-<DOMAIN>-NNN` 형식으로 제한

## Phase27 첫 runtime 결과

- 사용자 로컬 전체 scenario coverage: 완료
- `OverallResult: FAIL`
- blocker: `UNEXPECTED_ALLOW`, `TRIGGER_FAIL`
- script/env/coverage failure: 없음
- 기존 기대값 유지

## Phase27.1 변경

- migration draft 09 추가; 기존 00–08 및 Phase25 보호 파일은 무변경
- profile/project UPDATE column whitelist and Project INSERT allowlist
- archived child public source boundary
- creator/author binding 및 immutable identity triggers
- linked Change Card Feedback read/write parity
- Feedback Request target SECURITY DEFINER validation with unified non-disclosing error
- approved Change Card evidence/approval immutability
- P1 SECURITY DEFINER public-read/write helper search_path pinning
- P0 PRE-021 oracle를 `has_any_column_privilege`로 호환 보정
- integrity 017/018 독립 transaction으로 false-negative 제거
- scenario 167 → 181

## Phase27.1 최종 runtime 결과

- 전체 9개 SQL 파일 `FileOverallResult: PASS`
- expected/observed scenario: `181/181`
- missing/duplicate/conflicting scenario: 없음
- `UnexpectedAllowDetected: False`
- `UnexpectedDenyDetected: False`
- `TriggerFailDetected: False`
- `GrantFailDetected: False`
- `ScenarioCoverageFailDetected: False`
- `OverallResult: PASS`
- evidence level: `USER_LOCAL_PASS`

## Phase28 변경

- P0/Link/P1 PASS 계약을 하나의 manifest로 통합
- migration draft `00–09`를 포함한 42개 파일 보호
- 3 packs / 26 SQL files / 435 unique scenarios 고정
- migration 및 test SQL exact inventory 검증 추가
- strict UTF-8 + BOM 제거 + LF 정규화 SHA-256로 Windows checkout false-positive 제거
- pack ID/count/runner/source-contract/regex/flag contract를 gate 코드에서 고정
- P0 동적 scenario 생성 파일 2개만 `contract_only`, 나머지는 `exact_source`
- PowerShell parse와 prohibited remote-capable command scan
- Phase20/25/27 optional PASS log validation 및 `-RequireAllPassLogs`
- supplied malformed log의 fail-open 방지
- path traversal, drive-relative path, duplicated log path 차단
- 독립 리뷰와 mutation-oriented static validation 완료

## 현재 검증 상태

- Phase20 P0 compatibility: 사용자 로컬 PASS
- Phase25 Link Sharing: 사용자 로컬 PASS
- Phase26 legacy gate: 사용자 로컬 PASS
- Phase27.1 P1 RLS: 사용자 로컬 PASS
- Phase28 design/implementation/review correction: 완료
- Phase28 manifest static audit: PASS
- protected normalized hashes: 42/42 PASS
- scenario contract: 435/435 PASS
- PowerShell native parser and Phase28 gate on user Windows: pending
- Phase28 runtime evidence level은 아직 생성하지 않음

## 절대 제약

- 공식 작업 기준은 GitHub `gycha0109-beep/BuildMap` 저장소다.
- ZIP을 작업 기준으로 사용하지 않는다.
- 현재 BuildMap 작업에서는 Codex를 실행 주체로 가정하지 않는다.
- Supabase CLI, Docker, psql, SQL 실제 실행은 사용자 로컬 PC에서만 수행한다.
- `supabase link`, `supabase db push`, `supabase db pull`을 사용하지 않는다.
- hosted SQL Editor 또는 remote DB URL을 사용하지 않는다.
- migration draft를 정식 migration으로 승격하지 않는다.
- raw share token/hash/secret을 문서나 로그에 포함하지 않는다.
- `UNEXPECTED_ALLOW`를 테스트 기대값 변경으로 숨기지 않는다.
- protected file 변경 후 기존 PASS를 그대로 재사용하지 않는다.
- baseline hash 자동 재생성을 금지한다.
- 단계 완료 시 `docs/handoff/`를 누적 갱신한다.

## 다음 작업

1. 사용자 로컬에서 Phase28 PowerShell parse check
2. Phase28 static gate 실행
3. 가능하면 Phase20/25/27 wrapper 원본 로그를 함께 넣어 `-RequireAllPassLogs` 실행
4. `Phase28GateResult: PASS`면 Phase28 종료
5. 다음 단계: Phase29 Migration Promotion Readiness 설계
6. Phase29에서도 migration promotion이나 hosted 적용은 수행하지 않음

## 정확한 재개 지점

1. `docs/handoff/CURRENT-HANDOFF.md`
2. `docs/unified-rls-regression-gate/README.md`
3. `docs/unified-rls-regression-gate/phase28-independent-review.md`
4. `docs/unified-rls-regression-gate/phase28-local-runbook.md`
5. `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
6. `scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1`
