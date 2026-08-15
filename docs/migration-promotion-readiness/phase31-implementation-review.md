# Phase31 Controlled Staging Migration Execution — Implementation Review

## 구현 구성

- `phase31_controlled_staging_migration_manifest.json`
- `phase31-common.ps1`
- `phase31-runtime.ps1`
- `phase31-evidence.ps1`
- `run-phase31-static-gate.ps1`
- `run-phase31-controlled-staging-migration-local.ps1`
- operator `README.md`

## 구현 검토 결과

### 보호 결속

- Phase30 promotion HEAD와 exact 11-file release contract 고정
- Phase30.5 implementation HEAD와 merge commit 고정
- Phase30 bundle manifest/artifact hash 재검증
- Phase30.5 evidence의 staging/project/connection/bundle 결속 재검증
- migration source와 replay mirror의 Phase30.5 이후 drift 차단

### remote write surface

허용되는 remote mutation command는 actual `supabase db push` 하나입니다.

선행 remote commands:

- `supabase link` — isolated workdir의 대상 project 결속
- `supabase migration list` — before/after history 관찰
- `supabase db push --dry-run` — pending inventory 관찰

차단되는 capability:

- `migration repair`
- linked/remote `db reset`
- `db pull`
- `--db-url`
- command-line password
- seed/roles 포함
- production target

### credential 처리

- access token과 DB password는 process environment에서만 읽습니다.
- CLI command argument에 token/password/URL을 전달하지 않습니다.
- `link` 중 DB password env를 잠시 제거해 native credential 저장을 피합니다.
- evidence에는 connection identity hash만 기록합니다.
- 임시 linked workdir는 `finally`에서 삭제합니다.

### pre/post oracle

- pre: dry-run exact 11 + read-only empty-target re-probe
- post: exact migration history versions + public objects 존재
- post: protected Phase29 catalog 26 scenario exact completeness/all PASS
- parser는 missing/unexpected/duplicate/conflicting scenario를 fail closed 처리

### 보완 사항

- preflight failure에도 실제 JSON evidence가 생성되도록 보완
- apply 실패 후에도 post-list와 read-only post-probe를 수행해 부분 적용 상태를 관찰
- automatic rollback을 의도적으로 구현하지 않음
- generated workdir에서 seed/roles 파일을 제거

## 잔여 런타임 조건

이 저장소 변경만으로 hosted staging migration을 실행하지 않습니다. 다음은 사용자 로컬에서만 확인됩니다.

- 실제 설치된 Supabase CLI/psql 동작
- access token과 target credential
- dry-run output inventory
- explicit approval phrase
- actual hosted `db push`
- post-migration catalog 결과

## 판정

```text
Phase31ImplementationReview: PASS
RemoteMutationSurface: ONE_CONTROLLED_DB_PUSH
RuntimeExecution: PENDING_USER_LOCAL
ProductionDeployment: OUT_OF_SCOPE
```
