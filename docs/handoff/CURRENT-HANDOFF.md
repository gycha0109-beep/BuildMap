# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase27.1 P1 Access & Integrity Hardening — 구현/독립 리뷰/정적 검증/사용자 local runtime 완료
- 기준 날짜: 2026-07-20
- 공식 작업 기준: GitHub `gycha0109-beep/BuildMap` `main`
- Phase25 Link Sharing runtime: 사용자 로컬 `OverallResult: PASS`
- Phase26 regression gate: 사용자 로컬 `Phase26GateResult: PASS`
- Phase26.2 local runtime correction: `Failures` 빈 컬렉션 binding을 위해 `AllowEmptyCollection()` 3곳 적용
- Phase27.1 pack: 9 SQL files / 181 scenarios / 5 auth users / 4 user profiles / 3 builder profiles
- Phase27.1 runtime: 사용자 로컬 `OverallResult: PASS`, scenario coverage `181/181`
- hosted/remote 적용: 없음
- additive migration draft 09: local runtime 검증 완료
- 정식 migration 승격: 없음

## 보호 기준선

### P0 RLS

- Phase20 계열 P0 Local RLS: PASS 기준 유지
- wrapper parse/signal/oracle hardening: Phase23.6까지 완료

### Link sharing

- Phase24 secure RPC hardening: 완료
- Phase25 Full Matrix: 사용자 로컬 PASS
- expected SQL files: 8
- expected scenarios: 107
- Phase26 protected files: 18
- baseline manifest: `scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json`
- gate: `scripts/manual-local-link-sharing/run-phase26-link-sharing-regression-gate.ps1`

### P1 RLS

- Phase27.1 P1 Access & Integrity Hardening: 사용자 로컬 PASS
- expected SQL files: 9
- expected scenarios: 181
- `UnexpectedAllowDetected: False`
- `UnexpectedDenyDetected: False`
- `TriggerFailDetected: False`
- `ScenarioCoverageFailDetected: False`

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
- 독립 리뷰에서 adversarial fixture, linked-card parity, identity spoof, approved immutable field, account status, ownership/token direct mutation negative control을 추가
- final review에서 Builder identity reassignment oracle가 unique constraint에 가려지지 않도록 unbound foreign user profile fixture를 추가
- final review에서 fixture label을 scenario로 오인하던 wrapper 정규식을 `P1-<DOMAIN>-NNN` 형식으로 제한
- migration draft와 Phase25 protected files는 수정하지 않음

## Phase27 첫 runtime 결과

- 사용자 로컬 전체 scenario coverage: 완료
- `OverallResult: FAIL`
- blocker: `UNEXPECTED_ALLOW`, `TRIGGER_FAIL`
- script/env/coverage failure: 없음
- 기존 기대값은 유지했다.

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

## 현재 검증 상태

- Phase27.1 static structure/oracle/safety review: PASS
- Phase26 protected hashes 18/18 unchanged
- Phase20 P0 compatibility: 전체 PASS 보고
- Phase26 regression gate: PASS
- Phase27.1 SQL runtime: PASS
- Phase27.1은 완료 상태로 닫는다.

## 절대 제약

- 공식 작업 기준은 GitHub `gycha0109-beep/BuildMap` 저장소다.
- 앞으로 ZIP을 작업 기준으로 사용하지 않는다.
- 현재 BuildMap 작업에서는 Codex를 실행 주체로 가정하지 않는다.
- Supabase CLI, Docker, psql, SQL 실제 실행은 사용자 로컬 PC에서만 수행한다.
- `supabase link`, `supabase db push`, `supabase db pull`을 사용하지 않는다.
- hosted SQL Editor 또는 remote DB URL을 사용하지 않는다.
- migration draft를 정식 migration으로 승격하지 않는다.
- raw share token/hash/secret을 문서나 로그에 포함하지 않는다.
- `UNEXPECTED_ALLOW`를 테스트 기대값 변경으로 숨기지 않는다.
- protected file 변경 후 기존 PASS를 그대로 재사용하지 않는다.
- 단계 완료 시 `docs/handoff/`를 누적 갱신한다.

## 다음 작업 — Phase28

### 단계명

`Unified RLS Regression Baseline & Change Gate`

### 목적

1. migration draft 00–09를 새 보호 기준선으로 고정
2. Phase20 P0, Phase25 Link Sharing, Phase27.1 P1의 PASS 계약을 하나의 manifest에서 관리
3. wrapper, SQL, migration, scenario manifest의 SHA-256 drift를 검출
4. 예상 scenario 수와 필수 positive/negative signal을 교차 검증
5. 선택적 local PASS log attestation 검증을 추가
6. 자동 baseline refresh를 금지하고 명시적 승인 절차를 문서화

### 보호 대상 후보

- `supabase/migrations_draft/` 00–09
- Phase20 P0 wrapper/SQL/manifest
- Phase25 Link Sharing wrapper/SQL/manifest
- Phase27.1 P1 wrapper/SQL/manifest
- Phase26 기존 baseline/gate

### 완료 조건

- 보호 파일 hash 100% 일치
- P0/Link/P1 scenario contract 일치
- PowerShell parser PASS
- forbidden remote command 0건
- optional PASS log validator가 fail-open하지 않음
- 독립 리뷰 완료
- 사용자 로컬 gate PASS

## 정확한 재개 지점

1. `docs/handoff/CURRENT-HANDOFF.md`
2. `docs/p1-rls-full-matrix/phase27-1-access-integrity-hardening.md`
3. `docs/p1-rls-full-matrix/phase27-1-independent-review.md`
4. `scripts/manual-local-rls-p1/phase27_p1_scenario_manifest.json`
5. `scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json`
