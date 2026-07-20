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
- static review PASS, 사용자 local runtime pending

## Phase27.1 P1 Access & Integrity Hardening

- 첫 사용자 로컬 run의 complete coverage + `OverallResult: FAIL` intake
- archived child public source exposure, creator/author spoofing, linked-card parity, approval metadata, profile/project broad UPDATE를 실제 blocker로 분류
- 기존 protected migration 00–08을 수정하지 않고 additive migration draft 09 추가
- profile/project UPDATE whitelist, Project INSERT allowlist, identity triggers, linked-card helper parity, pinned SECURITY DEFINER helpers, unified target validation, approved Change Card immutability 구현
- `P1-INTEGRITY-018`이 ownership transfer 성공에 가려진 false-negative였음을 독립 리뷰에서 발견하고 transaction 분리
- P0 PRE-021 grant oracle를 column-level UPDATE와 호환되도록 보정
- matrix를 167 → 181 scenarios로 확대
- static review PASS, 사용자 local rerun pending
