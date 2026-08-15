# BuildMap Documentation Map

## Current authority

현재 저장소의 운영/재개 상태는 다음 문서를 우선 기준으로 본다.

1. `docs/handoff/CURRENT-HANDOFF.md`
2. `docs/use-cases/use-case-priorities.md`
3. `docs/screens/screen-priorities.md`
4. `docs/data-model/initial-data-scope.md`

Phase별 설계·검증 문서는 해당 시점의 historical evidence다. 과거 Phase README의 `PENDING`, `HOLD`, `DRAFT` 문자열만으로 현재 상태를 판정하지 않는다.

## Current implementation status

- 제품 철학, 유즈케이스, 화면 흐름, 텍스트 와이어프레임, 데이터 모델: 설계 완료 수준
- Supabase schema/RLS/migration `00–10`: 보호된 historical lineage
- staging: exact migration history와 catalog poststate reconciliation 완료
- Phase31: CLOSED
- production deployment: `OUT_OF_SCOPE`
- 사용자용 웹 애플리케이션 runtime: 아직 저장소에 없음

따라서 현재 저장소는 "제품 전체가 배포 직전"인 상태가 아니라, DB/RLS/staging 기반이 먼저 완성된 상태다.

## Product design

- `product/`: 철학, 문제 정의, 포지셔닝, 핵심 개념
- `use-cases/`: Builder/Scout 핵심 유즈케이스와 우선순위
- `screens/`: 정보 구조, 화면 흐름, 우선순위
- `wireframes/`: 텍스트 와이어프레임
- `data-model/`: 제품 데이터 모델과 1차 범위
- `database/`: DB 스키마 설계 문서
- `access-policy/`, `access-policy-tests/`: 권한/RLS 정책과 시나리오
- `rls/`, `rls-security/`: RLS SQL 설계 및 보안 보정

## Historical verification and migration lifecycle

다음 디렉터리는 migration/RLS 검증 이력과 재현성을 보존한다.

- `migration-draft/`
- `migration-file-draft/`
- `migration-review/`
- `migration-static-review/`
- `pre-dry-run-sql-patch/`
- `local-dry-run/`
- `local-dry-run-success/`
- `user-local-dry-run-runbook/`
- `manual-rls-scenario-test-plan/`
- `manual-rls-scenario-runbook/`
- `p0-rls-local-test-pack/`
- `p1-rls-full-matrix/`
- `link-sharing-secure-rpc-test-pack/`
- `link-sharing-regression-gate/`
- `unified-rls-regression-gate/`
- `migration-promotion-readiness/`

이 자료들은 삭제 대상 정크가 아니라 audit/replay 자산이다. 단, current status의 authority는 아니다.

## Next product milestone

다음 실질 milestone은 DB 검증 Phase를 추가하는 것이 아니라 실제 MVP application vertical slice를 구현하는 것이다.

```text
Auth
→ Builder Profile
→ Project
→ Problem / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card Review / Approval
→ Decision Timeline
→ Public Project Page
→ Feedback Request / Feedback
```

새 단계 번호나 branch 이름은 별도 설계 후 확정한다.
