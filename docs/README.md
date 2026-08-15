# BuildMap Documentation Map

## Current authority

현재 저장소의 제품 구현/운영 상태는 다음 문서를 우선 기준으로 본다.

1. `docs/handoff/ACTIVE-HANDOFF.md`
2. `docs/use-cases/use-case-priorities.md`
3. `docs/screens/screen-priorities.md`
4. `docs/data-model/initial-data-scope.md`

`docs/handoff/CURRENT-HANDOFF.md`는 이름과 달리 Phase31 closure 당시 hash-protected historical snapshot이다. Phase별 설계·검증 문서 역시 해당 시점의 historical evidence이며 과거 README의 `PENDING`, `HOLD`, `DRAFT` 문자열만으로 현재 상태를 판정하지 않는다.

## Current implementation status

- 제품 철학, 유즈케이스, 화면 흐름, 텍스트 와이어프레임, 데이터 모델: 설계 완료 수준
- Supabase schema/RLS historical migrations `00–10`: immutable lineage
- Phase31 staging reconciliation: CLOSED / PASS
- additive migration 11: app runtime privilege alignment
- additive migration 12: least-privilege ACL hardening
- Supabase Git `main` branch deployment: active, migrations auto-apply after merge
- `apps/web`: Next.js + TypeScript + Supabase SSR foundation implemented
- Auth signup/signin/confirmation route, Builder bootstrap, project create/list: implemented
- Web App CI / Database Contract Gate / Phase31 Historical Integrity Gate: active
- real browser staging E2E: not yet proven
- Vercel BuildMap deployment: not yet configured
- production deployment: `OUT_OF_SCOPE`

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

현재 우선순위는 DB 검증 Phase 추가가 아니라 앱 staging runtime을 실제로 증명하는 것이다.

```text
Vercel staging/preview
→ Supabase Auth configuration
→ signup / confirmation / signin
→ User + Builder bootstrap
→ Project create/list
→ browser smoke / E2E
```

이 흐름이 통과하면 다음 vertical slice로 진행한다.

```text
Problem / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card Review / Approval
→ Decision Timeline
→ Public Project Page
→ Feedback Request / Feedback
```
