# Phase30 Formal Migration Promotion & Deployment Readiness

## 목적

Phase29.2에서 `PROMOTION_READY`로 판정된 migration `00–10`을 변경 없이 정식 release bundle로 승격합니다. 이 단계는 파일 패키징과 정적 검증만 수행합니다.

## 핵심 원칙

- canonical source: `supabase/migrations_draft`
- protected replay mirror: `supabase/migrations`
- release bundle: `.local-evidence/phase30-formal-promotion/.../migrations`
- 변환: 파일명에서 `_draft`만 제거하고 SQL bytes는 그대로 보존
- hosted Supabase 연결·적용·migration repair: 금지
- target-project attestation 전 deployment decision: `DEPLOYMENT_HOLD`

## 전체 실행

BuildMap 루트에서 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Get-ChildItem .\scripts\manual-formal-migration-promotion\*.ps1 |
  Unblock-File

.\scripts\manual-formal-migration-promotion\run-phase30-local-promotion-closure.ps1
```

## 기대 결과

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

`DEPLOYMENT_HOLD`는 실패가 아닙니다. Phase30.5에서 대상 hosted project의 identity, migration history, backup/restore 조건을 별도로 확인하기 전까지 의도적으로 유지됩니다.

## 절대 금지

- `supabase link`
- `supabase db push`
- `supabase db pull`
- `supabase migration repair`
- remote DB URL, password, token, key 입력
- tracked `supabase/migrations` 자동 변경
- bundle을 Git에 커밋
