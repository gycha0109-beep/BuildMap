# SQL Syntax Review

> 주의: 이 문서는 실제 migration 파일이 아니다. SQL 실행, Supabase 연결, RLS 적용, helper/RPC/view/trigger 생성은 아직 하지 않는다. 실제 적용 전 Supabase/PostgreSQL 공식 문서와 로컬 dry-run으로 재검증해야 한다.

## 1. 검수 기준

9단계 문서의 SQL 초안은 실행 가능한 최종 SQL이 아니라 구조 검토용이다. 이 문서에서는 문법상 위험과 실제 적용 전 확인할 사항을 정리한다.

상태 값:

- 문법상 양호 후보
- 문법 확인 필요
- 보안 확인 필요
- 구조 보정 필요
- 후순위 제외

## 2. SQL 초안 전반 검수표

| 문서 위치 | SQL 초안 종류 | 현재 상태 | 검수 의견 | 보정 제안 | 실제 적용 전 확인 사항 |
|---|---|---|---|---|---|
| `schema-primitives-draft.md` | extension / status check / trigger helper | 문법 확인 필요 | `gen_random_uuid`, `pgcrypto`, trigger helper는 환경 의존 | extension 사용 가능성 명시 | 로컬 DB dry-run, 공식 문서 확인 |
| `profile-schema-migration-draft.md` | create table / FK | 문법상 양호 후보 | `auth.users(id)` FK는 Supabase 관리 객체 참조이므로 PK 기준 확인 필요 | FK는 `auth.users(id)`만 사용 후보 | Supabase Auth user data 문서 확인 |
| `project-schema-migration-draft.md` | create table / check / unique | 문법상 양호 후보 | `share_token_hash text unique`는 null 중복 허용 동작 확인 필요 | partial unique index 후보 비교 | Postgres unique null 처리 검증 |
| `problem-hypothesis-schema-migration-draft.md` | create table / FK / check | 문법상 양호 후보 | 자체 visibility 필드 보류가 명확함 | Project visibility 기반으로 시작 | 공개 여부 정책 재확인 |
| `rough-note-ai-draft-schema-migration-draft.md` | create table / status check | 문법상 양호 후보 | 전환 후 수정 제한은 table 문법만으로 부족 | trigger/app validation 후보 유지 | mutation trigger 검토 |
| `change-card-schema-migration-draft.md` | create table / FK / check | 문법 확인 필요 | `type`은 예약어 혼동 가능성이 있어 `card_type` 후보 검토 | 실제 migration 전 명명 재검토 | Postgres identifier 검증 |
| `feedback-schema-migration-draft.md` | create table / FK / check | 구조 보정 필요 | `feedbacks.project_id` 중복 저장 여부 결정 필요 | feedback_request로 project 파생 우선 후보 | 무결성/성능 비교 |
| `project-link-schema-migration-draft.md` | create table / FK | 문법상 양호 후보 | 단순 링크 저장 범위와 공개 여부 필요 | `visibility_status` 또는 `is_public` 후보 검토 | 공개 view 컬럼 검증 |
| `public-safe-view-migration-draft.md` | create view | 보안 확인 필요 | view owner/RLS 우회 위험 | `security_invoker` 또는 API 조합 검토 | Postgres/Supabase 공식 문서 검증 |
| `link-sharing-rpc-migration-draft.md` | create function/RPC | 보안 확인 필요 | `SECURITY DEFINER`와 `search_path` 검토 필수 | 반환 컬럼 제한, grant 제한 필요 | 실제 함수 문법 dry-run |
| `rls-policy-migration-draft.md` | create policy | 문법 확인 필요 | `USING`/`WITH CHECK` 분리 재검토 필요 | INSERT/UPDATE별 조건 정교화 | Postgres CREATE POLICY 문서 확인 |
| `helper-function-migration-draft.md` | helper function | 보안 확인 필요 | RLS에서 보호 테이블 조회 시 순환/권한 검토 | `SECURITY DEFINER` 최소화 | search_path 고정 검토 |
| `trigger-and-constraint-migration-draft.md` | trigger / constraint | 문법 확인 필요 | approved card mutation trigger는 실제 문법 검증 필요 | 컬럼 단위 제한 명확화 | Postgres trigger function dry-run |
| `index-and-performance-notes.md` | create index | 문법상 양호 후보 | partial index 조건 후보 필요 | public timeline index 보강 | explain plan 후순위 |

## 3. 주요 문법 확인 필요 항목

### 3.1 `type` 필드명

`change_cards.type`은 SQL에서 반드시 금지되는 이름은 아니더라도 가독성과 충돌 위험이 있다. 실제 migration 전 `card_type` 후보를 검토한다.

### 3.2 `share_token_hash unique`

PostgreSQL unique constraint의 null 처리 특성 때문에 `share_token_hash`가 nullable이면 여러 null이 허용될 수 있다. 이는 보통 문제는 아니지만, 의도를 명확히 하기 위해 partial unique index 후보를 검토한다.

### 3.3 public-safe view

view 문법 자체보다 보안 동작이 핵심이다. `security_invoker` 지원 여부, Supabase 환경의 RLS 적용 방식, view grant 범위를 공식 문서와 dry-run으로 검증해야 한다.

### 3.4 secure RPC

`SECURITY DEFINER` 후보는 반드시 `search_path` 고정, 반환 컬럼 제한, execute grant 제한을 함께 검토한다.

### 3.5 RLS policies

- `SELECT` 정책에는 `USING`이 필요하다.
- `INSERT` 정책에는 `WITH CHECK`가 필요하다.
- `UPDATE` 정책은 기존 row 접근을 위한 `USING`과 변경 후 row 검증을 위한 `WITH CHECK`가 모두 필요할 수 있다.
- 실제 SQL 문법은 적용 전 공식 문서 기준 재검증한다.

## 4. 현재 결론

문서 초안은 migration 파일 작성 준비 자료로는 충분하지만, 실제 `.sql`로 옮기기 전 다음은 필수 보정이다.

1. `type` → `card_type` 여부 결정
2. `share_token_hash` partial unique index 여부 결정
3. view 보안 모델 확정
4. RPC `SECURITY DEFINER` / `search_path` 확정
5. Feedback insert `WITH CHECK` 조건 보강
6. approved Change Card mutation trigger 문법 검증
