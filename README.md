# BuildMap

## 한 줄 정의

BuildMap은 코드 변경이 아니라 프로젝트가 왜 지금의 모습이 되었는지를 기록하고 공유하는 **Decision Timeline 플랫폼**이다.

## 왜 BuildMap이 필요한가

대부분의 프로젝트 기록은 여러 곳에 흩어진다.

- GitHub에는 코드 변경이 남는다.
- Notion에는 기획 문서와 회의록이 남는다.
- Slack, 카카오톡, Discord에는 대화가 남는다.
- 블로그에는 정리된 결과와 회고가 남는다.

그러나 시간이 지나면 가장 중요한 질문이 사라진다.

> 왜 그런 결정을 내렸는가?

BuildMap은 프로젝트의 결과물만 보여주지 않는다. BuildMap은 문제를 발견하고, 가설을 세우고, 실험하고, 피드백을 받고, 유지하거나 버리고, 방향을 바꾼 판단 흐름을 기록한다.

BuildMap의 목적은 프로젝트가 단순히 무엇을 만들었는지가 아니라, **어떤 판단 위에 서 있는지**를 드러내는 것이다.

## BuildMap이 기록하는 것

BuildMap은 프로젝트의 변화와 판단을 기록한다.

- 처음 어떤 문제를 보았는가
- 어떤 가설을 세웠는가
- 무엇을 실험했는가
- 어떤 피드백을 받았는가
- 무엇을 유지했는가
- 무엇을 버렸는가
- 왜 방향을 바꾸었는가
- 지금 프로젝트는 어떤 판단 위에 서 있는가
- 현재 어떤 도움, 피드백, 테스터, 협업자가 필요한가

BuildMap에서 중심이 되는 기록 단위는 **변화 카드**다. 변화 카드는 단순 로그가 아니라 프로젝트에서 발생한 하나의 의사결정 단위다.

## BuildMap이 기록하지 않는 것

BuildMap은 다음을 중심으로 하지 않는다.

- 코드 파일의 변경 내역
- 단순 작업 완료 목록
- 완성된 포트폴리오 전시
- 일회성 홍보 글
- 채용용 이력서
- 기능 목록만 나열한 제품 소개
- 점수화된 역량 평가

BuildMap은 GitHub, Notion, Product Hunt, LinkedIn, 블로그를 합친 서비스가 아니다. BuildMap의 독립적 위치는 **프로젝트의 판단 흐름을 비개발자도 이해할 수 있는 변화 지도로 보여주는 것**에 있다.

## 핵심 사용자

### Builder

Builder는 프로젝트를 만든 사람이 아니라 프로젝트를 성장시키는 사람이다.

창업자, 학생 메이커, 개발자, 디자이너, PM, 비개발자, 바이브코딩 유저, 사이드프로젝트 제작자가 포함된다. Builder는 자신의 프로젝트가 어떤 판단을 거쳐 변화했는지 기록하고, 필요한 피드백·테스터·협업자를 찾는다.

### Scout

Scout는 단순 채용 담당자만 의미하지 않는다.

초기에는 협업자, 초기 사용자, 테스터, 멘토, 창업자, 팀원 탐색자가 더 중요하다. 장기적으로는 헤드헌터와 채용 담당자도 포함될 수 있다.

Scout는 이력서보다 Builder의 프로젝트 진화 과정과 판단 기록을 보고 사람과 프로젝트를 발견한다.

## 현재 문서 구조

```text
BuildMap/
  README.md
  docs/
    product/
      philosophy.md
      problem-definition.md
      positioning.md
      core-concepts.md
    use-cases/
      README.md
      builder-use-cases.md
      scout-use-cases.md
      common-use-cases.md
      change-card-scenarios.md
      handoff-use-cases.md
      use-case-priorities.md
    screens/
      README.md
      information-architecture.md
      builder-flow.md
      project-creation-flow.md
      change-card-workflow.md
      decision-timeline-screen.md
      public-project-page.md
      scout-discovery-flow.md
      exploration-heatmap.md
      visibility-and-states.md
      screen-priorities.md
    wireframes/
      README.md
      builder-dashboard-wire.md
      project-create-wire.md
      problem-hypothesis-wire.md
      rough-note-to-change-card-wire.md
      change-card-review-wire.md
      decision-timeline-wire.md
      public-project-page-wire.md
      feedback-request-wire.md
      feedback-write-wire.md
      scout-project-discovery-wire.md
      project-card-grid-wire.md
      simple-decision-diff-wire.md
      empty-loading-error-states.md
    data-model/
      README.md
      product-data-model-overview.md
      domain-objects.md
      object-relationships.md
      builder-and-scout-model.md
      project-model.md
      problem-and-hypothesis-model.md
      rough-note-and-ai-draft-model.md
      change-card-model.md
      decision-timeline-model.md
      public-project-page-model.md
      feedback-model.md
      visibility-and-state-model.md
      discovery-model.md
      decision-diff-model.md
      initial-data-scope.md
      data-model-risks.md
    decisions/
      initial-direction.md
      phase2-use-case-scope.md
      phase3-screen-flow-scope.md
      phase4-wireframe-scope.md
      phase5-product-data-model-scope.md
      phase5-5-data-model-corrections.md
```

### 문서 역할

- `docs/product/philosophy.md`: BuildMap의 철학과 존재 이유
- `docs/product/problem-definition.md`: BuildMap이 해결하려는 핵심 문제
- `docs/product/positioning.md`: 기존 서비스와의 차이 및 독립적 위치
- `docs/product/core-concepts.md`: Builder, Scout, Decision Timeline, 변화 카드 등 핵심 개념 정의
- `docs/use-cases/README.md`: 2단계 유즈케이스 문서의 목적과 읽는 순서
- `docs/use-cases/builder-use-cases.md`: Builder의 판단 흐름 기록 유즈케이스
- `docs/use-cases/scout-use-cases.md`: Scout의 발견, 피드백, 테스트, 협업 유즈케이스
- `docs/use-cases/common-use-cases.md`: 공개 프로젝트 페이지, 히트맵, 팔로우 등 공통 유즈케이스
- `docs/use-cases/change-card-scenarios.md`: 변화 카드가 의사결정 단위로 작동하는 대표 시나리오
- `docs/use-cases/handoff-use-cases.md`: 새 팀원, 협업자, 인수자, 멘토를 위한 프로젝트 인수인계 유즈케이스
- `docs/use-cases/use-case-priorities.md`: 핵심 유즈케이스와 확장 후보의 우선순위
- `docs/screens/README.md`: 3단계 화면 및 흐름 문서의 목적과 읽는 순서
- `docs/screens/information-architecture.md`: BuildMap의 제품 관점 정보 구조
- `docs/screens/builder-flow.md`: Builder의 전체 핵심 화면 흐름
- `docs/screens/project-creation-flow.md`: 첫 프로젝트 생성 화면 흐름
- `docs/screens/change-card-workflow.md`: 거친 메모에서 변화 카드 승인까지의 핵심 화면 흐름
- `docs/screens/decision-timeline-screen.md`: Decision Timeline 화면 구조
- `docs/screens/public-project-page.md`: 공개 프로젝트 페이지 정보 순서와 역할
- `docs/screens/scout-discovery-flow.md`: Scout의 탐색, 피드백, 테스터, 협업 흐름
- `docs/screens/exploration-heatmap.md`: 프로젝트 히트맵 탐색 화면
- `docs/screens/visibility-and-states.md`: 공개/비공개 상태와 주요 상태 정의
- `docs/screens/screen-priorities.md`: 핵심 화면과 확장 화면의 우선순위
- `docs/wireframes/README.md`: 4단계 텍스트 와이어 문서의 목적과 읽는 순서
- `docs/wireframes/builder-dashboard-wire.md`: Builder 대시보드의 표시 정보, 버튼, 상태
- `docs/wireframes/project-create-wire.md`: 첫 프로젝트 생성 단계별 입력 구조
- `docs/wireframes/problem-hypothesis-wire.md`: 문제 정의와 가설 입력/수정 구조
- `docs/wireframes/rough-note-to-change-card-wire.md`: 거친 메모 입력과 AI 구조화 시작 화면
- `docs/wireframes/change-card-review-wire.md`: AI 변화 카드 초안 검토와 Builder 승인 화면
- `docs/wireframes/decision-timeline-wire.md`: Decision Timeline의 상단 요약, 카드, 필터, 이동 흐름
- `docs/wireframes/public-project-page-wire.md`: 공개 프로젝트 페이지의 상단 요약 카드와 하단 Timeline 구조
- `docs/wireframes/feedback-request-wire.md`: 특정 판단에 대한 피드백 요청 화면
- `docs/wireframes/feedback-write-wire.md`: 로그인 기반 피드백 작성 화면
- `docs/wireframes/scout-project-discovery-wire.md`: Scout의 프로젝트 탐색, 피드백, 테스터, 저장 흐름
- `docs/wireframes/project-card-grid-wire.md`: 히트맵 전 단계의 프로젝트 카드 그리드 탐색 화면
- `docs/wireframes/simple-decision-diff-wire.md`: 초기 판단과 현재 판단을 비교하는 간단한 Decision Diff 화면
- `docs/wireframes/empty-loading-error-states.md`: 공통 빈 상태, 로딩, 오류, 권한, 공개 전환 경고 상태
- `docs/data-model/README.md`: 5단계 제품 데이터 모델 문서의 목적과 읽는 순서
- `docs/data-model/product-data-model-overview.md`: BuildMap 전체 제품 데이터 모델 개요
- `docs/data-model/domain-objects.md`: User, Project, Change Card 등 핵심 도메인 객체 정의
- `docs/data-model/object-relationships.md`: 객체 간 관계와 연결 강도 정리
- `docs/data-model/builder-and-scout-model.md`: Builder와 Scout의 제품 데이터 모델
- `docs/data-model/project-model.md`: Project 객체의 역할, 상태, 포함 정보
- `docs/data-model/problem-and-hypothesis-model.md`: 문제 정의와 가설 모델
- `docs/data-model/rough-note-and-ai-draft-model.md`: 거친 메모와 AI 구조화 초안 모델
- `docs/data-model/change-card-model.md`: Change Card 핵심 원천 기록 모델
- `docs/data-model/decision-timeline-model.md`: Decision Timeline 표현 모델
- `docs/data-model/public-project-page-model.md`: 공개 프로젝트 페이지 데이터 모델
- `docs/data-model/feedback-model.md`: Feedback Request와 Feedback 모델
- `docs/data-model/visibility-and-state-model.md`: 공개/비공개와 상태 모델
- `docs/data-model/discovery-model.md`: 프로젝트 카드 그리드와 탐색 모델
- `docs/data-model/decision-diff-model.md`: 판단 차이를 보여주는 Decision Diff 모델
- `docs/data-model/initial-data-scope.md`: 1차 구현 필수 데이터와 후순위 데이터 범위
- `docs/data-model/data-model-risks.md`: 제품 데이터 모델 위험과 대응
- `docs/decisions/initial-direction.md`: 1단계에서 확정한 것과 보류한 것
- `docs/decisions/phase2-use-case-scope.md`: 2단계에서 확정한 유즈케이스 범위와 보류한 것
- `docs/decisions/phase3-screen-flow-scope.md`: 3단계에서 확정한 화면/흐름 범위와 보류한 것
- `docs/decisions/phase4-wireframe-scope.md`: 4단계에서 확정한 텍스트 와이어 범위와 보류한 것
- `docs/decisions/phase5-product-data-model-scope.md`: 5단계에서 확정한 제품 데이터 모델 범위와 보류한 것
- `docs/decisions/phase5-5-data-model-corrections.md`: DB 설계 전 원천/파생 데이터, 상태 분리, 공개 정책, 1차 범위를 보정한 결정 문서

## 현재 단계의 원칙

현재 문서는 1단계 철학/문제 정의, 2단계 유즈케이스, 3단계 화면 및 흐름, 4단계 텍스트 와이어, 5단계 제품 데이터 모델, 5.5단계 데이터 모델 보정 문서까지 포함한다.

5단계와 5.5단계에서도 구현하지 않는다. SQL, DB 테이블, Supabase RLS, API, 프론트엔드 컴포넌트, 패키지 설치, 상세 디자인 시스템은 확정하지 않는다.

BuildMap의 현재 설계 목표는 하나다.

> Change Card를 핵심 원천 기록으로 두고, 승인된 Change Card가 Decision Timeline과 공개 프로젝트 페이지로 표현되는 제품 데이터 구조를 명확히 한다.

## 6단계 DB 스키마 초안 문서

6단계 문서는 `docs/database/`에 위치한다. 이 단계는 실제 SQL이나 Supabase migration 작성이 아니라, 5.5단계 보정 결정을 우선 기준으로 1차 DB 스키마 후보를 정리한 문서다.

주요 시작 문서:

- `docs/database/README.md`
- `docs/database/schema-overview.md`
- `docs/database/table-scope.md`
- `docs/database/change-card-tables.md`
- `docs/database/migration-readiness-checklist.md`
- `docs/decisions/phase6-db-schema-draft-scope.md`
- `docs/decisions/phase6-5-db-schema-corrections.md`

## 6.5단계 DB 스키마 보정 문서

6.5단계 문서는 `docs/decisions/phase6-5-db-schema-corrections.md`에 위치한다. 이 문서는 7단계 권한/공개/RLS 정책 설계로 넘어가기 전, 6단계 DB 스키마 초안의 공개 상태, 민감도, 사용자 구조, 링크 공개, 피드백 대상, 원문 보존 기준을 보정한다.

- 7단계 문서: `docs/access-policy/` — Auth / Visibility / Access Policy / RLS Policy Design 문서.


## 7.5단계 Access Policy Test Cases / RLS Scenario Readiness 문서

7.5단계 문서는 `docs/access-policy-tests/`에 위치한다. 이 단계는 실제 RLS SQL 작성 전, 7단계 권한/공개 정책을 허용/차단 시나리오로 검증하는 문서화 단계다.

- `docs/access-policy-tests/README.md`
- `docs/access-policy-tests/rls-scenario-readiness-checklist.md`
- `docs/decisions/phase7-5-access-policy-test-scope.md`

## 8단계 RLS SQL 초안 문서

8단계 문서는 `docs/rls/`에 위치한다. 이 단계는 실제 Supabase migration 작성이 아니라, 7단계 권한 정책과 7.5단계 테스트 케이스를 바탕으로 검토용 RLS SQL 초안을 문서화하는 단계다.

- `docs/rls/README.md`
- `docs/rls/rls-policy-id-mapping.md`
- `docs/rls/rls-test-case-mapping.md`
- `docs/rls/change-card-rls-draft.md`
- `docs/rls/feedback-rls-draft.md`
- `docs/rls/link-sharing-rls-draft.md`
- `docs/rls/rls-review-checklist.md`
- `docs/decisions/phase8-rls-sql-draft-scope.md`

## 8.5단계 문서 위치

- `docs/rls-security/README.md`: 9단계 Supabase migration draft 전 확인해야 할 RLS 보안 보정, share_token, public read boundary 문서.
- `docs/decisions/phase8-5-rls-security-corrections.md`: 8.5단계에서 확정한 RLS 보안 보정 범위와 보류 항목.

## 9단계 문서 위치

9단계 Supabase migration draft 문서는 `docs/migration-draft/README.md`에서 시작한다. 이 단계의 SQL은 문서 안의 검토용 초안이며 실제 migration 파일이 아니다.



## 10단계 Supabase Migration Syntax / Security Review 문서

10단계 문서는 `docs/migration-review/`에 위치한다. 이 단계는 실제 migration 파일 작성 전, 9단계 migration draft의 SQL 초안·RLS 초안·public-safe view·secure RPC·helper·trigger 후보를 문법과 보안 관점에서 검수한 문서다. 실제 `.sql` 파일은 아직 생성하지 않는다.


## 11단계 Supabase Migration File Draft

11단계 SQL draft 파일은 `supabase/migrations_draft/`에 위치한다. 이 파일들은 검토용 초안이며 정식 `supabase/migrations`가 아니다. 실제 Supabase 적용, CLI 실행, DB 연결은 금지한다.

- `supabase/migrations_draft/README.md`
- `docs/migration-file-draft/README.md`
- `docs/decisions/phase11-supabase-migration-file-draft-scope.md`

## 12단계 Supabase Migration Draft Static Review / Dry-run Preparation

12단계 문서는 `docs/migration-static-review/`에 위치한다. 이 단계는 11단계 `supabase/migrations_draft` SQL 파일을 실제로 실행하기 전 정적 검수와 local dry-run 준비 상태를 문서화한다. Supabase CLI 실행, DB 적용, 정식 migration 이동은 여전히 금지한다.

- `docs/migration-static-review/README.md`
- `docs/migration-static-review/go-no-go-before-dry-run.md`
- `docs/decisions/phase12-migration-static-review-dry-run-prep-scope.md`


## 13단계 Pre Dry-run SQL Patch

13단계 문서는 `docs/pre-dry-run-sql-patch/`에 위치한다. 이 단계는 12단계 정적 검수에서 발견된 dry-run 전 보정사항을 `supabase/migrations_draft` SQL draft와 보조 문서에 반영한다. 실제 SQL 실행, Supabase CLI 실행, local dry-run, 정식 migration 이동은 여전히 금지한다.

- `docs/pre-dry-run-sql-patch/README.md`
- `docs/pre-dry-run-sql-patch/dry-run-readiness-after-patch.md`
- `docs/decisions/phase13-pre-dry-run-sql-patch-scope.md`

- 14단계 local dry-run 결과: `docs/local-dry-run/README.md`

## 15단계 User Local Dry-run Runbook & Log Intake

15단계 문서는 `docs/user-local-dry-run-runbook/`에 위치한다. 이 단계는 14단계에서 Supabase CLI/Docker 부재로 local dry-run을 실행하지 못한 결과를 바탕으로, 사용자의 로컬 PC에서 안전하게 dry-run을 수행하고 실패 로그를 수집하기 위한 runbook과 로그 양식을 제공한다.

- `docs/user-local-dry-run-runbook/README.md`
- `docs/user-local-dry-run-runbook/log-intake-template.md`
- `docs/user-local-dry-run-runbook/result-report-template.md`
- `docs/decisions/phase15-user-local-dry-run-runbook-scope.md`

## 16단계 문서 위치

- 사용자 local dry-run 성공 결과는 `docs/local-dry-run-success/README.md`, 다음 Manual RLS Scenario Test Plan은 `docs/manual-rls-scenario-test-plan/README.md`에서 확인한다.

## 17단계 Manual RLS Scenario Test Runbook

17단계 문서는 `docs/manual-rls-scenario-runbook/`에 위치한다. 이 단계는 16단계 Manual RLS Scenario Test Plan을 실제 local-only 수동 테스트 절차서로 변환한다. SQL/RPC/view/trigger/function 테스트는 아직 실행하지 않으며, remote Supabase 적용과 정식 migration 승격은 계속 금지한다.

- `docs/manual-rls-scenario-runbook/README.md`
- `docs/manual-rls-scenario-runbook/test-execution-order.md`
- `docs/manual-rls-scenario-runbook/manual-test-log-intake-template.md`
- `docs/decisions/phase17-manual-rls-scenario-runbook-scope.md`

- 18단계 auth.uid() actor simulation smoke test 문서: `docs/auth-uid-simulation-smoke-test/README.md`

## 19단계 Auth Smoke PASS & P0 RLS Local Test Pack

19단계 문서는 사용자 로컬 PC에서 확인된 18단계 `auth.uid()` smoke test PASS 결과를 반영하고, 20단계에서 local-only P0 RLS 검증을 실행할 수 있는 script pack을 제공한다. 현재 작업자는 SQL을 실행하지 않았고 remote Supabase 적용도 하지 않았다.

- PASS 결과: `docs/auth-uid-simulation-smoke-test/user-local-pass-result.md`
- Go 재분류: `docs/auth-uid-simulation-smoke-test/go-reclassification.md`
- P0 test pack: `docs/p0-rls-local-test-pack/README.md`
- local scripts: `scripts/manual-local-rls/README.md`
- 결정 문서: `docs/decisions/phase19-auth-smoke-pass-p0-rls-local-test-pack-scope.md`

## BuildMap 20단계 First Run Failure Intake & Seed Actor Context Patch

20단계 첫 P0 RLS local script 실행에서 preflight는 PASS했으나 seed 단계가 `Feedback author_user_profile_id must match the current user profile.` 오류로 중단되었다. 이 실패는 P0 본 테스트 실패가 아니라 `feedbacks` fixture insert actor context 누락에 따른 `SEED_FAIL`로 기록한다.

관련 문서:

- `docs/p0-rls-local-test-pack/phase20-first-run-result.md`
- `docs/p0-rls-local-test-pack/seed-failure-analysis.md`
- `docs/p0-rls-local-test-pack/seed-actor-context-patch.md`
- `docs/p0-rls-local-test-pack/phase20-rerun-guide.md`
- `docs/decisions/phase20-p0-seed-script-actor-context-patch-scope.md`

관련 script patch:

- `scripts/manual-local-rls/phase20_01_seed_p0_fixture.sql`
- `scripts/manual-local-rls/phase20_05_feedback_author_spoofing_p0.sql`
- `scripts/manual-local-rls/run-phase20-p0-local.ps1`

## Phase 21 - P0 Access Path / Minimal GRANT Boundary Patch

- 문서: `docs/p0-rls-local-test-pack/phase20-second-run-result.md`
- 결정: `docs/decisions/phase21-p0-access-path-minimal-grant-boundary-patch-scope.md`
- 요약: phase20 두 번째 실행의 `permission denied for table projects`를 source/view access path 문제와 최소 privilege boundary 관점에서 보정했다.

## Phase22 public-safe view execution boundary

Phase22 문서는 `docs/p0-rls-local-test-pack/`의 `phase20-third-run-result.md`, `public-safe-view-execution-model-analysis.md`, `public-safe-view-row-column-boundary-audit.md`, `public-safe-view-execution-boundary-patch.md`, `phase20-fourth-run-guide.md`를 기준으로 확인한다.

- Phase22.5 문서: `docs/p0-rls-local-test-pack/phase22-5-public-builder-view-coverage-correction.md` — `public_builder_profiles` runtime verification 누락 보정.

## Phase23 Phase20 Fourth Run PASS Intake & Final Signal Scan Correction

- Phase20 네 번째 사용자 로컬 실행 PASS intake 및 wrapper final signal scan false positive 보정 문서는 `docs/p0-rls-local-test-pack/phase20-fourth-run-pass-result.md`, `docs/p0-rls-local-test-pack/p0-local-rls-test-pass-intake.md`, `docs/p0-rls-local-test-pack/final-signal-scan-false-positive-analysis.md`, `docs/p0-rls-local-test-pack/post-p0-next-step-decision.md`를 확인한다.
- 이번 단계는 SQL/migration/RLS scenario 수정이 아니라 wrapper의 exact signal parsing 보정 단계다.


## Phase23.5 P0 Test Oracle Completeness

Phase23.5는 Phase20 P0 PASS 판정을 유지하면서 wrapper false-negative guard, exact negative-control oracle, scenario coverage manifest를 보강했다. 관련 문서는 `docs/p0-rls-local-test-pack/phase23-5-test-oracle-completeness-hardening.md`를 확인한다.
## 23.6단계 Wrapper Parse Gate & Deterministic Signal Parser Correction

23.6단계는 Phase23.5 wrapper의 PowerShell parse error와 signal parser 결정성 문제를 보정한다.

- `docs/p0-rls-local-test-pack/phase23-6-wrapper-parse-gate-signal-parser-correction.md`
- `docs/p0-rls-local-test-pack/powershell-static-parse-validation-guide.md`
- `docs/decisions/phase23-6-wrapper-parse-gate-signal-parser-correction-scope.md`

사용자는 wrapper 실행 전에 syntax-only parse check를 수행한다. 이번 단계는 migration/RLS/public-safe view 설계를 변경하지 않는다.


## Phase24 Link Sharing Secure RPC Security Hardening & Full Matrix

Phase24는 P0 RLS PASS 이후 `share_token` 기반 링크 공개 경계를 보강하고, 사용자가 Phase25에서 실행할 local-only secure RPC Full Matrix pack을 작성한다.

- 문서: `docs/link-sharing-secure-rpc-test-pack/README.md`
- scripts: `scripts/manual-local-link-sharing/README.md`
- 결정: `docs/decisions/phase24-link-sharing-secure-rpc-full-matrix-scope.md`
- 주요 patch: `supabase/migrations_draft/20260708004000_buildmap_04_helpers_and_triggers_draft.sql`, `20260708007000_buildmap_07_link_sharing_rpc_draft.sql`, `20260708008000_buildmap_08_grants_and_final_checks_draft.sql`

현재 작업자는 SQL을 실행하지 않았으며, 실제 Phase25 실행은 사용자 로컬 PC에서만 수행한다. remote 적용과 정식 migration 승격은 계속 금지한다.

## Phase25 PASS / Phase26 Regression Baseline

Phase25 Link Sharing Secure RPC Full Matrix는 사용자 로컬 clean rerun에서 다음 결과가 보고됐다.

```text
Phase25 link sharing RPC local run completed. OverallResult: PASS
```

Phase26은 이 결과를 `USER_LOCAL_PASS` 증거 수준으로 고정하고 protected file hash, 107개 scenario contract, PowerShell parse, 선택적 PASS log structure를 검증하는 static change gate를 추가한다.

- Phase25 PASS: `docs/link-sharing-secure-rpc-test-pack/phase25-user-local-pass-result.md`
- Phase26: `docs/link-sharing-regression-gate/README.md`
- regression gate: `scripts/manual-local-link-sharing/run-phase26-link-sharing-regression-gate.ps1`
- baseline manifest: `scripts/manual-local-link-sharing/phase26_link_sharing_regression_baseline.json`
- current handoff: `docs/handoff/CURRENT-HANDOFF.md`
- cumulative phase history: `docs/handoff/phase-history.md`

이후 모든 단계는 대화 제한 또는 작업자 변경에 대비해 `docs/handoff/`를 누적 갱신한다.


## Phase27–27.1 P1 RLS Full Matrix and Access Hardening

Phase27 added a local-only P1 RLS/integrity matrix. The first user-local run completed all scenarios but correctly returned `OverallResult: FAIL` because actual access/integrity gaps were detected. Phase27.1 adds an additive migration draft and expands the matrix from 167 to 181 scenarios without weakening expected denials.

- pack: `scripts/manual-local-rls-p1/`
- failure intake: `docs/p1-rls-full-matrix/phase27-first-runtime-failure-intake.md`
- hardening: `docs/p1-rls-full-matrix/phase27-1-access-integrity-hardening.md`
- review: `docs/p1-rls-full-matrix/phase27-1-independent-review.md`
- new migration draft: `supabase/migrations_draft/20260720000000_buildmap_09_p1_access_integrity_hardening_draft.sql`

Current status: static reviewed; combined Phase20 P0 compatibility, Phase26 regression, and Phase27.1 local clean rerun pending.
