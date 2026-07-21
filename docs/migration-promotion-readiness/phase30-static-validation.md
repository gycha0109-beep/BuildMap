# Phase30 Static Validation

## 확인 항목

- source promotion merge commit 고정
- migration count `11`
- source/replay normalized SHA-256 contract 고정
- release filename mapping `_draft.sql → .sql`
- release transformation `RENAME_ONLY_PRESERVE_BYTES`
- protected Phase30 file hash contract
- PowerShell parser gate 포함
- remote-capable command pattern 차단
- `.local-evidence` output confinement
- bundle HEAD/source commit/hash validation
- deployment decision과 formal promotion decision 분리

## 정적 판정

```text
Phase30Design: PASS
Phase30Implementation: PASS
RepositoryStaticReview: PASS
UserLocalBundleRuntime: PENDING
FormalPromotionDecision: PROMOTION_HOLD
DeploymentReadinessDecision: DEPLOYMENT_HOLD
```

정적 PASS는 bundle runtime PASS나 hosted deployment readiness를 대체하지 않습니다.
