# BuildMap Phase History

## Phase1–5.5 Product Definition

철학, 문제 정의, 포지셔닝, 핵심 개념, 유즈케이스, 화면 흐름, 텍스트 wireframe, 제품 데이터 모델과 보정을 문서화했다.

## Phase6–8.5 Schema and Access Design

DB schema draft, visibility/sensitivity 분리, Auth/access policy, RLS scenario, share-token hash 및 public-safe boundary를 설계했다.

## Phase9–13 Migration Draft and Static Hardening

migration draft 문서와 9개 SQL draft를 작성하고 syntax/security review 및 pre-dry-run patch를 진행했다.

## Phase14–18 Local Dry-run and Actor Simulation

사용자 로컬 Supabase dry-run을 수행하고 `auth.uid()` actor simulation을 검증했다.

## Phase19–20 P0 Local RLS Pack

P0 RLS local test pack을 작성했다. 첫 실행의 Feedback seed actor-context 실패를 fixture 문제로 분류하고 최소 보정했다.

## Phase21 Access Path / Minimal GRANT

source/view access path와 최소 privilege boundary를 보정했다.

## Phase22–22.6 Public-safe View Runtime Boundary

public-safe view execution model과 `public_builder_profiles` runtime coverage를 보정하고 native stderr 처리 문제를 수정했다.

## Phase23–23.6 Wrapper Assurance

raw substring false positive 제거, exact signal parser, scenario completeness, negative-control oracle, PowerShell parse gate를 보강했다. P0 PASS 기준은 유지했다.

## Phase24 Link Sharing Secure RPC Hardening

- `SECURITY DEFINER` search path 고정
- application/auth/extension object schema qualification
- function EXECUTE 최소 권한
- token lifecycle 및 not-found response contract 보강
- Feedback Request linked Change Card 공개 조건 강제
- Phase25 Full Matrix 107 scenarios 작성

## Phase25–25.1 User Local Full Matrix

첫 실행에서 response exposure SQL의 `jsonb_object_length(jsonb)` 호환성 오류를 발견했다. `jsonb_object_keys` count 방식으로 보정한 뒤 사용자가 전체 wrapper를 재실행했고 `OverallResult: PASS`를 보고했다.

## Phase26 Regression Baseline and Handoff

- 사용자 로컬 Phase25 PASS를 `USER_LOCAL_PASS` 기준선으로 고정
- migration/test/runner 18개 파일 SHA-256 보호
- 8개/107 scenario 계약 고정
- static regression gate와 선택적 PASS log validator 추가
- automatic baseline refresh 금지
- `docs/handoff/` canonical resume 문서 신설

## Phase26.1–26.2 Local PowerShell Corrections

- `${RelativePath}:` variable-colon parser correction
- 빈 `Failures` list binding을 위한 `AllowEmptyCollection()` 3곳 적용
- 사용자 로컬 `Phase26GateResult: PASS` 확인

## Phase27 P1 RLS Full Matrix

- P0/Link Sharing 밖의 P1 RLS·integrity matrix 설계 및 구현
- 9 SQL files / 167 expected scenarios
- 5 auth users / 4 user profiles / 3 builder profiles; unbound foreign profile로 reassignment RLS oracle 보강
- Problem/Hypothesis, Feedback Request/Feedback, Project Links, Change Card mutation, Profile/Discovery, grant/trigger integrity 검증
- 독립 리뷰 후 linked-card parity, archived row, identity spoof, approved immutable fields, internal account status, direct ownership/token mutation negative control 추가
- migration draft와 Phase25 protected baseline은 변경하지 않음

## Phase27.1 P1 Access & Integrity Hardening

- 첫 사용자 로컬 run의 complete coverage + `OverallResult: FAIL` intake
- archived child public source exposure, creator/author spoofing, linked-card parity, approval metadata, profile/project broad UPDATE를 실제 blocker로 분류
- 기존 protected migration 00–08을 수정하지 않고 additive migration draft 09 추가
- profile/project UPDATE whitelist, Project INSERT allowlist, identity triggers, linked-card helper parity, pinned SECURITY DEFINER helpers, unified target validation, approved Change Card immutability 구현
- `P1-INTEGRITY-018` false-negative를 독립 transaction으로 분리
- P0 PRE-021 grant oracle를 column-level UPDATE와 호환되도록 보정
- matrix를 167 → 181 scenarios로 확대

## Phase27.1 User Local Closure

- Phase20 P0 compatibility PASS
- Phase26 legacy regression gate PASS
- Phase27.1 9/9 SQL files PASS
- expected/observed scenarios `181/181`
- missing/duplicate/conflicting IDs 없음
- all blocker flags false
- `OverallResult: PASS`
- evidence level `USER_LOCAL_PASS`

## Phase28 Unified RLS Regression Baseline & Change Gate

- migration drafts `00–09`, Phase20, Phase25, Phase27.1, Phase26 legacy gate를 통합 보호
- Phase28 executable PowerShell 4개까지 포함한 46 protected files / 3 packs / 26 scenario files / 435 scenarios
- normalized UTF-8/LF SHA-256 contract로 Windows line-ending false positive 제거
- exact SQL inventory 및 scenario-source contract 검증
- pack metadata, signal flags, regex, validation mode를 gate에 고정
- optional three-pack PASS-log attestation 및 `-RequireAllPassLogs` 구현
- path traversal, duplicate path/log, malformed supplied log를 fail closed 처리
- raw/parsed `FileResult` count 불일치 및 blocker·unknown `ParsedSignals` 차단
- empty collection binder 예외가 아닌 명시적 gate failure reporting 적용
- 독립 리뷰에서 path normalization, console-only completion-line, manifest weakening, gate self-protection, log inconsistency 가능성을 보완
- static validation PASS

## Phase28 User Local Closure

- 사용자 Windows에서 Phase28 PowerShell parser 전체 PASS
- unified static gate 전체 PASS
- protected files `46/46`
- packs `3/3`
- scenario SQL files `26/26`
- scenario contract `435/435`
- `Phase28GateResult: PASS`
- evidence level `USER_LOCAL_PASS`
- hosted/remote DB 작업 없음
- Phase29 Migration Promotion Readiness 진입 승인

## Phase29 Migration Promotion Readiness & Release Safety Gate

- migration draft `00–09` exact inventory/order/dependency/hash contract 구현
- Phase28 baseline gate를 promotion readiness 선행 조건으로 연결
- destructive SQL, broad grants, PUBLIC EXECUTE, remote URL 정적 차단
- comments/string literals를 제거한 executable SQL scan으로 false positive 억제
- migration order 기준 final SECURITY DEFINER definition 분석
- tracked formal migration premature promotion 감지
- fresh-install/incremental evidence exact contract와 duplicate evidence 방지
- local PostgreSQL catalog 16-scenario wrapper 구현
- forward-fix, emergency recovery, Go/No-go matrix 문서화
- Phase29 executable/catalog files 7개 normalized hash 보호
- 독립 리뷰 및 static validation PASS
- 실제 blocker `MIG29-BLOCK-001` 발견: final `public.is_feedback_author(uuid)`가 `search_path = public, auth` 유지
- runtime evidence 미완료와 blocker 때문에 current decision `PROMOTION_HOLD`
- migration draft 수정, formal promotion, hosted/remote DB 작업 없음

## Phase29 Windows PowerShell 5.1 Compatibility Correction

- 첫 사용자 로컬 static gate가 `.NET Framework`에 없는 `System.IO.Path.GetRelativePath()` 호출에서 중단
- migration/security 실패가 아닌 test-harness compatibility defect로 분류
- `System.Uri.MakeRelativeUri()` 기반 `Get-CompatibleRelativePath`를 공통 모듈에 추가
- static gate의 PowerShell 7/.NET Core 전용 API 의존 제거
- 변경된 common/gate 파일의 protected normalized hashes 갱신
- corrected user-local rerun pending
