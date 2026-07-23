# Phase31 Controlled Staging Migration Execution — Design Review

## 목적

Phase30의 immutable release bundle과 Phase30.5의 staging target attestation을 동일 실행에 결속하고, hosted staging에 migration `00–10`을 한 번만 통제 적용합니다.

## 실제 저장소 기준선

- PR #6: merged
- Phase30.5 implementation HEAD: `eb40bea433a3e3f51c13520879e797728dc7bc05`
- Phase30.5 merge commit / Phase31 base: `ed2be349de1d9114d321fc2a66b97fbd5740bcc1`
- Phase30.5 user-local attestation: PASS
- DeploymentReadinessDecision: `DEPLOYMENT_READY`
- hosted migration execution: 아직 없음

## 검토한 실행 대안

### A. `psql`로 11개 SQL을 직접 순차 실행

거부했습니다.

- migration history를 별도로 작성해야 합니다.
- SQL 적용 성공과 history 기록 사이의 불일치 창이 생깁니다.
- Supabase의 표준 migration execution semantics를 우회합니다.

### B. `supabase db push --db-url ...`

거부했습니다.

- credential-bearing URL이 process command line에 노출될 수 있습니다.
- Phase30.5의 process-environment-only credential 계약과 충돌합니다.

### C. tracked `supabase/migrations`에서 직접 linked push

거부했습니다.

- repository의 protected replay mirror를 실제 release workspace와 혼동합니다.
- 기존 project config/link state와 결합돼 대상 오선택 가능성이 커집니다.

### D. isolated workdir + official linked `db push`

채택했습니다.

- `.local-evidence` 아래 임시 workdir만 사용합니다.
- release bundle의 11개 SQL만 복사하고 hash를 재검증합니다.
- `db push --dry-run`의 exact inventory를 승인 전 확인합니다.
- CLI가 migration history 생성과 각 migration 성공 기록을 담당합니다.
- 실행 후 workdir를 삭제해 persistent link/config를 남기지 않습니다.

## 승인·실행 경계

- staging만 허용합니다.
- Phase30.5 evidence의 project ref, connection identity, bundle hash가 현재 입력과 일치해야 합니다.
- dry-run 후에도 동일 read-only probe로 empty target을 다시 확인합니다.
- exact approval phrase를 interactive console에서 입력해야 합니다.
- actual `db push` 후 history `11`, exact versions `00–10`, catalog `26/26`을 확인합니다.

## 실패 정책

migration은 forward-only로 취급합니다. 부분 적용 또는 post-validation 실패 시:

1. 추가 mutation을 즉시 중지합니다.
2. apply/history/probe evidence를 보존합니다.
3. 자동 rollback, remote reset, history repair를 실행하지 않습니다.
4. rollback owner가 recovery plan과 실제 remote state를 기준으로 별도 결정을 내립니다.

## 판정

```text
Phase31DesignReview: PASS
ExecutionEngine: SUPABASE_CLI_DB_PUSH_V1
TargetEnvironment: staging
ProductionDeployment: OUT_OF_SCOPE
AutomaticRollback: false
```
