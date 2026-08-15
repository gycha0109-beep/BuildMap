# BuildMap

BuildMap은 프로젝트가 **왜 지금의 모습이 되었는지**를 기록하고 공유하는 Decision Timeline 플랫폼이다.

코드 diff나 완료 목록만 남기는 것이 아니라, 문제 발견 → 가설 → 실험 → 피드백 → 유지/폐기/전환의 판단 흐름을 Change Card로 축적하고, 승인된 기록을 Decision Timeline과 공개 프로젝트 페이지로 표현한다.

## Product core

핵심 사용 흐름은 다음과 같다.

```text
Builder
→ Project
→ Problem Definition / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card Review / Approval
→ Decision Timeline
→ Public Project Page
→ Feedback Request / Feedback
→ next decision
```

BuildMap의 핵심 원천 기록은 **Change Card**다. AI draft는 공식 기록이 아니며 Builder가 최종 승인한다.

## Current repository status

현재 저장소는 제품 전체가 배포 직전인 상태가 아니다.

완료되거나 상당히 진행된 영역:

- 제품 철학 / 문제 정의 / 포지셔닝
- Builder / Scout 유즈케이스
- 화면 흐름과 텍스트 와이어프레임
- 제품 데이터 모델
- Supabase schema / RLS / helper / trigger 설계 및 구현
- migration `00–10` historical lineage
- RLS regression / replay / catalog validation
- staging migration history 및 poststate reconciliation
- Phase31 lifecycle closure

아직 구현되지 않은 영역:

- 사용자용 웹 application runtime
- frontend framework / routing / components
- Supabase client 기반 실제 Auth UX
- AI provider runtime integration
- application-level API / server functions
- lint / typecheck / unit / E2E / app build CI
- application staging deployment
- production deployment

Production deployment는 현재 `OUT_OF_SCOPE`다.

## Staging database status

BuildMap staging에는 보호된 migration `00–10`의 exact version/name history가 존재한다.

Phase31에서 read-only reconciliation을 수행해 migration history, public object poststate, catalog readiness를 검증했고 remote mutation 없이 closure했다.

기존 `00–10`은 immutable history로 취급한다. 과거 migration을 수정하지 않고, 향후 DB 변경은 additive migration으로 처리한다.

상세 설명:

- `supabase/README.md`
- `docs/handoff/CURRENT-HANDOFF.md`

## Documentation authority

문서가 Phase별로 누적되어 있으므로 current status와 historical evidence를 구분한다.

현재 상태를 확인할 때의 우선순위:

1. `docs/handoff/CURRENT-HANDOFF.md`
2. `docs/README.md`
3. `docs/use-cases/use-case-priorities.md`
4. `docs/screens/screen-priorities.md`
5. `docs/data-model/initial-data-scope.md`

과거 Phase 문서의 `PENDING`, `HOLD`, `DRAFT` 문자열은 해당 시점의 상태이며 현재 authoritative status가 아니다.

## Repository layout

```text
BuildMap/
├─ .github/
│  └─ workflows/
│     └─ phase31-lifecycle.yml
├─ docs/
│  ├─ product/
│  ├─ use-cases/
│  ├─ screens/
│  ├─ wireframes/
│  ├─ data-model/
│  ├─ database/
│  ├─ access-policy/
│  ├─ access-policy-tests/
│  ├─ rls/
│  ├─ rls-security/
│  ├─ migration-*/
│  └─ handoff/
├─ scripts/
│  └─ manual-*/
└─ supabase/
   ├─ migrations_draft/
   ├─ migrations/
   └─ README.md
```

`docs/`와 `scripts/`의 migration/RLS 관련 자료는 단순 정크가 아니라 historical audit/replay 자산이다.

`supabase/.temp/`와 `.local-evidence/`는 local-only이며 Git에 커밋하지 않는다.

## Next milestone

다음 실질 milestone은 migration readiness Phase를 더 세분화하는 것이 아니라 **실제 MVP application foundation과 첫 vertical slice 구현**이다.

권장 첫 범위:

```text
Auth
→ Builder Profile
→ Project creation
→ Problem / Hypothesis
→ Rough Note
→ AI Structured Draft
→ Change Card approval
→ Decision Timeline
→ Public Project Page
→ Feedback Request / Feedback
```

Scout discovery, heatmap, handoff mode, recruiting, advanced recommendation은 핵심 흐름이 실제 사용자 환경에서 검증된 뒤 확장한다.

## Security and credentials

다음 값은 저장소에 커밋하지 않는다.

- database passwords
- Supabase access tokens
- service-role keys
- API keys
- connection secrets

credential은 필요한 경우 process environment를 통해 전달하고 실행 후 제거한다.

`*_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `PGPASSWORD` 같은 **환경변수 이름 자체는 secret 값이 아니다.** 실제 값은 Git history에 들어가면 안 된다.

## Core product principle

> BuildMap은 무엇을 만들었는지가 아니라, 어떤 판단을 거쳐 지금의 프로젝트가 되었는지를 보여준다.
