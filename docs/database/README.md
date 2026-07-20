# BuildMap 6단계 DB 스키마 초안 문서

> 이 문서는 DB 스키마 초안 문서다. 실제 SQL, Supabase migration, RLS 정책, API, 프론트엔드 구현은 작성하지 않는다. 테이블명과 필드명은 후보이며 최종 확정이 아니다.

## 1. 6단계 문서의 목적

6단계의 목적은 BuildMap의 1차 구현에 필요한 DB 스키마 후보를 제품 문서 수준에서 정리하는 것이다.

이번 단계는 실제 DB 구현이 아니다. 5단계 제품 데이터 모델과 5.5단계 보정 결정을 바탕으로, 어떤 테이블 후보가 필요하고 각 테이블 후보가 어떤 책임을 가지며 어떤 필드 후보와 관계 후보를 갖는지 정리한다.

## 2. 이전 단계 문서와의 관계

- 1단계: BuildMap의 철학, 문제 정의, 포지셔닝, 핵심 개념을 정리했다.
- 2단계: Builder, Scout, 피드백, 인수인계 유즈케이스를 정리했다.
- 3단계: 핵심 화면과 사용자 흐름을 정리했다.
- 4단계: 화면별 텍스트 와이어 구조를 정리했다.
- 5단계: 제품 데이터 모델을 정리했다.
- 5.5단계: 원천/파생 데이터, 상태축 분리, 공개 정책, 1차 범위를 보정했다.

6단계는 위 결정을 DB 스키마 초안으로 옮기는 단계다. 특히 `docs/decisions/phase5-5-data-model-corrections.md`가 5단계 데이터 모델보다 우선한다.

## 3. 이번 단계에서 다루는 범위

- 1차 필수 테이블 후보
- 1차 선택 테이블 후보
- 2차/장기 확장 테이블 후보
- 핵심 필드 후보
- 필수/선택 필드 후보
- 상태 필드와 공개 필드 분리
- 직접 참조와 연결 테이블 후보
- 원천 데이터와 파생/표현 데이터 구분
- 실제 migration 전 체크리스트

## 4. 이번 단계에서 다루지 않는 범위

- 실제 SQL
- Supabase migration 파일
- RLS 정책
- API route
- 프론트엔드 컴포넌트
- 프론트엔드 상태 관리
- 인덱스 최적화
- 검색 인덱스 구현
- 캐시/스냅샷 테이블 구현
- GitHub/Notion 자동 연동
- 비로그인 피드백
- 채용/헤드헌팅, 결제, 투자자 매칭
- Project DNA, 역량 점수화, AI 자동 평가 점수

## 5. 생성된 DB 스키마 초안 문서 목록

```text
BuildMap/docs/database/
  README.md
  schema-overview.md
  table-scope.md
  core-tables.md
  profile-tables.md
  project-tables.md
  problem-hypothesis-tables.md
  note-and-ai-draft-tables.md
  change-card-tables.md
  feedback-tables.md
  visibility-and-status-fields.md
  derived-views-and-computed-data.md
  optional-tables.md
  schema-relationships.md
  schema-risks.md
  migration-readiness-checklist.md
BuildMap/docs/decisions/
  phase6-db-schema-draft-scope.md
```

## 6. 읽는 순서

1. `schema-overview.md`
2. `table-scope.md`
3. `core-tables.md`
4. `change-card-tables.md`
5. `feedback-tables.md`
6. `visibility-and-status-fields.md`
7. `derived-views-and-computed-data.md`
8. `schema-relationships.md`
9. `schema-risks.md`
10. `migration-readiness-checklist.md`
11. `docs/decisions/phase6-db-schema-draft-scope.md`

## 7. 6단계의 핵심 결론

6단계의 핵심 결론은 다음이다.

- Change Card는 핵심 원천 테이블 후보다.
- Decision Timeline은 별도 원천 테이블이 아니라 승인된 Change Card의 표현 구조다.
- Public Project Page는 별도 제품 소개글 테이블이 아니라 Project의 공개 뷰다.
- Feedback은 일반 댓글이 아니라 Feedback Request 또는 특정 판단에 연결되는 근거다.
- Change Card 작업 상태와 공개 상태는 분리한다.
- Project 진행 상태와 공개 상태는 분리한다.
- AI Structured Draft는 공식 기록이 아니라 Change Card 후보 초안이다.
- Problem Definition과 Hypothesis의 과거 이력은 Change Card를 원천으로 추적한다.

## 8. 5.5 보정 우선 원칙

DB 스키마 초안 작성 기준은 `docs/decisions/phase5-5-data-model-corrections.md`를 우선한다. 5단계 데이터 모델과 5.5단계 보정 문서가 충돌하면 5.5단계 보정 결정을 따른다.

## 9. 6.5 보정 문서 확인 원칙

7단계 권한/공개/RLS 정책 설계로 넘어가기 전에는 `docs/decisions/phase6-5-db-schema-corrections.md`를 먼저 확인한다.

> RLS SQL 작성 전에는 `docs/access-policy/` 문서를 먼저 확인한다. 7단계 권한/공개/RLS 정책 설계는 6.5단계 보정 문서를 최우선 기준으로 한다.
