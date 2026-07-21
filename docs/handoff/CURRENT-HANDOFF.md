# BuildMap Current Handoff

## 현재 재개 기준

- 현재 단계: Phase30 Formal Migration Promotion & Deployment Readiness
- 상태: 설계 → 설계 리뷰 → 구현 → 구현 리뷰 → 정적 검증 완료
- 기준 날짜: 2026-07-21
- 공식 저장소: `gycha0109-beep/BuildMap`
- 작업 브랜치: `agent/phase30-formal-migration-promotion-readiness`
- Phase29.2 merge commit: `fccc9633761bfe99b0c0da23b661f3f74d7d7f08`
- hosted/remote migration execution: 없음
- Phase30 사용자 로컬 bundle runtime: pending

## 현재 보호 기준선

- migration source/replay mirror: exact `00–10`, 11 files
- Phase20 P0 RLS: `147` scenarios
- Phase25 Link Sharing: `107` scenarios
- Phase27.1 P1 RLS: `181` scenarios
- Phase28 unified gate: `47` protected files / `435` scenarios
- Phase29 catalog: `26` scenarios
- Phase29.2 final user report: `PromotionDecision: PROMOTION_READY`
- known security blockers: `0`
- automatic deployment/link/history repair: prohibited

## Phase29.2 종료

- fresh-install `00–10` evidence path 구현
- incremental `00–09 → 10` evidence path 구현
- 각 경로에서 Phase20/25/27.1/28/catalog 재검증
- evidence HEAD/digest/RunId binding 구현
- PowerShell blank-output binding 결함 보정
- 사용자 로컬 최종 `PROMOTION_READY` 보고
- PR #4 merge 완료

상세 attestation:

- `docs/migration-promotion-readiness/phase29-2-user-local-attestation.md`

## Phase30 목적

검증된 migration SQL을 수정하지 않고 정식 release artifact로 승격합니다. 실제 hosted 적용은 하지 않습니다.

### Artifact model

- canonical source: `supabase/migrations_draft`
- protected replay mirror: `supabase/migrations`
- generated release bundle: `.local-evidence/phase30-formal-promotion/...`
- release filename: `_draft.sql` suffix만 제거
- SQL transformation: 없음, bytes 보존
- source/replay/release normalized SHA-256 exact equality

### Decision model

```text
FormalPromotionDecision: PROMOTION_READY | PROMOTION_HOLD
DeploymentReadinessDecision: DEPLOYMENT_READY | DEPLOYMENT_HOLD
```

Phase30 local bundle이 PASS하면 formal promotion은 READY가 될 수 있습니다. 대상 hosted project identity/history/backup이 확인되지 않았으므로 deployment readiness는 Phase30.5까지 의도적으로 HOLD입니다.

## Phase30 구현

- `scripts/manual-formal-migration-promotion/phase30-common.ps1`
- `scripts/manual-formal-migration-promotion/phase30_formal_promotion_manifest.json`
- `scripts/manual-formal-migration-promotion/new-phase30-release-bundle-local.ps1`
- `scripts/manual-formal-migration-promotion/run-phase30-formal-promotion-readiness-gate.ps1`
- `scripts/manual-formal-migration-promotion/run-phase30-local-promotion-closure.ps1`
- `scripts/manual-formal-migration-promotion/README.md`
- `docs/migration-promotion-readiness/phase30-design-review.md`
- `docs/migration-promotion-readiness/phase30-implementation-review.md`
- `docs/migration-promotion-readiness/phase30-static-validation.md`
- `docs/migration-promotion-readiness/phase30-deployment-runbook.md`

## 설계·구현 리뷰 결과

- tracked replay mirror 즉시 rename/replace: 거부
- SQL comment cleanup/formatting: 거부
- release transformation: `RENAME_ONLY_PRESERVE_BYTES`
- output path escape: 차단
- current Git HEAD binding: 적용
- exact 11-file order/version/name/hash contract: 적용
- Supabase CLI/Docker/psql/URL capability: bundle generator에서 차단
- automatic remote link/deploy/history repair: false 고정
- 설계 판정: PASS
- 구현 리뷰 판정: PASS
- repository static review: PASS

## 현재 정확한 판정

```text
Phase29.2: USER_LOCAL_PROMOTION_READY
Phase30 design: PASS
Phase30 implementation: PASS
Phase30 static validation: PASS
FormalPromotionBundleRuntime: PENDING_USER_LOCAL
FormalPromotionDecision: PROMOTION_HOLD
TargetProjectAttestation: PENDING_PHASE30_5
DeploymentReadinessDecision: DEPLOYMENT_HOLD
```

## 사용자 로컬 다음 실행

BuildMap 루트에서 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Get-ChildItem .\scripts\manual-formal-migration-promotion\*.ps1 |
  Unblock-File

.\scripts\manual-formal-migration-promotion\run-phase30-local-promotion-closure.ps1
```

기대 결과:

```text
FormalPromotionBundleResult: PASS
StaticErrorCount: 0
StaticBlockerCount: 0
FormalPromotionDecision: PROMOTION_READY
TargetProjectAttestation: PENDING_PHASE30_5
DeploymentReadinessDecision: DEPLOYMENT_HOLD
Phase30GateResult: PASS
Phase30ClosureResult: PASS
```

## 절대 제약

- hosted Supabase 작업 금지
- `supabase link`, `db push`, `db pull`, `migration repair` 금지
- remote DB URL/password/token/key 입력 금지
- tracked `supabase/migrations` 변경 금지
- generated bundle/log Git commit 금지
- Phase30.5 target-project attestation 전 `DEPLOYMENT_READY` 판정 금지
