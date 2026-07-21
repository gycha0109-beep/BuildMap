# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase28 Unified RLS Regression Baseline & Change Gate — 종료
- 다음 단계: Phase29 Migration Promotion Readiness & Release Safety Gate
- 기준 날짜: 2026-07-21
- 공식 작업 기준: GitHub `gycha0109-beep/BuildMap`
- Phase28 작업 브랜치: `agent/phase28-unified-rls-regression-gate`
- Phase20 P0 RLS runtime: 사용자 로컬 PASS
- Phase25 Link Sharing runtime: 사용자 로컬 `OverallResult: PASS`
- Phase26 regression gate: 사용자 로컬 `Phase26GateResult: PASS`
- Phase27.1 P1 RLS runtime: 사용자 로컬 `OverallResult: PASS`, scenario coverage `181/181`
- Phase28 unified gate: 사용자 로컬 `Phase28GateResult: PASS`
- hosted/remote 적용: 없음
- migration draft `00–09`: 보호 기준선에 포함
- 정식 migration 승격: 없음

## 보호 기준선

### P0 RLS

- Phase20 계열 P0 Local RLS: PASS
- wrapper parse/signal/oracle hardening: Phase23.6까지 완료
- expected SQL files: 9
- expected scenarios: 147

### Link sharing

- Phase24 secure RPC hardening: 완료
- Phase25 Full Matrix: 사용자 로컬 PASS
- expected SQL files: 8
- expected scenarios: 107
- legacy Phase26 gate: 사용자 로컬 PASS

### P1 RLS

- Phase27.1 P1 Access & Integrity Hardening: 사용자 로컬 PASS
- expected SQL files: 9
- expected scenarios: 181
- all blocker flags false

### Unified Phase28 baseline

- manifest: `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
- gate: `scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1`
- protected files: 46
- packs: 3
- scenario files: 26
- scenarios: 435
- hash contract: `normalized_utf8_lf`
- Phase28 executable PowerShell files: 4/4 protected
- automatic baseline refresh: prohibited
- supplied PASS logs fail closed
- evidence level: `USER_LOCAL_PASS`
- attestation: `docs/unified-rls-regression-gate/phase28-user-local-attestation.md`

## 주요 변경 이력

### Phase25–26

- Link Sharing Full Matrix 107 scenarios 사용자 로컬 PASS
- migration/test/runner 18개 파일 SHA-256 보호
- static regression gate와 선택적 PASS log validator 추가
- automatic baseline refresh 금지
- 사용자 로컬 `Phase26GateResult: PASS`

### Phase27–27.1

- P1 RLS Full Matrix 최초 167 scenarios 구현
- 첫 runtime의 `UNEXPECTED_ALLOW`, `TRIGGER_FAIL`을 실제 blocker로 수용
- additive migration draft 09 추가
- profile/project column allowlist, identity trigger, linked-card parity, approval immutability, SECURITY DEFINER hardening 구현
- P0 PRE-021 grant oracle 호환 보정
- matrix를 181 scenarios로 확대
- 사용자 로컬 181/181, `OverallResult: PASS`

### Phase28

- P0/Link/P1 PASS 계약을 하나의 manifest로 통합
- migration draft `00–09`와 Phase28 executable gate 4개를 포함한 46개 파일 보호
- 3 packs / 26 SQL files / 435 unique scenarios 고정
- migration 및 test SQL exact inventory 검증
- strict UTF-8 + BOM 제거 + LF 정규화 SHA-256
- pack metadata, signal flags, regex, validation mode를 코드에서 고정
- dynamic scenario source 2개만 `contract_only`, 나머지는 `exact_source`
- PowerShell parse 및 prohibited remote-capable command scan
- malformed `FileResult`, blocker/unknown signal, duplicate log path, path traversal을 fail closed 처리
- 독립 리뷰와 mutation-oriented static validation 완료
- 사용자 Windows local parser/gate 전체 PASS
- `Phase28GateResult: PASS`

## 현재 검증 상태

- Phase20 P0 compatibility: PASS
- Phase25 Link Sharing: PASS
- Phase26 legacy gate: PASS
- Phase27.1 P1 RLS: PASS
- Phase28 static audit: PASS
- Phase28 normalized hashes: 46/46 PASS
- Phase28 scenario contract: 435/435 PASS
- Phase28 executable protection: 4/4 PASS
- Phase28 user local PowerShell parser/gate: PASS
- Phase28 evidence level: `USER_LOCAL_PASS`

## 절대 제약

- 공식 작업 기준은 GitHub `gycha0109-beep/BuildMap` 저장소다.
- ZIP을 작업 기준으로 사용하지 않는다.
- 현재 BuildMap 작업에서는 Codex를 실행 주체로 가정하지 않는다.
- Supabase CLI, Docker, psql, SQL 실제 실행은 사용자 로컬 PC에서만 수행한다.
- `supabase link`, `supabase db push`, `supabase db pull`을 사용하지 않는다.
- hosted SQL Editor 또는 remote DB URL을 사용하지 않는다.
- Phase29에서는 migration draft를 정식 migration으로 승격하지 않는다.
- raw share token/hash/secret을 문서나 로그에 포함하지 않는다.
- protected file 변경 후 기존 PASS를 그대로 재사용하지 않는다.
- baseline hash 자동 재생성을 금지한다.
- 단계 완료 시 `docs/handoff/`를 누적 갱신한다.

## 다음 작업 — Phase29

### 단계명

`Migration Promotion Readiness & Release Safety Gate`

### 목적

1. migration draft `00–09`의 순서, dependency, object, privilege, policy, trigger 계약을 고정한다.
2. fresh-install replay와 incremental `00–08 → 09` upgrade 경로를 분리 검증한다.
3. destructive/lock-sensitive/data-sensitive SQL을 분류하고 승인 없는 위험 패턴을 차단한다.
4. rollback 대신 forward-fix 및 emergency access-control recovery 계획을 문서화한다.
5. Phase20/25/27/28 회귀를 promotion readiness의 필수 조건으로 연결한다.
6. 최종 판정을 `PROMOTION_READY` 또는 `PROMOTION_HOLD`로 제한한다.

### 비범위

- `migrations_draft`에서 `migrations`로 실제 복사/승격
- hosted/remote 적용
- production 실행
- `supabase db push`, `supabase link`

## 정확한 재개 지점

1. `docs/handoff/CURRENT-HANDOFF.md`
2. `docs/unified-rls-regression-gate/phase28-user-local-attestation.md`
3. `scripts/manual-local-unified-regression/phase28_unified_rls_regression_baseline.json`
4. `scripts/manual-local-unified-regression/run-phase28-unified-rls-regression-gate.ps1`
5. `supabase/migrations_draft/20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql`
