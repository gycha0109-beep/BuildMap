# Phase30 Design Review

## 목적

검증된 migration `00–10`을 hosted 적용 없이 정식 release artifact로 승격하고, 실제 배포 전 필요한 target-project attestation 경계를 분리합니다.

## 채택 설계

1. `migrations_draft`는 검증된 canonical source로 유지합니다.
2. `supabase/migrations`는 Phase29 replay evidence 보호를 위해 변경하지 않습니다.
3. 정식 release bundle은 `.local-evidence` 아래에 생성합니다.
4. release filename에서는 `_draft` suffix만 제거합니다.
5. SQL bytes는 변경하지 않아 normalized SHA-256이 source와 동일해야 합니다.
6. bundle은 Git HEAD, Phase29.2 merge commit, Phase30 manifest에 결속합니다.
7. Phase30은 `FormalPromotionDecision`과 `DeploymentReadinessDecision`을 분리합니다.

## 거부한 설계

- tracked replay mirror를 즉시 rename/replace
- comment 정리 또는 SQL formatting을 promotion 과정에 포함
- fresh/incremental evidence 없이 release artifact 생성
- hosted project를 자동 link하거나 `db push`
- target migration history를 자동 repair
- bundle을 저장소에 커밋

## 결정

```text
DesignReviewResult: PASS
FormalPromotionBoundary: LOCAL_ARTIFACT_ONLY
HostedExecutionBoundary: PHASE31
```
