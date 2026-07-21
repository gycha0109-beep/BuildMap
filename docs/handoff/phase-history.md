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
- tracked local replay mirror exact parity 검증
- fresh-install/incremental evidence exact contract와 duplicate evidence 방지
- local PostgreSQL catalog 16-scenario wrapper 구현
- forward-fix, emergency recovery, Go/No-go matrix 문서화
- Phase29 executable/catalog files 7개 normalized hash 보호
- 실제 blocker `MIG29-BLOCK-001` 발견: final `public.is_feedback_author(uuid)`가 `search_path = public, auth` 유지

## Phase29 Local Corrections and Closure

- Windows PowerShell 5.1에 없는 `System.IO.Path.GetRelativePath()`를 `System.Uri.MakeRelativeUri()` 기반 함수로 교체
- tracked replay mirror를 formal promotion으로 오판하던 detector를 exact mirror parity 방식으로 보정
- 사용자 로컬 corrected static gate 정확히 PASS
- `Phase29GateResult: PASS`, `TrackedReplayMirrorResult: PASS`
- security blocker 1개와 runtime evidence 미완료를 정확히 분리
- PR #2를 `main` merge commit `0413ea9a8dafa2e2fb098a2b30b94c75a4a95676`으로 병합

## Phase29.1 Residual SECURITY DEFINER Boundary Hardening

- 기존 migration drafts `00–09` 불변 유지
- additive migration draft `10` 및 byte-identical local replay mirror 추가
- `public.is_feedback_author(uuid)`를 `search_path = pg_catalog, pg_temp`로 재정의
- `public.feedbacks`, `public.current_user_profile_id()` schema qualification 유지
- `PUBLIC`/`anon` EXECUTE revoke, `authenticated`만 재부여
- Phase28 protected migration inventory를 `00–10`, protected files `47`로 확장
- 변경된 migration set에 기존 PASS를 재사용하지 않고 baseline status를 `PENDING_USER_LOCAL_REVALIDATION`으로 전환
- Phase29 migration contract `10 → 11`, protected gate/catalog files `7 → 8`
- catalog contract `16 → 26` scenarios로 확장
- function signature oracle를 `pronargs` + `oidvectortypes(proargtypes)`로 보강
- 설계 자체 리뷰, 구현 독립 리뷰, static validation PASS
- hosted/remote/formal promotion 없음

## Phase29.1 User Local Closure

- Phase20, Phase25, Phase27.1 전체 PASS
- Phase28 `47 protected files / 435 scenarios` PASS
- Phase29 static gate: migrations `11`, mirror PASS, errors `0`, blockers `0`
- Phase29 catalog `26/26` PASS
- `MIG29-BLOCK-001` runtime 해소 확인
- PR #3을 `main` merge commit `c18b7995f6cf6cdff7787f5131cbb4d5d77df70d`으로 병합
- 남은 HOLD는 fresh/incremental evidence 파일 미완료로 한정

## Phase29.2 Fresh-install & Incremental Replay Evidence Closure

- 수동 evidence 작성 대신 실제 local replay 기반 evidence schema `2.0` 구현
- fresh path: reset 후 exact `00–10` migration history 검증
- incremental path: exact `00–09` precondition, migration 10 단독 delta 검증
- historical pre-upgrade oracle `MIG29-PREUP-001..006` 추가
- 두 경로 각각 Phase20/25/27.1 재실행
- 각 신규 로그를 Phase28 `-RequireAllPassLogs`로 검증
- 각 경로에서 Phase29 catalog `26/26` 재검증
- evidence를 Git HEAD, baseline ID, migration digest, protected-gate digest에 결속
- evidence path/RunId 중복과 서로 다른 HEAD 혼합 차단
- 긴 replay 전 static readiness preflight 추가
- one-command closure wrapper와 `.local-evidence/` Git exclusion 구현
- 설계 리뷰, 구현 리뷰, repository/static validation PASS

## Phase29.2 User Local Closure

- fresh-install `00–10` evidence PASS
- incremental `00–09 → 10` evidence PASS
- `RuntimeEvidenceComplete: True`
- `PromotionDecision: PROMOTION_READY`
- PowerShell blank-output binding 결함 보정 후 재검증
- PR #4를 `main` merge commit `fccc9633761bfe99b0c0da23b661f3f74d7d7f08`으로 병합
- hosted/remote DB 작업 없음

## Phase30 Formal Migration Promotion & Deployment Readiness

- migration `00–10` SQL bytes 불변 유지
- source/replay/release normalized SHA-256 exact equality
- release filename에서 `_draft` suffix만 제거
- `.local-evidence/phase30-formal-promotion` 아래 immutable bundle 생성
- bundle을 promotion head, Phase29.2 merge commit, Phase30 manifest에 결속
- exact 11-file release inventory 검증
- automatic deployment/link/history repair 비활성 고정
- hosted/remote DB capability 없음
- 설계 리뷰, 구현 리뷰, repository/static validation PASS

## Phase30 User Local Closure

- formal release bundle 생성 PASS
- `FormalPromotionDecision: PROMOTION_READY`
- `DeploymentReadinessDecision: DEPLOYMENT_HOLD` — Phase30.5 전 정상 상태
- `Phase30ClosureResult: PASS`
- PR #5를 `main` merge commit `320bbd52f7bf18402b1fe10801bc809e173fcf4b`으로 병합
- migration SQL 및 hosted DB 변경 없음

## Phase30.5 Target Project Read-only Attestation

- Phase30 bundle manifest와 11개 artifact 재검증
- protected Phase30 promotion head와 merge ancestry 결속
- explicit SQL `BEGIN TRANSACTION READ ONLY` + `ROLLBACK`
- `PGOPTIONS default_transaction_read_only=on` 이중 보호
- credential은 process environment variable에서만 읽고 command line/evidence에 저장하지 않음
- target project ref와 PGHOST/PGUSER identity 교차 확인
- PostgreSQL `15+`, required schema/privilege 점검
- `pgcrypto`가 `extensions` schema에 설치됐는지 검증
- migration history와 `public` 사용자 객체가 모두 0인 신규 대상만 허용
- existing/ambiguous target는 `DEPLOYMENT_HOLD`
- backup/recovery, maintenance window, rollback owner, operator, production approval 계약
- static no-write gate와 protected hash manifest 구현
- 설계 리뷰, 구현 리뷰, repository/static validation PASS
- 사용자 로컬 remote read-only attestation pending
